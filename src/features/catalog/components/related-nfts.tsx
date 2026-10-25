import { useQuery } from "@tanstack/react-query";

import { Carousel } from "../../../shared/ui/carousel";

import { type CatalogApi } from "../api/catalog-api";
import { normalizeCatalogSearch } from "../rules/catalog-search";
import { NftCard } from "./nft-card";

export function RelatedNfts ({ catalog, title, presentation = "detail" }: {
  readonly catalog: CatalogApi
  readonly title: string
  readonly presentation?: "detail" | "cart"
}) {
  const result = useQuery({
    queryKey: ["catalog", "related", "carousel"],
    queryFn: async ({ signal }) => {
      const pages = await Promise.all([1, 2].map(page => catalog.list(normalizeCatalogSearch({ page }), signal)))
      return [...new Map(pages.flatMap(page => page.items).map(nft => [nft.id, nft])).values()]
    },
  })

  const curated = result.data?.filter((nft) => [
    "cosmic-bloom-118",
    "violet-nomad-314",
    "ivory-baron-088",
    "golden-beat-207",
    "golden-signal-160",
  ].includes(nft.id)) ?? []

  const remaining = result.data?.filter(nft => !curated.some(item => item.id === nft.id)) ?? []
  const pages = [remaining.slice(0, 5), curated, remaining.slice(5, 10)].filter(page => page.length > 0)
  const initialPage = curated.length > 0 ? pages.indexOf(curated) : 0

  if (pages.length === 0) return null

  return (
    <section className="mt-24 hidden min-w-0 desktop:block">
      <h2 className="mb-8 border-b border-border pb-1.75 text-base leading-5 font-bold text-accent">{title}</h2>

      <Carousel label={title} initialPage={initialPage}>
        {pages.map((items, page) => (
          <div key={page} className="grid grid-cols-5 gap-6.5 wide:grid-cols-[219px_220px_repeat(3,219px)]">
            {items.map((nft, index) => (
              <NftCard
                nft={nft}
                key={nft.id}
                index={index}
                presentation={presentation === "cart" ? "cart-related" : "related"}
              />
            ))}
          </div>
        ))}
      </Carousel>
    </section>
  )
}
