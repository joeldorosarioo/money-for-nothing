import { z } from "zod";

import { orderInputSchema } from "../api/order-contracts";
import { type PurchaseAttempt } from "../application/purchase-service";

const attemptSchema = z.object({
  ownerId: z.string().min(1),
  key: z.string().min(8).max(100).regex(/^[a-zA-Z0-9-]+$/),
  input: orderInputSchema,
  orderId: z.string().min(1).nullable(),
})

const storageKey = (ownerId: string) => "kurio.purchase.v1." + encodeURIComponent(ownerId)

export const browserPurchasePersistence = {
  read (ownerId: string): PurchaseAttempt | null {
    const saved = localStorage.getItem(storageKey(ownerId))
    if (!saved) return null

    try {
      const result = attemptSchema.safeParse(JSON.parse(saved))
      return result.success && result.data.ownerId === ownerId ? result.data : null
    } catch {
      return null
    }
  },

  write (ownerId: string, attempt: PurchaseAttempt | null) {
    if (attempt) localStorage.setItem(storageKey(ownerId), JSON.stringify(attempt))
    else localStorage.removeItem(storageKey(ownerId))
  },
}
