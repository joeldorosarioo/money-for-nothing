import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { type ComponentProps } from "react";

import { cn } from "../lib/cn";

function Select (props: ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup (props: ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue (props: ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger ({ className, children, variant = "default", ...props }: ComponentProps<typeof SelectPrimitive.Trigger> & {
  readonly variant?: "default" | "inline"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex min-h-control w-full min-w-0 items-center justify-between gap-2 rounded-input border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none data-placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4 aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-45 **:data-[slot=select-value]:min-w-0 **:data-[slot=select-value]:truncate",
        variant === "inline" && "w-auto max-w-50 border-transparent px-0 text-xs",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectScrollUpButton ({ className, ...props }: ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton data-slot="select-scroll-up-button" className={cn("flex h-8 items-center justify-center", className)} {...props}>
      <ChevronUpIcon className="size-4" aria-hidden="true" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton ({ className, ...props }: ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton data-slot="select-scroll-down-button" className={cn("flex h-8 items-center justify-center", className)} {...props}>
      <ChevronDownIcon className="size-4" aria-hidden="true" />
    </SelectPrimitive.ScrollDownButton>
  )
}

function SelectContent ({ className, children, position = "popper", align = "start", sideOffset = 8, collisionPadding = 12, ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn("relative z-80 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) max-w-[calc(100vw-24px)] overflow-hidden rounded-input border border-input bg-raised text-foreground", className)}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className="p-1">
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel ({ className, ...props }: ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label data-slot="select-label" className={cn("px-3 py-2 text-xs font-medium text-muted-foreground", className)} {...props} />
}

function SelectItem ({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn("relative flex min-h-11 w-full cursor-default items-center rounded-control py-2 pr-9 pl-3 text-sm leading-5 wrap-break-word whitespace-normal outline-none select-none data-highlighted:bg-primary data-highlighted:text-primary-foreground data-[state=checked]:font-bold data-disabled:pointer-events-none data-disabled:opacity-45", className)}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-3 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator><CheckIcon className="size-4" aria-hidden="true" /></SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator ({ className, ...props }: ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator data-slot="select-separator" className={cn("my-1 h-px bg-panel-border", className)} {...props} />
}

export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue };
