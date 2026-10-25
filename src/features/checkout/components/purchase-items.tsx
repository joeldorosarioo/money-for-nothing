import React from "react";
import { ArtworkImage } from "../../../shared/components/artwork-image";
import { cn } from "../../../shared/lib/cn";
import { purchaseArtworkStyle } from "../helpers/purchase-artwork-layout";
import { type QuoteItem, type QuoteTotals } from "../types/quote";

function PurchaseItem ({ item, receipt }: { readonly item: QuoteItem; readonly receipt: boolean }) {
  return (
    <li style={purchaseArtworkStyle(item.nftId, receipt)} className={cn(
      "flex min-h-17.5 items-center gap-2 bg-card", receipt
        ? "grid grid-cols-[70px_minmax(0,1fr)] gap-x-3 gap-y-1 bg-transparent desktop:relative desktop:block desktop:h-17.5"
        : "wide:relative wide:block wide:h-17.5",
    )}>
      <ArtworkImage sizes="70px" src={item.image} alt="" className={cn(
        "size-17.5 shrink-0 rounded-[6px] object-cover", receipt
          ? "row-span-2 desktop:absolute desktop:top-1/2 desktop:left-(--purchase-art-x) desktop:size-(--purchase-art-size) desktop:-translate-y-1/2"
          : "wide:absolute wide:top-1/2 wide:left-(--purchase-art-x) wide:size-(--purchase-art-size) wide:-translate-y-1/2",
      )} />

      <div className={cn(
        "min-w-0 flex-1", receipt
          ? "col-start-2 desktop:absolute desktop:top-1/2 desktop:left-(--purchase-title-x) desktop:-translate-y-1/2"
          : "wide:absolute wide:top-1/2 wide:left-(--purchase-title-x) wide:-translate-y-1/2",
      )}>
        <p className="text-base leading-4 font-bold">{item.name} #{item.tokenId}</p>
        <p className="mt-1.5 text-sm leading-4 text-secondary">ID do token: #{item.tokenId.padStart(4, "0")}</p>
      </div>

      <span className={cn(
        "shrink-0 text-sm leading-4 text-muted-foreground", receipt
          ? "col-start-2 row-start-2 self-start desktop:absolute desktop:top-1/2 desktop:left-(--purchase-quantity-x) desktop:-translate-y-1/2"
          : "wide:absolute wide:top-1/2 wide:left-(--purchase-quantity-x) wide:-translate-y-1/2",
      )}>
        (x {item.quantity})
      </span>

      <strong className={cn(
        "ml-1 shrink-0 text-lg leading-4 text-accent", receipt
          ? "col-start-2 row-start-2 ml-10 max-w-full justify-self-end self-start text-right text-base break-all desktop:absolute desktop:top-1/2 desktop:left-(--purchase-subtotal-x) desktop:ml-0 desktop:-translate-y-1/2 desktop:text-left desktop:text-lg desktop:break-normal desktop:whitespace-nowrap"
          : "wide:absolute wide:top-1/2 wide:left-(--purchase-subtotal-x) wide:ml-0 wide:-translate-y-1/2",
      )}>
        {item.lineTotal} ETH
      </strong>
    </li>
  )
}

export function PurchaseItems ({ items, receipt = false }: { readonly items: readonly QuoteItem[]; readonly receipt?: boolean }) {
  return (
    <div>
      <div className={cn("mb-3 flex h-7 justify-between border-b border-border text-base leading-4", receipt && "border-panel-border")}>
        <strong>NFTs</strong>
        {receipt && <strong className="ml-auto mr-12 hidden desktop:block">Edições</strong>}
        <span>Subtotal</span>
      </div>

      <ul className="flex flex-col gap-3">
        {items.map((item) => <PurchaseItem key={item.cartItemId} item={item} receipt={receipt} />)}
      </ul>
    </div>
  )
}

export function PurchaseTotals ({ totals, receipt = false }: { readonly totals: QuoteTotals; readonly receipt?: boolean }) {
  return (
    <dl className={cn("flex flex-col gap-3 [&>div]:flex [&>div]:justify-between [&>div]:gap-3 [&>div]:leading-5 [&_dd]:text-right [&_dd]:text-lg", receipt ? "mt-3 ml-auto max-w-80.25" : "mt-3")}>
      {!receipt && (
        <React.Fragment>
          <div>
            <dt>Subtotal</dt>
            <dd>{totals.subtotal} ETH</dd>
          </div>

          <div>
            <dt>Desconto do lançamento</dt>
            <dd className="text-[15px]!">(-) {totals.discount === "0" ? "00.00" : totals.discount}</dd>
          </div>
        </React.Fragment>
      )}

      <div>
        <dt>Taxa de rede</dt>
        <dd>{totals.networkFee} ETH</dd>
      </div>

      {!receipt && (
        <div className="justify-center! leading-4!">
          <dt className="sr-only">Estimativa da taxa</dt>
          <dd className="text-center! text-xs! leading-4 text-accent">Taxa estimada</dd>
        </div>
      )}

      <div className={cn("font-bold [&_dd]:text-accent", !receipt && "border-t border-border px-10.5 pt-3 leading-4! [&_dd]:leading-4")}>
        <dt>Total</dt>
        <dd>{totals.total} ETH</dd>
      </div>
    </dl>
  )
}
