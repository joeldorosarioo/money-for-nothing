import "fake-indexeddb/auto";

import axios from "axios";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { createHandlers, resetSimulation } from "./handlers";

const server = setupServer(...createHandlers("integration"))

const http = axios.create({
  baseURL: "https://kurio.test/api",
  validateStatus: () => true,
})

beforeAll(() => { server.listen({ onUnhandledRequest: "error" }) })
afterAll(() => { server.close() })
beforeEach(async () => { await resetSimulation("integration", "default") })

async function authenticate (email = "collector@kurio.test") {
  const response = await http.post<unknown>("/auth/login", { email, password: "Kurio2026!" })
  expect(response.status).toBe(200)

  const session = z.object({ token: z.string(), user: z.object({ id: z.string() }) }).parse(response.data)
  return { Authorization: "Bearer " + session.token }
}

describe("simulated REST boundary", () => {
  it("combines catalog search, filters and pagination in the API", async () => {
    const response = await http.get<unknown>("/nfts", {
      params: { q: "Emerald", networks: "ethereum", page: 1 },
    })

    expect(response.status).toBe(200)
    const result = z.object({
      items: z.array(z.object({ name: z.string(), network: z.string() })),
      total: z.number(),
    }).parse(response.data)

    expect(result.total).toBeGreaterThan(0)
    expect(result.items.every((item) => item.name.includes("Emerald") && item.network === "ethereum")).toBe(true)
  })

  it("returns a missing-resource response for an unknown NFT", async () => {
    const response = await http.get<unknown>("/nfts/missing")

    expect(response.status).toBe(404)
  })

  it("rejects invalid account registration input", async () => {
    const response = await http.post<unknown>("/auth/register", {
      username: "x", email: "invalid", password: "short", confirmPassword: "different",
    })

    expect(response.status).toBe(422)
    expect(response.data).toMatchObject({ code: "VALIDATION_ERROR" })
  })

  it("registers an account once and reports an email conflict", async () => {
    const input = {
      username: "new-collector",
      email: "NEW@KURIO.TEST",
      password: "Kurio2026!",
      confirmPassword: "Kurio2026!",
    }

    const created = await http.post<unknown>("/auth/register", input)
    const duplicate = await http.post<unknown>("/auth/register", { ...input, username: "another" })

    expect(created.status).toBe(201)
    expect(created.data).toMatchObject({ user: { email: "new@kurio.test" } })
    expect(duplicate.status).toBe(409)
  })

  it("rejects an incorrect password", async () => {
    const response = await http.post<unknown>("/auth/login", {
      email: "collector@kurio.test", password: "Wrong2026!",
    })

    expect(response.status).toBe(401)
  })

  it("recovers the authenticated session and invalidates it on logout", async () => {
    const headers = await authenticate()
    const current = await http.get<unknown>("/auth/session", { headers })
    const ended = await http.delete<unknown>("/auth/session", { headers })
    const expired = await http.get<unknown>("/auth/session", { headers })

    expect(current.status).toBe(200)
    expect(ended.status).toBe(204)
    expect(expired.status).toBe(401)
  })

  it("keeps favorites private to their owner", async () => {
    const first = await authenticate()
    const second = await authenticate("nova@kurio.test")

    await http.put("/favorites/emerald-ape-042", { active: true }, { headers: first })

    const privateList = await http.get<unknown>("/favorites", { headers: first })
    const otherList = await http.get<unknown>("/favorites", { headers: second })

    expect(privateList.data).toEqual({ nftIds: ["emerald-ape-042"] })
    expect(otherList.data).toEqual({ nftIds: [] })
  })

  it("persists visitor cart changes across requests", async () => {
    const headers = { "X-Visitor-Id": "visitor-a" }
    const added = await http.post<unknown>("/cart/items", {
      nftId: "emerald-ape-042", editionId: "edition-50", quantity: 2,
    }, { headers })
    const recovered = await http.get<unknown>("/cart", { headers })

    expect(added.status).toBe(200)
    expect(recovered.data).toMatchObject({
      items: [{ nftId: "emerald-ape-042", editionId: "edition-50", quantity: 2 }],
    })
  })

  it("does not merge a visitor cart twice", async () => {
    const visitor = { "X-Visitor-Id": "visitor-a" }

    await http.post("/cart/items", {
      nftId: "emerald-ape-042", editionId: "edition-50", quantity: 2,
    }, { headers: visitor })

    const headers = { ...await authenticate(), ...visitor }
    const first = await http.post<unknown>("/cart/merge", { mergeId: "merge-a" }, { headers })
    const repeated = await http.post<unknown>("/cart/merge", { mergeId: "merge-a" }, { headers })

    expect(first.status).toBe(200)
    expect(repeated.data).toMatchObject({ cart: { items: [{ quantity: 2 }] } })
  })

  it("rejects unavailable and fractional quantities", async () => {
    const headers = { "X-Visitor-Id": "visitor-a" }
    const fractional = await http.post("/cart/items", {
      nftId: "emerald-ape-042", editionId: "edition-50", quantity: 1.5,
    }, { headers })
    const unavailable = await http.post("/cart/items", {
      nftId: "emerald-ape-042", editionId: "edition-50", quantity: 51,
    }, { headers })

    expect(fractional.status).toBe(422)
    expect(unavailable.status).toBe(409)
  })

  it("updates a cart line only against the current cart version", async () => {
    const headers = { "X-Visitor-Id": "visitor-edit" }

    const added = await http.post<unknown>("/cart/items", {
      nftId: "emerald-ape-042",
      editionId: "edition-50",
      quantity: 1,
    }, { headers })

    const current = z.object({
      version: z.number(),
      items: z.array(z.object({ id: z.string() }))
    }).parse(added.data)

    const lineId = z.string().parse(current.items[0]?.id)

    const updated = await http.patch<unknown>("/cart/items/" + lineId, {
      quantity: 3,
      expectedVersion: current.version,
    }, { headers })

    const stale = await http.patch<unknown>("/cart/items/" + lineId, {
      quantity: 2, expectedVersion: current.version,
    }, { headers })

    expect(updated.status).toBe(200)
    expect(updated.data).toMatchObject({ items: [{ quantity: 3 }], version: current.version + 1 })
    expect(stale.status).toBe(409)
    expect(stale.data).toMatchObject({ code: "CART_CHANGED" })
  })

  it("removes a cart line and persists the empty cart", async () => {
    const headers = { "X-Visitor-Id": "visitor-delete" }

    const added = await http.post<unknown>("/cart/items", {
      nftId: "emerald-ape-042",
      editionId: "edition-50",
      quantity: 1,
    }, { headers })

    const current = z.object({ version: z.number(), items: z.array(z.object({ id: z.string() })) }).parse(added.data)

    const response = await http.delete("/cart/items/" + z.string().parse(current.items[0]?.id), {
      headers: { ...headers, "If-Match": current.version.toString() },
    })

    const recovered = await http.get<unknown>("/cart", { headers })

    expect(response.status).toBe(200)
    expect(recovered.data).toMatchObject({ items: [] })
  })

  it("exposes a unique resource ID for every listing across all pages", async () => {
    const pages = await Promise.all([1, 2, 3, 4].map(async (page) => {
      const response = await http.get<unknown>("/nfts", { params: { page } })
      return z.object({ items: z.array(z.object({ id: z.string() })) }).parse(response.data)
    }))

    const ids = pages.flatMap((page) => page.items.map((item) => item.id))
    expect(new Set(ids).size).toBe(ids.length)
  })
})
