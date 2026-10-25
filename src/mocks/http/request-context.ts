import { type Session } from "../../features/auth/types/session"
import { type SimulationState } from "../persistence/simulation-state"
import { ApiError } from "./api-error"

export function requireSession (state: SimulationState, request: Request): Session {
  const authorization = request.headers.get("Authorization")
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : ""
  const session = state.sessions[token]

  if (!session || session.expiresAt <= Date.now() || !state.users[session.user.id]) {
    throw new ApiError(401, "SESSION_EXPIRED", "Entre na sua conta para continuar.")
  }

  return session
}

export function visitorOwner (request: Request): string {
  const visitorId = request.headers.get("X-Visitor-Id")

  if (!visitorId || visitorId.length > 100 || !/^[a-zA-Z0-9-]+$/.test(visitorId)) {
    throw new ApiError(422, "VISITOR_REQUIRED", "Não foi possível identificar este carrinho.")
  }

  return "guest:" + visitorId
}

export function cartOwner (state: SimulationState, request: Request): string {
  return request.headers.has("Authorization") ? requireSession(state, request).user.id : visitorOwner(request)
}
