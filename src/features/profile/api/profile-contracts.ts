import { z } from "zod";

import { emailSchema, ensSchema, usernameSchema } from "../../../shared/validation/account-fields";

function isAvatarPayload (value: string): boolean {
  if (value === "" || /^\/assets\/(8f387|83794|9add2|b7cfc)\.(png|webp)$/.test(value)) return true
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)

  if (!match?.[2]) return false

  try {
    const bytes = atob(match[2])

    if (bytes.length > 2 * 1024 * 1024 || bytes.length < 12) return false
    const signature = Array.from(bytes.slice(0, 8), (character) => character.charCodeAt(0))

    if (match[1] === "png") return signature.join(",") === "137,80,78,71,13,10,26,10"
    if (match[1] === "jpeg") return signature[0] === 255 && signature[1] === 216 && signature[2] === 255

    return bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP"
  } catch {
    return false
  }
}

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual.").max(128),
  password: z.string().min(8, "Use pelo menos 8 caracteres.").max(128),
  confirmPassword: z.string(),
}).refine((input) => input.password === input.confirmPassword, {
  path: ["confirmPassword"],
  message: "As senhas precisam ser iguais.",
})

export const profileInputSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  username: usernameSchema,
  email: emailSchema,
  ens: ensSchema,
  walletNickname: z.string().trim().min(2).max(50),
  avatarUrl: z.string().max(2_800_000).refine(isAvatarPayload, "Use uma imagem PNG, JPEG ou WebP de até 2 MB."),
  expectedVersion: z.number().int().min(1),
  passwordChange: passwordChangeSchema.optional(),
})

export const profileSchema = profileInputSchema.omit({ expectedVersion: true, passwordChange: true }).extend({
  id: z.string(), version: z.number().int().min(1),
  ens: z.union([z.literal(""), ensSchema]),
  walletNickname: z.string().max(50),
})

export type ProfileInput = z.infer<typeof profileInputSchema>
