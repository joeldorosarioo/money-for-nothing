import { HttpResponse } from "msw";
import { z } from "zod";

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly details: unknown = null) {
    super(message)
  }
}

export async function apiResponse (action: () => Promise<Response>): Promise<Response> {
  try {
    return await action()
  } catch (error) {
    if (error instanceof ApiError) {
      return HttpResponse.json({ code: error.code, message: error.message, details: error.details }, {
        status: error.status,
      })
    }

    if (error instanceof z.ZodError) {
      const fields = Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]))

      return HttpResponse.json({
        code: "VALIDATION_ERROR",
        message: "Confira os campos informados.",
        fields,
      }, { status: 422 })
    }

    if (error instanceof SyntaxError) {
      return HttpResponse.json({
        code: "VALIDATION_ERROR",
        message: "O corpo da requisição precisa ser um JSON válido.",
      }, { status: 422 })
    }

    throw error
  }
}
