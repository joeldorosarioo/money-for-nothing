import { createContext, useContext } from "react";

export type AuthDialogMode = "login" | "signup"

interface AuthDialogState {
  readonly mode: AuthDialogMode
  readonly redirect: string
}

interface AuthDialogContextValue {
  readonly dialog: AuthDialogState | null
  readonly open: (redirect: string) => void
  readonly restoreFocus: () => void
  readonly close: () => void
  readonly changeMode: (mode: AuthDialogMode) => void
}

export const AuthDialogContext = createContext<AuthDialogContextValue | null>(null);

export function useAuthDialog () {
  const value = useContext(AuthDialogContext);
  if (!value) throw new Error("AuthDialogProvider is missing.");

  return value
}
