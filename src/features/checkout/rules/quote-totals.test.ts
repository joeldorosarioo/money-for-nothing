import { describe, expect, it } from "vitest";

import { calculateQuoteTotals } from "./quote-totals";

describe("quote totals", () => {
  it("combines exact line totals and the network fee", () => {
    expect(calculateQuoteTotals([
      { unitPrice: "1.19", quantity: 2 },
      { unitPrice: "1.39", quantity: 1 },
    ], 0, "0.016")).toEqual({
      subtotal: "3.77",
      discount: "0",
      networkFee: "0.016",
      total: "3.786",
    })
  })

  it("applies the discount to the subtotal before adding the fee", () => {
    expect(calculateQuoteTotals([{ unitPrice: "1.19", quantity: 2 }], 1000, "0.016")).toEqual({
      subtotal: "2.38",
      discount: "0.238",
      networkFee: "0.016",
      total: "2.158",
    })
  })

  it("does not charge a network fee for an empty cart", () => {
    expect(calculateQuoteTotals([], 0, "0.016")).toEqual({
      subtotal: "0",
      discount: "0",
      networkFee: "0",
      total: "0",
    })
  })
})
