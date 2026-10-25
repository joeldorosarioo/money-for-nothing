import { useState, type ComponentProps } from "react";

import { cn } from "../lib/cn";
import { Input } from "../ui/input";

export function PasswordInput ({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input {...props} className={cn("pr-11", className)} type={visible ? "text" : "password"} />

      <button
        type="button"
        className="absolute top-1/2 right-2 grid h-8 w-7 -translate-y-1/2 place-items-center"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        onClick={() => { setVisible(!visible) }}
      >
        <img className="size-5" src="/assets/figma-password-hidden.svg" alt="" />
      </button>
    </div>
  );
}
