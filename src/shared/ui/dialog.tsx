import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { type ComponentProps } from "react";

import { cn } from "../lib/cn";
import { Button } from "./button";

type DialogVariant = "default" | "auth"

function Dialog ({ ...props }: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger ({ ...props }: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal ({ ...props }: ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose ({ ...props }: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay ({
  className, variant = "default", ...props
}: ComponentProps<typeof DialogPrimitive.Overlay> & { readonly variant?: DialogVariant }) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn("data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0", variant === "auth" ? "fixed inset-0 z-50 bg-black/50" : "fixed inset-0 z-60 bg-overlay", className)}
    {...props} />
  );
}

function DialogContent ({
  className, children, showCloseButton = true, overlayClassName, variant = "default", ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  readonly showCloseButton?: boolean
  readonly overlayClassName?: string
  readonly variant?: DialogVariant
}) {
  return (
    <DialogPortal>
      <DialogOverlay variant={variant} className={overlayClassName} />

      <DialogPrimitive.Content data-slot="dialog-content" className={cn(
        variant === "auth"
          ? "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg"
          : "fixed top-1/2 left-1/2 z-61 max-h-[calc(100dvh-48px)] w-[min(500px,calc(100vw-40px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-dialog border border-panel-border bg-card p-6",
        className,
      )} {...props}>
        {children}

        {showCloseButton && (variant === "auth" ? (
          <DialogClose className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-control text-muted-foreground hover:bg-raised hover:text-foreground">
            <XIcon />
            <span className="sr-only">Fechar diálogo</span>
          </DialogClose>
        ) : (
          <DialogClose className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-control text-muted-foreground hover:bg-raised hover:text-foreground" aria-label="Fechar diálogo">
            <XIcon className="size-5" aria-hidden="true" />
          </DialogClose>
        ))}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader ({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...props}
    />
  );
}

function DialogFooter ({
  className, showCloseButton = false, children, ...props
}: ComponentProps<"div"> & { readonly showCloseButton?: boolean }) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props}
    >
      {children}
      {showCloseButton && <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>}
    </div>
  );
}

function DialogTitle ({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("mb-4 pr-8 text-xl leading-[inherit] font-bold", className)} {...props}
    />
  );
}

function DialogDescription ({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("mb-6 text-control text-muted-foreground", className)} {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger
};
