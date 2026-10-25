import "fake-indexeddb/auto";

import axios from "axios";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createHandlers, resetSimulation } from "./handlers";

const server = setupServer(...createHandlers("checkout-integration"))
const api = axios.create({ baseURL: "https://kurio.test/api", validateStatus: () => true })
const idSchema = z.object({ id: z.string() })
const cartSchema = z.object({ items: z.array(z.object({ id: z.string(), quantity: z.number() })) })

beforeAll(() => { server.listen({ onUnhandledRequest: "error" }) })
afterAll(() => { server.close() })
beforeEach(async () => { await resetSimulation("checkout-integration", "default") })
afterEach(() => { vi.useRealTimers() })

async function preparePurchase () {
  const login = await api.post<unknown>("/auth/login", { email: "collector@kurio.test", password: "Kurio2026!" })

  const { token } = z.object({ token: z.string() }).parse(login.data)

  const headers = { Authorization: "Bearer " + token }
  await api.post("/cart/items", { nftId: "emerald-ape-042", editionId: "edition-50", quantity: 2 }, { headers })

  const wallets = await api.get<unknown>("/wallets", { headers })
  const { items } = z.object({ items: z.array(idSchema) }).parse(wallets.data)

  const connection = await api.post<unknown>("/wallets/connect", {
    walletId: items[0]?.id,
    provider: "metamask",
  }, { headers })

  const quote = await api.post<unknown>("/checkout/quotes", { network: "ethereum" }, { headers })

  expect(connection.status).toBe(200)
  expect(quote.status).toBe(200)

  return {
    headers,

    body: {
      quoteId: idSchema.parse(quote.data).id,
      walletConnectionId: idSchema.parse(connection.data).id,

      collector: {
        displayName: "Alex Morgan",
        username: "collector",
        email: "collector@kurio.test",
        ens: "collector.eth",
        referralCode: "KURIO",
        notes: "",
      },
    },
  }
}

async function createOrder () {
  const purchase = await preparePurchase()
  const headers = { ...purchase.headers, "Idempotency-Key": "attempt-original" }
  const response = await api.post<unknown>("/orders", purchase.body, { headers })

  expect(response.status).toBe(201)

  return {
    ...purchase,
    orderId: idSchema.parse(response.data).id,
    orderHeaders: headers,
    response
  }
}

describe("authoritative checkout and order lifecycle", () => {
  it("quotes the persisted cart with exact totals and an approved coupon", async () => {
    const purchase = await preparePurchase()

    const response = await api.post<unknown>("/checkout/quotes", {
      network: "ethereum",
      coupon: " kurio10 ",
    }, { headers: purchase.headers })

    expect(response.status).toBe(200)

    expect(response.data).toMatchObject({
      coupon: "KURIO10",

      totals: {
        subtotal: "2.38",
        discount: "0.238",
        networkFee: "0.016",
        total: "2.158"
      },
    })
  })

  it.each(["UNKNOWN", "EXPIRED"])("rejects the coupon %s without silently charging full price", async (coupon) => {
    const purchase = await preparePurchase()

    const response = await api.post<unknown>("/checkout/quotes", {
      network: "ethereum",
      coupon,
    }, { headers: purchase.headers })

    expect(response.status).toBe(422)
    expect(response.data).toMatchObject({ code: coupon === "EXPIRED" ? "COUPON_EXPIRED" : "COUPON_INVALID" })
  })

  it("requires authentication to create an order", async () => {
    const purchase = await preparePurchase()

    const response = await api.post("/orders", purchase.body, {
      headers: {
        "Idempotency-Key": "attempt-guest",
        "X-Visitor-Id": "visitor-checkout"
      },
    })

    expect(response.status).toBe(401)
  })

  it("recovers the same pending order for the same idempotency key", async () => {
    const purchase = await createOrder()
    const replay = await api.post<unknown>("/orders", purchase.body, { headers: purchase.orderHeaders })
    const recovered = await api.get<unknown>("/orders/" + purchase.orderId, { headers: purchase.headers })

    expect(purchase.response.data).toMatchObject({ status: "pending" })
    expect(replay.status).toBe(200)
    expect(replay.data).toEqual(recovered.data)
  })

  it("reports a conflict when a key is reused with different input", async () => {
    const purchase = await createOrder()

    const response = await api.post("/orders", {
      ...purchase.body, collector: { ...purchase.body.collector, notes: "Different input" },
    }, { headers: purchase.orderHeaders })

    expect(response.status).toBe(409)
    expect(response.data).toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  })

  it("requires a new quote after the edition price changes", async () => {
    const purchase = await preparePurchase()

    await api.patch("/simulation/nfts/emerald-ape-042", { editionId: "edition-50", unitPrice: "1.49" })

    const response = await api.post("/orders", purchase.body, {
      headers: { ...purchase.headers, "Idempotency-Key": "attempt-changed" },
    })

    expect(response.status).toBe(409)
    expect(response.data).toMatchObject({ code: "QUOTE_CHANGED" })
  })

  it("rejects an expired quote before creating any order", async () => {
    const purchase = await preparePurchase()

    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(Date.now() + 61_000)

    const response = await api.post("/orders", purchase.body, {
      headers: { ...purchase.headers, "Idempotency-Key": "attempt-expired" },
    })

    expect(response.status).toBe(409)
    expect(response.data).toMatchObject({ code: "QUOTE_EXPIRED" })
  })

  it("does not accept another attempt key while the cart already has a pending order", async () => {
    const purchase = await createOrder()
    const response = await api.post("/orders", purchase.body, {
      headers: { ...purchase.headers, "Idempotency-Key": "attempt-another" },
    })

    expect(response.status).toBe(409)
    expect(response.data).toMatchObject({ code: "ORDER_IN_PROGRESS", details: { orderId: purchase.orderId } })
  })

  it("consumes only purchased quantities after confirmation and keeps the immutable receipt", async () => {
    const purchase = await createOrder()

    await api.post("/cart/items", { nftId: "emerald-ape-042", editionId: "edition-50", quantity: 1 }, {
      headers: purchase.headers,
    })
    await api.post("/simulation/orders/" + purchase.orderId + "/resolve", { status: "confirmed" })

    const remaining = await api.get<unknown>("/cart", { headers: purchase.headers })
    const receipt = await api.get<unknown>("/orders/" + purchase.orderId, { headers: purchase.headers })

    expect(cartSchema.parse(remaining.data).items.map((item) => item.quantity)).toEqual([1])
    expect(receipt.data).toMatchObject({
      status: "confirmed", snapshot: { totals: { total: "2.396" }, items: [{ unitPrice: "1.19", quantity: 2 }] },
    })

    await api.patch("/simulation/nfts/emerald-ape-042", { editionId: "edition-50", unitPrice: "5" })

    const recovered = await api.get<unknown>("/orders/" + purchase.orderId, { headers: purchase.headers })

    expect(recovered.data).toEqual(receipt.data)
  })

  it("preserves the cart and releases stock when payment is rejected", async () => {
    const purchase = await createOrder()

    await api.post("/simulation/orders/" + purchase.orderId + "/resolve", { status: "rejected" })

    const remaining = await api.get<unknown>("/cart", { headers: purchase.headers })
    const nft = await api.get<unknown>("/nfts/emerald-ape-042")

    expect(cartSchema.parse(remaining.data).items.map((item) => item.quantity)).toEqual([2])
    expect(nft.data).toMatchObject({ editions: [{ id: "edition-50", available: 50 }, {}, {}] })
  })

  it("prevents another account from reading a private order", async () => {
    const purchase = await createOrder()
    const login = await api.post<unknown>("/auth/login", { email: "nova@kurio.test", password: "Kurio2026!" })

    const { token } = z.object({ token: z.string() }).parse(login.data)

    const response = await api.get("/orders/" + purchase.orderId, { headers: { Authorization: "Bearer " + token } })

    expect(response.status).toBe(403)
  })

  it("recovers the existing order after the first response times out", async () => {
    await resetSimulation("checkout-integration", "timeout-after-order")

    const purchase = await preparePurchase()
    const headers = { ...purchase.headers, "Idempotency-Key": "attempt-timeout" }

    await expect(api.post("/orders", purchase.body, { headers, timeout: 50 })).rejects.toMatchObject({
      code: "ECONNABORTED",
    })

    const replay = await api.post<unknown>("/orders", purchase.body, { headers })

    expect(replay.status).toBe(200)
    expect(replay.data).toMatchObject({ status: "pending" })
  })

  it("requires confirmation again when availability changes even if enough units remain", async () => {
    const purchase = await preparePurchase()

    await api.patch("/simulation/nfts/emerald-ape-042", { editionId: "edition-50", available: 49 })

    const response = await api.post("/orders", purchase.body, {
      headers: { ...purchase.headers, "Idempotency-Key": "attempt-stock-change" },
    })

    expect(response.status).toBe(409)
    expect(response.data).toMatchObject({ code: "QUOTE_CHANGED" })
  })

  it("returns a hexadecimal transaction reference after confirmation", async () => {
    const purchase = await createOrder()

    await api.post("/simulation/orders/" + purchase.orderId + "/resolve", { status: "confirmed" })

    const response = await api.get<unknown>("/orders/" + purchase.orderId, { headers: purchase.headers })
    const receipt = z.object({ transactionReference: z.string() }).parse(response.data)

    expect(receipt.transactionReference).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it("recovers a successful attempt after its quote expires without consuming the cart twice", async () => {
    const purchase = await createOrder()

    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(Date.now() + 61_000)

    const recovered = await api.post<unknown>("/orders", purchase.body, { headers: purchase.orderHeaders })
    const again = await api.post<unknown>("/orders", purchase.body, { headers: purchase.orderHeaders })
    const cart = await api.get<unknown>("/cart", { headers: purchase.headers })

    expect(recovered.status).toBe(200)
    expect(recovered.data).toMatchObject({ id: purchase.orderId, status: "confirmed" })
    expect(again.data).toEqual(recovered.data)
    expect(cartSchema.parse(cart.data).items).toEqual([])
  })

  it("creates only one reservation for concurrent copies of the same attempt", async () => {
    const purchase = await preparePurchase()
    const headers = { ...purchase.headers, "Idempotency-Key": "attempt-concurrent" }
    const responses = await Promise.all([
      api.post<unknown>("/orders", purchase.body, { headers }),
      api.post<unknown>("/orders", purchase.body, { headers }),
    ])

    expect(responses.map((response) => response.status).sort()).toEqual([200, 201])
    expect(new Set(responses.map((response) => idSchema.parse(response.data).id)).size).toBe(1)

    const nft = await api.get<unknown>("/nfts/emerald-ape-042")

    expect(nft.data).toMatchObject({ editions: [{ available: 48 }, {}, {}] })
  })
})
