import "fake-indexeddb/auto";

import axios from "axios";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { liveEventSchema } from "../features/live-updates/api/event-contracts";
import { type LiveEvent } from "../features/live-updates/types/live-event";
import { createHandlers, resetSimulation } from "./handlers";

// A type query keeps the native transport unloaded until MSW has patched WebSocket.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- A static import initializes WebSocket too early.
type Socket = import("socket.io-client").Socket

const server = setupServer(...createHandlers("realtime-integration"))
const api = axios.create({ baseURL: "https://kurio.test/api" })
const sockets: Socket[] = []

beforeAll(() => { server.listen({ onUnhandledRequest: "error" }) })
afterAll(() => { server.close() })
beforeEach(async () => { await resetSimulation("realtime-integration", "default") })
afterEach(() => { sockets.forEach((socket) => { socket.disconnect() }); sockets.length = 0 })

async function connect (token: string | null = null) {
  const [
    { io },
    { WebSocket }
  ] = await Promise.all([import("socket.io-client"), import("engine.io-client")])

  const socket = io("wss://realtime.kurio.test", { transports: [WebSocket], forceNew: true })
  const events: LiveEvent[] = []

  sockets.push(socket)

  for (const channel of ["resource.changed", "nft.updated", "order.updated"]) {
    socket.on(channel, (payload: unknown) => { events.push(liveEventSchema.parse(payload)) })
  }

  const ready = new Promise<void>((resolve) => {
    socket.once("session.accepted", () => { resolve() })
  })

  socket.on("connect", () => {
    socket.emit("session.authenticate", { token, visitorId: "socket-test" })
  })

  await ready
  return { socket, events }
}

function nextResource (socket: Socket, resource: LiveEvent["resource"]) {
  const channel = resource === "catalog"
    ? "nft.updated"
    : resource === "order"
      ? "order.updated"
      : "resource.changed"

  return new Promise<LiveEvent>((resolve) => {
    const listener = (payload: unknown) => {
      const event = liveEventSchema.parse(payload)
      if (event.resource !== resource) return

      socket.off(channel, listener)
      resolve(event)
    }

    socket.on(channel, listener)
  })
}

async function login (email: string) {
  const response = await api.post<unknown>("/auth/login", { email, password: "Kurio2026!" })
  return z.object({ token: z.string() }).parse(response.data).token
}

describe("real Socket.IO protocol over the MSW binding", () => {
  it("publishes committed price changes over a real socket.io-client connection", async () => {
    const { socket } = await connect()
    const changed = nextResource(socket, "catalog")

    await api.patch("/simulation/nfts/emerald-ape-042", { editionId: "edition-50", unitPrice: "1.49" })
    expect(await changed).toMatchObject({ subjectId: "emerald-ape-042", version: 2, ownerId: null })
  })

  it("publishes the accepted order on order.updated for its authenticated owner", async () => {
    const token = await login("collector@kurio.test")
    const headers = { Authorization: "Bearer " + token }

    await api.post("/cart/items", { nftId: "emerald-ape-042", editionId: "edition-50", quantity: 1 }, { headers })

    const wallets = await api.get<unknown>("/wallets", { headers })
    const wallet = z.object({ items: z.array(z.object({ id: z.string() })) }).parse(wallets.data).items[0]
    const connection = await api.post<unknown>("/wallets/connect", { walletId: wallet?.id, provider: "metamask" }, { headers })
    const quote = await api.post<unknown>("/checkout/quotes", { network: "ethereum" }, { headers })

    const { socket } = await connect(token)

    const changed = nextResource(socket, "order")

    const response = await api.post<unknown>("/orders", {
      quoteId: z.object({ id: z.string() }).parse(quote.data).id,
      walletConnectionId: z.object({ id: z.string() }).parse(connection.data).id,

      collector: {
        displayName: "Alex Morgan",
        username: "collector",
        email: "collector@kurio.test",
        ens: "collector.eth",
        referralCode: "KURIO",
        notes: "",
      },
    }, { headers: { ...headers, "Idempotency-Key": "socket-purchase" } })

    const order = z.object({ id: z.string() }).parse(response.data)
    expect(await changed).toMatchObject({ subjectId: order.id, resource: "order", ownerId: "user-collector" })
  })

  it("does not deliver private favorite changes to another user or visitor", async () => {
    const token = await login("collector@kurio.test")
    const collector = await connect(token)
    const nova = await connect(await login("nova@kurio.test"))
    const visitor = await connect()
    const changed = nextResource(collector.socket, "favorites")

    await api.put("/favorites/emerald-ape-042", { active: true }, { headers: { Authorization: "Bearer " + token } })
    expect(await changed).toMatchObject({ ownerId: "user-collector", resource: "favorites" })

    const fence = [nova, visitor].map(({ socket }) => nextResource(socket, "catalog"))

    await api.patch("/simulation/nfts/emerald-ape-042", { editionId: "edition-50", available: 49 })
    await Promise.all(fence)
    expect(nova.events.some((event) => event.resource === "favorites")).toBe(false)
    expect(visitor.events.some((event) => event.resource === "favorites")).toBe(false)
  })

  it("revokes a socket subscription after its session is logged out", async () => {
    const token = await login("collector@kurio.test")
    const { socket } = await connect(token)
    const disconnected = new Promise<void>((resolve) => { socket.once("disconnect", () => { resolve() }) })
    const rejected = new Promise<void>((resolve) => { socket.once("session.rejected", () => { resolve() }) })

    await api.delete("/auth/session", { headers: { Authorization: "Bearer " + token } })
    await Promise.all([rejected, disconnected])
    expect(socket.connected).toBe(false)
  })
})
