import { type ComponentProps } from "react";
import { cn } from "../lib/cn";

function Skeleton ({ className, ...props }: ComponentProps<"div">) {
  return (
    <div role={props["aria-label"] ? "status" : undefined} data-slot="skeleton" className={cn(
      "rounded-artwork bg-transparent animate-shimmer bg-[linear-gradient(90deg,var(--card)_25%,var(--deep)_50%,var(--card)_75%)] bg-size-[200%_100%]", className
    )} {...props} />
  );
}

export { Skeleton };
