import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

import { useAuth } from "../../features/auth/index";
import { CatalogChangeContext, createLiveSubscription, type LiveEvent } from "../../features/live-updates/index";

export function LiveUpdatesBoundary ({ ensureReady, visitorId, children }: {
  readonly ensureReady: () => Promise<void>
  readonly visitorId: string
  readonly children: ReactNode
}) {
  const { scope, session, status, service } = useAuth()

  const queryClient = useQueryClient()
  const token = session?.token ?? null

  const [catalogChange, setCatalogChange] = useState<{
    readonly scope: string;
    readonly event: LiveEvent
  } | null>(null)

  useEffect(() => {
    if (status !== "guest" && status !== "authenticated") return
    const currentOwner = session?.user.id ?? "guest:" + visitorId
    let readySeen = false

    const isCurrent = () => {
      const current = service.getSnapshot()
      return (current.session?.user.id ?? "guest") + ":" + current.generation.toString() === scope
    }

    const refreshPrivate = (resource?: string) => {
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "private"
          && query.queryKey[1] === scope
          && (resource ? query.queryKey[2] === resource : query.queryKey[2] !== "checkout-quote"),
      })
    }

    const markQuoteChanged = () => {
      void queryClient.invalidateQueries({
        queryKey: ["private", scope, "checkout-quote"],
        refetchType: "none"
      })
    }

    return createLiveSubscription({
      ensureReady,

      credentials: {
        token,
        visitorId
      },

      ownerId: currentOwner,

      onReady () {
        if (!isCurrent()) return
        refreshPrivate()

        void queryClient.invalidateQueries({ queryKey: ["catalog"] })
        void queryClient.invalidateQueries({ queryKey: ["nft"] })

        if (readySeen) markQuoteChanged()
        readySeen = true
      },

      onChange (event) {
        if (!isCurrent()) return

        if (event.resource === "catalog") {
          void queryClient.invalidateQueries({ queryKey: ["catalog"] })
          void queryClient.invalidateQueries({ queryKey: ["nft", event.subjectId] })

          refreshPrivate("cart")
          refreshPrivate("quote")
          setCatalogChange({ scope, event })
          markQuoteChanged()
        } else if (event.resource === "order") {
          void queryClient.invalidateQueries({ queryKey: ["private", scope, "order", event.subjectId] })
          refreshPrivate("cart")
        } else {
          refreshPrivate(event.resource)
          if (event.resource === "cart") markQuoteChanged()
          if (event.resource === "profile" || event.resource === "wallets") refreshPrivate("checkout-details")
        }
      },

      onRejected () {
        if (isCurrent() && token) service.expire(token)
      },
    })
  }, [ensureReady, queryClient, scope, service, session?.user.id, status, token, visitorId])

  return (
    <CatalogChangeContext value={catalogChange?.scope === scope ? catalogChange.event : null}>
      {children}
    </CatalogChangeContext>
  )
}
