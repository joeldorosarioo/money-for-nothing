import { type LiveEvent } from "../types/live-event";

export function createEventGate (epoch: string, ownerId: string) {
  const versions = new Map<string, number>()
  const seen = new Set<string>()

  return {
    accept (event: LiveEvent): boolean {
      if (event.epoch !== epoch || seen.has(event.id)) return false
      if (event.ownerId !== null && event.ownerId !== ownerId) return false
      const key = event.resource + ":" + event.subjectId

      if (event.version <= (versions.get(key) ?? 0)) return false
      versions.set(key, event.version)
      seen.add(event.id)

      if (seen.size > 512) {
        const oldest = seen.values().next().value
        if (oldest) seen.delete(oldest)
      }

      return true
    },
  }
}
