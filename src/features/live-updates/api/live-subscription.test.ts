import { toSocketIo } from "@mswjs/socket.io-binding";
import { ws } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { type LiveEvent } from "../types/live-event";
import { createLiveSubscription } from "./live-subscription";

const server = setupServer()
const subscriptions: (() => void)[] = []

const event: LiveEvent = {
  id: "event-1",
  epoch: "world-1",
  ownerId: "collector",
  resource: "cart",
  subjectId: "cart-1",
  version: 2,
}

beforeAll(() => { server.listen({ onUnhandledRequest: "error" }) })
afterAll(() => { server.close() })

afterEach(() => {
  subscriptions.forEach((stop) => { stop() })
  subscriptions.length = 0
  server.resetHandlers()
})

function setup (ensureReady = () => Promise.resolve()) {
  let send: ((channel: string, payload: unknown) => void) | undefined
  let connections = 0
  let credentials: unknown
  let closed = false
  let rejected = 0

  const changes: LiveEvent[] = []
  const ready: string[] = []

  server.use(ws.link("wss://realtime.kurio.test").addEventListener("connection", (connection) => {
    const bound = toSocketIo(connection)
    connections += 1

    send = (channel, payload) => { bound.client.emit(channel, payload) }
    bound.client.on("session.authenticate", (_event, payload: unknown) => { credentials = payload })
    connection.client.addEventListener("close", () => { closed = true })
  }))

  const stop = createLiveSubscription({
    ensureReady, credentials: { token: "token", visitorId: "visitor" }, ownerId: "collector",
    onChange: (change) => { changes.push(change) }, onReady: (epoch) => { ready.push(epoch) },
    onRejected: () => { rejected += 1 },
  })

  subscriptions.push(stop)

  return {
    stop, changes, ready,
    closed: () => closed, rejected: () => rejected, connections: () => connections,

    async authenticate () {
      await vi.waitFor(() => {
        expect(credentials).toEqual({ token: "token", visitorId: "visitor" })
      })
    },

    send (channel: string, payload: unknown) {
      if (!send) throw new Error("Socket not connected")
      send(channel, payload)
    },
  }
}

describe("Socket.IO live subscription", () => {
  it("authenticates before accepting events and ignores other owners, duplicates and old versions", async () => {
    const context = setup()
    await context.authenticate()

    context.send("resource.changed", event)
    context.send("session.accepted", { epoch: "world-1" })
    context.send("resource.changed", { ...event, id: "before-handshake" })
    context.send("session.accepted", { epoch: "world-1", ownerId: "collector" })
    context.send("resource.changed", { ...event, ownerId: "nova" })
    context.send("resource.changed", event)
    context.send("resource.changed", event)
    context.send("resource.changed", { ...event, id: "late", version: 1 })

    const next = { ...event, id: "next", version: 3 }
    context.send("resource.changed", next)

    await vi.waitFor(() => { expect(context.changes).toEqual([event, next]) })
    expect(context.ready).toEqual(["world-1"])
  })

  it("validates payloads on all three event channels", async () => {
    const context = setup()
    await context.authenticate()

    context.send("session.accepted", { epoch: "world-1", ownerId: "collector" })

    const catalog = { ...event, id: "catalog", resource: "catalog", ownerId: null } satisfies LiveEvent
    const order = { ...event, id: "order", resource: "order" } satisfies LiveEvent

    for (const channel of ["nft.updated", "order.updated", "resource.changed"]) {
      context.send(channel, { ...event, version: -1 })
      context.send(channel, { ...event, resource: "unknown" })
    }

    context.send("nft.updated", catalog)
    context.send("order.updated", order)
    context.send("resource.changed", event)

    await vi.waitFor(() => { expect(context.changes).toEqual([catalog, order, event]) })
  })

  it("reconciles on each accepted handshake and rejects events from the previous world", async () => {
    const context = setup()
    await context.authenticate()

    context.send("session.accepted", { epoch: "world-1", ownerId: "collector" })
    context.send("resource.changed", event)
    context.send("session.accepted", { epoch: "world-2", ownerId: "collector" })
    context.send("resource.changed", { ...event, id: "old-world" })

    const fresh = { ...event, id: "fresh", epoch: "world-2", version: 1 }
    context.send("resource.changed", fresh)

    await vi.waitFor(() => { expect(context.changes).toEqual([event, fresh]) })
    expect(context.ready).toEqual(["world-1", "world-2"])
  })

  it("closes a connection that accepts a different identity without reporting session rejection", async () => {
    const context = setup()
    await context.authenticate()

    context.send("session.accepted", { epoch: "world-1", ownerId: "nova" })
    context.send("resource.changed", event)

    await vi.waitFor(() => { expect(context.closed()).toBe(true) })
    expect(context.changes).toEqual([])
    expect(context.ready).toEqual([])
    expect(context.rejected()).toBe(0)
  })

  it("closes and reports an explicit session rejection once", async () => {
    const context = setup()
    await context.authenticate()

    context.send("session.rejected", null)
    context.send("session.rejected", null)

    await vi.waitFor(() => { expect(context.closed()).toBe(true) })
    expect(context.rejected()).toBe(1)
  })

  it("ignores queued callbacks after unsubscribe", async () => {
    const context = setup()
    await context.authenticate()

    context.send("session.accepted", { epoch: "world-1", ownerId: "collector" })
    context.send("resource.changed", event)
    context.send("session.rejected", null)
    context.stop()
    context.stop()

    await vi.waitFor(() => { expect(context.closed()).toBe(true) })
    expect(context.changes).toEqual([])
    expect(context.ready).toEqual([])
    expect(context.rejected()).toBe(0)
  })

  it("waits for initialization and can unsubscribe while it is pending", async () => {
    let finishInitialization: () => void = () => undefined
    const initialization = new Promise<void>((resolve) => { finishInitialization = resolve })
    const context = setup(() => initialization)

    await vi.dynamicImportSettled()

    expect(context.connections()).toBe(0)
    context.stop()
    finishInitialization()
    await vi.dynamicImportSettled()

    expect(context.connections()).toBe(0)
    expect(context.ready).toEqual([])
    expect(context.rejected()).toBe(0)
  })

  it("keeps failed optional initialization from rejecting the session", async () => {
    const context = setup(() => Promise.reject(new Error("Simulation unavailable")))
    await vi.dynamicImportSettled()

    expect(context.connections()).toBe(0)
    expect(context.ready).toEqual([])
    expect(context.rejected()).toBe(0)
  })
})
