import { type Network } from "../../../shared/types/network";

export type CatalogSort = "recent" | "price-asc" | "price-desc" | "popular"

export interface CatalogSearch {
  readonly q: string
  readonly categories: readonly string[]
  readonly networks: readonly Network[]
  readonly minPrice: string
  readonly maxPrice: string
  readonly sort: CatalogSort
  readonly page: number
}
