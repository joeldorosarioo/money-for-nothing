import { type ComponentProps } from "react";
import { cn } from "../lib/cn";

function Input ({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input type={type} data-slot="input" className={cn(
      "selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground md:text-sm dark:bg-input/30 focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 block h-auto min-h-control w-full min-w-0 rounded-input border border-input bg-transparent px-3 py-control-y text-control leading-control text-foreground shadow-none transition-none outline-none focus-visible:border-input focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4 aria-invalid:border-input aria-invalid:ring-0 disabled:pointer-events-auto placeholder:text-secondary placeholder:opacity-100 disabled:cursor-not-allowed disabled:opacity-45", className,
    )} {...props} />
  );
}

export { Input };
