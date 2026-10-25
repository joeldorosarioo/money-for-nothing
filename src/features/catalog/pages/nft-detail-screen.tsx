import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import React, { useState } from "react";
import { preload } from "react-dom";

import { detailArtworkSizes } from "../../../shared/artwork/artwork-sizes";
import { artworkSources } from "../../../shared/artwork/artwork-sources";
import { ArtworkImage } from "../../../shared/components/artwork-image";
import { EmptyState, ErrorState } from "../../../shared/components/async-state";
import { QuantityControl } from "../../../shared/components/quantity-control";
import { explainError } from "../../../shared/http/api-client-error";
import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../../../shared/ui/dialog";
import { Skeleton } from "../../../shared/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../shared/ui/tabs";
import { useCart } from "../../cart/index";
import { FavoriteButton } from "../../favorites/index";
import { type CatalogApi } from "../api/catalog-api";
import { RelatedNfts } from "../components/related-nfts";
import { type Nft } from "../types/nft";

function NftDetails ({ nft }: { readonly nft: Nft }) {
  const [quantity, setQuantity] = useState(1)
  const [selectedEdition, setSelectedEdition] = useState(nft.editions[0]?.id ?? "")
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  const { addItem, adding } = useCart()

  const edition = nft.editions.find((candidate) => candidate.id === selectedEdition) ?? nft.editions[0]
  const title = nft.name + " #" + nft.tokenId
  const artwork = artworkSources(nft.image, detailArtworkSizes)

  preload(nft.image, {
    as: "image",
    fetchPriority: "high",
    imageSrcSet: artwork.srcSet,
    imageSizes: artwork.sizes
  })

  if (!edition) return <EmptyState>Este NFT não possui edições disponíveis.</EmptyState>

  async function addToCart () {
    setNotice("")
    setError("")

    try {
      await addItem({ nftId: nft.id, editionId: selectedEdition, quantity })
      setNotice("NFT adicionado ao carrinho.")
    } catch (cause) {
      setError(explainError(cause))
    }
  }

  const quantityProps = {
    quantity,
    available: edition.available,
    onChange: setQuantity,
    label: "Quantidade de " + title,
    disabled: adding,
  }

  return (
    <React.Fragment>
      <div className="block desktop:grid desktop:grid-cols-[48%_minmax(0,1fr)] desktop:gap-6 wide:grid-cols-[573px_1fr] wide:gap-8">
        <div className="relative block h-107.5 min-w-0 bg-[linear-gradient(137.64deg,var(--card)_0%,var(--raised)_100%)] px-7 pt-16.5 tablet:h-137.5 desktop:flex desktop:h-auto desktop:gap-4 desktop:bg-none desktop:p-0 wide:gap-7">
          <div className="hidden w-18 shrink-0 flex-col gap-4 desktop:flex wide:w-25">
            {[0, 1, 2, 3].map((position) => (
              <button key={position} aria-label={"Ver imagem " + (position + 1).toString() + " de " + title}>
                <ArtworkImage
                  sizes="(min-width: 1331px) 100px, 72px"
                  className="size-18 rounded-[5px] object-cover wide:size-25"
                  src={nft.image}
                  alt=""
                />
              </button>
            ))}
          </div>

          <div className="relative m-0 h-auto w-full overflow-hidden rounded-3xl p-0 desktop:mt-0.5 desktop:flex-1 desktop:rounded-[5px] desktop:bg-card desktop:p-5 wide:h-111 wide:w-111 wide:flex-initial">
            <ArtworkImage
              sizes={detailArtworkSizes}
              className="aspect-square h-auto w-full rounded-3xl object-cover desktop:rounded-[22px] wide:size-101"
              src={nft.image}
              alt={title}
              fetchPriority="high"
            />

            <Dialog>
              <DialogTrigger asChild>
                <button className="absolute top-3 right-3 hidden rounded-full bg-raised p-1.25 desktop:block" aria-label="Ampliar imagem do NFT">
                  <img src="/assets/bd8c9.svg" alt="" />
                </button>
              </DialogTrigger>

              <DialogContent showCloseButton={false} className="w-[min(750px,calc(100vw-40px))] p-4">
                <DialogTitle className="sr-only">{title}</DialogTitle>
                <DialogDescription className="sr-only">Imagem ampliada da obra.</DialogDescription>
                <img className="w-full" src={nft.image} alt={title} />

                <DialogClose className="absolute top-2 right-3 w-8 text-[28px] leading-8" aria-label="Fechar imagem">
                  ×
                </DialogClose>
              </DialogContent>
            </Dialog>
          </div>

          <Link
            to="/"
            className="absolute top-5.75 left-7 flex size-9 items-center justify-center rounded-full border border-border bg-raised desktop:hidden [&_img]:rotate-90"
            aria-label="Voltar ao catálogo"
          >
            <img src="/assets/0e8e8.svg" alt="" />
          </Link>

          <FavoriteButton nftId={nft.id} title={title} className="absolute top-5.75 right-6 flex size-9 items-center justify-center rounded-full border border-border bg-raised desktop:hidden">
            <img src="/assets/d427d.svg" alt="" />
          </FavoriteButton>
        </div>

        <div className="relative -mt-9.5 min-w-0 rounded-t-4xl bg-card px-6 pt-8 pb-5 desktop:mt-0 desktop:rounded-none desktop:bg-transparent desktop:p-0">
          <div className="flex items-center justify-between gap-2 desktop:block">
            <h1 className="text-xl leading-6 font-bold desktop:text-[28px] desktop:leading-9">{title}</h1>

            <span className="block rounded-4xl border border-primary px-1.5 py-0.75 text-sm whitespace-nowrap text-foreground desktop:hidden [&>span]:text-muted-foreground">
              ★ 4.8<span>(19)</span>
            </span>
          </div>

          <div className="mt-3.25 hidden justify-between border-b border-border pb-3 desktop:flex">
            <strong className="text-[22px] leading-5 text-accent">{edition.unitPrice} ETH</strong>

            <span className="flex items-center gap-1 text-[15px] whitespace-nowrap desktop:[&>span:last-child]:text-[11px] wide:[&>span:last-child]:text-[15px]">
              <span className="flex gap-1" role="img" aria-label="4,8 de 5 estrelas">
                {[0, 1, 2, 3, 4].map((index) => (
                  <span className="grid size-3.75 place-items-center" key={index}>
                    <img src={index === 4 ? "/assets/89357.svg" : "/assets/19a5f.svg"} alt="" />
                  </span>
                ))}
              </span>

              <span>19 avaliações de colecionadores</span>
            </span>
          </div>

          <div className="mt-3 min-h-17.75 desktop:min-h-23.5">
            <h2 className="mb-3 hidden text-[15px] leading-4 font-bold desktop:block">Sobre este NFT:</h2>
            <p className="hidden text-sm leading-6 text-secondary desktop:block">{nft.description}</p>

            <p className="block text-sm leading-6 text-muted-foreground desktop:hidden">
              Um colecionável digital 1/{edition.totalSupply} finalizado à mão da coleção Kurio Editions,
              verificado na {nft.network === "ethereum" ? "Ethereum" : nft.network === "polygon" ? "Polygon" : "Solana"}.
            </p>
          </div>

          <fieldset className="mt-4 flex gap-3 border-0 p-0 desktop:mt-3.5 desktop:gap-1">
            <legend className="mb-2 text-[15px] leading-4 font-bold desktop:mb-3">Edição:</legend>

            {[...nft.editions].reverse().map((option) => (
              <label className={cn(
                "cursor-pointer rounded-[50%] border border-border px-1.5 py-1.25 text-sm leading-4 text-secondary",
                "has-focus-visible:outline-2 has-focus-visible:outline-accent desktop:px-1.25 desktop:py-0.75",
                option.id === edition.id && "border-primary text-accent",
              )} key={option.id}>
                <input
                  type="radio"
                  className="sr-only"
                  name="edition"
                  value={option.id}
                  checked={option.id === edition.id}
                  disabled={option.available === 0}
                  onChange={() => { setSelectedEdition(option.id); setQuantity(1); setNotice("") }}
                />

                {"1/" + option.totalSupply.toString()}
              </label>
            ))}

            <span
              className="cursor-pointer rounded-[50%] border border-border px-1.5 py-1.25 text-sm leading-4 text-secondary desktop:px-1.25 desktop:py-0.75"
              title="Edição aberta indisponível neste NFT"
            >
              ABERTA
            </span>
          </fieldset>

          <div className="my-3 hidden items-center gap-2 desktop:flex *:data-[slot=button]:min-w-32.5">
            <QuantityControl {...quantityProps} className="mr-auto" />

            <Button
              aria-label="Adicionar ao carrinho"
              disabled={adding || edition.available === 0}
              onClick={() => { void addToCart() }}
            >
              {adding ? "ADICIONANDO…" : "COMPRAR"}
            </Button>

            <FavoriteButton nftId={nft.id} title={title} showLabel>
              <img src="/assets/d427d.svg" alt="" />
            </FavoriteButton>
          </div>

          <div className="mt-3 flex flex-col gap-3 text-[15px] leading-5 text-secondary desktop:mt-0">
            <p>ID do token: #{nft.tokenId.padStart(4, "0")}</p><p>Coleção: Kurio Apes</p>
            <p>Atributos: Óculos, Esmeralda, Raro</p>
          </div>

          <div className="mt-3 hidden items-center gap-2 text-[15px] desktop:flex [&_strong]:font-bold">
            <strong>Compartilhar este NFT:</strong>

            <button aria-label="Copiar link do NFT" onClick={() => {
              void navigator.clipboard
                .writeText(window.location.href)
                .then(() => { setNotice("Link copiado.") }, () => { setError("Não foi possível copiar o link.") })
            }}>
              <img src="/assets/a4abe.svg" alt="" />
            </button>

            <a href={"mailto:?subject=" + encodeURIComponent(title)} aria-label="Compartilhar por e-mail">
              <img src="/assets/bec29.svg" alt="" />
            </a>

            <a
              href={"https://twitter.com/intent/tweet?text=" + encodeURIComponent(title)}
              target="_blank"
              rel="noreferrer"
              aria-label="Compartilhar no Twitter"
            >
              <img src="/assets/fbcbd.svg" alt="" />
            </a>
          </div>

          <p
            className="mt-2 min-h-4.5 text-[13px] text-accent empty:hidden [&_a]:underline max-desktop:fixed max-desktop:right-4 max-desktop:bottom-43.75 max-desktop:left-4 max-desktop:z-35 max-desktop:rounded-lg max-desktop:border max-desktop:border-panel-border max-desktop:bg-raised max-desktop:p-2.5"
            role="status"
          >
            {notice}
            {notice.includes("adicionado") && <Link to="/cart"> Ver carrinho</Link>}
          </p>

          {error && <p className="mt-1.5 text-xs leading-4.5 text-destructive" role="alert">{error}</p>}
        </div>
      </div>

      <Tabs defaultValue="details" className="mt-24 hidden desktop:block">
        <TabsList aria-label="Informações do NFT">
          <TabsTrigger value="details">Detalhes do NFT</TabsTrigger>
          <TabsTrigger value="reviews">Avaliações de colecionadores (19)</TabsTrigger>
        </TabsList>

        <TabsContent className="pt-3 text-sm leading-6 text-secondary [&_p+p]:mt-6 [&_dl]:mt-3 [&_dt]:mt-3 [&_dt]:font-bold [&_dt]:text-foreground [&_dt:first-child]:mt-0 [&_dd]:mt-0" value="details">
          <p>{title} é uma obra digital 1/50 finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na Ethereum. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.</p>
          <p>A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.</p>

          <dl>
            <dt>Rede:</dt>
            <dd>Cunhado na Ethereum com procedência imutável e metadados armazenados no IPFS.</dd>
            <dt>Contrato:</dt>
            <dd>Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</dd>
            <dt>Direitos autorais:</dt>
            <dd>0x7A42...19E8 · Contrato inteligente ERC-721 verificado.</dd>
          </dl>
        </TabsContent>

        <TabsContent className="pt-3 text-sm leading-6 text-secondary [&_p+p]:mt-6 [&_dl]:mt-3 [&_dt]:mt-3 [&_dt]:font-bold [&_dt]:text-foreground [&_dt:first-child]:mt-0 [&_dd]:mt-0" value="reviews">
          <p>4,8 de 5 — 19 avaliações de colecionadores desta coleção.</p>
        </TabsContent>
      </Tabs>

      <div className="fixed inset-x-0 bottom-0 z-30 flex h-41 flex-col gap-5 rounded-t-sheet bg-card px-6 pt-5 pb-9 shadow-dock tablet:mx-auto tablet:max-w-150 desktop:hidden">
        <div className="flex items-center gap-2">
          <span className="text-[15px] text-muted-foreground">Qtd.</span>
          <QuantityControl {...quantityProps} variant="mobile" />
          <strong className="ml-auto text-xl font-bold text-accent">{edition.unitPrice} ETH</strong>
        </div>

        <div className="flex items-center gap-3">
          <Button
            className="h-15 w-49 rounded-sheet font-bold text-primary-foreground"
            disabled={adding || edition.available === 0}
            onClick={() => { void addToCart() }}
          >
            Comprar NFT
          </Button>

          <Button
            className="h-15 w-15 rounded-sheet border-border bg-raised p-5 font-bold"
            variant="outline"
            aria-label="Adicionar ao carrinho"
            disabled={adding || edition.available === 0}
            onClick={() => { void addToCart() }}
          >
            <img src="/assets/3c537.svg" alt="" />
          </Button>
        </div>
      </div>
    </React.Fragment>
  )
}

export function NftDetailScreen ({ catalog, nftId }: {
  readonly catalog: CatalogApi
  readonly nftId: string
}) {
  const result = useQuery({
    queryKey: ["nft", nftId],
    queryFn: ({ signal }) => catalog.getById(nftId, signal),
  })

  if (result.isPending) return <Skeleton className="mt-0 h-112.5 desktop:mt-8" aria-busy="true" aria-label="Carregando NFT" />
  if (result.isError) return <ErrorState error={result.error} retry={() => { void result.refetch() }} />

  return (
    <div className="mt-0 desktop:mt-8">
      <p className="mb-3 hidden text-[15px] leading-4 font-bold desktop:block">
        <Link to="/">Início</Link> / Mercado
      </p>

      <NftDetails key={result.data.id} nft={result.data} />
      <RelatedNfts catalog={catalog} title="Mais desta coleção" />
    </div>
  )
}
