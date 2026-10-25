import { Heart } from "lucide-react";

import { AuthDialogLink, useAuth } from "../../auth/index";
import { Button } from "../../../shared/ui/button";
import { cn } from "../../../shared/lib/cn";
import { useFavorites } from "../hooks/favorites-context";

interface FavoriteButtonProps {
  readonly nftId: string
  readonly title: string
  readonly className?: string
  readonly showLabel?: boolean
}

export function FavoriteButton ({ nftId, title, className, showLabel = false }: FavoriteButtonProps) {
  const { status } = useAuth()
  const { nftIds, pendingIds, loading, toggle } = useFavorites()

  const saved = status === "authenticated" && nftIds.includes(nftId)
  const label = saved ? "Remover " + title + " dos favoritos" : "Favoritar " + title
  const pending = pendingIds.includes(nftId)
  const content = <>
    <Heart className="size-5" strokeWidth={1.8} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
    {showLabel && (saved ? "Favoritado" : "Favoritar")}
  </>

  const appearance = cn(
    "shrink-0 border-input text-accent focus-visible:outline-offset-2",
    !showLabel && "rounded-full bg-card",
    saved
      ? "border-primary bg-primary text-primary-foreground hover:bg-accent hover:text-primary-foreground hover:enabled:bg-accent hover:enabled:text-primary-foreground"
      : "hover:border-primary hover:bg-raised hover:text-accent",
    className,
  )

  if (status === "guest") {
    return (
      <Button asChild variant="outline" size={showLabel ? "default" : "icon"} className={appearance}>
        <AuthDialogLink aria-label={label}>{content}</AuthDialogLink>
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size={showLabel ? "default" : "icon"}
      className={appearance}
      aria-label={label}
      aria-pressed={saved}
      aria-busy={pending}
      disabled={status !== "authenticated" || loading || pending}
      onClick={() => { void toggle(nftId) }}
    >
      {content}
    </Button>
  )
}
