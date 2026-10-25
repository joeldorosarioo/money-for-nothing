import { describe, expect, it } from "vitest";

import { normalizeCatalogSearch } from "./catalog-search";

describe("catalog search normalization", () => {
  it("preserves combined filters and a requested page", () => {
    expect(normalizeCatalogSearch({
      q: "  Emerald  ",
      categories: ["digital-art", "photography", "digital-art"],
      networks: ["polygon", "ethereum"],
      minPrice: "0.1",
      maxPrice: "2",
      sort: "price-asc",
      page: 2,
    })).toEqual({
      q: "Emerald",
      categories: ["digital-art", "photography"],
      networks: ["ethereum", "polygon"],
      minPrice: "0.1",
      maxPrice: "2",
      sort: "price-asc",
      page: 2,
    })
  })

  it("discards invalid query values instead of propagating them to the API", () => {
    expect(normalizeCatalogSearch({
      q: ["unexpected"],
      categories: 12,
      networks: ["unknown"],
      minPrice: "-1",
      maxPrice: "NaN",
      sort: "invalid",
      page: -2,
    })).toEqual({
      q: "",
      categories: [],
      networks: [],
      minPrice: "",
      maxPrice: "",
      sort: "recent",
      page: 1,
    })
  })

  it("swaps an inverted valid price range", () => {
    const result = normalizeCatalogSearch({ minPrice: "2", maxPrice: "0.1" })

    expect(result.minPrice).toBe("0.1")
    expect(result.maxPrice).toBe("2")
  })

  it("rejects fractional and unbounded page numbers", () => {
    expect(normalizeCatalogSearch({ page: 1.5 }).page).toBe(1)
    expect(normalizeCatalogSearch({ page: Number.MAX_SAFE_INTEGER + 1 }).page).toBe(1)
  })
})
