import { parseEth } from "../../../shared/money/eth";
import { networks } from "../../../shared/types/network";

import { type CatalogSearch, type CatalogSort } from "../types/catalog-search";

function stringList (value: unknown): string[] {
  if (typeof value === "string") {
    return value.split(",").map((entry) => entry.trim()).filter(Boolean);
  }

  if (!Array.isArray(value)) return []

  return value.filter((entry: unknown): entry is string => typeof entry === "string");
}

function validPrice (value: unknown): string {
  if (typeof value !== "string" || value === "") return ""

  try {
    parseEth(value);
    return value
  } catch {
    return ""
  }
}

function validSort (value: unknown): CatalogSort {
  switch (value) {
    case "price-asc":
    case "price-desc":
    case "popular":
      return value
    default:
      return "recent"
  }
}

export function normalizeCatalogSearch (input: Readonly<Record<string, unknown>>): CatalogSearch {
  let minPrice = validPrice(input.minPrice);
  let maxPrice = validPrice(input.maxPrice);

  if (minPrice && maxPrice && parseEth(minPrice) > parseEth(maxPrice)) {
    const previousMinimum = minPrice

    minPrice = maxPrice
    maxPrice = previousMinimum
  }

  const selectedNetworks = stringList(input.networks)
  const requestedPage = typeof input.page === "string" ? Number(input.page) : input.page

  const page = typeof requestedPage === "number" && Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1

  return {
    q: typeof input.q === "string" ? input.q.trim().slice(0, 200) : "",
    categories: [...new Set(stringList(input.categories))].sort(),
    networks: networks.filter((network) => selectedNetworks.includes(network)),
    minPrice,
    maxPrice,
    sort: validSort(input.sort),
    page,
  }
}
