import { type AxiosInstance } from "axios";
import { z } from "zod";

import { type LoginCredentials, type Registration } from "../types/session";

const sessionSchema = z.object({
  token: z.string().min(1), expiresAt: z.number().int().positive(),

  user: z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string(),
    email: z.email()
  }),
});

export function createHttpAuthRepository (client: AxiosInstance) {
  return {
    async login (input: LoginCredentials, signal: AbortSignal) {
      const response = await client.post<unknown>("/auth/login", input, { signal });
      return sessionSchema.parse(response.data);
    },

    async register (input: Registration, signal: AbortSignal) {
      const response = await client.post<unknown>("/auth/register", input, { signal });
      return sessionSchema.parse(response.data);
    },

    async current (signal: AbortSignal) {
      const response = await client.get<unknown>("/auth/session", { signal });
      return sessionSchema.parse(response.data);
    },

    async logout (token: string) {
      await client.delete("/auth/session", { headers: { Authorization: "Bearer " + token } });
    },
  }
}
