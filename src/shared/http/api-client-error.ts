import { isAxiosError } from "axios";
import { z } from "zod";

const errorSchema = z.object({
  code: z.string(), message: z.string(),
  fields: z.record(z.string(), z.string()).optional(),
  details: z.unknown().optional(),
});

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Readonly<Record<string, string>> = {},
    readonly details: unknown = null,
  ) {
    super(message);
  }
}

export function explainError (error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir. Tente novamente."
}

export function normalizeApiError (error: unknown): Error {
  if (!isAxiosError<unknown>(error))
    return error instanceof Error ? error : new Error("Não foi possível concluir a requisição.");

  if (error.code === "ERR_CANCELED") return error
  const parsed = errorSchema.safeParse(error.response?.data);

  if (parsed.success) {
    return new ApiClientError(
      error.response?.status ?? 500,
      parsed.data.code,
      parsed.data.message,
      parsed.data.fields,
      parsed.data.details,
    );
  }

  return new ApiClientError(
    error.response?.status ?? 0,
    error.code === "ECONNABORTED" ? "TIMEOUT" : "NETWORK_ERROR",
    error.code === "ECONNABORTED"
      ? "A resposta demorou mais que o esperado. Tente recuperar sua tentativa."
      : "Não foi possível conectar. Confira sua conexão e tente novamente."
  );
}
