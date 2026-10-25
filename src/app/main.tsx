import "./styles.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createSimulationApi } from "../features/simulation/api/simulation-api";
import { LiveUpdatesBoundary } from "./providers/live-updates-boundary";

import { createHttpAuthRepository } from "../features/auth/api/http-auth-repository";
import { createSessionService, type SessionService } from "../features/auth/application/session-service";
import { AuthProvider } from "../features/auth/components/auth-provider";
import { browserSessionPersistence } from "../features/auth/storage/browser-session-persistence";
import { createCartApi } from "../features/cart/api/cart-api";
import { createCatalogApi } from "../features/catalog/api/catalog-api";
import { createQuoteApi } from "../features/checkout/api/quote-api";
import { createFavoritesApi } from "../features/favorites/api/favorites-api";
import { createOrderApi, isDefinitivePurchaseFailure } from "../features/orders/api/order-api";
import { createPurchaseService } from "../features/orders/application/purchase-service";
import { browserPurchasePersistence } from "../features/orders/storage/browser-purchase-persistence";
import { createProfileApi } from "../features/profile/api/profile-api";
import { createWalletApi } from "../features/wallets/api/wallet-api";
import { ApiClientError } from "../shared/http/api-client-error";
import { createHttpClient } from "../shared/http/create-http-client";
import { SessionCartBoundary } from "./providers/session-cart-boundary";
import { SessionFavoritesBoundary } from "./providers/session-favorites-boundary";
import { createAppRouter } from "./router";

async function bootstrap () {
  const simulationReady = import.meta.env.VITE_ENABLE_MOCKS !== "false"
    ? import("../mocks/browser").then((simulation) => simulation.startSimulation())
    : Promise.resolve(() => Promise.resolve())

  async function ensureSimulationReady () {
    const ensureActive = await simulationReady
    await ensureActive()
  }

  const storageKey = "kurio.visitor.v1"
  const savedVisitorId = localStorage.getItem(storageKey)

  const visitorId = savedVisitorId && /^[a-zA-Z0-9-]{1,100}$/.test(savedVisitorId)
    ? savedVisitorId : crypto.randomUUID()

  localStorage.setItem(storageKey, visitorId)

  const http = createHttpClient(visitorId, () => session.getToken(), (token) => { session.expire(token) })
  http.interceptors.request.use(async (config) => { await ensureSimulationReady(); return config })

  const session: SessionService = createSessionService({
    repository: createHttpAuthRepository(http), persistence: browserSessionPersistence,
    async mergeGuestCart (mergeId, signal) { await http.post("/cart/merge", { mergeId }, { signal }) },

    createId: () => crypto.randomUUID(),
    isUnauthorized: (error) => error instanceof ApiClientError && error.status === 401,
  })

  void session.restore()
  const cart = createCartApi(http)
  const favorites = createFavoritesApi(http)
  const orders = createOrderApi(http)

  const purchases = createPurchaseService({
    submitOrder: orders.submit, getOrder: orders.get,
    persistence: browserPurchasePersistence, createId: () => crypto.randomUUID(),
    isDefinitiveFailure: isDefinitivePurchaseFailure,
  })

  const router = createAppRouter({
    orders, purchases,
    simulation: import.meta.env.VITE_ENABLE_MOCKS === "false" ? null : createSimulationApi(http),
    catalog: createCatalogApi(http),
    profiles: createProfileApi(http),
    wallets: createWalletApi(http),
    quotes: createQuoteApi(http),
  })

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        retry: (failureCount, error) => failureCount < 1
          && !(error instanceof ApiClientError && [401, 403, 404, 409, 422].includes(error.status)),
      },
    },
  })

  const container = document.getElementById("root")

  if (!container) throw new Error("Root element is missing.")
  const root = createRoot(container)

  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider service={session}>
          <SessionCartBoundary api={cart}>
            <SessionFavoritesBoundary api={favorites}>
              <LiveUpdatesBoundary ensureReady={ensureSimulationReady} visitorId={visitorId}>
                <RouterProvider router={router} />
              </LiveUpdatesBoundary>
            </SessionFavoritesBoundary>
          </SessionCartBoundary>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  )

  try {
    await simulationReady
  } catch (error) {
    root.unmount()
    throw error
  }
}

void bootstrap().catch((error: unknown) => {
  const root = document.getElementById("root")

  if (root) {
    root.textContent = error instanceof Error
      ? "Não foi possível iniciar a Kurio: " + error.message : "Não foi possível iniciar a Kurio."
  }
})
