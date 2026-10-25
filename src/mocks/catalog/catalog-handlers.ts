import { http, HttpResponse } from "msw";

import { normalizeCatalogSearch } from "../../features/catalog/rules/catalog-search";
import { type CatalogSearch } from "../../features/catalog/types/catalog-search";
import { type Nft } from "../../features/catalog/types/nft";
import { parseEth } from "../../shared/money/eth";
import { ApiError, apiResponse } from "../http/api-error";
import { withState } from "../persistence/state-store";

function lowestPrice (nft: Nft): bigint {
  const prices = nft.editions.map((edition) => parseEth(edition.unitPrice))
  return prices.reduce((lowest, price) => price < lowest ? price : lowest, prices[0] ?? 0n)
}

function matchesSearch (nft: Nft, search: CatalogSearch): boolean {
  const text = (nft.name + " " + nft.tokenId + " " + nft.creator).toLowerCase()

  return text.includes(search.q.toLowerCase())
    && (search.categories.length === 0 || search.categories.includes(nft.category))
    && (search.networks.length === 0 || search.networks.includes(nft.network))
    && (!search.minPrice || lowestPrice(nft) >= parseEth(search.minPrice))
    && (!search.maxPrice || lowestPrice(nft) <= parseEth(search.maxPrice))
}

function compareNfts (first: Nft, second: Nft, sort: CatalogSearch["sort"]): number {
  if (sort === "price-asc" || sort === "price-desc") {
    const difference = lowestPrice(first) - lowestPrice(second)
    const direction = difference === 0n ? 0 : difference > 0n ? 1 : -1

    return (sort === "price-desc" ? -direction : direction) || first.id.localeCompare(second.id)
  }

  return (sort === "popular" ? second.popularity - first.popularity : second.listedAt - first.listedAt)
    || first.id.localeCompare(second.id)
}

function countFacets (nfts: readonly Nft[], field: "category" | "network") {
  const counts = new Map<string, number>()

  for (const nft of nfts) {
    counts.set(nft[field], (counts.get(nft[field]) ?? 0) + 1)
  }

  return Array.from(counts, ([id, count]) => ({ id, count }))
}

export function catalogHandlers (databaseName: string) {
  return [
    http.get("*/api/nfts", ({ request }) => apiResponse(async () => {
      const parameters = new URL(request.url).searchParams
      const search = normalizeCatalogSearch(Object.fromEntries(parameters))

      const result = await withState(databaseName, (state) => {
        const inventory = state.scenario === "empty" ? [] : state.nfts

        const filtered = inventory.filter((nft) => matchesSearch(nft, search))
          .sort((first, second) => compareNfts(first, second, search.sort))

        const pageSize = 9
        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
        const page = Math.min(search.page, totalPages)

        return {
          items: filtered.slice((page - 1) * pageSize, page * pageSize),
          total: filtered.length,
          page,
          pageSize,
          totalPages,

          facets: {
            categories: countFacets(inventory, "category"),
            networks: countFacets(inventory, "network")
          },
        }
      })

      return HttpResponse.json(result)
    })),

    http.get("*/api/nfts/:nftId", ({ params }) => apiResponse(async () => {
      const nft = await withState(databaseName, (state) => state.nfts.find((item) => item.id === params.nftId))
      if (!nft) throw new ApiError(404, "NFT_NOT_FOUND", "Este NFT não foi encontrado.")

      return HttpResponse.json(nft)
    })),
  ]
}
