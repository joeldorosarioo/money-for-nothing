import { cva } from "class-variance-authority";

import { cn } from "../lib/cn";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const controlVariants = cva("inline-flex items-center", {
  variants: {
    variant: {
      detail: "gap-3",
      mobile: "gap-2",
      cart: "absolute right-3 bottom-8.75 gap-1.5 desktop:static desktop:gap-2",
    },
  },
})

const stepVariants = cva("p-0 text-primary-foreground bg-primary hover:enabled:bg-primary rounded-[20px] disabled:opacity-100", {
  variants: {
    variant: {
      detail: "h-10 min-h-10 w-6 text-[26px] leading-6",
      mobile: "h-7.5 min-h-7.5 w-5 text-xl leading-6",
      cart: "size-6 min-h-6 rounded-full border-panel-border bg-deep text-foreground text-xl leading-6 hover:enabled:bg-deep desktop:h-7 desktop:min-h-7 desktop:w-5 desktop:border-transparent desktop:bg-primary desktop:text-primary-foreground desktop:hover:enabled:bg-primary"
    },
  },
},
)

interface QuantityControlProps {
  readonly quantity: number
  readonly available: number
  readonly onChange: (quantity: number) => void
  readonly label: string
  readonly disabled?: boolean
  readonly variant?: "detail" | "mobile" | "cart"
  readonly className?: string
}

export function QuantityControl ({
  quantity, available, onChange, label, disabled = false, variant = "detail", className,
}: QuantityControlProps) {
  return (
    <div className={cn(controlVariants({ variant }), className)}>
      <Button
        variant="ghost" aria-label="Diminuir quantidade"
        className={stepVariants({ variant })}
        disabled={disabled || quantity <= 1}
        onClick={() => { onChange(quantity - 1) }}
      >
        −
      </Button>

      <Input
        type="number"
        inputMode="numeric"
        aria-label={label}
        min={1}
        max={available}
        step={1}
        value={quantity}
        disabled={disabled}
        className={cn("h-7.5 min-h-7.5 w-6 min-w-6 appearance-textfield border-0 p-0 text-center text-lg [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none", variant === "cart" && "w-4.5 min-w-4.5 text-base desktop:w-6 desktop:min-w-6")}

        onChange={(event) => {
          const next = event.target.valueAsNumber
          if (Number.isSafeInteger(next) && next > 0 && next <= available) onChange(next)
        }}
      />

      <Button
        variant="ghost"
        className={stepVariants({ variant })}
        aria-label="Aumentar quantidade"
        disabled={disabled || quantity >= available}
        onClick={() => { onChange(quantity + 1) }}
      >
        +
      </Button>
    </div>
  );
}
