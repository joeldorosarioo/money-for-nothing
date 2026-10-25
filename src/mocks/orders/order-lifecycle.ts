import { consumePurchasedItems } from "../../features/cart/rules/cart-rules";
import { type Order } from "../../features/orders/types/order";
import { type SimulationState } from "../persistence/simulation-state";

export interface SimulatedOrder {
  order: Order
  readonly cartId: string
  readonly resolveAt: number
  readonly outcome: "confirmed" | "rejected"
}

function transactionReference (orderId: string): string {
  const encodedId = Array
    .from(new TextEncoder().encode(orderId), (byte) => byte.toString(16).padStart(2, "0"))
    .join("")

  return "0x" + encodedId.padStart(64, "0").slice(-64)
}

function releaseStock (state: SimulationState, order: Order): void {
  for (const item of order.snapshot.items) {
    state.nfts = state.nfts.map((nft) => nft.id === item.nftId ? {
      ...nft,
      version: nft.version + 1,

      editions: nft.editions
        .map((edition) => edition.id === item.editionId ? {
          ...edition,
          available: Math.min(edition.totalSupply, edition.available + item.quantity),
        } : edition),
    } : nft)
  }
}

export function settleOrder (state: SimulationState, record: SimulatedOrder, outcome: "confirmed" | "rejected"): Order {
  if (record.order.status !== "pending") return record.order
  const order = record.order

  if (outcome === "rejected") {
    record.order = {
      ...order,
      status: "rejected",
      version: order.version + 1,
      reason: "O provedor recusou o pagamento. Seus itens continuam no carrinho.",
    }

    releaseStock(state, order)
  } else {
    record.order = {
      ...order,
      status: "confirmed",
      version: order.version + 1,
      transactionReference: transactionReference(order.id),
      confirmedAt: Date.now(),
    }

    const cart = state.carts[order.ownerId]

    if (cart?.id === record.cartId) {
      state.carts[order.ownerId] = {
        ...cart,
        version: cart.version + 1,
        items: consumePurchasedItems(cart.items, order.snapshot.items),
      }
    }
  }

  return record.order
}

export function advanceOrders (state: SimulationState): void {
  for (const record of Object.values(state.orders)) {
    if (record.order.status === "pending" && record.resolveAt <= Date.now()) {
      settleOrder(state, record, record.outcome)
    }
  }
}
