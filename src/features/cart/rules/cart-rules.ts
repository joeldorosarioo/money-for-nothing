import { type CartAdjustment, type CartItem, type PurchasedItem } from "../types/cart";

export function mergeCartItems (
  current: readonly CartItem[],
  guest: readonly CartItem[],
  availability: (nftId: string, editionId: string) => number,
  createId: () => string,
): { items: CartItem[]; adjustments: CartAdjustment[] } {
  const items = current.map((item) => ({ ...item }));
  const adjustments: CartAdjustment[] = []

  for (const guestItem of guest) {
    const existingIndex = items
      .findIndex((item) => item.nftId === guestItem.nftId && item.editionId === guestItem.editionId);

    const existingItem = items[existingIndex]
    const requested = (existingItem?.quantity ?? 0) + guestItem.quantity
    const available = availability(guestItem.nftId, guestItem.editionId);
    const quantity = Math.min(requested, available);

    if (quantity < requested) {
      adjustments.push({
        nftId: guestItem.nftId,
        editionId: guestItem.editionId,
        requested,
        available
      });
    }

    if (quantity === 0) continue

    const merged = {
      ...guestItem, id: existingItem?.id ?? createId(), quantity
    }

    if (existingIndex < 0) {
      items.push(merged)
    } else {
      items[existingIndex] = merged
    }
  }

  return { items, adjustments }
}

export function consumePurchasedItems (current: readonly CartItem[], purchased: readonly PurchasedItem[]): CartItem[] {
  const purchasedQuantities = new Map(purchased.map((item) => [item.cartItemId, item.quantity]));

  return current.flatMap((item) => {
    const quantity = Math.max(0, item.quantity - (purchasedQuantities.get(item.id) ?? 0));
    return quantity > 0 ? [{ ...item, quantity }] : []
  });
}
