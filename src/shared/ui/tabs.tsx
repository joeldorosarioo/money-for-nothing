import { Tabs as TabsPrimitive } from "radix-ui";
import { type ComponentProps } from "react";

import { cn } from "../lib/cn";

function Tabs ({ className, orientation = "horizontal", ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root data-slot="tabs" data-orientation={orientation} orientation={orientation} className={cn(
      "group/tabs data-[orientation=horizontal]:flex-col block gap-0", className,
    )} {...props} />
  );
}

function TabsList ({
  className, variant = "default", ...props
}: ComponentProps<typeof TabsPrimitive.List> & { readonly variant?: "default" | "line" }) {
  return (
    <TabsPrimitive.List data-slot="tabs-list" data-variant={variant} className={cn(
      "group/tabs-list group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none flex h-auto w-auto items-stretch justify-normal gap-8 rounded-none border-b border-border bg-transparent p-0 text-[17px] font-normal text-foreground group-data-[orientation=horizontal]/tabs:h-auto", className,
    )} {...props} />
  );
}

function TabsTrigger ({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger data-slot="tabs-trigger" className={cn(
      "relative items-center justify-center border-transparent py-1 whitespace-nowrap group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:-bottom-1.25 group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100 block h-auto flex-initial gap-0 rounded-none border-0 px-0 pt-0 pb-1.75 text-[17px] leading-5 font-normal text-foreground transition-none after:hidden data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-accent group-data-[variant=default]/tabs-list:data-[state=active]:shadow-none focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4", className
    )} {...props} />
  );
}

function TabsContent ({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
