import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";

import { ErrorState } from "../../../shared/components/async-state";
import { explainError } from "../../../shared/http/api-client-error";
import { Button } from "../../../shared/ui/button";
import { Checkbox } from "../../../shared/ui/checkbox";
import { useAuth } from "../../auth/index";
import { type WalletApi } from "../api/wallet-api";
import { WalletForm } from "../components/wallet-form";

export function WalletsScreen ({ api }: { readonly api: WalletApi }) {
  const { scope, session, service } = useAuth()

  const client = useQueryClient()

  const [expanded, setExpanded] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [disconnecting, setDisconnecting] = useState(false)
  const [savingAlias, setSavingAlias] = useState(false)

  const queryKey = ["private", scope, "wallets"]
  const query = useQuery({ queryKey, queryFn: ({ signal }) => api.list(signal), enabled: Boolean(session) })
  const primary = query.data?.items.find((wallet) => wallet.slot === "primary")
  const secondary = query.data?.items.find((wallet) => wallet.slot === "secondary")

  function isCurrent () {
    return Boolean(session && service.getSnapshot().session?.token === session.token)
  }

  async function disconnectWallet () {
    setError("")
    setDisconnecting(true)

    try {
      await api.disconnect()
      if (!isCurrent()) return
      await client.invalidateQueries({ queryKey })
      setMessage("Carteira desconectada.")
    } catch (cause) {
      if (isCurrent()) setError(explainError(cause))
    } finally {
      if (isCurrent()) setDisconnecting(false)
    }
  }

  async function saveAlias (checked: boolean) {
    if (!checked) { setExpanded(true); return }

    setError("")
    setSavingAlias(true)

    try {
      await api.save("secondary", {
        aliasOfPrimary: true,
        expectedVersion: secondary?.version ?? 0
      })

      if (!isCurrent()) return
      await client.invalidateQueries({ queryKey })

      setMessage("Carteira secundária vinculada.")
      setExpanded(false)
    } catch (cause) {
      if (isCurrent()) setError(explainError(cause))
    } finally {
      if (isCurrent()) setSavingAlias(false)
    }
  }

  return (
    <section className="min-w-0">
      <h1 className="text-xl leading-7 font-bold">Carteira principal</h1>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
      </p>

      {message && <p className="mt-4 text-sm text-muted-foreground" role="status">{message}</p>}

      {query.isPending ? (
        <p aria-live="polite">Carregando carteiras…</p>
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => { void query.refetch() }} />
      ) : (
        <React.Fragment>
          {query.data.connection && (
            <Button className="mt-4" variant="outline" disabled={disconnecting} onClick={() => { void disconnectWallet() }}>
              Desconectar carteira
            </Button>
          )}


          <WalletForm key={primary?.version ?? 0} wallet={primary} slot="primary" api={api} onSaved={() => {
            if (!isCurrent()) return
            void client.invalidateQueries({ queryKey })
            setMessage("Carteira salva.")
          }} />

          <section className="mt-8">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 leading-6">
              <h2 className="mr-auto w-full text-lg font-bold desktop:w-auto">Carteira secundária</h2>

              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <Checkbox
                  variant="circle"
                  checked={savingAlias || Boolean(secondary?.aliasOfPrimary && !expanded)}
                  disabled={!primary || savingAlias}
                  onCheckedChange={(checked) => { void saveAlias(checked === true) }}
                />

                Igual à carteira principal
              </label>

              <button
                className="min-h-11 px-3 text-base text-accent"
                type="button"
                aria-expanded={expanded}
                aria-controls="secondary-wallet-form"
                onClick={() => { setExpanded(!expanded) }}
              >
                {expanded ? "Fechar" : secondary ? "Editar" : "Adicionar"}
              </button>
            </div>

            {error && <p role="alert" className="mt-2 text-xs leading-5 text-destructive">{error}</p>}

            {!expanded && (
              <p className="mt-3 text-sm text-muted-foreground">
                {
                  secondary
                    ? secondary.aliasOfPrimary
                      ? "Vinculada à carteira principal."
                      : secondary.nickname
                    : "Você ainda não adicionou uma carteira secundária."
                }
              </p>
            )}

            {expanded && (
              <div id="secondary-wallet-form">
                <WalletForm key={secondary?.version ?? 0} wallet={secondary} slot="secondary" api={api} onSaved={() => {
                  if (!isCurrent()) return
                  void client.invalidateQueries({ queryKey })

                  setMessage("Carteira secundária salva.")
                  setExpanded(false)
                }} />
              </div>
            )}
          </section>
        </React.Fragment>
      )}
    </section>
  )
}
