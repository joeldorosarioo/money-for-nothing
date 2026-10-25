import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import { useAuth } from "../../features/auth/index";
import { FeatureNotice } from "../../shared/components/feature-notice";
import { explainError } from "../../shared/http/api-client-error";
import { cn } from "../../shared/lib/cn";

const accountLinkClassName = "flex min-h-11 items-center gap-3 rounded-control border border-transparent bg-card px-3 py-2 text-left text-accent "
  + "aria-[current]:border-primary aria-[current]:bg-raised "
  + "[&_img]:size-5 [&_img]:object-contain"

export function AccountLayout ({ children }: { readonly children: ReactNode }) {
  const { service } = useAuth()

  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  const [error, setError] = useState("")

  async function logout () {
    try {
      await service.logout()
    } catch (cause) {
      setError(explainError(cause))
    } finally {
      await navigate({ to: "/login" })
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-8 desktop:mt-8 desktop:grid desktop:grid-cols-[260px_minmax(0,1fr)] wide:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="min-w-0 self-start bg-transparent desktop:rounded-artwork desktop:bg-card desktop:p-6">
        <h2 className="mb-4 text-lg leading-6 font-bold">Meu perfil</h2>

        <nav className="flex flex-wrap gap-2 desktop:flex-col" aria-label="Conta do colecionador">
          <Link className={accountLinkClassName} to="/profile" aria-current={pathname === "/profile" ? "page" : undefined}>
            <img src="/assets/figma-account-user.svg" alt="" />Dados do perfil
          </Link>

          <Link className={accountLinkClassName} to="/wallets" aria-current={pathname === "/wallets" ? "page" : undefined}>
            <img src="/assets/figma-account-wallet.svg" alt="" />Carteiras
          </Link>

          {([
            ["Atividade", "activity"],
            ["Lista de interesse", "heart"],
            ["Ofertas", "offers"],
            ["Arquivos baixados", "downloads"],
            ["Suporte", "support"],
          ] as const).map(([label, icon]) => (
            label === "Lista de interesse" ? (
              <Link
                key={label}
                className={cn(accountLinkClassName, pathname !== "/favorites" && "hidden desktop:flex")}
                to="/favorites"
                aria-current={pathname === "/favorites" ? "page" : undefined}
              >
                <img src="/assets/figma-account-heart.svg" alt="" />{label}
              </Link>
            ) : (
              <FeatureNotice key={label} title={label}>
                <button className="hidden min-h-11 items-center gap-3 rounded-control px-3 py-2 text-left text-accent hover:bg-raised desktop:flex [&_img]:size-5 [&_img]:object-contain" type="button">
                  <img src={"/assets/figma-account-" + icon + ".svg"} alt="" /> {label}
                </button>
              </FeatureNotice>
            )
          ))}

          <button
            type="button" onClick={() => { void logout() }}
            className="ml-auto flex min-h-11 items-center gap-3 rounded-control border border-transparent bg-card px-3 py-2 text-left font-bold text-accent hover:bg-raised desktop:ml-0 desktop:mt-2 desktop:border-border [&_img]:size-5 [&_img]:object-contain"
          >
            <img src="/assets/figma-account-logout.svg" alt="" />Sair
          </button>
        </nav>

        {error && <p role="alert">{error}</p>}
      </aside>

      {children}
    </div>
  )
}
