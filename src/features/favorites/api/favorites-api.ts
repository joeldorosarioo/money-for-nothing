import { type AxiosInstance } from "axios";
import { z } from "zod";

const favoriteSnapshotSchema = z.object({ nftIds: z.array(z.string().min(1)) })

export type FavoritesApi = ReturnType<typeof createFavoritesApi>

export function createFavoritesApi (client: AxiosInstance) {
  return {
    async list (signal: AbortSignal) {
      const response = await client.get<unknown>("/favorites", { signal })
      return favoriteSnapshotSchema.parse(response.data).nftIds
    },

    async set (nftId: string, active: boolean) {
      const response = await client.put<unknown>("/favorites/" + encodeURIComponent(nftId), { active })
      return favoriteSnapshotSchema.parse(response.data).nftIds
    },
  }
}
