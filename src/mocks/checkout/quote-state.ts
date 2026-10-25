import { calculateQuoteTotals } from "../../features/checkout/rules/quote-totals";
import { type Quote, type QuoteItem } from "../../features/checkout/types/quote";
import { multiplyEth } from "../../shared/money/eth";
import { type Network } from "../../shared/types/network";
import { getCart, getEdition } from "../cart/cart-state";
import { ApiError } from "../http/api-error";
import { nextId, type SimulationState } from "../persistence/simulation-state";

const networkFees: Record<Network, string> = { ethereum: "0.016", polygon: "0.002", solana: "0.0005" }

function couponDiscount (coupon: string | null): number {
  if (coupon === null) return 0
  if (coupon === "EXPIRED") throw new ApiError(422, "COUPON_EXPIRED", "Este cupom expirou.")
  if (coupon !== "KURIO10") throw new ApiError(422, "COUPON_INVALID", "Este cupom não é válido.")

  return 1_000
}

export function createQuote (state: SimulationState, ownerId: string, network: Network, coupon: string | null): Quote {
  const cart = getCart(state, ownerId)
  if (cart.items.length === 0) throw new ApiError(422, "CART_EMPTY", "Adicione um NFT ao carrinho para continuar.")

  const items: QuoteItem[] = cart.items.map((item) => {
    const { nft, edition } = getEdition(state, item.nftId, item.editionId)

    if (item.quantity > edition.available) {
      throw new ApiError(409, "INSUFFICIENT_STOCK", "Revise a quantidade disponível no carrinho.", {
        nftId: nft.id, editionId: edition.id, available: edition.available,
      })
    }

    if (nft.network !== network) {
      throw new ApiError(409, "NETWORK_MISMATCH", "Use NFTs e carteira da mesma rede nesta compra.")
    }

    return {
      cartItemId: item.id,
      nftId: nft.id,
      editionId: edition.id,
      editionLabel: edition.label,
      name: nft.name,
      tokenId: nft.tokenId,
      image: nft.image,
      quantity: item.quantity,
      unitPrice: edition.unitPrice,
      lineTotal: multiplyEth(edition.unitPrice, item.quantity),
      nftVersion: nft.version,
    }
  })

  const quote: Quote = {
    id: nextId(state, "quote"),
    ownerId,
    cartId: cart.id,
    cartVersion: cart.version,
    network,
    coupon,
    items,
    totals: calculateQuoteTotals(items, couponDiscount(coupon), networkFees[network]),
    expiresAt: Date.now() + 60_000,
    version: 1,
  }

  state.quotes[quote.id] = quote
  return quote
}

export function revalidateQuote (state: SimulationState, quote: Quote): void {
  if (quote.expiresAt <= Date.now()) {
    throw new ApiError(409, "QUOTE_EXPIRED", "A cotação expirou. Confira os valores atualizados.")
  }

  const cart = getCart(state, quote.ownerId)

  if (cart.id !== quote.cartId || cart.version !== quote.cartVersion) {
    throw new ApiError(409, "QUOTE_CHANGED", "Seu carrinho mudou. Confirme a nova cotação.")
  }

  for (const item of quote.items) {
    const { nft, edition } = getEdition(state, item.nftId, item.editionId)

    if (nft.version !== item.nftVersion || edition.unitPrice !== item.unitPrice || edition.available < item.quantity) {
      throw new ApiError(409, "QUOTE_CHANGED", "O preço ou a disponibilidade mudou. Confira a nova cotação.")
    }
  }

  couponDiscount(quote.coupon)
}
