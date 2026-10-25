import { describe, expect, it } from "vitest";

import { type LiveEvent } from "../types/live-event";
import { createEventGate } from "./event-gate";

const event: LiveEvent = {
  id: "event-1",
  epoch: "world-1",
  resource: "order",
  subjectId: "order-1",
  ownerId: "collector",
  version: 2,
}

describe("versioned live event acceptance", () => {
  it("accepts a current event only once", () => {
    const gate = createEventGate("world-1", "collector")

    expect(gate.accept(event)).toBe(true)
    expect(gate.accept(event)).toBe(false)
  })

  it("ignores stale versions even when the event ID differs", () => {
    const gate = createEventGate("world-1", "collector")

    gate.accept(event)
    expect(gate.accept({ ...event, id: "older-event", version: 1 })).toBe(false)
  })

  it("isolates private resources by their owner", () => {
    const gate = createEventGate("world-1", "nova")

    expect(gate.accept(event)).toBe(false)
    expect(gate.accept({ ...event, resource: "catalog", ownerId: null })).toBe(true)
  })

  it("does not reset its version fence for a delayed event from another world", () => {
    const gate = createEventGate("world-2", "collector")

    expect(gate.accept(event)).toBe(false)
    expect(gate.accept({ ...event, epoch: "world-2" })).toBe(true)
    expect(gate.accept({ ...event, id: "late", version: 30 })).toBe(false)
  })

  it("tracks independent resources without dropping a lower version of another order", () => {
    const gate = createEventGate("world-1", "collector")

    expect(gate.accept({ ...event, version: 10 })).toBe(true)
    expect(gate.accept({ ...event, id: "other-event", subjectId: "order-2", version: 1 })).toBe(true)
  })
})
