import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState, type SyntheticEvent } from "react";

import { ErrorState } from "../../../shared/components/async-state";
import { FormField } from "../../../shared/components/form-field";
import { explainError } from "../../../shared/http/api-client-error";
import { parseEth } from "../../../shared/money/eth";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { NativeSelect, NativeSelectOption } from "../../../shared/ui/native-select";
import { useAuth } from "../../auth/index";
import { simulationScenarioSchema, type SimulationApi, type SimulationScenario } from "../api/simulation-api";

const scenarioNames: Record<SimulationScenario, string> = {
  "default": "Fluxo normal",
  "empty": "Catálogo vazio",
  "slow": "Resposta lenta (1,2 s)",
  "variable-latency": "Latência variável e respostas fora de ordem",
  "offline": "Rede indisponível",
  "favorite-error": "Falha ao salvar favorito",
  "wallet-rejected": "Conexão da carteira recusada",
  "catalog-error": "Falha no catálogo",
  "checkout-error": "Falha na cotação",
  "timeout-after-order": "Resposta perdida após aceitar a compra",
  "payment-rejected": "Pagamento rejeitado",
}

type Panel = "scenario" | "nft" | "session" | "order"

interface SimulationAction {
  readonly panel: Panel
  readonly execute: () => Promise<string>
}

const panelClassName = "rounded-dialog border border-border bg-card p-6"
const fieldClassName = "mb-5"

function formText (data: FormData, name: string): string {
  const value = data.get(name)
  return typeof value === "string" ? value.trim() : ""
}

export function SimulationScreen ({ api }: { readonly api: SimulationApi }) {
  const { status } = useAuth()

  const client = useQueryClient()

  const [selected, setSelected] = useState<SimulationScenario | null>(null)

  const query = useQuery({ queryKey: ["simulation"], queryFn: ({ signal }) => api.get(signal) })

  const mutation = useMutation({
    mutationFn: (action: SimulationAction) => action.execute(),
    onSuccess: async () => { await client.invalidateQueries() },
  })

  const run = (panel: Panel, execute: () => Promise<string>) => { mutation.mutate({ panel, execute }) }
  const pending = mutation.isPending

  function feedback (panel: Panel) {
    if (mutation.variables?.panel !== panel) return null

    return <div className="mt-4 text-sm wrap-break-word">
      {pending && <p aria-live="polite">Aplicando alteração…</p>}
      {mutation.isError && <p className="text-destructive" role="alert">{explainError(mutation.error)}</p>}
      {mutation.isSuccess && <p className="text-accent" role="status">{mutation.data}</p>}
    </div>
  }

  function updateNft (event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    run("nft", async () => {
      const nftId = formText(data, "nftId")
      const editionId = formText(data, "editionId")
      const unitPrice = formText(data, "unitPrice")
      const available = Number(data.get("available"))

      parseEth(unitPrice)

      if (!Number.isSafeInteger(available) || available < 0)
        throw new Error("Informe uma quantidade inteira a partir de zero.")

      await api.updateNft({ nftId, editionId, unitPrice, available })
      return "Preço e disponibilidade atualizados. As telas abertas recebem a alteração em tempo real."
    })
  }

  function resolveOrder (event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    run("order", async () => {
      const id = formText(data, "orderId")
      const nextStatus = data.get("orderStatus") === "rejected" ? "rejected" : "confirmed"
      const order = await api.resolveOrder(id, nextStatus)

      return "Pedido " + order.id + ": " + (
        order.status === "confirmed" ? "confirmado" : order.status === "rejected" ? "rejeitado" : "pendente"
      ) + "."
    })
  }

  if (query.isPending) return <p className="mt-8" aria-live="polite">Carregando cenários…</p>
  if (query.isError) return <ErrorState error={query.error} retry={() => { void query.refetch() }} />
  const scenario = selected ?? query.data.scenario

  return <section className="mx-auto mt-8 max-w-250">
    <Link className="text-accent" to="/">Abrir catálogo</Link>
    <h1 className="mt-5 text-[26px] leading-8 font-bold">Cenários da demonstração</h1>

    <p className="mt-3 max-w-[70ch] text-muted-foreground">
      Reproduza falhas, mudanças de preço e recuperação de compras. Este painel opera pela mesma API das telas do marketplace.
    </p>

    <p className="mt-3 text-[13px] text-secondary">NFTs no catálogo: {query.data.nftCount}</p>

    <div className="mt-8 grid gap-6 desktop:grid-cols-2">
      <section className={panelClassName}>
        <h2 className="mb-6 text-lg font-bold">Comportamento do serviço</h2>

        <FormField variant="password" className={fieldClassName} id="simulation-scenario" label="Cenário" error={undefined}>
          <NativeSelect id="simulation-scenario" value={scenario} disabled={pending} onChange={(event) => {
            const next = simulationScenarioSchema.safeParse(event.target.value)
            if (next.success) setSelected(next.data)
          }}>
            {simulationScenarioSchema.options.map((value) => (
              <NativeSelectOption key={value} value={value}>{scenarioNames[value]}</NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>

        <Button disabled={pending} onClick={() => {
          run("scenario", async () => {
            client.setQueryData(["simulation"], await api.setScenario(scenario))
            setSelected(null)
            return "Cenário atualizado."
          })
        }}>
          Aplicar cenário
        </Button>

        <p className="mt-6 mb-3 text-sm text-muted-foreground">
          Reiniciar apaga contas criadas, carrinhos e pedidos da demonstração e encerra as sessões abertas.
        </p>

        <Button variant="outline" disabled={pending} onClick={() => {
          run("scenario", async () => {
            client.setQueryData(["simulation"], await api.reset(scenario))
            setSelected(null)
            return "Demonstração reiniciada."
          })
        }}>
          Reiniciar demonstração
        </Button>

        {feedback("scenario")}
      </section>

      <form className={panelClassName} onSubmit={updateNft}>
        <h2 className="mb-6 text-lg font-bold">Preço e disponibilidade</h2>

        <FormField variant="password" className={fieldClassName} id="simulation-nft" label="ID do NFT" error={undefined}>
          <Input id="simulation-nft" name="nftId" defaultValue="emerald-ape-042" required disabled={pending} />
        </FormField>

        <FormField variant="password" className={fieldClassName} id="simulation-edition" label="Edição" error={undefined}>
          <NativeSelect id="simulation-edition" name="editionId" disabled={pending}>
            <NativeSelectOption value="edition-50">Edição de 50</NativeSelectOption>
            <NativeSelectOption value="edition-10">Edição de 10</NativeSelectOption>
            <NativeSelectOption value="edition-1">Peça única</NativeSelectOption>
          </NativeSelect>
        </FormField>

        <FormField variant="password" className={fieldClassName} id="simulation-price" label="Preço em ETH" error={undefined}>
          <Input id="simulation-price" name="unitPrice" defaultValue="1.49" inputMode="decimal" required disabled={pending} />
        </FormField>

        <FormField variant="password" className={fieldClassName} id="simulation-stock" label="Quantidade disponível" error={undefined}>
          <Input id="simulation-stock" name="available" type="number" min="0" step="1" defaultValue="49" required disabled={pending} />
        </FormField>

        <Button type="submit" disabled={pending}>Atualizar NFT</Button>

        {feedback("nft")}
      </form>

      <section className={panelClassName}>
        <h2 className="mb-4 text-lg font-bold">Sessão</h2>

        <p className="mb-5 text-muted-foreground">
          Expire a sessão atual e confira a proteção das páginas privadas, inclusive em outras abas.
        </p>

        <Button variant="outline" disabled={pending || status !== "authenticated"} onClick={() => {
          run("session", async () => {
            await api.expireSession()
            return "Sessão expirada no servidor."
          })
        }}>
          Expirar sessão
        </Button>

        {status !== "authenticated" && (
          <p className="mt-4 text-sm text-muted-foreground">
            Entre na sua conta para expirar uma sessão.{" "}
            <Link className="text-accent underline underline-offset-2" to="/login" search={{ redirect: "/simulation" }}>
              Entrar para expirar sessão
            </Link>
          </p>
        )}

        {feedback("session")}
      </section>

      <form className={panelClassName} onSubmit={resolveOrder}>
        <h2 className="mb-6 text-lg font-bold">Resultado de um pedido</h2>

        <FormField variant="password" className={fieldClassName} id="simulation-order" label="ID do pedido" error={undefined}>
          <Input id="simulation-order" name="orderId" placeholder="order-…" required disabled={pending} />
        </FormField>

        <FormField variant="password" className={fieldClassName} id="simulation-status" label="Resultado" error={undefined}>
          <NativeSelect id="simulation-status" name="orderStatus" disabled={pending}>
            <NativeSelectOption value="confirmed">Confirmado</NativeSelectOption>
            <NativeSelectOption value="rejected">Rejeitado</NativeSelectOption>
          </NativeSelect>
        </FormField>

        <p className="mb-4 text-[13px] text-muted-foreground">
          Pedidos concluídos mantêm o resultado e o recibo originais.
        </p>

        <Button type="submit" disabled={pending}>Resolver pedido</Button>
        {feedback("order")}
      </form>
    </div>
  </section>
}
