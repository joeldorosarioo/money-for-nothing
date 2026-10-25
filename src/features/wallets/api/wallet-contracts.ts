import { z } from "zod";

import { emailSchema, ensSchema } from "../../../shared/validation/account-fields";
import { isWalletAddress } from "../rules/wallet-address";

const fieldsSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  nickname: z.string().trim().min(2).max(50),
  network: z.enum(["ethereum", "polygon", "solana"]),
  profileName: z.string().trim().min(2).max(80),
  address: z.string().trim(),
  secondaryAddress: z.string().trim().max(100).default(""),
  provider: z.enum(["walletconnect", "metamask", "coinbase"]),
  referralCode: z.string().trim().min(3).max(32),
  email: emailSchema,
  ens: ensSchema,
})

const standaloneWalletSchema = fieldsSchema.extend({
  aliasOfPrimary: z.literal(false),
  expectedVersion: z.number().int().min(0),
}).superRefine((input, context) => {
  if (!isWalletAddress(input.address, input.network)) {
    context.addIssue({
      code: "custom",
      path: ["address"],
      message: "Endereço incompatível com a rede selecionada."
    })
  }

  if (
    input.secondaryAddress
    && !isWalletAddress(input.secondaryAddress, input.network)
    && !ensSchema.safeParse(input.secondaryAddress).success
  ) {
    context.addIssue({
      code: "custom",
      path: ["secondaryAddress"],
      message: "Informe um endereço ou ENS válido."
    })
  }
})

export const walletInputSchema = z.discriminatedUnion("aliasOfPrimary", [
  standaloneWalletSchema, z.object({ aliasOfPrimary: z.literal(true), expectedVersion: z.number().int().min(0) }),
])

export const walletSchema = fieldsSchema.extend({
  id: z.string(),
  slot: z.enum(["primary", "secondary"]),
  aliasOfPrimary: z.boolean(),
  version: z.number().int().min(1),
})

export const connectionSchema = z.object({
  id: z.string(),
  walletId: z.string(),
  network: z.enum(["ethereum", "polygon", "solana"]),
  provider: z.enum(["walletconnect", "metamask", "coinbase"]),
  expiresAt: z.number(),
})

export const walletListSchema = z.object({
  items: z.array(walletSchema),
  connection: connectionSchema.nullable()
})

export type WalletInput = z.infer<typeof walletInputSchema>
