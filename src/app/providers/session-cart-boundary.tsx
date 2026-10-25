import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "../../features/auth/index";
import { CartProvider, type CartApi } from "../../features/cart/index";
import { Button } from "../../shared/ui/button";

export function SessionCartBoundary ({ api, children }: {
  readonly api: CartApi
  readonly children: ReactNode
}) {
  const queryClient = useQueryClient()

  const { scope, status, service, error, mergeError } = useAuth()

  useEffect(() => {
    return () => {
      const filters = {
        predicate: (query: {
          queryKey: readonly unknown[]
        }) => query.queryKey[0] === "private" && query.queryKey[1] === scope
      }

      void queryClient.cancelQueries(filters)
      queryClient.removeQueries(filters)
    }
  }, [queryClient, scope])

  return (
    <CartProvider
      api={api}
      scope={scope}
      enabled={status === "guest" || status === "authenticated"}
      isCurrentScope={(expected) => {
        const current = service.getSnapshot()
        return (current.session?.user.id ?? "guest") + ":" + current.generation.toString() === expected
      }}
    >
      {status === "unavailable" && (
        <div className="flex flex-wrap gap-3 bg-raised px-6 py-3" role="alert">
          <p>{error?.message}</p>
          <Button onClick={() => { void service.restore() }}>Recuperar sessão</Button>

          <Button variant="outline" onClick={() => { const token = service.getToken(); if (token) service.expire(token) }}>
            Continuar como visitante
          </Button>
        </div>
      )}

      {mergeError && (
        <div className="flex flex-wrap gap-3 bg-raised px-6 py-3" role="alert">
          <p>Seu carrinho de visitante foi preservado. Não foi possível transferi-lo para esta conta.</p>
          <Button onClick={() => { void service.retryMerge() }}>Tentar transferência novamente</Button>
        </div>
      )}

      {children}
    </CartProvider>
  )
}
