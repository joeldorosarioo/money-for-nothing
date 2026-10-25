import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, type ReactNode } from "react";

import { type CartApi } from "../api/cart-api";
import { CartContext } from "../hooks/cart-context";
import { type CartView } from "../types/cart";

interface CartProviderProps {
  readonly api: CartApi
  readonly scope: string
  readonly enabled?: boolean
  readonly isCurrentScope?: (scope: string) => boolean
  readonly children: ReactNode
}

export function CartProvider ({ api, scope, children, enabled = true, isCurrentScope = () => true }: CartProviderProps) {
  const queryClient = useQueryClient();
  const active = useRef(true);

  useEffect(() => { active.current = true; return () => { active.current = false } }, []);

  const queryKey = ["private", scope, "cart"]

  const query = useQuery({
    queryKey, enabled,

    async queryFn ({ signal }) {
      const snapshot = await api.get(signal)
      const current = queryClient.getQueryData<CartView>(queryKey)
      return current && current.version > snapshot.version ? current : snapshot
    },
  });

  const mutation = useMutation({
    async mutationFn ({ request }: { request: () => Promise<CartView>; scope: string }) {
      if (!enabled) throw new Error("Aguarde a recuperação da sessão.");
      return request();
    },

    onSuccess (next, command) {
      if (!active.current || !isCurrentScope(command.scope)) return

      queryClient.setQueryData<CartView>(queryKey, (previous) =>
        !previous || next.version >= previous.version ? next : previous,
      )
    },

    async onError (_error, command) {
      if (!active.current || !isCurrentScope(command.scope)) return
      await queryClient.invalidateQueries({ queryKey })
    },
  });

  const mutate = (request: () => Promise<CartView>) => mutation.mutateAsync({ request, scope });

  return (
    <CartContext value={{
      cart: query.data ?? null, loading: query.isPending, error: query.error,
      adding: mutation.isPending && mutation.variables.scope === scope, scope,
      addItem: (input) => mutate(() => api.add(input)),
      changeItem: (id, quantity, version) => mutate(() => api.change(id, quantity, version)),
      removeItem: (id, version) => mutate(() => api.remove(id, version)),
      retry () { void query.refetch() },
    }}>
      {children}
    </CartContext>
  );
}
