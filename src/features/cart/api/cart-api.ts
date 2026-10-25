import { type AxiosInstance } from "axios";
import { z } from "zod";

import { ethSchema } from "../../../shared/http/eth-schema";
import { type AddCartItem, type CartView } from "../types/cart";

const cartViewSchema: z.ZodType<CartView> = z.object({
  id: z.string(), ownerId: z.string(), version: z.number().int().min(1),

  items: z.array(z.object({
    id: z.string(), nftId: z.string(), editionId: z.string(), quantity: z.number().int().min(1),
    name: z.string(), tokenId: z.string(), image: z.string(),
    network: z.enum(["ethereum", "polygon", "solana"]), editionLabel: z.string(), unitPrice: ethSchema,
    available: z.number().int().min(0), nftVersion: z.number().int().min(1),
  })),
});

export function createCartApi (client: AxiosInstance) {
  return {
    async get (signal: AbortSignal) {
      const response = await client.get<unknown>("/cart", { signal });
      return cartViewSchema.parse(response.data);
    },

    async change (id: string, quantity: number, version: number) {
      const response = await client.patch<unknown>("/cart/items/" + encodeURIComponent(id), {
        quantity, expectedVersion: version,
      });

      return cartViewSchema.parse(response.data);
    },

    async remove (id: string, version: number) {
      const response = await client.delete<unknown>("/cart/items/" + encodeURIComponent(id), {
        headers: { "If-Match": version.toString() },
      });

      return cartViewSchema.parse(response.data);
    },

    async add (input: AddCartItem) {
      const response = await client.post<unknown>("/cart/items", input);
      return cartViewSchema.parse(response.data);
    },
  }
}

export type CartApi = ReturnType<typeof createCartApi>
