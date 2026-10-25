import axios from "axios";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { createSimulationApi } from "./simulation-api";

const endpoint = "https://kurio.test/api/simulation"
const server = setupServer()
const api = createSimulationApi(axios.create({ baseURL: "https://kurio.test/api" }))

const summary = { scenario: "default", epoch: "world-1", nftCount: 36 }
const nftUpdate = { nftId: "nft/one ?#", editionId: "edition-50", unitPrice: "1.49", available: 49 }

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => { server.close() })

describe("simulation HTTP API", () => {
  it("loads the current scenario and catalog size", async () => {
    server.use(http.get(endpoint, () => HttpResponse.json({ ...summary, internal: "discard" })))
    expect(await api.get(new AbortController().signal)).toEqual(summary)
  })

  it.each(
    ["setScenario", "reset"] as const
  )("%s sends the selected scenario and returns the server summary", async (operation) => {
    let body: unknown
    const path = operation === "setScenario" ? "/scenario" : "/reset"

    server.use(http.post(endpoint + path, async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ scenario: "empty", epoch: "world-2", nftCount: 0 })
    }))

    expect(await api[operation]("empty")).toEqual({ scenario: "empty", epoch: "world-2", nftCount: 0 })
    expect(body).toEqual({ scenario: "empty" })
  })

  it("expires the session through the server", async () => {
    let body: unknown
    server.use(http.post(endpoint + "/session/expire", async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ expired: true })
    }))

    await expect(api.expireSession()).resolves.toBeUndefined()
    expect(body).toEqual({})
  })

  it("updates the selected NFT edition and escapes its identifier", async () => {
    let body: unknown
    let pathname = ""
    server.use(http.patch(endpoint + "/nfts/:nftId", async ({ request }) => {
      body = await request.json()
      pathname = new URL(request.url).pathname
      return HttpResponse.json({ id: "nft/one ?#", version: 2 })
    }))

    await expect(api.updateNft(nftUpdate)).resolves.toBeUndefined()
    expect(pathname).toBe("/api/simulation/nfts/nft%2Fone%20%3F%23")
    expect(body).toEqual({ editionId: "edition-50", unitPrice: "1.49", available: 49 })
  })

  it.each([
    ["confirmed", "confirmed"], ["rejected", "rejected"],
    ["confirmed", "pending"], ["rejected", "confirmed"],
  ] as const)("requests %s and preserves the order's %s result", async (requested, returned) => {
    let body: unknown
    let pathname = ""
    server.use(http.post(endpoint + "/orders/:orderId/resolve", async ({ request }) => {
      body = await request.json()
      pathname = new URL(request.url).pathname
      return HttpResponse.json({ id: "order/one ?#", status: returned })
    }))

    expect(await api.resolveOrder("order/one ?#", requested)).toEqual({ id: "order/one ?#", status: returned })
    expect(pathname).toBe("/api/simulation/orders/order%2Fone%20%3F%23/resolve")
    expect(body).toEqual({ status: requested })
  })

  it.each([
    { name: "unsupported scenario", path: "", response: { ...summary, scenario: "unknown" }, run: () => api.get(new AbortController().signal) },
    { name: "empty epoch", path: "", response: { ...summary, epoch: "" }, run: () => api.get(new AbortController().signal) },
    { name: "negative count", path: "", response: { ...summary, nftCount: -1 }, run: () => api.get(new AbortController().signal) },
    { name: "fractional count", path: "", response: { ...summary, nftCount: 1.5 }, run: () => api.get(new AbortController().signal) },
    { name: "scenario change", path: "/scenario", response: {}, run: () => api.setScenario("default") },
    { name: "reset", path: "/reset", response: {}, run: () => api.reset("default") },
    { name: "session expiration", path: "/session/expire", response: { expired: false }, run: () => api.expireSession() },
    { name: "NFT version", path: "/nfts/:nftId", response: { id: "nft-1", version: 0 }, run: () => api.updateNft(nftUpdate) },
    { name: "order status", path: "/orders/:orderId/resolve", response: { id: "order-1", status: "unknown" }, run: () => api.resolveOrder("order-1", "confirmed") },
  ])("rejects an invalid $name response", async ({ path, response, run }) => {
    server.use(http.all(endpoint + path, () => HttpResponse.json(response)))

    await expect(run()).rejects.toBeInstanceOf(ZodError)
  })

  it("propagates server failures instead of reporting a successful change", async () => {
    server.use(http.post(endpoint + "/scenario", () => HttpResponse.json({
      code: "SIMULATION_UNAVAILABLE",
    }, { status: 503 })))

    await expect(api.setScenario("default")).rejects.toMatchObject({
      response: { status: 503, data: { code: "SIMULATION_UNAVAILABLE" } },
    })
  })

  it("cancels an in-flight summary read when its signal is aborted", async () => {
    let requestStarted: () => void = () => undefined
    const started = new Promise<void>((resolve) => { requestStarted = resolve })

    server.use(http.get(endpoint, async ({ request }) => {
      requestStarted()
      await new Promise<void>((resolve) => {
        request.signal.addEventListener("abort", () => { resolve() }, { once: true })
      })
      return HttpResponse.json(summary)
    }))

    const controller = new AbortController()
    const pending = api.get(controller.signal)
    const rejection = expect(pending).rejects.toMatchObject({ code: "ERR_CANCELED" })

    await started
    controller.abort()
    await rejection
  })
})
