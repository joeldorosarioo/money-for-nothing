import { http, HttpResponse } from "msw";
import { z } from "zod";

import { mergeCartItems } from "../../features/cart/rules/cart-rules";
import { ApiError, apiResponse } from "../http/api-error";
import { cartOwner, requireSession, visitorOwner } from "../http/request-context";
import { nextId } from "../persistence/simulation-state";
import { withState } from "../persistence/state-store";
import { cartRepresentation, getCart, getEdition, updateCartLine } from "./cart-state";

const addItemSchema = z.object({
  nftId: z.string().min(1),
  editionId: z.string().min(1),
  quantity: z.number().int().min(1).max(1_000_000),
})

const mergeSchema = z.object({
  mergeId: z.string().min(1).max(100)
})

export function cartHandlers (databaseName: string) {
  return [
    http.get("*/api/cart", ({ request }) => apiResponse(async () => {
      const cart = await withState(databaseName, (state) =>
        cartRepresentation(state, getCart(state, cartOwner(state, request))),
      )

      return HttpResponse.json(cart)
    })),

    http.post("*/api/cart/items", ({ request }) => apiResponse(async () => {
      const input = addItemSchema.parse(await request.json())

      const cart = await withState(databaseName, (state) => {
        const ownerId = cartOwner(state, request)
        const current = getCart(state, ownerId)

        const { edition } = getEdition(state, input.nftId, input.editionId)

        const existing = current.items
          .find((item) => item.nftId === input.nftId && item.editionId === input.editionId)

        const quantity = (existing?.quantity ?? 0) + input.quantity

        if (quantity > edition.available) {
          throw new ApiError(409, "INSUFFICIENT_STOCK", "A quantidade excede a disponibilidade desta edição.", {
            available: edition.available,
          })
        }

        const updated = { id: existing?.id ?? nextId(state, "item"), ...input, quantity }

        const items = existing
          ? current.items.map((item) => item.id === existing.id ? updated : item)
          : [...current.items, updated]

        const next = { ...current, version: current.version + 1, items }

        state.carts[ownerId] = next
        return cartRepresentation(state, next)
      })

      return HttpResponse.json(cart)
    })),

    http.patch("*/api/cart/items/:itemId", ({ request, params }) => apiResponse(async () => {
      const input = z.object({
        quantity: z.number().int().min(1).max(1_000_000),
        expectedVersion: z.number().int().min(1),
      }).parse(await request.json())

      const cart = await withState(databaseName, (state) => cartRepresentation(state, updateCartLine(
        state,
        cartOwner(state, request),
        z.string().parse(params.itemId),
        input.expectedVersion,
        input.quantity
      )))

      return HttpResponse.json(cart)
    })),

    http.delete("*/api/cart/items/:itemId", ({ request, params }) => apiResponse(async () => {
      const expectedVersion = z.coerce.number().int().min(1).parse(request.headers.get("If-Match"))

      const cart = await withState(databaseName, (state) => cartRepresentation(state, updateCartLine(
        state, cartOwner(state, request), z.string().parse(params.itemId), expectedVersion, null
      )))

      return HttpResponse.json(cart)
    })),

    http.post("*/api/cart/merge", ({ request }) => apiResponse(async () => {
      const input = mergeSchema.parse(await request.json())

      const result = await withState(databaseName, (state) => {
        const ownerId = requireSession(state, request).user.id
        const guestOwnerId = visitorOwner(request)
        const current = getCart(state, ownerId)
        const marker = ownerId + ":" + guestOwnerId + ":" + input.mergeId

        if (state.completedMerges[marker]) {
          return {
            cart: cartRepresentation(state, current),
            adjustments: []
          }
        }

        const guest = getCart(state, guestOwnerId)

        const merged = mergeCartItems(current.items, guest.items, (nftId, editionId) => state.nfts
          .find((nft) => nft.id === nftId)?.editions
          .find((edition) => edition.id === editionId)?.available ?? 0, () => nextId(state, "item"),
        )

        const next = { ...current, items: merged.items, version: current.version + 1 }

        state.carts[ownerId] = next
        state.carts[guestOwnerId] = { ...guest, items: [], version: guest.version + 1 }
        state.completedMerges[marker] = true

        return { cart: cartRepresentation(state, next), adjustments: merged.adjustments }
      })

      return HttpResponse.json(result)
    })),
  ]
}
