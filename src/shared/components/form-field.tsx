import { type ReactNode } from "react";

import { cn } from "../lib/cn";
import { Label } from "../ui/label";

export function FormField ({ id, label, error, required = false, variant = "profile", className, children }: {
  readonly id: string
  readonly label: string
  readonly error: string | undefined
  readonly required?: boolean
  readonly variant?: "profile" | "password" | "wallet" | "wallet-optional" | "checkout"
  readonly className?: string
  readonly children: ReactNode
}) {
  return (
    <div data-slot="field" className={cn(variant === "wallet-optional" && "self-end", className)}>
      <Label htmlFor={id} className={cn(
        "block",
        variant === "profile" && "mb-2.5 leading-7.25",
        variant === "password" && "mb-2.25 leading-4.5",
        variant === "checkout" && "leading-7.25",
        variant === "wallet" && "-mb-1 leading-7.25",
        variant === "wallet-optional" && "sr-only",
      )}>
        {label}
        {required && <span aria-hidden="true" className="text-[22px] leading-none text-accent"> *</span>}
      </Label>

      {children}
      {error && <p className="mt-1.5 text-xs leading-4.5 text-destructive" id={id + "-error"}>{error}</p>}
    </div>
  )
}
