import { useState, type SyntheticEvent } from "react";

import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/button";
import { Checkbox } from "../../../shared/ui/checkbox";
import { type CatalogPage } from "../api/catalog-api";
import { type CatalogSearch } from "../types/catalog-search";

const categoryLabels = [
  ["digital-art", "Arte digital"],
  ["photography", "Fotografia"],
  ["music", "Música"],
  ["3d", "Arte 3D"],
  ["collectibles", "Colecionáveis"],
  ["generative-art", "Generativa"],
  ["games", "Jogos"],
  ["subscriptions", "Assinaturas"],
  ["utility", "Utilidade"],
] as const

const networkLabels = [
  ["ethereum", "Ethereum"],
  ["polygon", "Polygon"],
  ["solana", "Solana"]
] as const

export function CatalogFilters ({ search, facets, updateSearch, className }: {
  readonly className?: string
  readonly search: CatalogSearch
  readonly facets: CatalogPage["facets"] | undefined
  readonly updateSearch: (next: CatalogSearch) => void
}) {
  const [minimum, setMinimum] = useState(search.minPrice || "0.02")
  const [maximum, setMaximum] = useState(search.maxPrice || "12.30")

  function updatePrice (event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    updateSearch({ ...search, minPrice: minimum, maxPrice: maximum, page: 1 })
  }

  return (
    <div className={cn("flex flex-col gap-10 bg-card p-5 [&_h2]:text-xl [&_h2]:leading-7 [&_h2]:font-bold", className)}>
      <section className="min-h-97">
        <h2>Coleções</h2>

        {categoryLabels.map(([id, label]) => (
          <label key={id} className="flex min-h-10 cursor-pointer items-center justify-between px-3 text-[15px] leading-5 text-secondary hover:text-accent has-data-[state=checked]:text-accent has-focus-visible:outline-2 has-focus-visible:outline-accent has-focus-visible:outline-offset-2">
            <Checkbox variant="hidden" checked={search.categories.includes(id)} onCheckedChange={(checked) => {
              updateSearch({
                ...search, page: 1,

                categories: checked === true
                  ? [...search.categories, id]
                  : search.categories.filter((item) => item !== id),
              })
            }} />

            <span>{label}</span>
            <span>({facets?.categories.find((facet) => facet.id === id)?.count ?? 0})</span>
          </label>
        ))}
      </section>

      <form className="h-32.25" onSubmit={updatePrice}>
        <h2>Faixa de preço</h2>

        <div className={cn(
          "relative mt-2 h-7",
          "[&_input]:pointer-events-none [&_input]:absolute [&_input]:top-2 [&_input]:left-0",
          "[&_input]:h-1 [&_input]:w-full [&_input]:appearance-none [&_input]:bg-primary",
          "[&_input::-webkit-slider-thumb]:pointer-events-auto [&_input::-webkit-slider-thumb]:size-4",
          "[&_input::-webkit-slider-thumb]:cursor-grab [&_input::-webkit-slider-thumb]:appearance-none",
          "[&_input::-webkit-slider-thumb]:rounded-full [&_input::-webkit-slider-thumb]:border",
          "[&_input::-webkit-slider-thumb]:border-background [&_input::-webkit-slider-thumb]:bg-primary",
          "[&_input::-moz-range-thumb]:pointer-events-auto [&_input::-moz-range-thumb]:size-4",
          "[&_input::-moz-range-thumb]:cursor-grab [&_input::-moz-range-thumb]:rounded-full",
          "[&_input::-moz-range-thumb]:bg-primary",
        )}>
          <input
            type="range"
            min="0.02"
            max="12.30"
            step="0.01"
            value={minimum}
            aria-label="Preço mínimo em ETH"
            onChange={(event) => { setMinimum(event.target.value) }}
          />

          <input
            type="range"
            min="0.02"
            max="12.30"
            step="0.01"
            value={maximum}
            aria-label="Preço máximo em ETH"
            onChange={(event) => { setMaximum(event.target.value) }}
          />
        </div>

        <p className="mt-2 mb-3 text-[13px] text-muted-foreground">
          Preço: {minimum.replace(".", ",")} - {maximum.replace(".", ",")} ETH
        </p>

        <Button size="small" type="submit">Aplicar</Button>
      </form>

      <section className="min-h-37">
        <h2>Rede</h2>

        {networkLabels.map(([id, label]) => (
          <label key={id} className="flex min-h-10 cursor-pointer items-center justify-between px-3 text-[15px] leading-5 text-secondary hover:text-accent has-data-[state=checked]:text-accent has-focus-visible:outline-2 has-focus-visible:outline-accent has-focus-visible:outline-offset-2">
            <Checkbox
              variant="hidden"
              checked={search.networks.includes(id)}
              onCheckedChange={(checked) => {
                updateSearch({
                  ...search, page: 1,
                  networks: checked === true
                    ? [...search.networks, id]
                    : search.networks.filter((item) => item !== id),
                })
              }}
            />

            <span>{label}</span>
            <span>({facets?.networks.find((facet) => facet.id === id)?.count ?? 0})</span>
          </label>
        ))}
      </section>

      {(search.q || search.categories.length > 0 || search.networks.length > 0 || search.minPrice || search.maxPrice) && (
        <Button variant="outline" onClick={() => {
          updateSearch({
            q: "",
            categories: [],
            networks: [],
            minPrice: "",
            maxPrice: "",
            sort: "recent",
            page: 1,
          })
        }}>
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
