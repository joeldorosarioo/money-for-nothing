import { useQuery } from "@tanstack/react-query";
import { ArtworkImage } from "../../../shared/components/artwork-image";
import { Link } from "@tanstack/react-router";
import { useState, type SyntheticEvent } from "react";

import { useCatalogChange } from "../../live-updates/index";
import { type CatalogApi, RelatedNfts } from "../../catalog/index";
import { type QuoteApi } from "../../checkout/index";
import { explainError } from "../../../shared/http/api-client-error";
import { multiplyEth } from "../../../shared/money/eth";
import { Button } from "../../../shared/ui/button";
import { EmptyState, ErrorState } from "../../../shared/components/async-state";
import { Input } from "../../../shared/ui/input";
import { cn } from "../../../shared/lib/cn";
import { Skeleton } from "../../../shared/ui/skeleton";
import { QuantityControl } from "../../../shared/components/quantity-control";
import { useCart } from "../hooks/cart-context";

export function CartScreen ({ catalog, quotes }: { readonly catalog: CatalogApi; readonly quotes: QuoteApi }) {
  const {
    cart, loading, error, retry, scope, adding, changeItem, removeItem
  } = useCart();

  const catalogChange = useCatalogChange();

  const [coupon, setCoupon] = useState("");
  const [message, setMessage] = useState("");

  const quote = useQuery({
    queryKey: ["private", scope, "quote", cart?.version, coupon],
    queryFn: ({ signal }) => quotes.create(cart?.items[0]?.network ?? "ethereum", coupon, signal),
    enabled: Boolean(cart?.items.length),
    retry: false,
    staleTime: 30_000,
  });

  async function mutateLine (action: () => Promise<unknown>) {
    setMessage("");

    try {
      await action();
    } catch (cause) {
      setMessage(explainError(cause));
    }
  }

  function applyCoupon (event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const requestedCoupon = form.get("coupon");

    setCoupon((typeof requestedCoupon === "string" ? requestedCoupon : "").trim().toUpperCase());
  }

  return (
    <div className="mt-0 desktop:mt-8">
      <p className="mb-3 hidden text-[15px] leading-4 font-bold desktop:block">
        <Link to="/">Início</Link> / Mercado / Carrinho
      </p>

      <div className="relative mb-5 flex h-9 items-center desktop:hidden">
        <Link
          to="/" aria-label="Voltar ao catálogo"
          className="absolute left-0 flex size-9 items-center justify-center rounded-full border border-border bg-raised [&_img]:rotate-90"
        >
          <img src="/assets/0e8e8.svg" alt="" />
        </Link>

        <h1 className="w-full text-center text-xl leading-6 font-bold" aria-label="Seu carrinho de NFTs">
          Carrinho de NFTs
        </h1>
      </div>

      <h1 className="sr-only max-desktop:hidden">Seu carrinho de NFTs</h1>

      {loading ? (
        <Skeleton className="h-80" aria-label="Carregando carrinho" aria-busy="true" />
      ) : error ? (
        <ErrorState error={error} retry={retry} />
      ) : !cart || cart.items.length === 0 ? (
        <EmptyState>
          <h2>Seu carrinho está vazio</h2>
          <p>Explore a coleção e escolha seu próximo NFT.</p>

          <Button asChild>
            <Link to="/">Explorar NFTs</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="block desktop:grid desktop:grid-cols-[1fr_310px] desktop:gap-7 wide:grid-cols-[minmax(0,782px)_minmax(0,332px)] wide:gap-21.5">
          <div className="min-w-0">
            {catalogChange && cart.items.some((item) => item.nftId === catalogChange.subjectId) && (
              <p role="status" className="mb-4 text-sm text-accent">
                O preço ou a disponibilidade foi atualizado. Confira os itens e o total antes de finalizar.
              </p>
            )}

            <div className="mb-3 hidden h-7 grid-cols-[1fr_90px_90px_36px] border-b border-border text-base font-bold desktop:grid wide:grid-cols-[311px_138px_136px_1fr]">
              <span>NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
            </div>

            {cart.items.map((item) => {
              const title = item.name + " #" + item.tokenId

              return (
                <article key={item.id} className={cn(
                  "group relative mb-5 grid h-25 grid-cols-[102px_minmax(0,1fr)] grid-rows-[52px_48px] items-center gap-x-2 rounded-2xl bg-card pr-3",
                  "desktop:mb-3 desktop:h-17.5 desktop:grid-cols-[60px_1fr_90px_90px_24px] desktop:grid-rows-none",
                  "desktop:gap-3 desktop:rounded-none desktop:pr-0 wide:grid-cols-[70px_209px_122px_120px_136px_24px] wide:gap-4",
                )}>
                  <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} className="row-span-2 desktop:row-auto">
                    <ArtworkImage
                      src={item.image} alt={title}
                      sizes="(min-width: 1024px) 70px, 102px"
                      className="size-25.5 rounded-[14px] object-cover desktop:size-17.5 desktop:rounded-[5px]"
                    />
                  </Link>

                  <div className="mt-3.5 self-start desktop:mt-0 desktop:self-auto">
                    <h2 className="text-[15px] leading-4.5 font-bold desktop:text-base desktop:leading-5">
                      {title}
                    </h2>

                    <p className="hidden text-sm leading-5 text-secondary desktop:block">
                      ID do token: #{item.tokenId.padStart(4, "0")}
                    </p>

                    <p className="block text-sm leading-4.5 text-muted-foreground desktop:hidden">
                      Edição: {item.editionLabel.replace("Edição de ", "1/")}
                    </p>
                  </div>

                  <span className="hidden text-base font-bold text-muted-foreground wide:block">
                    {item.unitPrice} ETH
                  </span>

                  <QuantityControl
                    variant="cart"
                    quantity={item.quantity}
                    available={item.available}
                    disabled={adding}
                    label={"Quantidade de " + title}
                    onChange={(quantity) => { void mutateLine(() => changeItem(item.id, quantity, cart.version)) }}
                  />

                  <strong className="col-start-2 row-start-2 self-end pb-2.5 text-lg text-accent desktop:col-auto desktop:row-auto desktop:self-auto desktop:pb-0 desktop:text-base">
                    {multiplyEth(item.unitPrice, item.quantity)} ETH
                  </strong>

                  <button
                    disabled={adding}
                    aria-label={"Remover " + title}
                    onClick={() => { void mutateLine(() => removeItem(item.id, cart.version)) }}

                    className={cn(
                      "hidden h-10 w-6 items-center justify-center",
                      "max-desktop:group-focus-within:absolute max-desktop:group-focus-within:-top-3",
                      "max-desktop:group-focus-within:-right-3 max-desktop:group-focus-within:flex",
                      "max-desktop:group-focus-within:size-8 max-desktop:group-focus-within:rounded-full",
                      "max-desktop:group-focus-within:border max-desktop:group-focus-within:border-panel-border",
                      "max-desktop:group-focus-within:bg-raised desktop:flex",
                    )}
                  >
                    <img src="/assets/e196c.svg" alt="" />
                  </button>
                </article>
              )
            })}

            {message && <p role="alert" className="mt-1.5 text-xs leading-4.5 text-destructive">{message}</p>}
          </div>

          <section aria-label="Resumo da carteira" className={cn(
            "fixed inset-x-0 bottom-0 z-30 rounded-t-sheet bg-card px-6 pt-6 pb-9 shadow-dock",
            "tablet:mx-auto tablet:max-w-150",
            "desktop:static desktop:z-auto desktop:mx-0 desktop:max-w-none desktop:rounded-none",
            "desktop:bg-transparent desktop:p-0 desktop:shadow-none",
          )}>
            <h2 className="mb-6 hidden border-b border-border text-xl leading-6 font-bold desktop:block">
              Resumo da carteira
            </h2>

            <form onSubmit={applyCoupon} className="block">
              <label htmlFor="coupon" className="mb-1 hidden text-[15px] font-bold desktop:block">
                Código promocional
              </label>

              <div className="flex h-12.5 overflow-hidden rounded-sheet border border-panel-border desktop:h-10 desktop:overflow-visible desktop:rounded-none desktop:border-0">
                <Input
                  id="coupon"
                  name="coupon"
                  defaultValue={coupon}
                  placeholder="Digite o código promocional..."
                  className="rounded-l-xs rounded-r-none border-0 px-4 py-3 text-sm desktop:border desktop:border-primary desktop:p-2"
                />

                <Button className="rounded-sheet font-bold text-primary-foreground desktop:rounded-l-none desktop:rounded-r-xs desktop:font-medium" type="submit">
                  Aplicar
                </Button>
              </div>
            </form>

            {quote.isPending ? (
              <Skeleton className="mt-6 h-44" aria-label="Calculando valores do carrinho" aria-busy="true">
                <span className="sr-only" aria-live="polite">Calculando valores…</span>
              </Skeleton>
            ) : quote.isError ? (
              <div className="mt-1.5 text-xs leading-4.5 text-destructive" role="alert">
                {explainError(quote.error)}
                {coupon && <button onClick={() => { setCoupon("") }}>Remover cupom</button>}
              </div>
            ) : (
              <dl className="mt-3 flex flex-col gap-3 text-[15px] desktop:mt-6 [&>div]:flex [&>div]:justify-between [&>div]:gap-2 [&>div]:leading-5 [&_dd]:text-right [&_dd]:text-base desktop:[&_dd]:text-lg">
                <div>
                  <dt>Subtotal</dt>
                  <dd>{quote.data.totals.subtotal} ETH</dd>
                </div>

                <div>
                  <dt>Desconto do lançamento</dt>
                  <dd>(-) {quote.data.totals.discount === "0" ? "00.00" : quote.data.totals.discount}</dd>
                </div>

                <div>
                  <dt>Taxa de rede</dt>
                  <dd>{quote.data.totals.networkFee} ETH<small className="mt-0 block text-xs leading-4 text-accent desktop:mt-2">Taxa estimada</small></dd>
                </div>

                <div className="mt-1 text-lg font-bold desktop:mt-3 desktop:text-[15px] [&_dd]:text-accent">
                  <dt>Total</dt>
                  <dd>{quote.data.totals.total} ETH</dd>
                </div>
              </dl>
            )}

            <Button asChild className="mt-6 flex h-15 w-full rounded-sheet text-base font-bold text-primary-foreground desktop:h-auto desktop:rounded-control desktop:text-[15px] desktop:font-medium">
              <Link to="/checkout" search={{ coupon }}>Conectar e finalizar</Link>
            </Button>

            <Link to="/" className="mt-3 hidden text-center text-accent desktop:block">Continuar explorando</Link>
          </section>
        </div>
      )}

      <RelatedNfts presentation="cart" catalog={catalog} title="Colecionadores também viram" />
    </div>
  );
}
