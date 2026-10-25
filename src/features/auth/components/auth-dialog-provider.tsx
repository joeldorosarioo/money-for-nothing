import { useRef, useState, type ReactNode } from "react";

import { AuthDialogContext, type AuthDialogMode } from "../hooks/auth-dialog-context";

export function AuthDialogProvider ({ children }: { readonly children: ReactNode }) {
  const trigger = useRef<HTMLElement | null>(null);

  const [dialog, setDialog] = useState<{ readonly mode: AuthDialogMode; readonly redirect: string } | null>(null);

  return (
    <AuthDialogContext value={{
      dialog,

      open: (redirect) => {
        trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        setDialog({ mode: "login", redirect });
      },

      restoreFocus: () => {
        const target = trigger.current?.isConnected ? trigger.current : document.getElementById("main");
        target?.focus({ preventScroll: true });
      },

      close: () => { setDialog(null) },
      changeMode: (mode) => { setDialog((previous) => previous ? { ...previous, mode } : null) },
    }}>
      {children}
    </AuthDialogContext>
  );
}
