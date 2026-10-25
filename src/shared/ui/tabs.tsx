import { Tabs as TabsPrimitive } from "radix-ui";
import { type ComponentProps } from "react";

import { cn } from "../lib/cn";

function Tabs ({ className, orientation = "horizontal", ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root data-slot="tabs" data-orientation={orientation} orientation={orientation} className={cn(
      "group/tabs flex flex-col gap-6 data-[orientation=vertical]:flex-row", className,
    )} {...props} />
  );
}

function TabsList ({
  className, variant = "default", ...props
}: ComponentProps<typeof TabsPrimitive.List> & { readonly variant?: "default" | "line" }) {
  return (
    <TabsPrimitive.List data-slot="tabs-list" data-variant={variant} className={cn(
      "group/tabs-list flex min-w-0 shrink-0 items-stretch gap-2 overflow-x-auto border-b border-border bg-transparent p-0 [scrollbar-width:none] group-data-[orientation=vertical]/tabs:flex-col [&::-webkit-scrollbar]:hidden", className,
    )} {...props} />
  );
}

function TabsTrigger ({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger data-slot="tabs-trigger" className={cn(
      "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-[17px] leading-5 font-normal whitespace-nowrap text-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary data-[state=active]:font-bold data-[state=active]:text-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-4 group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", className
    )} {...props} />
  );
}

function TabsContent ({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("min-w-0 flex-1 outline-none", className)} {...props} />
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
