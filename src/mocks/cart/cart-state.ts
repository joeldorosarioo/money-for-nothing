import { type Cart } from "../../features/cart/types/cart";
import { nextId, type SimulationState } from "../persistence/simulation-state";
import { ApiError } from "../http/api-error";

export function getCart (state: SimulationState, ownerId: string): Cart {
  const existing = state.carts[ownerId]
  if (existing) return existing

  const cart: Cart = { id: nextId(state, "cart"), ownerId, version: 1, items: [] }
  state.carts[ownerId] = cart

  return cart
}

export function getEdition (state: SimulationState, nftId: string, editionId: string) {
  const nft = state.nfts.find((candidate) => candidate.id === nftId)
  const edition = nft?.editions.find((candidate) => candidate.id === editionId)

  if (!nft || !edition) throw new ApiError(404, "EDITION_NOT_FOUND", "Esta edição não foi encontrada.")
  return { nft, edition }
}

export function cartRepresentation (state: SimulationState, cart: Cart) {
  return {
    ...cart, items: cart.items.map((item) => {
      const {
        nft, edition
      } = getEdition(state, item.nftId, item.editionId)

      return {
        ...item,

        name: nft.name,
        tokenId: nft.tokenId,
        image: nft.image,
        network: nft.network,
        editionLabel: edition.label,
        unitPrice: edition.unitPrice,
        available: edition.available,
        nftVersion: nft.version,
      }
    }),
  }
}

export function updateCartLine (
  state: SimulationState, ownerId: string, itemId: string, expectedVersion: number, quantity: number | null,
): Cart {
  const cart = getCart(state, ownerId)

  if (cart.version !== expectedVersion) {
    throw new ApiError(409, "CART_CHANGED", "Seu carrinho foi atualizado. Confira as quantidades atuais.")
  }

  const line = cart.items.find((item) => item.id === itemId)

  if (!line) {
    throw new ApiError(404, "CART_ITEM_NOT_FOUND", "Este item não está mais no carrinho.")
  }

  if (quantity !== null && quantity > getEdition(state, line.nftId, line.editionId).edition.available) {
    throw new ApiError(409, "INSUFFICIENT_STOCK", "A quantidade excede a disponibilidade desta edição.")
  }

  const items = quantity === null
    ? cart.items.filter((item) => item.id !== itemId)
    : cart.items.map((item) => item.id === itemId ? { ...item, quantity } : item)

  const updated = { ...cart, items, version: cart.version + 1 }

  state.carts[ownerId] = updated
  return updated
}
