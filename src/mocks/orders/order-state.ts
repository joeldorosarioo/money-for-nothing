import { type OrderInput, type PendingOrder } from "../../features/orders/types/order";
import { revalidateQuote } from "../checkout/quote-state";
import { ApiError } from "../http/api-error";
import { nextId, type SimulationState } from "../persistence/simulation-state";

export function submitOrder (state: SimulationState, userId: string, key: string, input: OrderInput) {
  const attemptId = userId + ":" + key
  const fingerprint = JSON.stringify(input)
  const previous = state.attempts[attemptId]

  if (previous) {
    if (previous.fingerprint !== fingerprint) {
      throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "Esta tentativa já foi usada com outros dados.")
    }

    const existing = state.orders[previous.orderId]

    if (!existing) {
      throw new ApiError(500, "ORDER_RECOVERY_FAILED", "Não foi possível recuperar a tentativa.")
    }

    return { order: existing.order, created: false }
  }

  const quote = state.quotes[input.quoteId]

  if (!quote || quote.ownerId !== userId) {
    throw new ApiError(403, "QUOTE_FORBIDDEN", "Esta cotação não pertence à sua conta.")
  }

  const pending = Object.values(state.orders).find((record) =>
    record.order.ownerId === userId && record.cartId === quote.cartId && record.order.status === "pending",
  )

  if (pending) {
    throw new ApiError(409, "ORDER_IN_PROGRESS", "Sua compra já está sendo processada.", { orderId: pending.order.id })
  }

  revalidateQuote(state, quote)

  const connection = state.connections[userId]

  if (!connection || connection.id !== input.walletConnectionId || connection.expiresAt <= Date.now()) {
    throw new ApiError(409, "WALLET_DISCONNECTED", "Conecte sua carteira novamente para confirmar.")
  }

  const wallet = state.wallets[userId]?.find((candidate) => candidate.id === connection.walletId)

  if (!wallet || wallet.network !== quote.network || connection.network !== quote.network) {
    throw new ApiError(409, "NETWORK_MISMATCH", "A carteira e os NFTs precisam usar a mesma rede.")
  }

  const order: PendingOrder = {
    id: nextId(state, "order"),
    ownerId: userId,
    version: 1,
    createdAt: Date.now(),
    idempotencyKey: key,
    status: "pending",
    transactionReference: null,
    confirmedAt: null,
    reason: null,

    snapshot: {
      items: structuredClone(quote.items),
      totals: { ...quote.totals },
      network: quote.network,
      walletAddress: wallet.address,
      collectorName: input.collector.displayName,
      collectorEmail: input.collector.email,
    },
  }

  for (const item of quote.items) {
    state.nfts = state.nfts.map((nft) => nft.id === item.nftId ? {
      ...nft,
      version: nft.version + 1,
      editions: nft.editions.map((edition) => edition.id === item.editionId ? {
        ...edition, available: edition.available - item.quantity,
      } : edition),
    } : nft)
  }

  state.orders[order.id] = {
    order, cartId: quote.cartId, resolveAt: Date.now() + 3_000,
    outcome: state.scenario === "payment-rejected" ? "rejected" : "confirmed",
  }

  state.attempts[attemptId] = { fingerprint, orderId: order.id }
  return { order, created: true }
}
