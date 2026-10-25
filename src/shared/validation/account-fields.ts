import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Informe um e-mail válido."));

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Use pelo menos 3 caracteres.")
  .max(24)
  .regex(/^[a-zA-Z0-9._-]+$/, "Use letras, números, ponto, hífen ou sublinhado.");

export const ensSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\.eth$/, "Informe um nome ENS válido terminado em .eth.");
