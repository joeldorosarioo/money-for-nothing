import axios from "axios";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { type CatalogSearch } from "../types/catalog-search";
import { createCatalogApi } from "./catalog-api";

const nft = {
  id: "emerald-ape-042",
  tokenId: "042",
  name: "Emerald Ape",
  image: "/assets/8f387.webp",
  category: "digital-art",
  network: "ethereum",
  creator: "Kurio",
  description: "Digital artwork.",

  editions: [
    {
      id: "limited",
      label: "Limited",
      totalSupply: 10,
      available: 3,
      unitPrice: "1.19"
    }
  ],

  version: 1,
  listedAt: 100,
  popularity: 20,
  previousPrice: null,

  attributes: [
    { name: "Color", value: "Emerald" }
  ],
}

const catalogPage = {
  items: [nft],
  total: 1,
  page: 1,
  pageSize: 9,
  totalPages: 1,

  facets: {
    categories: [
      { id: "digital-art", count: 1 }
    ],

    networks: [
      { id: "ethereum", count: 1 }
    ]
  },
}

const emptySearch: CatalogSearch = {
  q: "",
  categories: [],
  networks: [],
  minPrice: "",
  maxPrice: "",
  sort: "recent",
  page: 1,
}

const server = setupServer();
const catalog = createCatalogApi(axios.create({ baseURL: "https://kurio.test/api" }));

beforeAll(() => { server.listen({ onUnhandledRequest: "error" }) });
afterEach(() => { server.resetHandlers() });
afterAll(() => { server.close() });

describe("catalog HTTP boundary", () => {
  it.each([
    {
      label: "combined filters",

      search: {
        q: "Emerald Ape",
        categories: ["digital-art", "photography"],
        networks: ["ethereum", "polygon"],
        minPrice: "0.02",
        maxPrice: "12.30",
        sort: "price-asc",
        page: 2,
      },

      parameters: {
        q: "Emerald Ape",
        categories: "digital-art,photography",
        networks: "ethereum,polygon",
        minPrice: "0.02",
        maxPrice: "12.30",
        sort: "price-asc",
        page: "2",
      },
    },
    {
      label: "empty filters",
      search: emptySearch,
      parameters: {
        q: "",
        categories: "",
        networks: "",
        minPrice: "",
        maxPrice: "",
        sort: "recent",
        page: "1"
      },
    },
  ] satisfies {
    label: string; search: CatalogSearch; parameters: Record<string, string>
  }[])("serializes $label and returns the validated catalog page", async ({ search, parameters }) => {
    let receivedParameters: Record<string, string> | undefined

    server.use(http.get("https://kurio.test/api/nfts", ({ request }) => {
      receivedParameters = Object.fromEntries(new URL(request.url).searchParams)
      return HttpResponse.json(catalogPage)
    }))

    const result = await catalog.list(search, new AbortController().signal)

    expect(receivedParameters).toEqual(parameters)
    expect(result).toEqual(catalogPage)
  },
  )

  it("encodes an NFT ID as one path segment and returns the validated NFT", async () => {
    let receivedPath: string | undefined

    server.use(http.get("https://kurio.test/api/nfts/:nftId", ({ request }) => {
      receivedPath = new URL(request.url).pathname
      return HttpResponse.json(nft)
    }))

    const result = await catalog.getById("collection/item #042?", new AbortController().signal)

    expect(receivedPath).toBe("/api/nfts/collection%2Fitem%20%23042%3F")
    expect(result).toEqual(nft)
  })

  it.each(["list", "detail"] as const)("rejects an invalid %s response", async (endpoint) => {
    server.use(http.get("https://kurio.test/api/nfts" + (endpoint === "detail" ? "/:nftId" : ""), () => (
      HttpResponse.json(endpoint === "list" ? { ...catalogPage, total: -1 } : { ...nft, network: "unknown" })
    )))

    const signal = new AbortController().signal
    const result = endpoint === "list" ? catalog.list(emptySearch, signal) : catalog.getById(nft.id, signal)

    await expect(result).rejects.toBeInstanceOf(ZodError)
  })

  it.each(["list", "detail"] as const)("propagates a failed %s request", async (endpoint) => {
    server.use(http.get("https://kurio.test/api/nfts" + (endpoint === "detail" ? "/:nftId" : ""), () => (
      HttpResponse.json({ code: "UNAVAILABLE", message: "Catalog unavailable." }, { status: 503 })
    )))

    const signal = new AbortController().signal
    const result = endpoint === "list" ? catalog.list(emptySearch, signal) : catalog.getById(nft.id, signal)

    await expect(result).rejects.toMatchObject({ response: { status: 503 } })
  })

  it.each(["list", "detail"] as const)("cancels a %s request with an aborted signal", async (endpoint) => {
    server.use(http.get("https://kurio.test/api/nfts" + (endpoint === "detail" ? "/:nftId" : ""), () => (
      HttpResponse.json(endpoint === "list" ? catalogPage : nft)
    )))

    const controller = new AbortController()
    controller.abort()

    const result = endpoint === "list"
      ? catalog.list(emptySearch, controller.signal)
      : catalog.getById(nft.id, controller.signal)

    await expect(result).rejects.toMatchObject({ code: "ERR_CANCELED" })
  })
})
