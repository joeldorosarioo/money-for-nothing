import { type AxiosInstance } from "axios";
import { z } from "zod";

import { ApiClientError } from "../../../shared/http/api-client-error";
import { ethSchema } from "../../../shared/http/eth-schema";
import { type Order, type OrderInput } from "../types/order";

const snapshotSchema = z.object({
  network: z.enum(["ethereum", "polygon", "solana"]),
  walletAddress: z.string(),
  collectorName: z.string(),
  collectorEmail: z.email(),

  items: z.array(z.object({
    cartItemId: z.string(),
    nftId: z.string(),
    editionId: z.string(),
    name: z.string(),
    tokenId: z.string(),
    image: z.string(),
    editionLabel: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: ethSchema,
    lineTotal: ethSchema,
    nftVersion: z.number().int().positive(),
  })),

  totals: z.object({
    subtotal: ethSchema,
    discount: ethSchema,
    networkFee: ethSchema,
    total: ethSchema
  }),
})

const baseSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  version: z.number().int().positive(),
  createdAt: z.number(),
  idempotencyKey: z.string().min(8),
  snapshot: snapshotSchema,
})

const orderSchema: z.ZodType<Order> = z.discriminatedUnion("status", [
  baseSchema.extend({
    status: z.literal("pending"),
    transactionReference: z.null(),
    reason: z.null(),
    confirmedAt: z.null()
  }),

  baseSchema.extend({
    status: z.literal("confirmed"),
    transactionReference: z.string(),
    reason: z.null(),
    confirmedAt: z.number()
  }),

  baseSchema.extend({
    status: z.literal("rejected"),
    transactionReference: z.null(),
    reason: z.string(),
    confirmedAt: z.null()
  }),
])

export function createOrderApi (client: AxiosInstance) {
  return {
    submit: async (input: OrderInput, key: string) => {
      const response = await client.post<unknown>("/orders", input, { headers: { "Idempotency-Key": key } })
      return orderSchema.parse(response.data)
    },

    get: async (id: string, signal?: AbortSignal) => {
      const response = await client.get<unknown>("/orders/" + encodeURIComponent(id), signal ? { signal } : {})
      return orderSchema.parse(response.data)
    },
  }
}

export type OrderApi = ReturnType<typeof createOrderApi>

const rejectedBeforeAcceptance = new Set([
  "QUOTE_CHANGED",
  "QUOTE_EXPIRED",
  "QUOTE_FORBIDDEN",
  "NETWORK_MISMATCH",
  "WALLET_DISCONNECTED",
  "INSUFFICIENT_STOCK",
  "VALIDATION_ERROR",
  "CART_EMPTY",
  "COUPON_EXPIRED",
  "COUPON_INVALID",
  "ORDER_IN_PROGRESS",
  "ORDER_NOT_FOUND",
])

export function isDefinitivePurchaseFailure (error: unknown): boolean {
  return error instanceof ApiClientError
    && error.status >= 400
    && error.status < 500
    && rejectedBeforeAcceptance.has(error.code)
}
