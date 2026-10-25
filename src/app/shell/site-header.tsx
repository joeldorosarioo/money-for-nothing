import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type SyntheticEvent } from "react";

import { AuthDialogLink, useAuth } from "../../features/auth/index";
import { useCart } from "../../features/cart/index";
import { normalizeCatalogSearch } from "../../features/catalog/index";
import { cn } from "../../shared/lib/cn";
import { Button } from "../../shared/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../../shared/ui/dialog";
import { Input } from "../../shared/ui/input";

export function SiteHeader ({ bordered }: { readonly bordered: boolean }) {
  const { session } = useAuth()
  const { cart } = useCart()

  const [searchOpen, setSearchOpen] = useState(false)

  const navigate = useNavigate()
  const location = useRouterState({ select: (state) => state.location })
  const currentSearch = normalizeCatalogSearch({ ...location.search })
  const quantity = cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0

  const marketActive = location.pathname.startsWith("/nfts/")
    || location.pathname === "/cart"
    || location.pathname === "/checkout"
    || location.pathname.startsWith("/orders/")

  function searchCatalog (event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()

    const data = new FormData(event.currentTarget)
    const query = data.get("q")

    void navigate({
      to: "/",

      search: {
        ...currentSearch,
        q: (typeof query === "string" ? query : ""),
        page: 1
      }
    })

    setSearchOpen(false)
  }

  return (
    <header className={cn("relative hidden min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-6 pb-3 desktop:grid", bordered && "border-b border-border")}>
      <Link className="inline-flex min-h-11 items-center text-sm font-bold tracking-widest" to="/" search={normalizeCatalogSearch({})}>
        KURIO
      </Link>

      <nav className="flex min-w-0 items-center justify-self-center gap-4 text-base leading-5 wide:gap-8 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:px-1 [&_a:hover]:text-accent" aria-label="Navegação principal">
        <Link to="/" search={normalizeCatalogSearch({})} className={cn(!marketActive && "border-b-2 border-primary font-bold text-accent")}>
          Início
        </Link>

        <Link to="/" search={normalizeCatalogSearch({})} hash="catalogo" className={cn(marketActive && "border-b-2 border-primary font-bold text-accent")}>
          Mercado
        </Link>

        <Link to="/" search={currentSearch} hash="criadores">Criadores</Link>
        <Link to="/" search={currentSearch} hash="diario">Aprenda</Link>
      </nav>

      <div className="flex items-center gap-3 wide:gap-5">
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogTrigger asChild>
            <Button className="size-11 min-h-11" variant="ghost" size="icon" aria-label="Buscar NFTs">
              <img src="/assets/bd8c9.svg" alt="" />
            </Button>
          </DialogTrigger>

          <DialogContent showCloseButton={false}>
            <DialogTitle>Buscar NFTs</DialogTitle>
            <DialogDescription className="sr-only">Busque pelo nome, token ou criador.</DialogDescription>

            <form onSubmit={searchCatalog} className="flex gap-2">
              <Input
                key={currentSearch.q}
                type="search"
                name="q"
                aria-label="Buscar NFTs"
                defaultValue={currentSearch.q}
                placeholder="Nome, token ou criador"
                autoFocus
              />

              <Button type="submit">Buscar</Button>
            </form>

            <DialogClose className="absolute top-2 right-2 flex size-11 items-center justify-center text-[28px]" aria-label="Fechar busca">
              ×
            </DialogClose>
          </DialogContent>
        </Dialog>

        <Link className="relative flex size-11 items-center justify-center rounded-control hover:bg-raised" to="/cart" aria-label={"Carrinho, " + quantity.toString() + " itens"}>
          <img src="/assets/c0c08.svg" alt="" />

          <span className="absolute top-0.5 right-0.5 flex min-h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4.5 text-primary-foreground">
            {quantity}
          </span>
        </Link>

        {session ? (
          <Link to="/profile" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-3 py-2 text-base whitespace-nowrap text-primary-foreground hover:bg-accent">
            <img src="/assets/62554.svg" alt="" />Meu perfil
          </Link>
        ) : (
          <AuthDialogLink className="inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-3 py-2 text-base whitespace-nowrap text-primary-foreground hover:bg-accent">
            <img src="/assets/62554.svg" alt="" />Entrar
          </AuthDialogLink>
        )}
      </div>
    </header>
  )
}
