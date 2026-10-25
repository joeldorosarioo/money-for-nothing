import "fake-indexeddb/auto";

import axios from "axios";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { createHandlers, resetSimulation } from "./handlers";

const server = setupServer(...createHandlers("simulation-controls"))
const api = axios.create({ baseURL: "https://kurio.test/api", validateStatus: () => true })
const summarySchema = z.object({ epoch: z.string(), scenario: z.string(), nftCount: z.number() })

beforeAll(() => { server.listen({ onUnhandledRequest: "error" }) })
afterAll(() => { server.close() })
beforeEach(async () => { await resetSimulation("simulation-controls", "default") })

describe("deterministic simulation controls", () => {
  it("can simulate a transport failure without making the recovery controls unreachable", async () => {
    expect((await api.post("/simulation/scenario", { scenario: "offline" })).status).toBe(200)
    await expect(api.get("/nfts")).rejects.toThrow()

    expect((await api.post("/simulation/scenario", { scenario: "default" })).status).toBe(200)
    expect((await api.get("/nfts")).status).toBe(200)
  })

  it("rejects a favorite write without changing the saved list", async () => {
    const login = await api.post<unknown>("/auth/login", { email: "collector@kurio.test", password: "Kurio2026!" })
    const token = z.object({ token: z.string() }).parse(login.data).token
    const headers = { Authorization: "Bearer " + token }
    await api.post("/simulation/scenario", { scenario: "favorite-error" })

    expect((await api.put("/favorites/emerald-ape-042", { active: true }, { headers })).status).toBe(503)
    const favorites = await api.get<unknown>("/favorites", { headers })
    expect(favorites.data).toEqual({ nftIds: [] })
  })

  it("refuses a wallet connection without persisting a successful connection", async () => {
    const login = await api.post<unknown>("/auth/login", { email: "collector@kurio.test", password: "Kurio2026!" })
    const token = z.object({ token: z.string() }).parse(login.data).token
    const headers = { Authorization: "Bearer " + token }
    const wallets = await api.get<unknown>("/wallets", { headers })
    const wallet = z.object({ items: z.array(z.object({ id: z.string() })) }).parse(wallets.data).items[0]
    await api.post("/simulation/scenario", { scenario: "wallet-rejected" })
    const response = await api.post<unknown>("/wallets/connect", { walletId: wallet?.id, provider: "metamask" }, { headers })

    expect(response.status).toBe(409)
    expect(response.data).toMatchObject({ code: "WALLET_CONNECTION_REJECTED" })

    await api.post("/simulation/scenario", { scenario: "default" })
    expect((await api.post("/wallets/connect", { walletId: wallet?.id, provider: "metamask" }, { headers })).status).toBe(200)
  })

  it("delivers shorter searches after longer searches in the variable latency scenario", async () => {
    expect((await api.post("/simulation/scenario", { scenario: "variable-latency" })).status).toBe(200)
    const completed: string[] = []

    await Promise.all(["e", "emerald"].map(async (q) => {
      expect((await api.get("/nfts", { params: { q } })).status).toBe(200)
      completed.push(q)
    }))

    expect(completed).toEqual(["emerald", "e"])
  })

  it("changes catalog failure behavior through REST and can recover without resetting data", async () => {
    expect((await api.post("/simulation/scenario", { scenario: "catalog-error" })).status).toBe(200)
    expect((await api.get("/nfts")).status).toBe(503)

    await api.post("/simulation/scenario", { scenario: "default" })
    const catalog = await api.get<unknown>("/nfts")

    expect(catalog.status).toBe(200)
    expect(z.object({ total: z.number() }).parse(catalog.data).total).toBe(36)
  })

  it("rejects unsupported scenarios without changing the current world", async () => {
    expect((await api.post("/simulation/scenario", { scenario: "unknown" })).status).toBe(422)
    const response = await api.get<unknown>("/simulation")
    expect(summarySchema.parse(response.data).scenario).toBe("default")
  })

  it("resets to an empty world with a fresh epoch and revoked sessions", async () => {
    const initial = summarySchema.parse((await api.get<unknown>("/simulation")).data)
    const login = await api.post<unknown>("/auth/login", { email: "collector@kurio.test", password: "Kurio2026!" })
    const token = z.object({ token: z.string() }).parse(login.data).token
    const response = await api.post<unknown>("/simulation/reset", { scenario: "empty" })
    const next = summarySchema.parse(response.data)

    expect(next.epoch).not.toBe(initial.epoch)
    expect(next.nftCount).toBe(0)
    expect((await api.get("/auth/session", { headers: { Authorization: "Bearer " + token } })).status).toBe(401)
  })

  it("expires the current session at the server boundary", async () => {
    const login = await api.post<unknown>("/auth/login", { email: "collector@kurio.test", password: "Kurio2026!" })
    const token = z.object({ token: z.string() }).parse(login.data).token
    const headers = { Authorization: "Bearer " + token }

    expect((await api.post("/simulation/session/expire", {}, { headers })).status).toBe(200)
    expect((await api.get("/auth/session", { headers })).status).toBe(401)
  })
})
