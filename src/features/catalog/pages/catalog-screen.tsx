import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState, type SyntheticEvent } from "react";

import { ArtworkImage } from "../../../shared/components/artwork-image";
import { CatalogSkeleton, EmptyState, ErrorState } from "../../../shared/components/async-state";
import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../../../shared/ui/dialog";
import { Input } from "../../../shared/ui/input";
import { NativeSelect, NativeSelectOption } from "../../../shared/ui/native-select";
import { type CatalogApi } from "../api/catalog-api";
import { CatalogFilters } from "../components/catalog-filters";
import { HomeEditorial, HomeHero } from "../components/home-content";
import { NftCard } from "../components/nft-card";
import { type CatalogSearch } from "../types/catalog-search";

interface CatalogScreenProps {
  readonly presentation?: "home" | "auth"
  readonly catalog: CatalogApi
  readonly search: CatalogSearch
  readonly updateSearch: (next: CatalogSearch) => void
}

export function CatalogScreen ({ catalog, search, updateSearch, presentation = "home" }: CatalogScreenProps) {
  const [recentTab, setRecentTab] = useState<"all" | "new">("all");
  const tab = search.sort === "popular" ? "popular" : search.sort === "recent" ? recentTab : "all"

  const result = useQuery({
    queryKey: ["catalog", search],
    queryFn: ({ signal }) => catalog.list(search, signal),
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    if (result.data && !result.isPlaceholderData && result.data.page !== search.page) {
      updateSearch({ ...search, page: result.data.page })
    }
  }, [result.data, result.isPlaceholderData, search, updateSearch])

  function searchCatalog (event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const query = data.get("q")

    updateSearch({ ...search, q: (typeof query === "string" ? query : ""), page: 1 })
  }

  return (
    <div>
      <div className="flex min-h-11 gap-3 pt-6 desktop:hidden">
        <form onSubmit={searchCatalog} className="flex min-w-0 flex-1 items-center gap-2 rounded-control border-0 bg-card px-3">
          <img src="/assets/ce4db.svg" alt="" />

          <Input
            key={search.q}
            className="min-h-11 border-0 p-0 text-sm font-bold placeholder:text-secondary"
            name="q"
            type="search"
            aria-label="Buscar NFTs"
            placeholder="Explorar coleções"
            defaultValue={search.q}
          />
        </form>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="size-11 rounded-control border-0 bg-primary" variant="outline" size="icon" aria-label="Filtrar NFTs">
              <img src="/assets/bc3bf.svg" alt="" />
            </Button>
          </DialogTrigger>

          <DialogContent className="p-6">
            <DialogTitle>Filtrar NFTs</DialogTitle>
            <DialogDescription className="sr-only">Combine coleções, preço e rede.</DialogDescription>

            <CatalogFilters
              className="px-0 pt-3 pb-6"
              key={search.minPrice + search.maxPrice}
              search={search}
              facets={result.data?.facets}
              updateSearch={updateSearch}
            />

            <DialogClose asChild>
              <Button>Ver resultados</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </div>

      <HomeHero compactCopy={presentation === "auth"} />

      <section className={cn("mt-8 block scroll-mt-6 desktop:mt-section desktop:grid desktop:grid-cols-[260px_minmax(0,1fr)] desktop:gap-8 wide:grid-cols-[310px_minmax(0,1fr)]", presentation === "auth" && "desktop:mt-12")} id="catalogo" aria-label="Catálogo de NFTs">
        <h2 className="sr-only">Catálogo de NFTs</h2>

        <aside className="hidden desktop:block">
          <CatalogFilters
            key={search.minPrice + search.maxPrice}
            search={search}
            facets={result.data?.facets}
            updateSearch={updateSearch}
          />

          <article aria-labelledby="featured-nft-heading" className={cn("mt-6 rounded-artwork bg-card p-6", presentation === "auth" && "hidden")}>
            <h2 id="featured-nft-heading" className="text-lg leading-6 font-bold">NFT em destaque</h2>

            <Link
              to="/nfts/$nftId"
              params={{ nftId: "sage-nomad-009" }}
              aria-label="Conhecer NFT em destaque: Sage Nomad #009"
              className="group mt-4 block rounded-control"
            >
              <ArtworkImage
                deferUntilVisible
                sizes="(min-width: 1331px) 262px, 212px"
                className="aspect-square h-auto w-full rounded-artwork object-cover"
                src="/assets/83794.webp"
                alt="Sage Nomad com chapéu e moletom violeta"
                loading="lazy"
              />

              <div className="mt-4">
                <h3 className="text-base leading-6 font-bold">Sage Nomad #009</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">OFERTA LIMITADA</p>
              </div>

              <span className="mt-5 flex min-h-11 items-center justify-between gap-3 rounded-control bg-primary px-4 py-3 text-sm leading-5 font-medium text-primary-foreground transition-colors group-hover:bg-accent group-focus-visible:bg-accent">
                Ver NFT
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          </article>
        </aside>

        <div className="min-w-0">
          <div className="mb-6 flex flex-col gap-4">
            <div
              className="flex min-w-0 items-stretch gap-2 overflow-x-auto border-b border-border text-sm leading-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="group" aria-label="Exibição do catálogo"
            >
              {([["all", "Todos os NFTs"], ["new", "Novos lançamentos"], ["popular", "Em alta"]] as const)
                .map(([value, label]) => (
                  <button
                    key={value}
                    className={cn("inline-flex min-h-12 shrink-0 items-center justify-center border-b-2 border-transparent px-2 py-3 whitespace-nowrap text-secondary hover:text-accent focus-visible:-outline-offset-4 tablet:px-4", tab === value && "border-primary font-bold text-accent")}
                    aria-label={label}
                    aria-pressed={tab === value}

                    onClick={() => {
                      if (value !== "popular") setRecentTab(value)
                      updateSearch({ ...search, sort: value === "popular" ? "popular" : "recent", page: 1 })
                    }}
                  >
                    {value === "new" ? <><span className="tablet:hidden">Novos</span><span className="hidden tablet:inline">{label}</span></> : label}
                  </button>
                ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border pb-3">
              <p role="status" aria-live="polite" aria-atomic="true" className="text-xs text-muted-foreground">
                {result.isFetching ? "Atualizando NFTs…" : result.data ? result.data.total.toString() + " NFTs encontrados" : "Carregando NFTs…"}
              </p>
              <div className="flex min-h-11 items-center gap-2 text-xs leading-5">
                Ordenar por:
                <NativeSelect
                  variant="inline"
                  className="max-w-56 text-xs wide:text-sm"
                  aria-label="Ordenar NFTs"
                  value={search.sort}
                  onChange={(event) => {
                    setRecentTab("all")
                    updateSearch({
                      ...search, sort: event.target.value === "price-asc" ? "price-asc"
                        : event.target.value === "price-desc" ? "price-desc"
                          : event.target.value === "popular" ? "popular" : "recent",
                      page: 1,
                    })
                  }}
                >
                  <NativeSelectOption value="recent">Listados recentemente</NativeSelectOption>
                  <NativeSelectOption value="price-asc">Menor preço</NativeSelectOption>
                  <NativeSelectOption value="price-desc">Maior preço</NativeSelectOption>
                  <NativeSelectOption value="popular">Mais populares</NativeSelectOption>
                </NativeSelect>
              </div>
            </div>
          </div>

          <div aria-busy={result.isFetching}>
            {result.isPending ? <CatalogSkeleton /> : result.isError ? (
              <ErrorState error={result.error} retry={() => { void result.refetch() }} />
            ) : result.data.items.length === 0 ? (
              <EmptyState>
                <h2>Nenhum NFT encontrado</h2>
                <p>Tente outro nome ou ajuste os filtros.</p>
              </EmptyState>
            ) : (
              <div className="grid grid-cols-2 items-start gap-x-4 gap-y-8 tablet:grid-cols-3 desktop:gap-x-6">
                {result.data.items.map((nft, index) => <NftCard nft={nft} index={index} key={nft.id} />)}
              </div>
            )}
          </div>

          {result.data && result.data.total > 0 && (
            <nav className={cn(
              "mt-8 flex justify-center gap-2 desktop:mt-12 desktop:justify-end",
              "flex-wrap [&_button]:min-h-11 [&_button]:min-w-11 [&_button]:rounded-control [&_button]:border [&_button]:border-input [&_button]:text-base [&_button]:leading-5",
              "[&_button[aria-current=page]]:bg-primary [&_button[aria-current=page]]:font-bold [&_button[aria-current=page]]:text-primary-foreground",
              presentation === "auth" && "hidden",
            )} aria-label="Paginação do catálogo">
              {Array.from({ length: result.data.totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  aria-label={"Página " + page.toString()}
                  aria-current={page === result.data.page ? "page" : undefined}
                  onClick={() => { updateSearch({ ...search, page }) }}
                >
                  {page}
                </button>
              ))}

              <button
                aria-label="Próxima página"
                disabled={result.data.page === result.data.totalPages}
                onClick={() => { updateSearch({ ...search, page: search.page + 1 }) }}
              >
                ›
              </button>
            </nav>
          )}
        </div>
      </section>

      {presentation === "home" && <HomeEditorial />}
    </div>
  )
}
