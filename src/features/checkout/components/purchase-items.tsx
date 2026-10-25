import React from "react";
import { ArtworkImage } from "../../../shared/components/artwork-image";
import { cn } from "../../../shared/lib/cn";
import { type QuoteItem, type QuoteTotals } from "../types/quote";

function PurchaseItem ({ item, receipt }: { readonly item: QuoteItem; readonly receipt: boolean }) {
  return (
    <li className={cn("grid grid-cols-[64px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 border-b border-border py-4", receipt && "border-panel-border")}>
      <ArtworkImage sizes="64px" src={item.image} alt="" className="row-span-2 size-16 rounded-artwork object-cover" />

      <div className="min-w-0">
        <p className="wrap-break-word text-sm leading-5 font-bold">{item.name} #{item.tokenId}</p>
        <p className="mt-1 text-xs leading-5 text-secondary">ID do token: #{item.tokenId.padStart(4, "0")}</p>
      </div>

      <div className="col-start-2 flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm leading-5 text-muted-foreground">(x {item.quantity})</span>
        <strong className="min-w-0 break-all text-sm leading-5 text-accent tabular-nums">{item.lineTotal} ETH</strong>
      </div>
    </li>
  )
}

export function PurchaseItems ({ items, receipt = false }: { readonly items: readonly QuoteItem[]; readonly receipt?: boolean }) {
  return (
    <div>
      <div className={cn("flex min-h-8 justify-between gap-3 border-b border-border pb-2 text-sm leading-6", receipt && "border-panel-border")}>
        <strong>NFTs</strong>
        <span>Subtotal</span>
      </div>

      <ul className="flex flex-col">
        {items.map((item) => <PurchaseItem key={item.cartItemId} item={item} receipt={receipt} />)}
      </ul>
    </div>
  )
}

export function PurchaseTotals ({ totals, receipt = false }: { readonly totals: QuoteTotals; readonly receipt?: boolean }) {
  return (
    <dl className={cn("mt-6 flex flex-col gap-4 text-sm [&>div]:flex [&>div]:flex-wrap [&>div]:justify-between [&>div]:gap-x-3 [&>div]:gap-y-1 [&>div]:leading-6 [&_dd]:text-right [&_dd]:text-base [&_dd]:tabular-nums", receipt && "ml-auto max-w-80")}>
      {!receipt && (
        <React.Fragment>
          <div>
            <dt>Subtotal</dt>
            <dd>{totals.subtotal} ETH</dd>
          </div>

          <div>
            <dt>Desconto do lançamento</dt>
            <dd>(-) {totals.discount === "0" ? "00.00" : totals.discount}</dd>
          </div>
        </React.Fragment>
      )}

      <div>
        <dt>Taxa de rede</dt>
        <dd>{totals.networkFee} ETH</dd>
      </div>

      {!receipt && (
        <div className="justify-end!">
          <dt className="sr-only">Estimativa da taxa</dt>
          <dd className="text-xs! leading-5 text-accent">Taxa estimada</dd>
        </div>
      )}

      <div className={cn("font-bold [&_dd]:text-accent", !receipt && "border-t border-border pt-4")}>
        <dt>Total</dt>
        <dd>{totals.total} ETH</dd>
      </div>
    </dl>
  )
}
