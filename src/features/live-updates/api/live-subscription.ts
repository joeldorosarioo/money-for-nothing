import { createEventGate } from "../rules/event-gate";
import { type LiveEvent } from "../types/live-event";
import { liveEventSchema, liveHandshakeSchema } from "./event-contracts";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type Socket = import("socket.io-client").Socket

export function createLiveSubscription ({ ensureReady, credentials, ownerId, onChange, onReady, onRejected }: {
  readonly ensureReady: () => Promise<void>
  readonly credentials: { readonly token: string | null; readonly visitorId: string }
  readonly ownerId: string
  readonly onChange: (event: LiveEvent) => void
  readonly onReady: (epoch: string) => void
  readonly onRejected: () => void
}) {
  let active = true
  let socket: Socket | null = null
  let gate: ReturnType<typeof createEventGate> | null = null

  function stop () {
    if (!active) return
    active = false
    gate = null
    socket?.removeAllListeners()
    socket?.disconnect()
  }

  async function connect () {
    await ensureReady()
    const [{ io }, { WebSocket }] = await Promise.all([import("socket.io-client"), import("engine.io-client")])

    if (!active) return
    const configuredUrl: unknown = import.meta.env.VITE_REALTIME_URL
    const url = typeof configuredUrl === "string" && configuredUrl ? configuredUrl : "wss://realtime.kurio.test"

    socket = io(url, {
      transports: [WebSocket],
      autoConnect: false,
      forceNew: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3_000,
    })

    socket.on("connect", () => { socket?.emit("session.authenticate", credentials) })

    socket.on("session.accepted", (payload: unknown) => {
      if (!active) return
      const parsed = liveHandshakeSchema.safeParse(payload)

      if (!parsed.success) return
      if (parsed.data.ownerId !== ownerId) { stop(); return }

      gate = createEventGate(parsed.data.epoch, ownerId)
      onReady(parsed.data.epoch)
    })

    for (const channel of ["nft.updated", "order.updated", "resource.changed"]) {
      socket.on(channel, (payload: unknown) => {
        const parsed = liveEventSchema.safeParse(payload)
        if (active && parsed.success && gate?.accept(parsed.data)) onChange(parsed.data)
      })
    }

    socket.on("session.rejected", () => {
      if (!active) return
      stop()
      onRejected()
    })

    socket.connect()
  }

  void connect().catch(stop)
  return stop
}
