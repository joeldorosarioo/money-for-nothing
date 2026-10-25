// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { browserPurchasePersistence as persistence } from "./browser-purchase-persistence";

const attempt = {
  ownerId: "collector",
  key: "attempt-original",

  input: {
    quoteId: "quote-original",
    walletConnectionId: "connection-original",

    collector: {
      displayName: "Alex Morgan",
      username: "alex",
      email: "collector@kurio.test",
      ens: "alex.eth",
      referralCode: "KURIO",
      notes: "",
    },
  },

  orderId: null,
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe("browser purchase persistence", () => {
  it("returns no attempt when storage is empty", () => {
    expect(persistence.read("collector")).toBeNull()
  })

  it.each([null, "order-1"])("restores a saved attempt with order %s", (orderId) => {
    localStorage.setItem("kurio.purchase.v1.collector", JSON.stringify({ ...attempt, orderId }))
    expect(persistence.read("collector")).toEqual({ ...attempt, orderId })
  })

  it("stores separate recoverable attempts for each account", () => {
    const otherAttempt = { ...attempt, ownerId: "collector/other", key: "attempt-other", orderId: "order-2" }

    persistence.write("collector", attempt)
    persistence.write("collector/other", otherAttempt)

    expect(persistence.read("collector")).toEqual(attempt)
    expect(persistence.read("collector/other")).toEqual(otherAttempt)
    expect(localStorage.getItem("kurio.purchase.v1.collector%2Fother")).toBe(JSON.stringify(otherAttempt))
  })

  it.each([
    "{", "null", "{}",
    JSON.stringify({ ...attempt, ownerId: "another-account" }),
    JSON.stringify({ ...attempt, key: "bad key!" }),
    JSON.stringify({ ...attempt, orderId: "" }),
    JSON.stringify({ ...attempt, input: { ...attempt.input, quoteId: "" } }),
  ])("ignores a corrupt or invalid stored attempt: %s", (serialized) => {
    localStorage.setItem("kurio.purchase.v1.collector", serialized)
    expect(persistence.read("collector")).toBeNull()
  })

  it("clears only the selected account's attempt", () => {
    const otherAttempt = { ...attempt, ownerId: "another-account" }
    persistence.write("collector", attempt)
    persistence.write("another-account", otherAttempt)
    localStorage.setItem("kurio.visitor.v1", "visitor-id")

    persistence.write("collector", null)

    expect(persistence.read("collector")).toBeNull()
    expect(persistence.read("another-account")).toEqual(otherAttempt)
    expect(localStorage.getItem("kurio.visitor.v1")).toBe("visitor-id")
  })

  it("propagates a failed write so the purchase cannot continue without a recoverable attempt", () => {
    const failure = new DOMException("Storage is full", "QuotaExceededError")

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw failure })
    expect(() => { persistence.write("collector", attempt) }).toThrow(failure)
  })
})
