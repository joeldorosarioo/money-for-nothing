import { createContext, useContext } from "react";

interface FavoritesContextValue {
  readonly nftIds: readonly string[]
  readonly pendingIds: readonly string[]
  readonly loading: boolean
  readonly error: Error | null
  readonly toggle: (nftId: string) => Promise<void>
  readonly retry: () => void
}

export const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function useFavorites () {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("FavoritesProvider is required.");
  return context
}
