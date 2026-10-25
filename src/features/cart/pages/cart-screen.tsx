import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
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
  const network = cart?.items[0]?.network ?? "ethereum";

  const quote = useQuery({
    queryKey: ["private", scope, "quote", cart?.version, coupon, cart?.id, network],
    queryFn: ({ signal }) => quotes.create(network, coupon, signal),
    placeholderData (previous, previousQuery) {
      return previousQuery?.queryKey[1] === scope
        && previous?.cartId === cart?.id
        && previous?.network === network
        && (previous.coupon ?? "") === coupon ? previous : undefined
    },
    enabled: Boolean(cart?.items.length),
    retry: false,
    staleTime: 30_000,
  });
  const updatingQuote = adding || quote.isFetching || quote.isPlaceholderData;
  const canContinue = quote.isSuccess && !updatingQuote
    && quote.data.cartId === cart?.id && quote.data.cartVersion === cart.version;

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

      <div className="relative mb-6 flex min-h-11 items-center desktop:hidden">
        <Link
          to="/" aria-label="Voltar ao catálogo"
          className="absolute left-0 flex size-11 items-center justify-center rounded-full border border-input bg-raised [&_img]:rotate-90"
        >
          <img src="/assets/0e8e8.svg" alt="" />
        </Link>

        <h1 className="w-full pl-14 text-lg leading-6 font-bold" aria-label="Seu carrinho de NFTs">
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
        <div className="block desktop:grid desktop:grid-cols-[minmax(0,1fr)_290px] desktop:gap-6 wide:grid-cols-[minmax(0,1fr)_310px] wide:gap-10">
          <div className="min-w-0">
            {catalogChange && cart.items.some((item) => item.nftId === catalogChange.subjectId) && (
              <p role="status" className="mb-4 text-sm text-accent">
                O preço ou a disponibilidade foi atualizado. Confira os itens e o total antes de finalizar.
              </p>
            )}

            <div className="mb-3 hidden min-h-8 grid-cols-[minmax(0,1fr)_140px_100px_44px] gap-3 border-b border-border text-sm font-bold desktop:grid">
              <span>NFTs</span>
              <span>Quantidade</span>
              <span>Total</span>
              <span className="sr-only">Remover</span>
            </div>

            {cart.items.map((item) => {
              const title = item.name + " #" + item.tokenId

              return (
                <article key={item.id} className={cn(
                  "relative mb-4 grid grid-cols-[64px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 rounded-artwork bg-card p-3",
                  "desktop:mb-3 desktop:grid-cols-[60px_minmax(0,1fr)_140px_100px_44px] desktop:items-center desktop:gap-3 desktop:p-0 desktop:py-3 desktop:bg-transparent desktop:border-b desktop:border-border desktop:rounded-none",
                )}>
                  <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} className="row-span-3 self-start desktop:row-auto">
                    <ArtworkImage
                      src={item.image} alt={title}
                      sizes="64px"
                      className="size-16 rounded-input object-cover desktop:size-15"
                    />
                  </Link>

                  <div className="min-w-0 pr-10 desktop:pr-0">
                    <h2 className="wrap-break-word text-sm leading-5 font-bold">
                      {title}
                    </h2>

                    <p className="hidden text-xs leading-5 text-secondary desktop:block">
                      ID do token: #{item.tokenId.padStart(4, "0")}
                    </p>

                    <p className="hidden text-xs leading-5 text-muted-foreground wide:block">
                      {item.unitPrice} ETH / unidade
                    </p>

                    <p className="block text-xs leading-5 text-muted-foreground desktop:hidden">
                      Edição: {item.editionLabel.replace("Edição de ", "1/")}
                    </p>
                  </div>

                  <QuantityControl
                    variant="cart"
                    quantity={item.quantity}
                    available={item.available}
                    disabled={adding}
                    label={"Quantidade de " + title}
                    onChange={(quantity) => { void mutateLine(() => changeItem(item.id, quantity, cart.version)) }}
                  />

                  <strong className="col-start-2 row-start-2 text-base leading-6 text-accent tabular-nums desktop:col-auto desktop:row-auto desktop:text-sm">
                    {multiplyEth(item.unitPrice, item.quantity)} ETH
                  </strong>

                  <button
                    disabled={adding}
                    aria-label={"Remover " + title}
                    onClick={() => { void mutateLine(() => removeItem(item.id, cart.version)) }}

                    className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-control text-muted-foreground hover:bg-raised hover:text-destructive desktop:static"
                  >
                    <Trash2 className="size-4.5" aria-hidden="true" />
                  </button>
                </article>
              )
            })}

            {message && <p role="alert" className="mt-1.5 text-xs leading-4.5 text-destructive">{message}</p>}
          </div>

          <section aria-label="Resumo da carteira" className={cn(
            "mt-8 rounded-artwork bg-card p-6 desktop:mt-0 desktop:self-start",
          )}>
            <h2 className="mb-4 border-b border-border pb-4 text-lg leading-6 font-bold">
              Resumo da carteira
            </h2>

            <form onSubmit={applyCoupon} className="block">
              <label htmlFor="coupon" className="mb-2 block text-sm font-medium">
                Código promocional
              </label>

              <div className="flex gap-2">
                <Input
                  id="coupon"
                  name="coupon"
                  defaultValue={coupon}
                  placeholder="Ex.: KURIO10"
                  className="px-3 text-sm"
                />

                <Button className="px-3 text-sm" type="submit">
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
              <dl aria-busy={updatingQuote} className="mt-6 flex flex-col gap-4 text-sm [&>div]:flex [&>div]:justify-between [&>div]:gap-2 [&>div]:leading-5 [&_dd]:text-right [&_dd]:text-base">
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

                <div className="mt-1 border-t border-border pt-4 text-base font-bold [&_dd]:text-accent">
                  <dt>Total</dt>
                  <dd>{quote.data.totals.total} ETH</dd>
                </div>
              </dl>
            )}

            {canContinue ? (
              <Button asChild className="mt-6 flex min-h-12 w-full rounded-control text-sm font-bold">
                <Link to="/checkout" search={{ coupon }}>Conectar e finalizar</Link>
              </Button>
            ) : (
              <Button disabled className="mt-6 flex min-h-12 w-full rounded-control text-sm font-bold">
                Conectar e finalizar
              </Button>
            )}

            <Link to="/" className="mt-3 hidden text-center text-accent desktop:block">Continuar explorando</Link>
          </section>
        </div>
      )}

      <RelatedNfts presentation="cart" catalog={catalog} title="Colecionadores também viram" />
    </div>
  );
}
