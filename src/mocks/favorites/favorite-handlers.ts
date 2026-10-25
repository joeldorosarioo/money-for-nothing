import { http, HttpResponse } from "msw";
import { z } from "zod";

import { ApiError, apiResponse } from "../http/api-error";
import { requireSession } from "../http/request-context";
import { withState } from "../persistence/state-store";

const favoriteInput = z.object({ active: z.boolean() })

export function favoriteHandlers (databaseName: string) {
  return [
    http.get("*/api/favorites", ({ request }) => apiResponse(async () => {
      const nftIds = await withState(databaseName, (state) => {
        const session = requireSession(state, request)
        return state.favorites[session.user.id] ?? []
      })

      return HttpResponse.json({ nftIds })
    })),

    http.put("*/api/favorites/:nftId", ({ request, params }) => apiResponse(async () => {
      const input = favoriteInput.parse(await request.json())
      const nftId = z.string().parse(params.nftId)

      const nftIds = await withState(databaseName, (state) => {
        const session = requireSession(state, request)

        if (!state.nfts.some((nft) => nft.id === nftId)) {
          throw new ApiError(404, "NFT_NOT_FOUND", "Este NFT não foi encontrado.")
        }

        const favorites = new Set(state.favorites[session.user.id] ?? [])

        if (input.active) {
          favorites.add(nftId)
        } else {
          favorites.delete(nftId)
        }

        state.favorites[session.user.id] = [...favorites]
        return state.favorites[session.user.id]
      })

      return HttpResponse.json({ nftIds })
    })),
  ]
}
