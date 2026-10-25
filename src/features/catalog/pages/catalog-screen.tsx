import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
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
  const [tab, setTab] = useState<"all" | "new" | "popular">("all");

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
      <div className="flex h-21.25 gap-2 pt-10 desktop:hidden">
        <form onSubmit={searchCatalog} className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border-0 bg-card px-3">
          <img src="/assets/ce4db.svg" alt="" />

          <Input
            key={search.q}
            className="min-h-10.75 border-0 p-0 text-sm font-bold placeholder:text-secondary"
            name="q"
            type="search"
            aria-label="Buscar NFTs"
            placeholder="Explorar coleções"
            defaultValue={search.q}
          />
        </form>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="size-11.25 rounded-xl border-0 bg-primary" variant="outline" size="icon" aria-label="Filtrar NFTs">
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

      <section className={cn("mt-4 block scroll-mt-6 desktop:mt-24 desktop:grid desktop:grid-cols-[260px_minmax(0,1fr)] desktop:gap-7 wide:grid-cols-[310px_minmax(0,1fr)] wide:gap-12", presentation === "auth" && "desktop:mt-11.5")} id="catalogo" aria-label="Catálogo de NFTs">
        <h2 className="sr-only">Catálogo de NFTs</h2>

        <aside className="hidden desktop:block">
          <CatalogFilters
            key={search.minPrice + search.maxPrice}
            search={search}
            facets={result.data?.facets}
            updateSearch={updateSearch}
          />

          <div className={cn("relative mt-6 h-117.5 overflow-hidden bg-card", presentation === "auth" && "hidden")}>
            <h2 className="mx-5 mt-6.25 mb-3 text-2xl leading-7 font-bold text-accent">NFT EM DESTAQUE</h2>
            <h3 className="text-center text-xl font-bold">OFERTA LIMITADA</h3>

            <Link to="/nfts/$nftId" params={{ nftId: "sage-nomad-009" }} aria-label="Conhecer NFT em destaque">
              <ArtworkImage
                deferUntilVisible
                sizes="310px"
                className="h-92 w-77.5 rounded-3xl object-cover"
                src="/assets/83794.webp"
                alt="Sage Nomad com chapéu e moletom violeta"
                loading="lazy"
              />
            </Link>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex h-5 items-start justify-between whitespace-nowrap desktop:mb-6.5 desktop:h-6">
            <div
              className="flex w-full justify-start gap-4 text-sm leading-4 desktop:w-auto desktop:gap-3 desktop:font-bold wide:gap-6"
              role="group" aria-label="Exibição do catálogo"
            >
              {([["all", "Todos os NFTs"], ["new", "Novos lançamentos"], ["popular", "Em alta"]] as const)
                .map(([value, label]) => (
                  <button
                    key={value}
                    className={cn("h-5 font-normal first:-mr-3 desktop:h-6 desktop:font-bold desktop:first:mr-0", tab === value && "border-b-2 border-primary font-bold text-accent")}
                    aria-pressed={tab === value}

                    onClick={() => {
                      setTab(value)
                      updateSearch({ ...search, sort: value === "popular" ? "popular" : "recent", page: 1 })
                    }}
                  >
                    {label}
                  </button>
                ))}
            </div>

            <label className="hidden text-xs leading-5 desktop:flex wide:text-sm">
              Ordenar por:
              <NativeSelect
                variant="inline"
                className="max-w-37.5 text-xs wide:max-w-50 wide:text-sm"
                aria-label="Ordenar NFTs"
                value={search.sort}
                onChange={(event) => {
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
            </label>
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
              <div className="grid grid-cols-2 items-start gap-x-4 gap-y-6 tablet:grid-cols-3 desktop:gap-x-5 desktop:gap-y-18 wide:gap-x-8.5">
                {result.data.items.map((nft, index) => <NftCard nft={nft} index={index} key={nft.id} />)}
              </div>
            )}
          </div>

          {result.data && result.data.total > 0 && (
            <nav className={cn(
              "mt-14 flex justify-center gap-2 desktop:mt-22 desktop:justify-end",
              "[&_button]:h-8.75 [&_button]:min-w-8.75 [&_button]:rounded-control [&_button]:border [&_button]:border-border [&_button]:text-lg [&_button]:leading-4",
              "**:aria-[aria-current=page]:bg-primary **:aria-[aria-current=page]:font-bold **:aria-[aria-current=page]:text-primary-foreground",
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
