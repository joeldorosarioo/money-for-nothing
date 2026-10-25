import { type LiveEvent, type LiveResource } from "../../features/live-updates/types/live-event";
import { type SimulationState } from "../persistence/simulation-state";

interface Resource {
  readonly resource: LiveResource
  readonly subjectId: string
  readonly ownerId: string | null
  readonly version: number
  readonly fingerprint: string
}

export function captureResources (state: SimulationState): Map<string, Resource> {
  const resources = new Map<string, Resource>()

  function add (
    resource: LiveResource,
    subjectId: string,
    ownerId: string | null,
    version: number,
    fingerprint = version.toString()
  ) {
    resources.set(resource + ":" + subjectId, {
      resource,
      subjectId,
      ownerId,
      version,
      fingerprint
    })
  }

  state.nfts.forEach((nft) => { add("catalog", nft.id, null, nft.version) })
  Object.values(state.carts).forEach((cart) => { add("cart", cart.id, cart.ownerId, cart.version) })
  Object.values(state.orders).forEach(({ order }) => { add("order", order.id, order.ownerId, order.version) })

  for (const user of Object.values(state.users)) {
    const owner = user.id

    add("profile", owner, owner, user.profile.version)
    add("favorites", owner, owner, 0, JSON.stringify(state.favorites[owner] ?? []))
    add("wallets", owner, owner, 0, JSON.stringify([state.wallets[owner] ?? [], state.connections[owner] ?? null]))

    add("session", owner, owner, 0, JSON.stringify(Object.values(state.sessions)
      .filter((session) => session.user.id === owner).map(({ token, expiresAt }) => [token, expiresAt])))
  }

  return resources
}

export function changedResources (before: Map<string, Resource>, state: SimulationState): LiveEvent[] {
  const events: LiveEvent[] = []

  for (const [key, resource] of captureResources(state)) {
    if (before.get(key)?.fingerprint === resource.fingerprint) continue
    state.eventSequence += 1

    events.push({
      id: state.epoch + ":" + state.eventSequence.toString(),
      epoch: state.epoch,
      resource: resource.resource,
      subjectId: resource.subjectId,
      ownerId: resource.ownerId,
      version: resource.version || state.eventSequence,
    })
  }

  return events
}
