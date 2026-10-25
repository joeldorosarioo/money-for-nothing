import { type ReactNode } from "react";

import { AuthDialogLink, useAuth } from "../../auth/index";
import { Button } from "../../../shared/ui/button";
import { cn } from "../../../shared/lib/cn";
import { useFavorites } from "../hooks/favorites-context";

interface FavoriteButtonProps {
  readonly nftId: string
  readonly title: string
  readonly className?: string
  readonly children: ReactNode
  readonly showLabel?: boolean
  readonly savedIcon?: ReactNode
}

export function FavoriteButton ({ nftId, title, className, children, showLabel = false, savedIcon }: FavoriteButtonProps) {
  const { status } = useAuth()
  const { nftIds, pendingIds, loading, toggle } = useFavorites()

  const saved = status === "authenticated" && nftIds.includes(nftId)
  const label = saved ? "Remover " + title + " dos favoritos" : "Favoritar " + title
  const content = <>{saved && savedIcon ? savedIcon : children}{showLabel && (saved ? "Favoritado" : "Favoritar")}</>

  const appearance = cn(!showLabel && "min-h-0 border-0 p-0", saved && "aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:[&_img]:brightness-0", className)

  if (status === "guest") {
    return (
      <Button asChild variant={showLabel ? "outline" : "ghost"} className={appearance}>
        <AuthDialogLink aria-label={label}>{content}</AuthDialogLink>
      </Button>
    )
  }

  return (
    <Button
      variant={showLabel ? "outline" : "ghost"}
      className={appearance}
      aria-label={label}
      aria-pressed={saved}
      disabled={status !== "authenticated" || loading || pendingIds.includes(nftId)}
      onClick={() => { void toggle(nftId) }}
    >
      {content}
    </Button>
  )
}
