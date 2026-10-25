import { http, HttpResponse } from "msw";
import { z } from "zod";

import { orderInputSchema } from "../../features/orders/api/order-contracts";
import { apiResponse, ApiError } from "../http/api-error";
import { requireSession } from "../http/request-context";
import { delayUntilAbort } from "../simulation/delay-until-abort";
import { withState } from "../persistence/state-store";
import { submitOrder } from "./order-state";

const idempotencyKeySchema = z.string().min(8).max(100).regex(/^[a-zA-Z0-9-]+$/)

export function orderHandlers (databaseName: string) {
  return [
    http.post("*/api/orders", ({ request }) => apiResponse(async () => {
      const input = orderInputSchema.parse(await request.json())
      const key = idempotencyKeySchema.parse(request.headers.get("Idempotency-Key"))

      const result = await withState(databaseName, (state) => ({
        ...submitOrder(state, requireSession(state, request).user.id, key, input),
        scenario: state.scenario,
      }))

      if (result.created && result.scenario === "timeout-after-order") {
        await delayUntilAbort(11_000, request.signal)
      }

      return HttpResponse.json(result.order, { status: result.created ? 201 : 200 })
    })),

    http.get("*/api/orders/:orderId", ({ request, params }) => apiResponse(async () => {
      const order = await withState(databaseName, (state) => {
        const session = requireSession(state, request)
        const record = state.orders[z.string().parse(params.orderId)]

        if (!record) throw new ApiError(404, "ORDER_NOT_FOUND", "Este pedido não foi encontrado.")

        if (record.order.ownerId !== session.user.id) {
          throw new ApiError(403, "ORDER_FORBIDDEN", "Este pedido pertence a outra conta.")
        }

        return record.order
      })

      return HttpResponse.json(order)
    })),
  ]
}
