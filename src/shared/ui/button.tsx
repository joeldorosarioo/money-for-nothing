import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { type ComponentProps } from "react";

import { cn } from "../lib/cn";

const buttonVariants = cva("focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control border font-medium text-control leading-control transition-colors disabled:cursor-not-allowed disabled:opacity-45 shrink outline-none focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4 disabled:pointer-events-auto", {
  variants: {
    variant: {
      default: "hover:bg-primary/90 border-transparent bg-primary text-primary-foreground hover:enabled:bg-accent",
      outline: "shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 border-primary bg-transparent text-accent hover:enabled:bg-raised hover:enabled:text-accent",
      ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 border-transparent bg-transparent text-inherit hover:enabled:bg-raised hover:enabled:text-inherit",
      link: "border-transparent text-accent underline-offset-4 hover:underline",
    },

    size: {
      default: "has-[>svg]:px-3 h-auto min-h-control px-control-x py-control-y",
      small: "has-[>svg]:px-2.5 h-auto min-h-11 px-3 py-2",
      icon: "size-11 min-h-11 p-0",
    },
  },

  defaultVariants: {
    variant: "default",
    size: "default"
  },
});

function Button ({
  className, variant = "default", size = "default", asChild = false, ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { readonly asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button" data-variant={variant} data-size={size === "small" ? "sm" : size}
      className={cn(buttonVariants({ variant, size }), className)} {...props}
    />
  );
}

export { Button, buttonVariants };
