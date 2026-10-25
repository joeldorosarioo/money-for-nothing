import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";

import { useAuthDialog } from "../hooks/auth-dialog-context";

export function AuthDialogLink ({ children, className, ...props }: {
  readonly children: ReactNode
  readonly className?: string | undefined
  readonly "aria-label"?: string | undefined
}) {
  const { open } = useAuthDialog();

  const href = useRouterState({ select: (state) => state.location.href });

  return (
    <Link {...props} to="/login" className={className} search={{ redirect: href }} onClick={(event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault();
      open(href);
    }}>
      {children}
    </Link>
  );
}
