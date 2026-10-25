import { http, HttpResponse } from "msw";
import { z } from "zod";

import { parseEth } from "../../shared/money/eth";
import { ApiError, apiResponse } from "../http/api-error";
import { settleOrder } from "../orders/order-lifecycle";
import { withState } from "../persistence/state-store";

const editionPatchSchema = z.object({
  editionId: z.string(),

  unitPrice: z.string().refine((value) => {
    try {
      parseEth(value)
      return true
    } catch {
      return false
    }
  }).optional(),

  available: z.number().int().min(0).optional(),
}).refine((input) => input.unitPrice !== undefined || input.available !== undefined)

const resolutionSchema = z.object({ status: z.enum(["confirmed", "rejected"]) })

export function controlHandlers (databaseName: string) {
  return [
    http.patch("*/api/simulation/nfts/:nftId", ({ request, params }) => apiResponse(async () => {
      const input = editionPatchSchema.parse(await request.json())

      const result = await withState(databaseName, (state) => {
        const nft = state.nfts.find((candidate) => candidate.id === params.nftId)
        const edition = nft?.editions.find((candidate) => candidate.id === input.editionId)

        if (!nft || !edition) {
          throw new ApiError(404, "EDITION_NOT_FOUND", "Esta edição não foi encontrada.")
        }

        if (input.available !== undefined && input.available > edition.totalSupply) {
          throw new ApiError(422, "VALIDATION_ERROR", "A disponibilidade excede o total da edição.")
        }

        const updated = {
          ...nft,
          version: nft.version + 1,
          editions: nft.editions.map((candidate) => candidate.id === edition.id ? {
            ...candidate,
            unitPrice: input.unitPrice ?? candidate.unitPrice,
            available: input.available ?? candidate.available,
          } : candidate),
        }

        state.nfts = state.nfts.map((candidate) => candidate.id === nft.id ? updated : candidate)
        return updated
      })

      return HttpResponse.json(result)
    })),

    http.post("*/api/simulation/orders/:orderId/resolve", ({ request, params }) => apiResponse(async () => {
      const input = resolutionSchema.parse(await request.json())

      const order = await withState(databaseName, (state) => {
        const record = state.orders[z.string().parse(params.orderId)]
        if (!record) throw new ApiError(404, "ORDER_NOT_FOUND", "Este pedido não foi encontrado.")

        return settleOrder(state, record, input.status)
      })

      return HttpResponse.json(order)
    })),
  ]
}
