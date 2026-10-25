import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ErrorState } from "../../../shared/components/async-state";
import { ApiClientError, explainError } from "../../../shared/http/api-client-error";
import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/button";
import { useAuth } from "../../auth/index";
import { type CartView } from "../../cart/index";
import { orderInputSchema } from "../../orders/api/order-contracts";
import { type PurchaseService } from "../../orders/index";
import { type CollectorProfile } from "../../profile/index";
import { type Wallet, type WalletApi, type WalletProvider } from "../../wallets/index";
import { type QuoteApi } from "../api/quote-api";
import { useQuoteExpiry } from "../hooks/use-quote-expiry";
import { CollectorFields, type CollectorValues } from "./collector-fields";
import { PurchaseItems, PurchaseTotals } from "./purchase-items";
import { WalletCards, WalletOptions } from "./wallet-options";

export function CheckoutForm ({
  quotes, walletApi, purchases, profile, wallets, cart, coupon, isCurrent, onOrder, onRecoveryNeeded, onSubmitting
}: {
  readonly quotes: QuoteApi
  readonly walletApi: WalletApi
  readonly purchases: PurchaseService
  readonly profile: CollectorProfile
  readonly wallets: readonly Wallet[]
  readonly cart: CartView
  readonly coupon: string
  readonly isCurrent: () => boolean
  readonly onOrder: (id: string) => Promise<void>
  readonly onRecoveryNeeded: () => void
  readonly onSubmitting: (pending: boolean) => void
}) {
  const { scope } = useAuth()

  const network = cart.items[0]?.network ?? "ethereum"
  const initialWallet = wallets.find((item) => item.network === network) ?? wallets[0]

  const [walletId, setWalletId] = useState(initialWallet?.id ?? "")
  const [provider, setProvider] = useState<WalletProvider>(initialWallet?.provider ?? "walletconnect")
  const [message, setMessage] = useState("")
  const [needsReview, setNeedsReview] = useState(false)
  const [acceptedCartVersion, setAcceptedCartVersion] = useState(cart.version)
  const [showDetails, setShowDetails] = useState(false)

  const form = useForm<CollectorValues>({
    defaultValues: {
      displayName: profile.displayName,
      username: profile.username,
      email: profile.email,
      ens: profile.ens,
      referralCode: initialWallet?.referralCode ?? "",
      notes: "",
    },
  })

  const quote = useQuery({
    queryKey: ["private", scope, "checkout-quote", cart.version, network, coupon],
    queryFn: ({ signal }) => quotes.create(network, coupon, signal),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const expired = useQuoteExpiry(quote.data?.id, quote.data?.expiresAt)
  const wallet = wallets.find((item) => item.id === walletId)
  const submitting = form.formState.isSubmitting
  const mismatch = wallet?.network !== network
  const changed = Boolean(quote.data && quote.isStale && !quote.isFetching)
  const reviewRequired = needsReview || acceptedCartVersion !== cart.version

  function selectWallet (id: string) {
    setWalletId(id)
    const next = wallets.find((item) => item.id === id)
    if (next?.network === "solana") setProvider("walletconnect")
  }

  async function refreshQuote () {
    setNeedsReview(true)
    await quote.refetch()
  }

  async function submit (collector: CollectorValues) {
    if (!wallet || !quote.data || reviewRequired || changed || expired || mismatch || !isCurrent()) return
    setMessage("")

    try {
      const connection = await walletApi.connect(wallet.id, provider)
      if (!isCurrent()) return
      const parsed = orderInputSchema.safeParse({ quoteId: quote.data.id, walletConnectionId: connection.id, collector })

      if (!parsed.success) {
        setShowDetails(true)

        for (const issue of parsed.error.issues) {
          const field = issue.path[1]

          if (
            field === "displayName"
            || field === "username"
            || field === "email"
            || field === "ens"
            || field === "referralCode"
            || field === "notes"
          ) {
            form.setError(field, {
              message: issue.message
            }, { shouldFocus: true })
          }
        }

        return
      }

      onSubmitting(true)
      const order = await purchases.submit(profile.id, parsed.data)
      if (isCurrent()) await onOrder(order.id)
    } catch (error) {
      if (!isCurrent()) return
      setMessage(explainError(error))

      if (error instanceof ApiClientError && error.code === "ORDER_IN_PROGRESS") {
        const pending = z.object({ orderId: z.string().min(1) }).safeParse(error.details)
        if (pending.success) { await onOrder(pending.data.orderId); return }
      }

      if (error instanceof ApiClientError && ["QUOTE_CHANGED", "QUOTE_EXPIRED"].includes(error.code)) {
        await refreshQuote()
      } else if (purchases.read(profile.id)) onRecoveryNeeded()
    } finally {
      if (isCurrent()) onSubmitting(false)
    }
  }

  if (!wallet) return (
    <ErrorState
      error={new Error("Selecione uma carteira válida.")}
      retry={() => { if (initialWallet) selectWallet(initialWallet.id) }}
    />
  )

  return (
    <div>
      <p className="mt-8 mb-8 hidden text-[15px] leading-4 font-bold desktop:block">Início / Mercado / Pagamento</p>

      <div className="mb-4 flex h-11 items-start gap-6 desktop:hidden">
        <Link
          to="/cart" aria-label="Voltar ao carrinho"
          className="flex size-8.75 shrink-0 items-center justify-center rounded-full border border-border bg-raised [&_img]:rotate-90"
        >
          <img src="/assets/0e8e8.svg" alt="" />
        </Link>

        <h1 className="pt-1.75 text-xl leading-6 font-bold">Pagamento com carteira</h1>
      </div>

      <h1 className="sr-only max-desktop:hidden">Pagamento</h1>

      <form
        noValidate onSubmit={(event) => { void form.handleSubmit(submit)(event) }}
        className="flex min-h-[calc(100svh-124px)] flex-col desktop:grid desktop:min-h-0 desktop:grid-cols-[minmax(0,763fr)_minmax(0,405fr)] desktop:gap-8"
      >
        <div className="order-2 desktop:order-0">
          <div className="mt-5 desktop:mt-0">
            <button
              className="cursor-pointer text-sm text-accent desktop:hidden"
              type="button"
              aria-expanded={showDetails}
              aria-controls="collector-details"
              onClick={() => { setShowDetails((previous) => !previous) }}
            >
              Dados do colecionador e resumo
            </button>

            <div id="collector-details" className={cn("mt-5 desktop:mt-0", !showDetails && "hidden desktop:block")}>
              <CollectorFields
                form={form}
                wallet={wallet}
                provider={provider}
                onProviderChange={setProvider}
                onWalletChange={selectWallet}
                wallets={wallets}
                disabled={submitting}
              />

              {quote.data && (
                <div className="mt-6 desktop:hidden">
                  <PurchaseItems items={quote.data.items} />
                  <PurchaseTotals totals={quote.data.totals} />
                </div>
              )}
            </div>
          </div>
        </div>

        <section className="contents desktop:block" aria-label="Seus NFTs e pagamento">
          <div className="hidden desktop:block"><h2 className="mb-2 text-[17px] leading-5 font-bold">Seus NFTs</h2>

            {quote.isPending ? (
              <p aria-live="polite">Calculando valores…</p>
            ) : quote.data && (
              <React.Fragment>
                <PurchaseItems items={quote.data.items} />

                <p className="mt-3 text-center text-sm leading-4">
                  Tem um código promocional? <Link className="text-accent underline underline-offset-2" to="/cart">Aplique aqui</Link>
                </p>

                <PurchaseTotals totals={quote.data.totals} />
              </React.Fragment>
            )}
          </div>

          <div className="desktop:mt-3">
            <div className="flex items-center justify-between text-base leading-4 desktop:hidden">
              <h2 className="font-bold">Carteira conectada</h2>
              <Link className="text-sm font-bold text-accent" to="/wallets">Trocar carteira</Link>
            </div>

            <div className="desktop:hidden">
              <WalletCards wallets={wallets} selectedId={walletId} onSelect={selectWallet} />
            </div>

            <WalletOptions provider={provider} network={wallet.network} onChange={setProvider} disabled={submitting} />
          </div>

          <p className="mt-4 text-right text-base leading-5 font-bold desktop:hidden">
            Total: <strong className="ml-4 text-lg text-accent">{quote.data?.totals.total ?? "…"} ETH</strong>
          </p>

          <div className="order-3 mt-4">
            {quote.isError && (
              <div role="alert">
                <p>{explainError(quote.error)}</p>
                <Button variant="outline" type="button" onClick={() => { void refreshQuote() }}>Atualizar cotação</Button>
                <Link to="/cart" className="ml-3 text-accent">Revisar carrinho</Link>
              </div>
            )}

            {message && <p role="alert" className="mb-3 text-sm text-destructive">{message}</p>}
            {mismatch && <p role="alert" className="mb-3 text-sm text-destructive">Use uma carteira da mesma rede dos NFTs: {network}.</p>}

            {(expired || changed) && !quote.isError && (
              <div className="mb-3" role="status">
                <p>{expired ? "A cotação expirou." : "O preço ou a disponibilidade mudou. Confira a nova cotação."}</p>

                <Button variant="outline" type="button" disabled={quote.isFetching} onClick={() => { void refreshQuote() }}>
                  Atualizar cotação
                </Button>
              </div>
            )}

            {reviewRequired && !expired && !changed && quote.data && !quote.isFetching && (
              <Button
                className="mb-3 w-full"
                variant="outline"
                type="button"
                onClick={() => { setNeedsReview(false); setAcceptedCartVersion(cart.version); setMessage("") }}
              >
                Aceitar nova cotação
              </Button>
            )}
          </div>

          <Button
            type="submit" disabled={submitting || !quote.data || quote.isError || quote.isFetching || expired || changed || reviewRequired || mismatch}
            className="order-4 mt-auto h-15 w-full rounded-sheet text-[15px] font-bold desktop:mt-2 desktop:h-11.25 desktop:rounded-lg"
          >
            {submitting ? "Confirmando…" : "Confirmar compra"}
          </Button>
        </section>
      </form>
    </div>
  )
}
