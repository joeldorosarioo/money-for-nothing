import { liveEventSchema } from "../../features/live-updates/api/event-contracts";
import { type LiveEvent } from "../../features/live-updates/types/live-event";

interface Bus {
  readonly listeners: Set<(event: LiveEvent) => void>
  readonly channel: BroadcastChannel | null
}

const buses = new Map<string, Bus>()

export function subscribeSimulation (database: string, listener: (event: LiveEvent) => void): () => void {
  let bus = buses.get(database)

  if (!bus) {
    const listeners = new Set<(event: LiveEvent) => void>()
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("kurio:" + database)

    if (channel) {
      channel.onmessage = (message: MessageEvent<unknown>) => {
        const event = liveEventSchema.safeParse(message.data)
        if (event.success) listeners.forEach((receive) => { receive(event.data) })
      }
    }

    bus = { listeners, channel }
    buses.set(database, bus)
  }

  bus.listeners.add(listener)

  return () => {
    const current = buses.get(database)
    current?.listeners.delete(listener)

    if (current?.listeners.size === 0) {
      current.channel?.close()
      buses.delete(database)
    }
  }
}

export function publishSimulation (database: string, event: LiveEvent): void {
  const bus = buses.get(database)
  bus?.listeners.forEach((listener) => { listener(event) })

  if (bus?.channel) {
    bus.channel.postMessage(event)
  } else if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("kurio:" + database)

    channel.postMessage(event)
    channel.close()
  }
}
