import { delay, http, HttpResponse } from "msw";
import { z } from "zod";

import { simulationScenarioSchema } from "../../features/simulation/api/simulation-api";
import { apiResponse } from "../http/api-error";
import { requireSession } from "../http/request-context";
import { type SimulationState } from "../persistence/simulation-state";
import { resetState, withState } from "../persistence/state-store";

const scenarioInputSchema = z.object({ scenario: simulationScenarioSchema })

function summarize (state: SimulationState) {
  return {
    scenario: state.scenario,
    epoch: state.epoch,
    nftCount: state.scenario === "empty" ? 0 : state.nfts.length
  }
}

export function scenarioHandlers (databaseName: string) {
  return [
    http.get("*/api/simulation", () => apiResponse(async () =>
      HttpResponse.json(await withState(databaseName, summarize)),
    )),

    http.post("*/api/simulation/scenario", ({ request }) => apiResponse(async () => {
      const { scenario } = scenarioInputSchema.parse(await request.json())
      const summary = await withState(databaseName, (state) => { state.scenario = scenario; return summarize(state) })
      return HttpResponse.json(summary)
    })),

    http.post("*/api/simulation/reset", ({ request }) => apiResponse(async () => {
      const { scenario } = scenarioInputSchema.parse(await request.json())
      await resetState(databaseName, scenario)
      return HttpResponse.json(await withState(databaseName, summarize))
    })),

    http.post("*/api/simulation/session/expire", ({ request }) => apiResponse(async () => {
      await withState(databaseName, (state) => {
        const session = requireSession(state, request)
        state.sessions[session.token] = { ...session, expiresAt: Date.now() - 1 }
      })

      return HttpResponse.json({ expired: true })
    })),
  ]
}

export function scenarioMiddleware (databaseName: string) {
  return http.all("*/api/*", async ({ request }) => {
    const path = new URL(request.url).pathname
    if (path.startsWith("/api/simulation")) return
    const scenario = await withState(databaseName, (state) => state.scenario)

    if (scenario === "offline") return HttpResponse.error()
    if (scenario === "slow") await delay(1_200)

    if (scenario === "variable-latency") {
      const queryLength = new URL(request.url).searchParams.get("q")?.length ?? 0
      await delay(queryLength > 3 ? 120 : 1_200)
    }

    const failed = scenario === "catalog-error" && path.startsWith("/api/nfts")
      || scenario === "checkout-error" && path === "/api/checkout/quotes"
      || scenario === "favorite-error" && request.method === "PUT" && path.startsWith("/api/favorites/")

    if (failed) return HttpResponse.json({
      code: "SIMULATED_UNAVAILABLE",
      message: "O serviço está temporariamente indisponível. Tente novamente.",
    }, { status: 503 })
  })
}
