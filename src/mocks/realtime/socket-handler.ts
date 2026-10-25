import { toSocketIo } from "@mswjs/socket.io-binding";
import { ws } from "msw";
import { z } from "zod";

import { withState } from "../persistence/state-store";
import { subscribeSimulation } from "./event-bus";

const authenticationSchema = z.object({
  token: z.string().min(1).nullable(),
  visitorId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9-]+$/),
})

export function socketHandler (databaseName: string) {
  return ws.link(new RegExp("^wss://realtime[.]kurio[.]test/(socket[.]io/)?$"))
    .addEventListener("connection", (connection) => {
      const bound = toSocketIo(connection)

      let active = true
      let checking = false
      let revoked = false
      let rejectionTimer: ReturnType<typeof setTimeout> | undefined
      let ownerId: string | null = null
      let token: string | null = null
      let unsubscribe: () => void = () => undefined

      function isActive (): boolean {
        return active
      }

      function rejectSession () {
        if (!isActive() || revoked) return

        revoked = true
        unsubscribe()
        bound.client.emit("session.rejected")
        rejectionTimer = setTimeout(() => { connection.client.close(1008, "Session expired") }, 0)
      }

      async function checkSession () {
        if (!isActive() || revoked || !ownerId || checking) return
        checking = true

        try {
          const valid = await withState(
            databaseName, (state) => !token || (state.sessions[token]?.expiresAt ?? 0) > Date.now()
          )

          if (!valid) rejectSession()
        } catch {
          if (isActive()) connection.client.close(1011, "Simulation unavailable")
        } finally {
          checking = false
        }
      }

      bound.client.on("session.authenticate", (_event, payload: unknown) => {
        void (async () => {
          if (ownerId || !isActive()) return
          const parsed = authenticationSchema.safeParse(payload)

          if (!parsed.success) { rejectSession(); return }
          const credentials = parsed.data

          const identity = await withState(databaseName, (state) => {
            const session = credentials.token ? state.sessions[credentials.token] : null
            if (credentials.token && (!session || session.expiresAt <= Date.now())) return null
            return { ownerId: session?.user.id ?? "guest:" + credentials.visitorId, epoch: state.epoch }
          })

          if (!isActive()) return
          if (!identity) { rejectSession(); return }

          ownerId = identity.ownerId
          token = credentials.token

          unsubscribe = subscribeSimulation(databaseName, (event) => {
            if (!isActive() || (event.ownerId !== null && event.ownerId !== ownerId)) return

            if (event.resource === "reset") {
              connection.client.close(1012, "Simulation reset");
              return
            }

            if (event.resource === "session") {
              void checkSession();
              return
            }

            const channel = event.resource === "catalog"
              ? "nft.updated"
              : event.resource === "order"
                ? "order.updated"
                : "resource.changed"

            bound.client.emit(channel, event)
          })

          bound.client.emit("session.accepted", identity)
        })().catch(() => { if (isActive()) connection.client.close(1011, "Authentication unavailable") })
      })

      const heartbeat = setInterval(() => { if (isActive()) connection.client.send("2") }, 20_000)
      const clock = setInterval(() => { void checkSession() }, 1_000)

      connection.client.addEventListener("close", () => {
        active = false
        unsubscribe()
        clearInterval(heartbeat)
        clearInterval(clock)
        clearTimeout(rejectionTimer)
      })
    })
}
