import { describe, expect, it } from "vitest";

import { type Order, type OrderInput } from "../types/order";
import { createPurchaseService, type PurchaseAttempt } from "./purchase-service";

const input: OrderInput = {
  quoteId: "quote-original",
  walletConnectionId: "connection-original",

  collector: {
    displayName: "Alex Morgan",
    username: "alex",
    email: "collector@kurio.test",
    ens: "alex.eth",
    referralCode: "KURIO",
    notes: ""
  },
}

const order: Order = {
  id: "order-1",
  ownerId: "collector",
  version: 1,
  createdAt: 1,
  idempotencyKey: "attempt-original",
  status: "pending",
  transactionReference: null,
  reason: null,
  confirmedAt: null,

  snapshot: {
    items: [],

    totals: {
      subtotal: "1",
      discount: "0",
      networkFee: "0.016",
      total: "1.016"
    },

    network: "ethereum",
    walletAddress: "0x123",
    collectorName: "Alex",
    collectorEmail: "collector@kurio.test",
  },
}

function setup (submitOrder: (input: OrderInput, key: string) => Promise<Order>, initial: PurchaseAttempt | null = null) {
  const records = new Map<string, PurchaseAttempt>()
  if (initial) records.set(initial.ownerId, initial)

  const dependencies = {
    submitOrder,
    getOrder: () => Promise.resolve(order),

    persistence: {
      read: (ownerId: string) => records.get(ownerId) ?? null,

      write: (ownerId: string, attempt: PurchaseAttempt | null) => {
        if (attempt) records.set(ownerId, attempt)
        else records.delete(ownerId)
      },
    },

    createId: () => "attempt-original",
    isDefinitiveFailure: (error: unknown) => error instanceof RangeError,
  }

  return { dependencies, records, service: createPurchaseService(dependencies) }
}

describe("recoverable purchases", () => {
  it("persists the exact payload and key before sending an order", async () => {
    let savedBeforeRequest: PurchaseAttempt | undefined

    const context = setup(() => {
      savedBeforeRequest = context.records.get("collector")
      return Promise.resolve(order)
    })

    await context.service.submit("collector", input)
    expect(savedBeforeRequest).toEqual({ ownerId: "collector", key: "attempt-original", input, orderId: null })
    expect(context.records.get("collector")?.orderId).toBe("order-1")
  })

  it("retries an ambiguous timeout with the original quote, connection and key after reload", async () => {
    const sent: { input: OrderInput; key: string }[] = []

    const context = setup((payload, key) => {
      sent.push({ input: payload, key })
      return Promise.reject(new Error("Response lost after acceptance"))
    })

    await expect(context.service.submit("collector", input)).rejects.toThrow("Response lost")

    const reloaded = createPurchaseService({
      ...context.dependencies,

      submitOrder: (payload: OrderInput, key: string) => {
        sent.push({ input: payload, key })
        return Promise.resolve(order)
      },

      createId: () => "must-not-be-used",
    })

    expect(await reloaded.recover("collector")).toEqual(order)
    expect(sent).toEqual([{ input, key: "attempt-original" }, { input, key: "attempt-original" }])
  })

  it("can recover after a transport throws synchronously", async () => {
    let requests = 0

    const context = setup(() => {
      requests += 1
      if (requests === 1) throw new Error("Transport unavailable")
      return Promise.resolve(order)
    })

    await expect(context.service.submit("collector", input)).rejects.toThrow("Transport unavailable")
    await expect(context.service.recover("collector")).resolves.toEqual(order)
  })

  it("coalesces double submission into one order", async () => {
    let requests = 0
    const context = setup(() => { requests += 1; return Promise.resolve(order) })

    const [first, second] = await Promise.all([
      context.service.submit("collector", input), context.service.submit("collector", input),
    ])

    expect(first.id).toBe(second.id)
    expect(requests).toBe(1)
  })

  it("refuses a changed payload until the uncertain attempt is recovered", async () => {
    const context = setup(() => Promise.reject(new Error("Offline")))
    await expect(context.service.submit("collector", input)).rejects.toThrow("Offline")

    await expect(context.service.submit("collector", { ...input, quoteId: "new-quote" }))
      .rejects.toThrow("Recupere")
  })

  it("allows a fresh quote only after a definitive rejection", async () => {
    let fail = true
    const context = setup(() => fail ? Promise.reject(new RangeError("Quote expired")) : Promise.resolve(order))

    await expect(context.service.submit("collector", input)).rejects.toThrow("Quote expired")
    expect(context.records.has("collector")).toBe(false)

    fail = false
    await expect(context.service.submit("collector", { ...input, quoteId: "fresh-quote" })).resolves.toEqual(order)
  })

  it("keeps another account's attempt separate and rejects a mismatched owner response", async () => {
    const context = setup(() => Promise.resolve({ ...order, ownerId: "nova" }))
    await expect(context.service.submit("collector", input)).rejects.toThrow("conta")

    expect(context.service.read("nova")).toBeNull()
    expect(context.service.read("collector")?.orderId).toBeNull()
  })

  it("recovers known orders through GET and clears only a matching terminal attempt", async () => {
    const attempt = { ownerId: "collector", key: "attempt-original", input, orderId: "order-1" }
    const context = setup(() => Promise.reject(new Error("Must not submit again")), attempt)

    await expect(context.service.recover("collector")).resolves.toEqual(order)
    context.service.observe({ ...order, id: "other", status: "rejected", reason: "Declined" })

    expect(context.records.has("collector")).toBe(true)
    context.service.observe({ ...order, status: "rejected", reason: "Declined" })
    expect(context.records.has("collector")).toBe(false)
  })
})
