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
    <header className={cn("relative hidden h-11.25 items-start justify-between desktop:flex", bordered && "border-b border-border")}>
      <Link className="inline-flex min-h-8.5 items-center text-sm font-bold tracking-widest" to="/" search={normalizeCatalogSearch({})}>
        KURIO
      </Link>

      <nav className="absolute left-7/25 flex h-11.25 gap-7 text-base leading-4 wide:left-94 wide:gap-10 [&_a]:h-11.25" aria-label="Navegação principal">
        <Link to="/" search={normalizeCatalogSearch({})} className={cn(!marketActive && "border-b-2 border-primary font-bold text-accent")}>
          Início
        </Link>

        <Link to="/" search={normalizeCatalogSearch({})} hash="catalogo" className={cn(marketActive && "border-b-2 border-primary font-bold text-accent")}>
          Mercado
        </Link>

        <Link to="/" search={currentSearch} hash="criadores">Criadores</Link>
        <Link to="/" search={currentSearch} hash="diario">Aprenda</Link>
      </nav>

      <div className="flex h-8.5 items-center gap-7">
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Buscar NFTs">
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

            <DialogClose className="absolute top-2 right-3 w-8 text-[28px] leading-8" aria-label="Fechar busca">
              ×
            </DialogClose>
          </DialogContent>
        </Dialog>

        <Link className="relative w-7.75" to="/cart" aria-label={"Carrinho, " + quantity.toString() + " itens"}>
          <img src="/assets/c0c08.svg" alt="" />

          <span className="absolute top-0 left-3.75 size-4 rounded-full bg-primary text-center text-[10px] leading-4 text-primary-foreground">
            {quantity}
          </span>
        </Link>

        {session ? (
          <Link to="/profile" className="inline-flex h-8.5 items-center gap-1 rounded-[6px] bg-primary px-2.25 py-1.5 text-base text-primary-foreground">
            <img src="/assets/62554.svg" alt="" />Meu perfil
          </Link>
        ) : (
          <AuthDialogLink className="inline-flex h-8.5 items-center gap-1 rounded-[6px] bg-primary px-2.25 py-1.5 text-base text-primary-foreground">
            <img src="/assets/62554.svg" alt="" />Entrar
          </AuthDialogLink>
        )}
      </div>
    </header>
  )
}
