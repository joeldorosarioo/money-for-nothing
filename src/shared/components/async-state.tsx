import { type ReactNode } from "react";

import { explainError } from "../http/api-client-error";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

const stateClassName = "flex min-h-60 flex-col items-center justify-center gap-4 p-6 text-center [&_h2]:text-xl [&_h2]:font-bold"

export function ErrorState ({ error, retry }: { readonly error: unknown; readonly retry: () => void }) {
  return (
    <div className={stateClassName} role="alert">
      <p>{explainError(error)}</p>
      <Button variant="outline" onClick={retry}>Tentar novamente</Button>
    </div>
  )
}

export function EmptyState ({ children }: { readonly children: ReactNode }) {
  return <div className={stateClassName}>{children}</div>
}

export function CatalogSkeleton () {
  return (
    <div
      role="status" aria-label="Carregando NFTs" aria-busy="true"
      className="grid grid-cols-2 gap-x-4 gap-y-8 tablet:grid-cols-3 desktop:gap-x-6"
    >
      {Array.from({ length: 9 }, (_, index) => (
        <div key={index}>
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="mt-3 h-4 w-7/10" />
        </div>
      ))}
    </div>
  )
}
