import { useQuery } from "@tanstack/react-query";

import { type CatalogApi } from "../api/catalog-api";
import { normalizeCatalogSearch } from "../rules/catalog-search";
import { NftCard } from "./nft-card";

export function RelatedNfts ({ catalog, title, presentation = "detail" }: {
  readonly catalog: CatalogApi
  readonly title: string
  readonly presentation?: "detail" | "cart"
}) {
  const result = useQuery({
    queryKey: ["catalog", "related"],
    queryFn: ({ signal }) => catalog.list(normalizeCatalogSearch({}), signal),
  })

  const items = result.data?.items.filter((nft) => [
    "cosmic-bloom-118",
    "violet-nomad-314",
    "ivory-baron-088",
    "golden-beat-207",
    "golden-signal-160",
  ].includes(nft.id)) ?? []

  if (items.length === 0) return null

  return (
    <section className="mt-24 hidden desktop:block">
      <h2 className="mb-8 border-b border-border pb-1.75 text-base leading-5 font-bold text-accent">{title}</h2>

      <div className="grid grid-cols-5 gap-6.5 wide:grid-cols-[219px_220px_repeat(3,219px)]">
        {items.map((nft, index) => (
          <NftCard
            nft={nft}
            key={nft.id}
            index={index}
            presentation={presentation === "cart" ? "cart-related" : "related"}
          />
        ))}
      </div>

      <div className="mt-8 flex h-3 justify-center gap-2 [&_i]:size-3 [&_i]:rounded-full [&_i]:border [&_i]:border-primary [&_i:nth-child(2)]:bg-primary" aria-hidden="true">
        <i /><i /><i />
      </div>
    </section>
  )
}
