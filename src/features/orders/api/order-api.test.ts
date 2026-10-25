import axios from "axios";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { ApiClientError } from "../../../shared/http/api-client-error";
import { createOrderApi, isDefinitivePurchaseFailure } from "./order-api";

const endpoint = "https://kurio.test/api/orders"
const server = setupServer()
const api = createOrderApi(axios.create({ baseURL: "https://kurio.test/api" }))

const input = {
  quoteId: "quote-1",
  walletConnectionId: "connection-1",

  collector: {
    displayName: "Alex Morgan",
    username: "alex",
    email: "collector@kurio.test",
    ens: "alex.eth",
    referralCode: "KURIO",
    notes: "",
  },
}

const pending = {
  id: "order-1",
  ownerId: "collector",
  version: 1,
  createdAt: 1_800_000_000_000,
  idempotencyKey: "attempt-original",
  status: "pending",
  transactionReference: null,
  reason: null,
  confirmedAt: null,

  snapshot: {
    network: "ethereum",
    walletAddress: "0x123",
    collectorName: "Alex Morgan",
    collectorEmail: "collector@kurio.test",

    items: [
      {
        cartItemId: "line-1",
        nftId: "emerald",
        editionId: "edition-50",
        name: "Emerald Ape",
        tokenId: "042",
        image: "/assets/emerald.webp",
        editionLabel: "Edition of 50",
        quantity: 1,
        unitPrice: "1.190000000000000001",
        lineTotal: "1.190000000000000001",
        nftVersion: 4,
      }
    ],

    totals: {
      subtotal: "1.190000000000000001",
      discount: "0",
      networkFee: "0.016",
      total: "1.206000000000000001"
    },
  },
}
const confirmed = {
  ...pending,
  status: "confirmed",
  transactionReference: "0xtransaction",
  confirmedAt: 1_800_000_001_000
}

const rejected = { ...pending, status: "rejected", reason: "Declined" }

beforeAll(() => { server.listen({ onUnhandledRequest: "error" }) })
afterEach(() => { server.resetHandlers() })
afterAll(() => { server.close() })

describe("order HTTP API", () => {
  it("submits the purchase payload and idempotency key without losing ETH precision", async () => {
    let body: unknown
    let key: string | null = null

    server.use(http.post(endpoint, async ({ request }) => {
      body = await request.json()
      key = request.headers.get("Idempotency-Key")
      return HttpResponse.json(pending)
    }))

    const order = await api.submit(input, "attempt-original")

    expect(body).toEqual(input)
    expect(key).toBe("attempt-original")

    expect(order).toMatchObject({
      id: "order-1",
      status: "pending",
      transactionReference: null,
      confirmedAt: null,
      snapshot: {
        items: [
          { unitPrice: "1.190000000000000001" }
        ],

        totals: {
          total: "1.206000000000000001"
        }
      },
    })
  })

  it.each([pending, confirmed, rejected])("loads an escaped order ID with $status details", async (response) => {
    let pathname = ""

    server.use(http.get(endpoint + "/:orderId", ({ request }) => {
      pathname = new URL(request.url).pathname
      return HttpResponse.json(response)
    }))

    const order = await api.get("order/one ?#")

    expect(pathname).toBe("/api/orders/order%2Fone%20%3F%23")
    expect(order).toEqual(response)
  })

  it.each([
    ["a pending transaction reference", { ...pending, transactionReference: "0xtransaction" }],
    ["a confirmed order without its timestamp", { ...confirmed, confirmedAt: null }],
    ["a rejected order without a reason", { ...rejected, reason: null }],
    ["an invalid ETH total", {
      ...pending, snapshot: {
        ...pending.snapshot, totals: { ...pending.snapshot.totals, total: "1e3" }
      }
    }],
  ])("rejects a response with %s", async (_description, response) => {
    server.use(http.get(endpoint + "/:orderId", () => HttpResponse.json(response)))
    await expect(api.get("order-1")).rejects.toBeInstanceOf(ZodError)
  })

  it("rejects malformed submission responses", async () => {
    server.use(http.post(endpoint, () => HttpResponse.json({ ...pending, ownerId: "" })))
    await expect(api.submit(input, "attempt-original")).rejects.toBeInstanceOf(ZodError)
  })

  it("cancels an order read when its signal is aborted", async () => {
    let requestStarted: () => void = () => undefined
    const started = new Promise<void>((resolve) => { requestStarted = resolve })

    server.use(http.get(endpoint + "/:orderId", async ({ request }) => {
      requestStarted()

      await new Promise<void>((resolve) => {
        request.signal.addEventListener("abort", () => { resolve() }, { once: true })
      })

      return HttpResponse.json(pending)
    }))

    const controller = new AbortController()
    const request = api.get("order-1", controller.signal)
    const rejection = expect(request).rejects.toMatchObject({ code: "ERR_CANCELED" })

    await started
    controller.abort()
    await rejection
  })

  it("propagates submission conflicts without returning an order", async () => {
    server.use(http.post(endpoint, () => HttpResponse.json({ code: "ORDER_IN_PROGRESS" }, { status: 409 })))

    await expect(api.submit(input, "attempt-original")).rejects.toMatchObject({
      response: { status: 409, data: { code: "ORDER_IN_PROGRESS" } },
    })
  })
})

describe("purchase recovery failure policy", () => {
  it("keeps the attempt when a session expires during recovery", () => {
    expect(isDefinitivePurchaseFailure(new ApiClientError(401, "SESSION_EXPIRED", "Session expired"))).toBe(false)
    expect(isDefinitivePurchaseFailure(new ApiClientError(403, "ORDER_FORBIDDEN", "Forbidden"))).toBe(false)
  })

  it("keeps uncertain timeouts, overloads and unexpected server failures recoverable", () => {
    for (const status of [0, 408, 429, 500, 503]) {
      expect(isDefinitivePurchaseFailure(new ApiClientError(status, "NETWORK_ERROR", "Unavailable"))).toBe(false)
    }
  })

  it("permits a new quote after the server definitively rejects the original before acceptance", () => {
    expect(isDefinitivePurchaseFailure(new ApiClientError(409, "QUOTE_CHANGED", "Changed"))).toBe(true)
    expect(isDefinitivePurchaseFailure(new ApiClientError(409, "QUOTE_EXPIRED", "Expired"))).toBe(true)
  })
})
