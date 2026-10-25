import { z } from "zod";

export const liveEventSchema = z.object({
  id: z.string().min(1),
  epoch: z.string().min(1),
  subjectId: z.string().min(1),
  ownerId: z.string().nullable(),
  version: z.number().int().positive(),
  resource: z.enum(["catalog", "cart", "favorites", "profile", "wallets", "order", "session", "reset"]),
})

export const liveHandshakeSchema = z.object({
  epoch: z.string().min(1),
  ownerId: z.string().min(1)
})
