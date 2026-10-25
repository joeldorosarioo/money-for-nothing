import { describe, expect, it } from "vitest";

import { type CartItem } from "../types/cart";
import { consumePurchasedItems, mergeCartItems } from "./cart-rules";

const existing: readonly CartItem[] = [
  { id: "line-a", nftId: "emerald", editionId: "edition-50", quantity: 2 },
]

describe("cart rules", () => {
  it("combines matching editions and reports quantities limited by stock", () => {
    const guest: readonly CartItem[] = [
      { id: "guest-a", nftId: "emerald", editionId: "edition-50", quantity: 3 },
      { id: "guest-b", nftId: "violet", editionId: "edition-1", quantity: 2 },
    ]

    const result = mergeCartItems(existing, guest, () => 4, () => "new-line");

    expect(result.items).toEqual([
      { id: "line-a", nftId: "emerald", editionId: "edition-50", quantity: 4 },
      { id: "new-line", nftId: "violet", editionId: "edition-1", quantity: 2 },
    ])

    expect(result.adjustments).toEqual([
      { nftId: "emerald", editionId: "edition-50", requested: 5, available: 4 },
    ])

    expect(existing[0]?.quantity).toBe(2);
  });

  it("keeps editions of the same NFT separate", () => {
    const result = mergeCartItems(existing, [
      { id: "guest-b", nftId: "emerald", editionId: "edition-10", quantity: 1 }
    ], () => 10, () => "new-line");

    expect(result.items).toHaveLength(2);
    expect(result.items[1]?.editionId).toBe("edition-10");
  });

  it("omits a sold-out guest item while explaining the adjustment", () => {
    const result = mergeCartItems([], [
      { id: "guest-b", nftId: "violet", editionId: "edition-1", quantity: 1 }
    ], () => 0, () => "new-line");

    expect(result.items).toEqual([]);

    expect(result.adjustments).toEqual([
      { nftId: "violet", editionId: "edition-1", requested: 1, available: 0 }
    ]);
  });

  it("removes only purchased quantities and preserves later additions", () => {
    const current: readonly CartItem[] = [
      { id: "line-a", nftId: "emerald", editionId: "edition-50", quantity: 5 },
      { id: "new-line", nftId: "violet", editionId: "edition-1", quantity: 1 },
    ]

    expect(consumePurchasedItems(current, [
      { cartItemId: "line-a", quantity: 2 }
    ])).toEqual([
      { id: "line-a", nftId: "emerald", editionId: "edition-50", quantity: 3 },
      { id: "new-line", nftId: "violet", editionId: "edition-1", quantity: 1 },
    ]);
  });

  it("preserves an item removed and added again with a new line identity", () => {
    const current = [{ id: "replacement", nftId: "emerald", editionId: "edition-50", quantity: 1 }]

    expect(consumePurchasedItems(current, [
      { cartItemId: "line-a", quantity: 2 }
    ])).toEqual(current);
  });

  it("removes fully purchased lines", () => {
    expect(consumePurchasedItems(existing, [
      { cartItemId: "line-a", quantity: 2 }
    ])).toEqual([]);
  });
});
