import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import { type SessionService } from "../application/session-service";
import { AuthContext } from "../hooks/auth-context";

export function AuthProvider ({ service, children }: { readonly service: SessionService; readonly children: ReactNode }) {
  const state = useSyncExternalStore(service.subscribe, service.getSnapshot, service.getSnapshot);

  useEffect(() => {
    if (!state.session) return

    const { token, expiresAt } = state.session

    const expireIfDue = () => {
      if (Date.now() >= expiresAt) service.expire(token);
    }

    const timer = window.setTimeout(expireIfDue, Math.max(0, Math.min(expiresAt - Date.now(), 2_147_483_647)));
    document.addEventListener("visibilitychange", expireIfDue);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", expireIfDue);
    }
  }, [service, state.session]);

  return (
    <AuthContext value={{
      ...state, service, scope: (state.session?.user.id ?? "guest") + ":" + state.generation.toString(),
    }}>{children}</AuthContext>
  );
}
