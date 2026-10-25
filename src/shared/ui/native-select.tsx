import { cva } from "class-variance-authority";
import { ChevronDownIcon } from "lucide-react";
import { type ComponentProps } from "react";

import { cn } from "../lib/cn";

const selectVariants = cva("selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed data-[size=sm]:h-8 data-[size=sm]:py-1 dark:bg-input/30 dark:hover:bg-input/50 focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 min-w-0 appearance-auto bg-transparent shadow-none transition-none outline-none focus-visible:border-input focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4 aria-invalid:border-input aria-invalid:ring-0 disabled:pointer-events-auto disabled:opacity-45 w-full border-input text-sm", {
  variants: {
    variant: {
      default: "h-control rounded-input border px-3 py-2 text-muted-foreground",
      inline: "h-auto max-w-50 rounded-none border-0 p-0 text-foreground",
    },
  },

  defaultVariants: {
    variant: "default"
  },
});

function NativeSelect ({
  className, size = "default", variant = "default", ...props
}: Omit<ComponentProps<"select">, "size"> & {
  readonly variant?: "default" | "inline"
  readonly size?: "sm" | "default"
}) {
  return (
    <div className={cn(
      "relative **:data-[slot=native-select-icon]:hidden",
      variant === "default" ? "w-full **:data-[slot=native-select-wrapper]:w-full" : "w-fit",
    )}>
      <div className="group/native-select relative w-fit has-[select:disabled]:opacity-50" data-slot="native-select-wrapper">
        <select
          data-slot="native-select" data-size={size}
          className={cn(selectVariants({ variant }), className)} {...props}
        />

        <ChevronDownIcon
          className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground opacity-50 select-none"
          aria-hidden="true" data-slot="native-select-icon"
        />
      </div>
    </div>
  );
}

function NativeSelectOption ({ className, ...props }: ComponentProps<"option">) {
  return <option data-slot="native-select-option" className={cn("bg-card text-foreground", className)} {...props} />
}

function NativeSelectOptGroup ({ className, ...props }: ComponentProps<"optgroup">) {
  return <optgroup data-slot="native-select-optgroup" className={cn("bg-[Canvas] text-[CanvasText]", className)} {...props} />
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
