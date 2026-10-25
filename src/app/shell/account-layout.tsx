import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import { useAuth } from "../../features/auth/index";
import { FeatureNotice } from "../../shared/components/feature-notice";
import { explainError } from "../../shared/http/api-client-error";
import { cn } from "../../shared/lib/cn";

const accountLinkClassName = "flex h-10 items-center gap-4 rounded-control bg-card px-3 py-2 text-left text-accent "
  + "aria-[current]:border aria-[current]:border-primary aria-[current]:shadow-[inset_5px_0_var(--primary)] "
  + "desktop:h-11.25 desktop:rounded-none desktop:px-4 desktop:py-0 [&_img]:size-4.5 [&_img]:object-contain"

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
    <div className="mt-3 flex flex-col gap-8 desktop:mt-8 desktop:grid desktop:grid-cols-[310px_minmax(0,1fr)] desktop:gap-7">
      <aside className="h-auto bg-transparent desktop:h-101.75 desktop:bg-card">
        <h2 className="pt-4 pr-2.5 pb-2 text-lg leading-5 font-bold desktop:pl-2.5">Meu perfil</h2>

        <nav className="flex flex-wrap gap-2 desktop:flex-col desktop:gap-0" aria-label="Conta do colecionador">
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
                <button className="hidden h-11.25 items-center gap-4 px-4 text-left text-accent desktop:flex [&_img]:size-4.5 [&_img]:object-contain" type="button">
                  <img src={"/assets/figma-account-" + icon + ".svg"} alt="" /> {label}
                </button>
              </FeatureNotice>
            )
          ))}

          <button
            type="button" onClick={() => { void logout() }}
            className="ml-auto flex h-10 items-center gap-4 rounded-control border-0 bg-card px-3 py-2 text-left font-bold text-accent desktop:ml-0 desktop:rounded-none desktop:border-t desktop:border-border desktop:px-4 desktop:py-0 [&_img]:size-4.5 [&_img]:object-contain"
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
