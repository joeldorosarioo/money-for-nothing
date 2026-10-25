import { http, HttpResponse } from "msw";

import { loginSchema, registerSchema } from "../../features/auth/api/auth-contracts";
import { type Session } from "../../features/auth/types/session";
import { ApiError, apiResponse } from "../http/api-error";
import { requireSession } from "../http/request-context";
import { nextId, type SimulatedUser, type SimulationState } from "../persistence/simulation-state";
import { withState } from "../persistence/state-store";
import { createPasswordSalt, hashPassword } from "./password";

function createSession (state: SimulationState, user: SimulatedUser): Session {
  const session: Session = {
    token: crypto.randomUUID(),

    user: {
      id: user.id,
      username: user.profile.username,
      displayName: user.profile.displayName,
      email: user.profile.email,
    },

    expiresAt: Date.now() + 30 * 60_000,
  }

  state.sessions[session.token] = session
  return session
}

export function authHandlers (databaseName: string) {
  return [
    http.post("*/api/auth/login", ({ request }) => apiResponse(async () => {
      const input = loginSchema.parse(await request.json())

      const user = await withState(
        databaseName, (state) => Object
          .values(state.users)
          .find((candidate) => candidate.profile.email === input.email)
      )

      if (!user || await hashPassword(input.password, user.passwordSalt) !== user.passwordHash) {
        throw new ApiError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos.")
      }

      const session = await withState(databaseName, (state) => createSession(state, user))
      return HttpResponse.json(session)
    })),

    http.post("*/api/auth/register", ({ request }) => apiResponse(async () => {
      const input = registerSchema.parse(await request.json())
      const passwordSalt = createPasswordSalt()
      const passwordHash = await hashPassword(input.password, passwordSalt)

      const session = await withState(databaseName, (state) => {
        const duplicate = Object.values(state.users).some((user) =>
          user.profile.email === input.email || user.profile.username.toLowerCase() === input.username.toLowerCase(),
        )

        if (duplicate) throw new ApiError(409, "ACCOUNT_EXISTS", "Este e-mail ou nome de usuário já está em uso.")
        const id = nextId(state, "user")

        const user: SimulatedUser = {
          id,
          passwordSalt,
          passwordHash,

          profile: {
            id,
            username: input.username,
            displayName: input.username,
            email: input.email,
            ens: "",
            walletNickname: "",
            avatarUrl: "",
            version: 1,
          },
        }

        state.users[id] = user
        return createSession(state, user)
      })

      return HttpResponse.json(session, { status: 201 })
    })),

    http.get("*/api/auth/session", ({ request }) => apiResponse(async () => {
      const session = await withState(databaseName, (state) => requireSession(state, request))
      return HttpResponse.json(session)
    })),

    http.delete("*/api/auth/session", ({ request }) => apiResponse(async () => {
      await withState(databaseName, (state) => {
        const session = requireSession(state, request)
        state.sessions = Object.fromEntries(Object.entries(state.sessions).filter(([token]) => token !== session.token))
      })

      return new HttpResponse(null, { status: 204 })
    })),
  ]
}
