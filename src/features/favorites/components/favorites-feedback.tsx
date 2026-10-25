import { Button } from "../../../shared/ui/button";
import { useFavorites } from "../hooks/favorites-context";

export function FavoritesFeedback () {
  const { error, retry } = useFavorites()
  if (!error) return null

  return (
    <div role="alert" className="fixed right-6 bottom-36 left-6 z-50 mx-auto flex max-w-140 flex-wrap items-center justify-between gap-3 rounded-control border border-border bg-card p-4 desktop:bottom-6 desktop:left-auto">
      <p>{error.message}</p>
      <Button variant="outline" onClick={retry}>Tentar novamente</Button>
    </div>
  )
}
