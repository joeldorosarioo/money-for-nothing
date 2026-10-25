import { cva } from "class-variance-authority";
import { CheckIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { type ComponentProps } from "react";

import { cn } from "../lib/cn";

const checkboxVariants = cva("peer outline-none focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary peer size-4 shrink-0 border border-primary shadow-none transition-none disabled:cursor-not-allowed disabled:opacity-45 focus-visible:border-primary focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4", {
  variants: {
    variant: {
      default: "rounded-control",
      circle: "rounded-full bg-transparent data-[state=checked]:inset-ring-3 data-[state=checked]:inset-ring-background [&_[data-slot=checkbox-indicator]]:hidden",
      hidden: "rounded-control [&_[data-slot=checkbox-indicator]]:hidden sr-only",
    },
  },

  defaultVariants: {
    variant: "default"
  },
});

function Checkbox ({
  className, variant = "default", ...props
}: ComponentProps<typeof CheckboxPrimitive.Root> & { readonly variant?: "default" | "circle" | "hidden" }) {
  return (
    <CheckboxPrimitive.Root data-slot="checkbox" className={cn(checkboxVariants({ variant }), className)} {...props}>
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
