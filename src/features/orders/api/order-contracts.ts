import { z } from "zod";

import { type OrderInput } from "../types/order";

export const orderInputSchema: z.ZodType<OrderInput> = z.object({
  quoteId: z.string().min(1),
  walletConnectionId: z.string().min(1),

  collector: z.object({
    displayName: z.string().trim().min(2).max(80),
    username: z.string().trim().min(3).max(24),
    email: z.string().trim().toLowerCase().pipe(z.email()),
    ens: z.string().trim().min(3).max(100),
    referralCode: z.string().trim().min(3).max(32),
    notes: z.string().trim().max(1_000).default(""),
  }),
})
