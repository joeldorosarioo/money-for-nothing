import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import { createFixtureState } from "../fixtures/create-fixture-state";
import { advanceOrders } from "../orders/order-lifecycle";
import { publishSimulation } from "../realtime/event-bus";
import { captureResources, changedResources } from "../realtime/state-events";
import { type SimulationState } from "./simulation-state";

interface SimulationDatabase extends DBSchema {
  state: { key: string; value: SimulationState }
}

const databases = new Map<string, Promise<IDBPDatabase<SimulationDatabase>>>()

function openSimulation (name: string): Promise<IDBPDatabase<SimulationDatabase>> {
  const existing = databases.get(name)
  if (existing) return existing

  const database = openDB<SimulationDatabase>("kurio-" + name, 1, {
    upgrade (db) {
      db.createObjectStore("state")
    },
  })

  databases.set(name, database)
  return database
}

export async function withState<T> (databaseName: string, mutate: (state: SimulationState) => T): Promise<T> {
  const database = await openSimulation(databaseName)
  const transaction = database.transaction("state", "readwrite")

  try {
    const state = await transaction.store.get("world") ?? createFixtureState()
    const persistedSequence: unknown = state.eventSequence

    state.eventSequence = typeof persistedSequence === "number"
      && Number.isSafeInteger(persistedSequence)
      && persistedSequence >= 0 ? persistedSequence : 0

    const before = captureResources(state)
    advanceOrders(state)
    const result = mutate(state)

    const events = changedResources(before, state)

    await transaction.store.put(state, "world")
    await transaction.done
    events.forEach((event) => { publishSimulation(databaseName, event) })
    return result
  } catch (error) {
    try { transaction.abort() } catch {
      // Preserve the original error if IndexedDB already aborted.
    }

    await transaction.done.catch(() => undefined)
    throw error
  }
}

export async function resetState (databaseName: string, scenario: string): Promise<void> {
  const database = await openSimulation(databaseName)

  const state = createFixtureState(scenario)
  await database.put("state", state, "world")

  publishSimulation(databaseName, {
    id: state.epoch + ":reset",
    epoch: state.epoch,
    resource: "reset",
    subjectId: "world",
    ownerId: null,
    version: 1,
  })
}
