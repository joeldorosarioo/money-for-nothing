import { setupWorker } from "msw/browser";

import { createHandlers } from "./handlers";

function activateMocking (worker: ServiceWorker): Promise<void> {
  return new Promise((resolve, reject) => {
    const container = navigator.serviceWorker

    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error("Não foi possível restabelecer a conexão. Tente novamente."))
    }, 3_000)

    function cleanup () {
      window.clearTimeout(timeout)
      container.removeEventListener("message", onMessage)
    }

    function onMessage (event: MessageEvent<unknown>) {
      const message = event.data

      if (
        event.source !== worker
        || typeof message !== "object"
        || message === null
        || !("type" in message)
        || message.type !== "MOCKING_ENABLED"
      ) return

      cleanup()
      resolve()
    }

    container.addEventListener("message", onMessage)
    try {
      worker.postMessage("MOCK_ACTIVATE")
    } catch (error) {
      cleanup()
      reject(new Error("Não foi possível restabelecer a conexão. Tente novamente.", { cause: error }))
    }
  })
}

export async function startSimulation (): Promise<() => Promise<void>> {
  const worker = setupWorker(...createHandlers("browser-v1"))

  const registration = await worker.start({
    quiet: true,
    onUnhandledRequest (request, print) {
      if (new URL(request.url).pathname.startsWith("/api/")) {
        print.error()
      }
    },
  })

  let activation: Promise<void> | null = null

  return () => {
    if (!registration) return Promise.resolve()
    if (activation) return activation
    const activeWorker = registration.active

    if (!activeWorker) return Promise.reject(new Error("Não foi possível restabelecer a conexão. Tente novamente."))
    activation = activateMocking(activeWorker).finally(() => { activation = null })
    return activation
  }
}
