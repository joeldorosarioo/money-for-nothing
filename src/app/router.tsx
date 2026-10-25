import { createRootRouteWithContext, createRoute, createRouter, Link, Navigate, Outlet, useRouterState, type SearchSchemaInput } from "@tanstack/react-router";
import { Heart, House, ShoppingBag, Store, UserRound } from "lucide-react";

import React, { lazy, Suspense, useEffect, type ReactNode } from "react";
import { AuthDialogProvider, useAuth, useAuthDialog } from "../features/auth/index";
import { useCart } from "../features/cart/index";
import { normalizeCatalogSearch, type CatalogApi, type CatalogSearch } from "../features/catalog/index";
import { CatalogScreen } from "../features/catalog/pages/catalog-screen";
import { type QuoteApi } from "../features/checkout/index";
import { type OrderApi, type PurchaseService } from "../features/orders/index";
import { type ProfileApi } from "../features/profile/index";
import { type SimulationApi } from "../features/simulation/index";
import { type WalletApi } from "../features/wallets/index";
import { ErrorState } from "../shared/components/async-state";
import { cn } from "../shared/lib/cn";
import { AccountLayout } from "./shell/account-layout";
import { SiteFooter } from "./shell/site-footer";
import { SiteHeader } from "./shell/site-header";

const WalletsScreen = lazy(async () => ({
  default: (await import("../features/wallets/pages/wallets-screen")).WalletsScreen,
}))

const ProfileScreen = lazy(async () => ({
  default: (await import("../features/profile/pages/profile-screen")).ProfileScreen,
}))

const AuthScreen = lazy(async () => ({
  default: (await import("../features/auth/pages/auth-screen")).AuthScreen,
}))

const NftDetailScreen = lazy(async () => ({
  default: (await import("../features/catalog/pages/nft-detail-screen")).NftDetailScreen,
}))

const SimulationScreen = lazy(async () => ({
  default: (await import("../features/simulation/pages/simulation-screen")).SimulationScreen,
}))

const CheckoutScreen = lazy(async () => ({
  default: (await import("../features/checkout/pages/checkout-screen")).CheckoutScreen,
}))

const OrderScreen = lazy(async () => ({
  default: (await import("../features/orders/pages/order-screen")).OrderScreen,
}))

const CartScreen = lazy(async () => ({
  default: (await import("../features/cart/pages/cart-screen")).CartScreen,
}))

const FavoritesScreen = lazy(async () => ({
  default: (await import("../features/favorites/pages/favorites-screen")).FavoritesScreen,
}))

export interface AppServices {
  readonly wallets: WalletApi
  readonly profiles: ProfileApi
  readonly catalog: CatalogApi
  readonly quotes: QuoteApi
  readonly orders: OrderApi
  readonly purchases: PurchaseService
  readonly simulation: SimulationApi | null
}

const rootRoute = createRootRouteWithContext<AppServices>()({
  component: RootLayout,
  errorComponent: RouteErrorScreen,
  notFoundComponent: NotFoundScreen,
})

function RouteErrorScreen () {
  return (
    <main id="main">
      <h1 className="sr-only">Falha no carregamento</h1>

      <ErrorState
        error={new Error("Não foi possível carregar esta tela. Tente recarregar a aplicação.")}
        retry={() => { window.location.reload() }}
      />
    </main>
  )
}

function RootLayout () {
  return (
    <AuthDialogProvider>
      <RootShell />
      <AuthDialog />
    </AuthDialogProvider>
  )
}

function AuthDialog () {
  const { dialog, close, changeMode, restoreFocus } = useAuthDialog()

  const href = useRouterState({ select: (state) => state.location.href })
  const isOnOrigin = dialog?.redirect === href

  useEffect(() => {
    if (dialog && !isOnOrigin) close()
  }, [dialog, isOnOrigin, close])

  return dialog && isOnOrigin ? (
    <Suspense fallback={null}>
      <AuthScreen
        key={dialog.mode}
        mode={dialog.mode}
        redirect={dialog.redirect}
        onClose={close}
        onModeChange={changeMode}
        onRestoreFocus={restoreFocus}
      />
    </Suspense>
  ) : null
}

function RootShell () {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isAuth = pathname === "/login" || pathname === "/signup"

  const isAccount = pathname === "/simulation"
    || pathname === "/profile"
    || pathname === "/wallets"
    || pathname === "/favorites"

  const isDetail = pathname.startsWith("/nfts/")
  const isCart = pathname === "/cart"
  const isCheckout = pathname === "/checkout" || pathname.startsWith("/orders/")

  return (
    <div className="relative min-h-dvh">
      <a className="fixed top-2 left-3 z-100 -translate-y-8/5 bg-primary p-3 text-primary-foreground focus:translate-y-0" href="#main">
        Pular para o conteúdo
      </a>

      <div className={cn(
        "mx-auto w-full px-5 pb-32 tablet:max-w-200 tablet:px-6",
        "desktop:w-[min(1200px,calc(100%-48px))] desktop:max-w-none desktop:px-0 desktop:py-6",
        isAuth && "hidden desktop:block desktop:min-h-screen",
        isAccount && "pt-6 pb-16 desktop:py-6",
        isDetail && "px-0 pb-56 tablet:max-w-150 desktop:max-w-none desktop:py-6",
        isCheckout && "px-5 pt-6 pb-8 tablet:px-6 desktop:px-0 desktop:py-6",
        isCart && "px-5 pt-6 pb-12 tablet:px-6 desktop:px-0 desktop:py-6",
      )}>
        <SiteHeader bordered={!isAuth && !isDetail && !isCart && !isCheckout} />

        <main id="main" tabIndex={-1} className={isDetail ? "desktop:min-h-[calc(100svh-96px)]" : undefined}>
          <Suspense fallback={
            <p className="flex min-h-150 items-center justify-center" aria-live="polite">Carregando tela…</p>
          }>
            <Outlet />
          </Suspense>
        </main>

        {!isAuth && !isAccount && <SiteFooter />}
      </div>

      {pathname === "/" && <MobileTabBar />}
    </div>
  )
}

function MobileTabBar () {
  const { cart } = useCart()
  const hash = useRouterState({ select: (state) => state.location.hash })

  const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-end gap-1 border-t border-panel-border bg-card px-2 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] text-xs text-muted-foreground shadow-dock desktop:hidden [&_a]:flex [&_a]:min-h-14 [&_a]:min-w-11 [&_a]:flex-col [&_a]:items-center [&_a]:justify-center [&_a]:gap-1 [&_a]:rounded-control [&_a:hover]:text-accent" aria-label="Navegação principal">
      <Link to="/" search={normalizeCatalogSearch({})} aria-label="Início" aria-current={!hash ? "page" : undefined} className={cn(!hash && "font-bold text-accent")}>
        <House className="size-5" aria-hidden="true" />
        <span>Início</span>
      </Link>

      <Link to="/favorites" aria-label="Meus favoritos">
        <Heart className="size-5" aria-hidden="true" />
        <span>Favoritos</span>
      </Link>

      <Link to="/cart" className="relative bg-primary text-primary-foreground hover:text-primary-foreground!" aria-label={"Carrinho, " + count.toString() + " itens"}>
        <ShoppingBag className="size-5" aria-hidden="true" />
        <span>Carrinho</span>
        {count > 0 && <span aria-hidden="true" className="absolute -top-2 right-0 min-w-5 rounded-full bg-foreground px-1 text-center text-xs leading-5 text-background">{count}</span>}
      </Link>

      <Link to="/" search={normalizeCatalogSearch({})} hash="catalogo" aria-label="Mercado" aria-current={hash === "catalogo" ? "location" : undefined} className={cn(hash === "catalogo" && "font-bold text-accent")}>
        <Store className="size-5" aria-hidden="true" />
        <span>Mercado</span>
      </Link>

      <Link to="/profile" aria-label="Meu perfil">
        <UserRound className="size-5" aria-hidden="true" />
        <span>Perfil</span>
      </Link>
    </nav>
  )
}

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: (search: Partial<CatalogSearch> & SearchSchemaInput) => normalizeCatalogSearch({ ...search }),
  component: HomeRoute,
})

function HomeRoute () {
  const services = rootRoute.useRouteContext()
  const search = homeRoute.useSearch()
  const navigate = homeRoute.useNavigate()

  return (
    <CatalogScreen
      catalog={services.catalog}
      search={search}
      updateSearch={(next) => {
        void navigate({ search: next, replace: false, resetScroll: false })
      }}
    />
  )
}

const detailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/nfts/$nftId",
  component: DetailRoute,
})

function DetailRoute () {
  const services = rootRoute.useRouteContext()
  const { nftId } = detailRoute.useParams()

  return <NftDetailScreen catalog={services.catalog} nftId={nftId} />
}

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cart",
  component: function CartRoute () {
    const services = rootRoute.useRouteContext()
    return <CartScreen catalog={services.catalog} quotes={services.quotes} />
  },
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",

  validateSearch: (input: { redirect?: string } & SearchSchemaInput) => ({
    redirect: typeof input.redirect === "string"
      && input.redirect.startsWith("/")
      && !input.redirect.startsWith("//") ? input.redirect : "/profile",
  }),

  component: function LoginRoute () {
    const { redirect } = loginRoute.useSearch()
    return <AuthRouteScreen mode="login" redirect={redirect} />
  },
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute, path: "/signup", validateSearch: loginRoute.options.validateSearch,

  component: function SignupRoute () {
    const { redirect } = signupRoute.useSearch()
    return <AuthRouteScreen mode="signup" redirect={redirect} />
  },
})

function AuthRouteScreen ({ mode, redirect }: { readonly mode: "login" | "signup"; readonly redirect: string }) {
  const { catalog } = rootRoute.useRouteContext()

  return (
    <React.Fragment>
      <div inert>
        <CatalogScreen
          presentation="auth"
          catalog={catalog}
          search={normalizeCatalogSearch({})}
          updateSearch={() => undefined}
        />
      </div>

      <AuthScreen key={mode} mode={mode} redirect={redirect} />
    </React.Fragment>
  )
}

function RequireSession ({ children, redirect }: { readonly children: ReactNode; readonly redirect: string }) {
  const { status } = useAuth()

  if (status === "guest") return <Navigate to="/login" search={{ redirect }} replace />

  if (status !== "authenticated") return (
    <p className="flex min-h-60 flex-col items-center justify-center gap-5 text-center" aria-live="polite">
      Recuperando sua sessão…
    </p>
  )

  return children
}

const profileRoute = createRoute({
  getParentRoute: () => rootRoute, path: "/profile", component: function ProfileRoute () {
    const { profiles } = rootRoute.useRouteContext()

    return (
      <RequireSession redirect="/profile">
        <AccountLayout>
          <ProfileScreen api={profiles} />
        </AccountLayout>
      </RequireSession>
    )
  },
})

const walletsRoute = createRoute({
  getParentRoute: () => rootRoute, path: "/wallets", component: function WalletsRoute () {
    const { wallets } = rootRoute.useRouteContext()

    return (
      <RequireSession redirect="/wallets">
        <AccountLayout>
          <WalletsScreen api={wallets} />
        </AccountLayout>
      </RequireSession>
    )
  },
})

const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute, path: "/favorites", component: function FavoritesRoute () {
    const { catalog } = rootRoute.useRouteContext()

    return (
      <RequireSession redirect="/favorites">
        <AccountLayout>
          <FavoritesScreen catalog={catalog} />
        </AccountLayout>
      </RequireSession>
    )
  },
})

const simulationRoute = createRoute({
  getParentRoute: () => rootRoute, path: "/simulation",
  component: function SimulationRoute () {
    const { simulation } = rootRoute.useRouteContext()
    return simulation ? <SimulationScreen api={simulation} /> : <NotFoundScreen />
  },
})

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute, path: "/checkout",

  validateSearch: (input: { coupon?: string } & SearchSchemaInput) => ({
    coupon: typeof input.coupon === "string" ? input.coupon.trim().toUpperCase().slice(0, 40) : "",
  }),

  component: function CheckoutRoute () {
    const { profiles, wallets, quotes, purchases } = rootRoute.useRouteContext()
    const { coupon } = checkoutRoute.useSearch()

    const navigate = checkoutRoute.useNavigate()
    const redirect = "/checkout" + (coupon ? "?coupon=" + encodeURIComponent(coupon) : "")

    return (
      <RequireSession redirect={redirect}>
        <CheckoutScreen
          profiles={profiles}
          wallets={wallets}
          quotes={quotes}
          purchases={purchases}
          coupon={coupon}
          onOrder={async (id) => { await navigate({ to: "/orders/$orderId", params: { orderId: id } }) }}
        />
      </RequireSession>
    )
  },
})

const orderRoute = createRoute({
  getParentRoute: () => rootRoute, path: "/orders/$orderId",
  component: function OrderRoute () {
    const { orders, purchases } = rootRoute.useRouteContext()
    const { orderId } = orderRoute.useParams()
    const navigate = orderRoute.useNavigate()

    return (
      <RequireSession redirect={"/orders/" + encodeURIComponent(orderId)}>
        <OrderScreen
          orderId={orderId}
          orders={orders}
          purchases={purchases}
          onClose={() => { void navigate({ to: "/cart" }) }}
        />
      </RequireSession>
    )
  },
})

function NotFoundScreen () {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center gap-5 text-center">
      <h1>Página não encontrada</h1>
      <Link to="/">Voltar ao catálogo</Link>
    </div>
  )
}

const routeTree = rootRoute.addChildren([
  homeRoute,
  detailRoute,
  cartRoute,
  loginRoute,
  signupRoute,
  profileRoute,
  walletsRoute,
  favoritesRoute,
  simulationRoute,
  checkoutRoute,
  orderRoute,
])

export function createAppRouter (services: AppServices) {
  return createRouter({ routeTree, context: services, scrollRestoration: true, defaultPreload: "intent" })
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
