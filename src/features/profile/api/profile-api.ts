import { type AxiosInstance } from "axios";

import { profileSchema, type ProfileInput } from "./profile-contracts";

export type ProfileApi = ReturnType<typeof createProfileApi>

export function createProfileApi (client: AxiosInstance) {
  return {
    async get (signal: AbortSignal) {
      const response = await client.get<unknown>("/profile", { signal })
      return profileSchema.parse(response.data)
    },

    async save (input: ProfileInput) {
      const response = await client.put<unknown>("/profile", input)
      return profileSchema.parse(response.data)
    },
  }
}
