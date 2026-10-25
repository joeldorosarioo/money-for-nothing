import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import React, { useEffect } from "react";

import { EmptyState, ErrorState } from "../../../shared/components/async-state";
import { FeatureNotice } from "../../../shared/components/feature-notice";
import { FormField } from "../../../shared/components/form-field";
import { Button } from "../../../shared/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../../../shared/ui/dialog";
import { useAuth } from "../../auth/index";
import { PurchaseItems, PurchaseTotals, WalletOptions, networkLabels, shortenAddress } from "../../checkout/index";
import { type OrderApi } from "../api/order-api";
import { type PurchaseService } from "../application/purchase-service";
import { formatReceiptDate } from "../helpers/receipt-date";

export function OrderScreen ({ orderId, orders, purchases, onClose }: {
  readonly orderId: string
  readonly orders: OrderApi
  readonly purchases: PurchaseService
  readonly onClose: () => void
}) {
  const { scope } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["private", scope, "order", orderId],
    queryFn: ({ signal }) => orders.get(orderId, signal),
    refetchInterval: (current) => current.state.data?.status === "pending" ? 700 : false,
  })

  const order = query.data

  useEffect(() => {
    if (!order || order.status === "pending") return
    purchases.observe(order)

    void queryClient.invalidateQueries({ queryKey: ["private", scope, "cart"] })
    void queryClient.invalidateQueries({ queryKey: ["catalog"] })
  }, [order, purchases, queryClient, scope])

  if (query.isPending) return <EmptyState><p aria-live="polite">Recuperando pedido…</p></EmptyState>
  if (query.isLoadingError) return <ErrorState error={query.error} retry={() => { void query.refetch() }} />
  if (!order) return null

  if (order.status === "pending") return (
    <EmptyState>
      <h1>Confirmando sua compra</h1>
      <p role="status">A confirmação está em andamento. Você pode recarregar esta página para acompanhar.</p>
      <p>Pedido: {order.id}</p>
      <p>Total: {order.snapshot.totals.total} ETH</p>

      {query.isRefetchError && <p role="alert">A conexão foi interrompida. Seu pedido foi preservado.</p>}
      <Button variant="outline" onClick={() => { void query.refetch() }}>Consultar pedido</Button>
    </EmptyState>
  )

  if (order.status === "rejected") return (
    <EmptyState>
      <h1>Compra não confirmada</h1>
      <p role="alert">{order.reason}</p><p>Os itens continuam no seu carrinho.</p>
      <Button asChild>
        <Link to="/cart">Revisar carrinho</Link>
      </Button>
    </EmptyState>
  )

  const network = order.snapshot.network === "ethereum"
    ? "Ethereum"
    : order.snapshot.network === "polygon"
      ? "Polygon"
      : "Solana"

  return (
    <React.Fragment>
      <div className="pointer-events-none absolute inset-0 z-60 hidden bg-overlay desktop:block" />

      <div className="mt-8 hidden min-h-206.5 desktop:block" inert aria-hidden="true">
        <p className="mb-8 font-bold">Início / Mercado / Pagamento</p>

        <div className="grid grid-cols-[minmax(0,763fr)_minmax(0,405fr)] gap-8">
          <div>
            <h2 className="mb-3 text-[17px] leading-5 font-bold">Perfil do colecionador</h2>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                "Nome de exibição",
                "Nome de usuário",
                "Rede",
                "Nome do perfil",
                "Endereço da carteira",
                "ENS ou carteira secundária (opcional)",
                "Tipo de carteira",
                "Código de indicação",
                "E-mail",
                "Nome ENS"
              ].map((label) => (
                <FormField
                  key={label}
                  variant="checkout"
                  id={"receipt-backdrop-" + label}
                  label={label}
                  required={!label.includes("opcional")}
                  error={undefined}
                >
                  <div className="h-10 rounded-input border border-border" />
                </FormField>
              ))}
            </div>

            <p className="mt-6 leading-5">Usar outra carteira?</p>
            <p className="mt-6 mb-2">Observação do colecionador (opcional)</p>

            <div className="h-38 max-w-87.5 rounded-input border border-border" />
          </div>

          <div>
            <h2 className="mb-2 text-[17px] font-bold">Seus NFTs</h2>
            <PurchaseItems items={order.snapshot.items} />
            <p className="mt-3 text-center text-sm leading-4">Tem um código promocional? Aplique aqui</p>
            <PurchaseTotals totals={order.snapshot.totals} />

            <div className="mt-3">
              <WalletOptions provider="coinbase" network={order.snapshot.network} onChange={() => undefined} />
            </div>

            <div className="mt-6 rounded-control bg-primary p-3 text-center font-bold text-primary-foreground">
              Confirmar compra
            </div>
          </div>
        </div>
      </div>

      <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
        <DialogContent showCloseButton={false} overlayClassName="desktop:hidden" className="[--receipt-top:24px] top-(--receipt-top) max-h-[calc(100dvh-var(--receipt-top)-24px)] w-[calc(100vw-32px)] translate-y-0 overflow-y-auto rounded-none border-0 p-0 desktop:absolute desktop:w-144.5 desktop:[--receipt-top:clamp(24px,calc(100dvh-914px),166px)]">
          <div className="flex min-h-39 flex-col items-center px-5 pt-5.5 pb-4.5">
            <img className="size-20" src="/assets/figma-thank-you.svg" alt="" />

            <DialogTitle className="mt-4 mb-0 text-center text-base leading-5 text-muted-foreground">
              Seus NFTs agora estão na sua carteira
            </DialogTitle>
          </div>

          <DialogDescription className="sr-only">
            Comprovante do pedido {order.id}, confirmado na {network}.
          </DialogDescription>

          <dl className="grid grid-cols-2 gap-y-3 border-y border-primary px-5 py-4 text-sm leading-4.5 text-muted-foreground desktop:min-h-16.5 desktop:grid-cols-[145fr_144fr_126fr_91fr] desktop:gap-0 desktop:px-9 desktop:py-3.75 desktop:whitespace-nowrap [&>div]:px-2 desktop:[&>div]:border-r desktop:[&>div]:border-primary desktop:[&>div:last-child]:border-0">
            <div>
              <dt className="font-bold">ID da transação</dt>
              <dd title={order.transactionReference}>{shortenAddress(order.transactionReference)}</dd>
            </div>

            <div>
              <dt>Data</dt>
              <dd>{formatReceiptDate(order.confirmedAt)}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd className="whitespace-nowrap">{order.snapshot.totals.total} ETH</dd>
            </div>

            <div>
              <dt className="font-bold">Carteira</dt>
              <dd title={order.snapshot.walletAddress}>{"0x…" + order.snapshot.walletAddress.slice(-4)}</dd>
            </div>
          </dl>

          <div className="px-5 pt-5 pb-12 desktop:px-11">
            <h2 className="mb-3 text-[15px] leading-4 font-bold">Detalhes da transação</h2>
            <PurchaseItems receipt items={order.snapshot.items} />
            <PurchaseTotals receipt totals={order.snapshot.totals} />

            <p className="mt-2 border-t border-panel-border pt-3 text-center text-sm leading-5.5 text-muted-foreground">
              Transação confirmada na {network}. A propriedade foi transferida para sua carteira conectada e registrada na rede.
            </p>

            <div className="mt-5 flex justify-center">
              <FeatureNotice title="Transação simulada" description={"Este comprovante pertence ao ambiente demonstrativo. Referência: " + order.transactionReference + ". A rede " + networkLabels[order.snapshot.network] + " não recebeu uma transação real."}>
                <Button className="h-12 px-4 text-base font-bold">Ver no Etherscan</Button>
              </FeatureNotice>
            </div>
          </div>

          <div className="h-2.5 bg-primary" />

          <DialogClose className="absolute top-4 right-3 flex size-6 items-center justify-center text-[22px] text-accent" aria-label="Fechar recibo">
            ×
          </DialogClose>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  )
}
