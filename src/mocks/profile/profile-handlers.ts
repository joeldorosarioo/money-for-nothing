import { http, HttpResponse } from "msw";

import { profileInputSchema } from "../../features/profile/api/profile-contracts";
import { type CollectorProfile } from "../../features/profile/types/collector-profile";
import { createPasswordSalt, hashPassword } from "../auth/password";
import { ApiError, apiResponse } from "../http/api-error";
import { requireSession } from "../http/request-context";
import { type SimulationState } from "../persistence/simulation-state";
import { withState } from "../persistence/state-store";

function readAccount (state: SimulationState, request: Request) {
  const session = requireSession(state, request)

  const user = state.users[session.user.id]
  if (!user) throw new ApiError(401, "SESSION_EXPIRED", "Entre na sua conta para continuar.")

  return { user, session }
}

export function profileHandlers (databaseName: string) {
  return [
    http.get("*/api/profile", ({ request }) => apiResponse(async () => {
      const profile = await withState(databaseName, (state) => readAccount(state, request).user.profile)
      return HttpResponse.json(profile)
    })),

    http.put("*/api/profile", ({ request }) => apiResponse(async () => {
      const input = profileInputSchema.parse(await request.json())
      const original = await withState(databaseName, (state) => readAccount(state, request))

      let passwordSalt = original.user.passwordSalt
      let passwordHash = original.user.passwordHash

      if (input.passwordChange) {
        const currentHash = await hashPassword(input.passwordChange.currentPassword, passwordSalt)

        if (currentHash !== passwordHash) {
          throw new ApiError(422, "CURRENT_PASSWORD_INVALID", "A senha atual está incorreta.")
        }

        passwordSalt = createPasswordSalt()
        passwordHash = await hashPassword(input.passwordChange.password, passwordSalt)
      }

      const profile = await withState(databaseName, (state) => {
        const { user, session } = readAccount(state, request)

        if (user.profile.version !== input.expectedVersion || user.passwordHash !== original.user.passwordHash) {
          throw new ApiError(409, "PROFILE_CHANGED", "O perfil foi atualizado. Recarregue antes de salvar.")
        }

        const duplicate = Object.values(state.users).some((candidate) => candidate.id !== user.id && (
          candidate.profile.email === input.email
          || candidate.profile.username.toLowerCase() === input.username.toLowerCase()
        ))

        if (duplicate) throw new ApiError(409, "ACCOUNT_EXISTS", "Este e-mail ou nome de usuário já está em uso.")

        const next: CollectorProfile = {
          id: user.id,
          displayName: input.displayName,
          username: input.username,
          email: input.email,
          ens: input.ens,
          walletNickname: input.walletNickname,
          avatarUrl: input.avatarUrl,
          version: user.profile.version + 1,
        }

        state.users[user.id] = { ...user, profile: next, passwordHash, passwordSalt }

        state.sessions = Object.fromEntries(Object.entries(state.sessions)
          .filter(([token, current]) => !input.passwordChange || current.user.id !== user.id || token === session.token)
          .map(([token, current]) => [token, current.user.id === user.id ? {
            ...current, user: {
              id: user.id,
              username: next.username,
              displayName: next.displayName,
              email: next.email,
            },
          } : current]))

        return next
      })

      return HttpResponse.json(profile)
    })),
  ]
}
