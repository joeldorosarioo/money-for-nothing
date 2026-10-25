import { type ReactNode } from "react";

import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../ui/dialog";

export function FeatureNotice ({
  children, title, description = "Esta seção não faz parte desta demonstração do marketplace."
}: {
  readonly children: ReactNode
  readonly title: string
  readonly description?: string
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent showCloseButton={false}>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <DialogClose asChild><Button>Continuar explorando</Button></DialogClose>
      </DialogContent>
    </Dialog>
  )
}
