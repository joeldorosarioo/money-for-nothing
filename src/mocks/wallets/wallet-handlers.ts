import { http, HttpResponse } from "msw";
import { z } from "zod";
import { walletInputSchema } from "../../features/wallets/api/wallet-contracts";
import { saveWallet } from "./save-wallet";

import { type WalletConnection } from "../../features/wallets/types/wallet";
import { ApiError, apiResponse } from "../http/api-error";
import { requireSession } from "../http/request-context";
import { nextId } from "../persistence/simulation-state";
import { withState } from "../persistence/state-store";

const connectionSchema = z.object({
  walletId: z.string().min(1),
  provider: z.enum(["walletconnect", "metamask", "coinbase"]),
})

export function walletHandlers (databaseName: string) {
  return [
    http.get("*/api/wallets", ({ request }) => apiResponse(async () => {
      const result = await withState(databaseName, (state) => {
        const userId = requireSession(state, request).user.id
        return { items: state.wallets[userId] ?? [], connection: state.connections[userId] ?? null }
      })

      return HttpResponse.json(result)
    })),

    http.put("*/api/wallets/:slot", ({ request, params }) => apiResponse(async () => {
      const input = walletInputSchema.parse(await request.json())
      const slot = z.enum(["primary", "secondary"]).parse(params.slot)

      const wallet = await withState(databaseName, (state) =>
        saveWallet(state, requireSession(state, request).user.id, slot, input),
      )

      return HttpResponse.json(wallet)
    })),

    http.delete("*/api/wallets/connection", ({ request }) => apiResponse(async () => {
      await withState(databaseName, (state) => {
        const userId = requireSession(state, request).user.id
        Reflect.deleteProperty(state.connections, userId)
      })

      return new HttpResponse(null, { status: 204 })
    })),

    http.post("*/api/wallets/connect", ({ request }) => apiResponse(async () => {
      const input = connectionSchema.parse(await request.json())

      const result = await withState(databaseName, (state) => {
        const userId = requireSession(state, request).user.id

        const wallet = state.wallets[userId]?.find((candidate) => candidate.id === input.walletId)
        if (!wallet) throw new ApiError(403, "WALLET_FORBIDDEN", "Escolha uma carteira da sua conta.")

        if (wallet.network === "solana" && input.provider !== "walletconnect") {
          throw new ApiError(409, "PROVIDER_UNSUPPORTED", "Este provedor não oferece suporte à rede selecionada.")
        }

        if (state.scenario === "wallet-rejected") {
          throw new ApiError(409, "WALLET_CONNECTION_REJECTED", "A conexão foi recusada na carteira. Tente conectar novamente.")
        }

        const connection: WalletConnection = {
          id: nextId(state, "connection"),
          walletId: wallet.id,
          network: wallet.network,
          provider: input.provider,
          expiresAt: Date.now() + 10 * 60_000,
        }

        state.connections[userId] = connection
        return connection
      })

      return HttpResponse.json(result)
    })),
  ]
}
