export interface SessionUser {
  readonly id: string
  readonly username: string
  readonly displayName: string
  readonly email: string
}

export interface Session {
  readonly token: string
  readonly user: SessionUser
  readonly expiresAt: number
}

export interface LoginCredentials {
  readonly email: string
  readonly password: string
}

export interface Registration extends LoginCredentials {
  readonly username: string
  readonly confirmPassword: string
}

export interface StoredSession {
  readonly token: string
  readonly pendingMergeId: string | null
}

export interface AuthState {
  readonly status: "restoring" | "guest" | "activating" | "authenticated" | "unavailable"
  readonly session: Session | null
  readonly generation: number
  readonly error: Error | null
  readonly mergeError: Error | null
}
