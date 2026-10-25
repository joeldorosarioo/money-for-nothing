import { cva } from "class-variance-authority";

import { cn } from "../lib/cn";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const controlVariants = cva("inline-flex items-center", {
  variants: {
    variant: {
      detail: "gap-3",
      mobile: "gap-2",
      cart: "col-start-2 row-start-3 gap-1 desktop:col-auto desktop:row-auto desktop:gap-1",
    },
  },
})

const stepVariants = cva("size-11 min-h-11 shrink-0 rounded-control p-0 text-2xl leading-6 disabled:opacity-45", {
  variants: {
    variant: {
      detail: "bg-primary text-primary-foreground hover:enabled:bg-accent",
      mobile: "bg-primary text-primary-foreground hover:enabled:bg-accent",
      cart: "border-input bg-raised text-foreground hover:enabled:bg-deep"
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
        className="h-11 min-h-11 w-11 min-w-11 appearance-textfield border-0 p-0 text-center text-base tabular-nums [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"

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
