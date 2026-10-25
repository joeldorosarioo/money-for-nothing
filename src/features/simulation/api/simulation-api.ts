import { type AxiosInstance } from "axios";
import { z } from "zod";

export const simulationScenarioSchema = z.enum([
  "default",
  "empty",
  "slow",
  "variable-latency",
  "offline",
  "favorite-error",
  "wallet-rejected",
  "catalog-error",
  "checkout-error",
  "timeout-after-order",
  "payment-rejected",
])

export type SimulationScenario = z.infer<typeof simulationScenarioSchema>
export type SimulationApi = ReturnType<typeof createSimulationApi>

const simulationSummarySchema = z.object({
  scenario: simulationScenarioSchema,
  epoch: z.string().min(1),
  nftCount: z.number().int().nonnegative(),
})

export function createSimulationApi (client: AxiosInstance) {
  return {
    async get (signal: AbortSignal) {
      return simulationSummarySchema.parse((await client.get<unknown>("/simulation", { signal })).data)
    },

    async setScenario (scenario: SimulationScenario) {
      return simulationSummarySchema.parse((await client.post<unknown>("/simulation/scenario", { scenario })).data)
    },

    async reset (scenario: SimulationScenario) {
      return simulationSummarySchema.parse((await client.post<unknown>("/simulation/reset", { scenario })).data)
    },

    async expireSession () {
      const response = await client.post<unknown>("/simulation/session/expire", {})
      z.object({ expired: z.literal(true) }).parse(response.data)
    },

    async updateNft ({ nftId, ...input }: {
      readonly nftId: string
      readonly editionId: string
      readonly unitPrice: string
      readonly available: number
    }) {
      const response = await client.patch<unknown>("/simulation/nfts/" + encodeURIComponent(nftId), input)
      z.object({ id: z.string(), version: z.number().int().positive() }).parse(response.data)
    },

    async resolveOrder (id: string, status: "confirmed" | "rejected") {
      const response = await client.post<unknown>("/simulation/orders/" + encodeURIComponent(id) + "/resolve", { status })
      return z.object({ id: z.string(), status: z.enum(["pending", "confirmed", "rejected"]) }).parse(response.data)
    },
  }
}
