import { http, HttpResponse } from "msw";
import { z } from "zod";

import { apiResponse } from "../http/api-error";
import { cartOwner } from "../http/request-context";
import { withState } from "../persistence/state-store";
import { createQuote } from "./quote-state";

const quoteSchema = z.object({
  network: z.enum(["ethereum", "polygon", "solana"]),
  coupon: z.string().trim().toUpperCase().max(40).optional(),
})

export function checkoutHandlers (databaseName: string) {
  return [
    http.post("*/api/checkout/quotes", ({ request }) => apiResponse(async () => {
      const input = quoteSchema.parse(await request.json())

      const quote = await withState(databaseName, (state) =>
        createQuote(state, cartOwner(state, request), input.network, input.coupon || null),
      )

      return HttpResponse.json(quote)
    })),
  ]
}
