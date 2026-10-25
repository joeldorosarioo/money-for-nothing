import axios from "axios";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { createQuoteApi } from "./quote-api";

const endpoint = "https://kurio.test/api/checkout/quotes"
const server = setupServer()
const api = createQuoteApi(axios.create({ baseURL: "https://kurio.test/api" }))

const item = {
  cartItemId: "line-1",
  nftId: "emerald-ape-042",
  editionId: "edition-50",
  name: "Emerald Ape",
  tokenId: "042",
  image: "/assets/emerald.webp",
  editionLabel: "Limited edition",
  quantity: 2,
  unitPrice: "1.190000000000000001",
  lineTotal: "2.380000000000000002",
  nftVersion: 4,
}

const snapshot = {
  id: "quote-1",
  ownerId: "collector",
  cartId: "cart-1",
  cartVersion: 3,
  network: "polygon",
  coupon: "KURIO10",
  version: 1,
  expiresAt: 1_800_000_060_000,
  items: [item],

  totals: {
    subtotal: "2.380000000000000002",
    discount: "0.238",
    networkFee: "0.016",
    total: "2.158000000000000002",
  },
}

beforeAll(() => { server.listen({ onUnhandledRequest: "error" }) })
afterEach(() => { server.resetHandlers() })
afterAll(() => { server.close() })

describe("quote HTTP API", () => {
  it("requests a quote for the selected network and coupon without losing ETH precision", async () => {
    let body: unknown

    server.use(http.post(endpoint, async ({ request }) => {
      body = await request.json()
      return HttpResponse.json(snapshot)
    }))

    const quote = await api.create("polygon", "KURIO10", new AbortController().signal)

    expect(body).toEqual({ network: "polygon", coupon: "KURIO10" })

    expect(quote).toMatchObject({
      id: "quote-1",
      cartVersion: 3,
      network: "polygon",
      coupon: "KURIO10",

      items: [
        {
          quantity: 2,
          unitPrice: "1.190000000000000001",
          lineTotal: "2.380000000000000002"
        }
      ],

      totals: {
        subtotal: "2.380000000000000002",
        discount: "0.238",
        networkFee: "0.016",
        total: "2.158000000000000002"
      },

      expiresAt: 1_800_000_060_000,
    })
  })

  it.each([
    ["an unsupported network", { ...snapshot, network: "unknown" }],
    ["an invalid ETH unit price", { ...snapshot, items: [{ ...item, unitPrice: "1e3" }] }],
    ["a fractional quantity", { ...snapshot, items: [{ ...item, quantity: 1.5 }] }],
    ["an invalid ETH total", { ...snapshot, totals: { ...snapshot.totals, total: "invalid" } }],
  ])("rejects a quote response with %s", async (_description, invalid) => {
    server.use(http.post(endpoint, () => HttpResponse.json(invalid)))
    await expect(api.create("polygon", "KURIO10", new AbortController().signal)).rejects.toBeInstanceOf(ZodError)
  })

  it("cancels an in-flight quote request when its signal is aborted", async () => {
    let requestStarted: () => void = () => undefined
    const started = new Promise<void>((resolve) => { requestStarted = resolve })

    server.use(http.post(endpoint, async ({ request }) => {
      requestStarted()

      await new Promise<void>((resolve) => {
        request.signal.addEventListener("abort", () => { resolve() }, { once: true })
      })

      return HttpResponse.json(snapshot)
    }))

    const controller = new AbortController()
    const pending = api.create("polygon", "KURIO10", controller.signal)
    const rejection = expect(pending).rejects.toMatchObject({ code: "ERR_CANCELED" })

    await started
    controller.abort()
    await rejection
  })

  it("propagates HTTP errors without returning a quote", async () => {
    server.use(http.post(endpoint, () => HttpResponse.json({
      code: "COUPON_EXPIRED",
      message: "The coupon has expired.",
    }, { status: 422 })))

    await expect(api.create("polygon", "EXPIRED", new AbortController().signal)).rejects.toMatchObject({
      response: { status: 422, data: { code: "COUPON_EXPIRED" } },
    })
  })
})
