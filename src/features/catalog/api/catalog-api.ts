import { type AxiosInstance } from "axios";
import { z } from "zod";

import { ethSchema } from "../../../shared/http/eth-schema";
import { type CatalogSearch } from "../types/catalog-search";

const nftSchema = z.object({
  id: z.string(),
  tokenId: z.string(),
  name: z.string(),
  image: z.string(),
  category: z.string(),
  network: z.enum(["ethereum", "polygon", "solana"]),
  creator: z.string(),
  description: z.string(),

  editions: z.array(z.object({
    id: z.string(),
    label: z.string(),
    totalSupply: z.number().int().min(0),
    available: z.number().int().min(0),
    unitPrice: ethSchema,
  })).min(1),

  version: z.number().int().min(1),
  listedAt: z.number(),
  popularity: z.number(),
  previousPrice: ethSchema.nullable(),
  attributes: z.array(z.object({ name: z.string(), value: z.string() })),
})

const facetSchema = z.array(z.object({ id: z.string(), count: z.number().int().min(0) }))

const catalogPageSchema = z.object({
  items: z.array(nftSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalPages: z.number().int().min(1),
  facets: z.object({ categories: facetSchema, networks: facetSchema }),
})

export type CatalogPage = z.infer<typeof catalogPageSchema>
export type CatalogApi = ReturnType<typeof createCatalogApi>

export function createCatalogApi (client: AxiosInstance) {
  return {
    async list (search: CatalogSearch, signal: AbortSignal) {
      const response = await client.get<unknown>("/nfts", {
        signal,

        params: {
          ...search,
          categories: search.categories.join(","),
          networks: search.networks.join(","),
        },
      })

      return catalogPageSchema.parse(response.data)
    },

    async getById (id: string, signal: AbortSignal) {
      const response = await client.get<unknown>("/nfts/" + encodeURIComponent(id), { signal })
      return nftSchema.parse(response.data)
    },
  }
}
