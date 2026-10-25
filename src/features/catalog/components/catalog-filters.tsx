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
    <div className={cn("flex flex-col gap-8 rounded-artwork bg-card p-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:leading-7 [&_h2]:font-bold", className)}>
      <section>
        <h2>Coleções</h2>

        {categoryLabels.map(([id, label]) => (
          <label key={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 text-sm leading-5 text-muted-foreground hover:bg-raised hover:text-accent has-data-[state=checked]:font-bold has-data-[state=checked]:text-accent has-focus-visible:outline-2 has-focus-visible:outline-accent has-focus-visible:outline-offset-2">
            <Checkbox checked={search.categories.includes(id)} onCheckedChange={(checked) => {
              updateSearch({
                ...search, page: 1,

                categories: checked === true
                  ? [...search.categories, id]
                  : search.categories.filter((item) => item !== id),
              })
            }} />

            <span>{label}</span>
            <span className="ml-auto text-xs tabular-nums">({facets?.categories.find((facet) => facet.id === id)?.count ?? 0})</span>
          </label>
        ))}
      </section>

      <form onSubmit={updatePrice}>
        <h2>Faixa de preço</h2>

        <div className="mt-3 space-y-2 [&_input]:block [&_input]:h-11 [&_input]:w-full [&_input]:accent-primary">
          <label className="block text-sm text-muted-foreground">
            Mínimo: {minimum.replace(".", ",")} ETH
          <input
            type="range"
            min="0.02"
            max="12.30"
            step="0.01"
            value={minimum}
            aria-label="Preço mínimo em ETH"
            onChange={(event) => { setMinimum(event.target.value) }}
          />
          </label>
          <label className="block text-sm text-muted-foreground">
            Máximo: {maximum.replace(".", ",")} ETH
          <input
            type="range"
            min="0.02"
            max="12.30"
            step="0.01"
            value={maximum}
            aria-label="Preço máximo em ETH"
            onChange={(event) => { setMaximum(event.target.value) }}
          />
          </label>
        </div>

        <Button className="mt-3" size="small" type="submit">Aplicar</Button>
      </form>

      <section className="min-h-37">
        <h2>Rede</h2>

        {networkLabels.map(([id, label]) => (
          <label key={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 text-sm leading-5 text-muted-foreground hover:bg-raised hover:text-accent has-data-[state=checked]:font-bold has-data-[state=checked]:text-accent has-focus-visible:outline-2 has-focus-visible:outline-accent has-focus-visible:outline-offset-2">
            <Checkbox
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
            <span className="ml-auto text-xs tabular-nums">({facets?.networks.find((facet) => facet.id === id)?.count ?? 0})</span>
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
