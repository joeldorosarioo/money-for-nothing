import { z } from "zod";

import { emailSchema, usernameSchema } from "../../../shared/validation/account-fields";

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha.").max(128),
});

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: z.string().min(8, "Use pelo menos 8 caracteres.").max(128),
  confirmPassword: z.string(),
}).refine((input) => input.password === input.confirmPassword, {
  path: ["confirmPassword"],
  message: "As senhas precisam ser iguais.",
});
