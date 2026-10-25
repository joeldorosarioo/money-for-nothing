import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { CatalogSkeleton, EmptyState, ErrorState } from "../../../shared/components/async-state";
import { Button } from "../../../shared/ui/button";
import { useAuth } from "../../auth/index";
import { NftCard, type CatalogApi } from "../../catalog/index";
import { useFavorites } from "../hooks/favorites-context";

export function FavoritesScreen ({ catalog }: { readonly catalog: CatalogApi }) {
  const { scope } = useAuth()

  const favorites = useFavorites()

  const query = useQuery({
    queryKey: ["private", scope, "favorite-nfts", ...[...favorites.nftIds].sort()],
    enabled: !favorites.loading && favorites.nftIds.length > 0,
    queryFn: ({ signal }) => Promise.all(favorites.nftIds.map((id) => catalog.getById(id, signal))),
  })

  return (
    <section className="min-w-0" aria-labelledby="favorites-title">
      <h1 id="favorites-title" className="mb-6 text-2xl font-bold">Lista de interesse</h1>

      {
        favorites.loading
          ? <CatalogSkeleton />
          : favorites.error
            ? <ErrorState error={favorites.error} retry={favorites.retry} />
            : favorites.nftIds.length === 0 ? (
              <EmptyState>
                <h2>Sua lista está vazia</h2>
                <p>Salve os NFTs que você quer acompanhar.</p>

                <Button asChild>
                  <Link to="/">Explorar o catálogo</Link>
                </Button>
              </EmptyState>
            ) : query.isPending
              ? <CatalogSkeleton />
              : query.isError
                ? <ErrorState error={query.error} retry={() => { void query.refetch() }} />
                : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-14 tablet:grid-cols-3 desktop:gap-x-5">
                    {query.data.map((nft, index) => (
                      <NftCard key={nft.id} nft={nft} index={index} presentation="favorites" />
                    ))}
                  </div>
                )
      }
    </section>
  )
}
