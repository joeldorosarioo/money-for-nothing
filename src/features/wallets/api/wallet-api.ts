import { type AxiosInstance } from "axios";

import { type WalletProvider, type WalletSlot } from "../types/wallet";
import { connectionSchema, walletListSchema, walletSchema, type WalletInput } from "./wallet-contracts";

export type WalletApi = ReturnType<typeof createWalletApi>

export function createWalletApi (client: AxiosInstance) {
  return {
    async list (signal: AbortSignal) {
      const response = await client.get<unknown>("/wallets", { signal })
      return walletListSchema.parse(response.data)
    },

    async save (slot: WalletSlot, input: WalletInput) {
      const response = await client.put<unknown>("/wallets/" + slot, input)
      return walletSchema.parse(response.data)
    },

    connect: async (walletId: string, provider: WalletProvider) => {
      const response = await client.post<unknown>("/wallets/connect", { walletId, provider })
      return connectionSchema.parse(response.data)
    },

    async disconnect () { await client.delete("/wallets/connection") },
  }
}
