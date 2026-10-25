import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { type FavoritesApi } from "../api/favorites-api";
import { FavoritesContext } from "../hooks/favorites-context";

interface FavoriteCommand {
  readonly scope: string
  readonly nftId: string
  readonly active: boolean
}

interface FavoritesProviderProps {
  readonly api: FavoritesApi
  readonly scope: string
  readonly enabled: boolean
  readonly isCurrentScope: (scope: string) => boolean
  readonly children: ReactNode
}

function applyFavorite (nftIds: readonly string[], nftId: string, active: boolean) {
  return active ? [...new Set([...nftIds, nftId])] : nftIds.filter((id) => id !== nftId)
}

export function FavoritesProvider ({ api, scope, enabled, isCurrentScope, children }: FavoritesProviderProps) {
  const queryClient = useQueryClient()
  const mountedScope = useRef<string | null>(scope)
  const pending = useRef(new Set<string>())

  const [commands, setCommands] = useState<readonly FavoriteCommand[]>([])
  const [failure, setFailure] = useState<{ readonly scope: string; readonly error: Error } | null>(null)

  const queryKey = ["private", scope, "favorites"]
  const query = useQuery({ queryKey, enabled, queryFn: ({ signal }) => api.list(signal) })
  const currentCommands = commands.filter((command) => command.scope === scope)

  const nftIds = currentCommands
    .reduce((previous, command) => applyFavorite(previous, command.nftId, command.active), query.data ?? [])

  useEffect(() => {
    mountedScope.current = scope

    return () => {
      mountedScope.current = null
      void queryClient.cancelQueries({ queryKey: ["private", scope, "favorites"] })
      queryClient.removeQueries({ queryKey: ["private", scope, "favorites"] })
    }
  }, [queryClient, scope])

  async function toggle (nftId: string) {
    const commandKey = scope + ":" + nftId
    if (!enabled || query.isPending || pending.current.has(commandKey)) return

    const command = { scope, nftId, active: !nftIds.includes(nftId) }
    const isCurrent = () => mountedScope.current === scope && isCurrentScope(scope)

    pending.current.add(commandKey)
    setCommands((previous) => [...previous, command])
    setFailure(null)

    try {
      await queryClient.cancelQueries({ queryKey })
      if (!isCurrent()) return
      const result = await api.set(nftId, command.active)

      if (isCurrent()) {
        queryClient.setQueryData<string[]>(queryKey, (previous) =>
          applyFavorite(previous ?? [], nftId, result.includes(nftId)),
        )
      }
    } catch (error) {
      if (isCurrent()) {
        setFailure({
          scope,
          error: error instanceof Error ? error : new Error("Não foi possível salvar o favorito.")
        })
      }
    } finally {
      pending.current.delete(commandKey)

      if (mountedScope.current !== null) {
        setCommands((previous) => previous.filter((item) => item !== command))
      }

      const hasPending = [...pending.current].some((key) => key.startsWith(scope + ":"))
      if (isCurrent() && !hasPending) void queryClient.invalidateQueries({ queryKey })
    }
  }

  return (
    <FavoritesContext value={{
      nftIds,
      pendingIds: currentCommands.map((command) => command.nftId),
      loading: enabled && query.isPending,
      error: failure?.scope === scope ? failure.error : query.error,
      toggle,
      retry () { setFailure(null); void query.refetch() },
    }}>
      {children}
    </FavoritesContext>
  )
}
