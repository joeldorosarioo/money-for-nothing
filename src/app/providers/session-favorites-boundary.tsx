import { type ReactNode } from "react";

import { useAuth } from "../../features/auth/index";
import { FavoritesFeedback, FavoritesProvider, type FavoritesApi } from "../../features/favorites/index";

export function SessionFavoritesBoundary ({ api, children }: {
  readonly api: FavoritesApi
  readonly children: ReactNode
}) {
  const { scope, status, service } = useAuth()

  return (
    <FavoritesProvider api={api} scope={scope} enabled={status === "authenticated"} isCurrentScope={(expected) => {
      const current = service.getSnapshot()
      return (current.session?.user.id ?? "guest") + ":" + current.generation.toString() === expected
    }}>
      {children}
      <FavoritesFeedback />
    </FavoritesProvider>
  )
}
