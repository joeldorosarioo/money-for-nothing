import axios from "axios";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { createFavoritesApi } from "./favorites-api";

const baseUrl = "https://kurio.test/api/favorites"
const server = setupServer()
const api = createFavoritesApi(axios.create({ baseURL: "https://kurio.test/api" }))

beforeAll(() => { server.listen({ onUnhandledRequest: "error" }) })
afterEach(() => { server.resetHandlers() })
afterAll(() => { server.close() })

describe("favorites HTTP API", () => {
  it.each(
    [{ nftIds: [] }, { nftIds: ["emerald", "violet"] }]
  )("returns favorite IDs directly from $nftIds", async ({ nftIds }) => {
    server.use(http.get(baseUrl, () => HttpResponse.json({ nftIds })))
    await expect(api.list(new AbortController().signal)).resolves.toEqual(nftIds)
  })

  it.each([true, false])("sends active=%s with the NFT ID encoded as one path segment", async (active) => {
    let pathname: string | undefined
    let body: unknown

    server.use(http.put(baseUrl + "/:nftId", async ({ request }) => {
      pathname = new URL(request.url).pathname
      body = await request.json()
      return HttpResponse.json({ nftIds: active ? ["collection/item #042?"] : [] })
    }))

    const nftIds = await api.set("collection/item #042?", active)

    expect(pathname).toBe("/api/favorites/collection%2Fitem%20%23042%3F")
    expect(body).toEqual({ active })
    expect(nftIds).toEqual(active ? ["collection/item #042?"] : [])
  })

  it.each(["list", "set"] as const)("rejects a malformed %s response", async (method) => {
    const malformed = () => HttpResponse.json({ nftIds: [""] })
    server.use(http.get(baseUrl, malformed), http.put(baseUrl + "/:nftId", malformed))

    const result = method === "list" ? api.list(new AbortController().signal) : api.set("emerald", true)
    await expect(result).rejects.toBeInstanceOf(ZodError)
  })

  it.each(["list", "set"] as const)("propagates an unsuccessful %s request", async (method) => {
    const unavailable = () => HttpResponse.json({ code: "UNAVAILABLE" }, { status: 503 })
    server.use(http.get(baseUrl, unavailable), http.put(baseUrl + "/:nftId", unavailable))

    const result = method === "list" ? api.list(new AbortController().signal) : api.set("emerald", true)
    await expect(result).rejects.toMatchObject({ response: { status: 503, data: { code: "UNAVAILABLE" } } })
  })

  it("cancels an in-flight list request when its signal is aborted", async () => {
    let requestStarted: () => void = () => undefined
    const started = new Promise<void>((resolve) => { requestStarted = resolve })

    server.use(http.get(baseUrl, async ({ request }) => {
      requestStarted()

      await new Promise<void>((resolve) => {
        request.signal.addEventListener("abort", () => { resolve() }, { once: true })
      })

      return HttpResponse.json({ nftIds: [] })
    }))

    const controller = new AbortController()
    const result = api.list(controller.signal)
    const rejection = expect(result).rejects.toMatchObject({ code: "ERR_CANCELED" })

    await started
    controller.abort()
    await rejection
  })
})
