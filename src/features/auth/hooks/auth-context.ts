import { createContext, useContext } from "react";

import { type SessionService } from "../application/session-service";
import { type AuthState } from "../types/session";

export const AuthContext = createContext<(AuthState & {
  readonly service: SessionService
  readonly scope: string
}) | null>(null)

export function useAuth () {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is missing.");

  return context
}
