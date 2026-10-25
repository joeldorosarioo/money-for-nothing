import { type AxiosInstance } from "axios";
import { z } from "zod";

import { ethSchema } from "../../../shared/http/eth-schema";
import { type Network } from "../../../shared/types/network";
import { type Quote } from "../types/quote";

const quoteSchema: z.ZodType<Quote> = z.object({
  id: z.string(),
  ownerId: z.string(),
  cartId: z.string(),
  cartVersion: z.number().int(),
  network: z.enum(["ethereum", "polygon", "solana"]),
  coupon: z.string().nullable(),
  version: z.number().int(),
  expiresAt: z.number(),

  items: z.array(z.object({
    cartItemId: z.string(),
    nftId: z.string(),
    editionId: z.string(),
    name: z.string(),
    tokenId: z.string(),
    image: z.string(),
    editionLabel: z.string(),
    quantity: z.number().int(),
    unitPrice: ethSchema,
    lineTotal: ethSchema,
    nftVersion: z.number().int(),
  })),

  totals: z.object({
    subtotal: ethSchema,
    discount: ethSchema,
    networkFee: ethSchema,
    total: ethSchema
  }),
})

export function createQuoteApi (client: AxiosInstance) {
  return {
    async create (network: Network, coupon: string, signal: AbortSignal) {
      const response = await client.post<unknown>("/checkout/quotes", { network, coupon }, { signal })
      return quoteSchema.parse(response.data)
    },
  }
}

export type QuoteApi = ReturnType<typeof createQuoteApi>
