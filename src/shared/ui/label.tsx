import { Label as LabelPrimitive } from "radix-ui";
import { type ComponentProps } from "react";

import { cn } from "../lib/cn";

function Label ({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root data-slot="label" className={cn(
      "items-center select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 block gap-0 text-control leading-[inherit] font-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-45", className
    )} {...props} />
  );
}

export { Label };
