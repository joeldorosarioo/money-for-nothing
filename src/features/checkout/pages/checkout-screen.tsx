import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { EmptyState, ErrorState } from "../../../shared/components/async-state";
import { explainError } from "../../../shared/http/api-client-error";
import { Button } from "../../../shared/ui/button";
import { Skeleton } from "../../../shared/ui/skeleton";
import { useAuth } from "../../auth/index";
import { useCart, type CartView } from "../../cart/index";
import { type PurchaseService } from "../../orders/index";
import { type ProfileApi } from "../../profile/index";
import { type WalletApi } from "../../wallets/index";
import { type QuoteApi } from "../api/quote-api";
import { CheckoutForm } from "../components/checkout-form";

export function CheckoutScreen ({ profiles, wallets, quotes, purchases, coupon, onOrder }: {
  readonly profiles: ProfileApi
  readonly wallets: WalletApi
  readonly quotes: QuoteApi
  readonly purchases: PurchaseService
  readonly coupon: string
  readonly onOrder: (id: string) => Promise<void>
}) {
  const { scope, session, service } = useAuth()

  const cart = useCart()

  const [recoveryError, setRecoveryError] = useState("")
  const [recovering, setRecovering] = useState(false)

  const ownerId = session?.user.id ?? ""

  const [attempt, setAttempt] = useState(() => purchases.read(ownerId))
  const [submittedCart, setSubmittedCart] = useState<CartView | null>(null)

  const active = useRef(true)
  const checkoutCart = submittedCart ?? cart.cart

  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])

  const query = useQuery({
    queryKey: ["private", scope, "checkout-details"],
    enabled: !attempt,

    queryFn: async ({ signal }) => {
      const [profile, walletList] = await Promise.all([profiles.get(signal), wallets.list(signal)])
      return { profile, wallets: walletList }
    },
  })

  const isCurrent = () => {
    const current = service.getSnapshot()
    return active.current
      && current.status === "authenticated"
      && ((current.session?.user.id ?? "guest") + ":" + current.generation.toString()) === scope
  }

  async function recover () {
    setRecovering(true)
    setRecoveryError("")

    try {
      const order = await purchases.recover(ownerId)
      if (isCurrent()) await onOrder(order.id)
    } catch (error) {
      if (isCurrent()) { setRecoveryError(explainError(error)); setAttempt(purchases.read(ownerId)) }
    } finally {
      if (isCurrent()) setRecovering(false)
    }
  }

  if (attempt) return (
    <EmptyState>
      <h1>Recuperar sua compra</h1>
      <p>Sua tentativa foi preservada. Confira o resultado antes de comprar novamente.</p>
      {recoveryError && <p role="alert">{recoveryError}</p>}

      <Button disabled={recovering} onClick={() => { void recover() }}>
        {recovering ? "Recuperando…" : "Recuperar compra"}
      </Button>

      <Link className="text-accent" to="/cart">Voltar ao carrinho</Link>
    </EmptyState>
  )

  if (cart.loading || query.isPending) return <Skeleton className="mt-8 h-150" aria-label="Carregando pagamento" />
  if (cart.error) return <ErrorState error={cart.error} retry={cart.retry} />
  if (query.isError) return <ErrorState error={query.error} retry={() => { void query.refetch() }} />

  if (!checkoutCart || checkoutCart.items.length === 0) return (
    <EmptyState>
      <h1>Seu carrinho está vazio</h1>

      <Button asChild>
        <Link to="/">Explorar NFTs</Link>
      </Button>
    </EmptyState>
  )

  if (query.data.wallets.items.length === 0) return (
    <EmptyState>
      <h1>Cadastre uma carteira para continuar</h1>

      <Button asChild>
        <Link to="/wallets">Cadastrar carteira</Link>
      </Button>
    </EmptyState>
  )

  return (
    <CheckoutForm
      key={scope}
      quotes={quotes}
      walletApi={wallets}
      purchases={purchases}
      coupon={coupon}
      profile={query.data.profile}
      wallets={query.data.wallets.items}
      cart={checkoutCart}
      isCurrent={isCurrent}
      onOrder={onOrder}
      onRecoveryNeeded={() => { setAttempt(purchases.read(ownerId)) }}
      onSubmitting={(pending) => { setSubmittedCart(pending ? checkoutCart : null) }}
    />
  )
}
