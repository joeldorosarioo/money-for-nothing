import { Controller, useForm } from "react-hook-form";

import { FormField } from "../../../shared/components/form-field";
import { ApiClientError, explainError } from "../../../shared/http/api-client-error";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/ui/select";
import { type WalletApi } from "../api/wallet-api";
import { walletInputSchema } from "../api/wallet-contracts";
import { type Wallet, type WalletSlot } from "../types/wallet";

const fields = [
  ["displayName", "Nome de exibição"],
  ["nickname", "Apelido da carteira"],
  ["network", "Rede"],
  ["profileName", "Nome do perfil"],
  ["address", "Endereço da carteira"],
  ["secondaryAddress", "ENS ou carteira secundária (opcional)"],
  ["provider", "Tipo de carteira"],
  ["referralCode", "Código de indicação"],
  ["email", "E-mail"],
  ["ens", "Nome ENS"],
] as const

type WalletValues = Record<(typeof fields)[number][0], string>

function isWalletField (value: unknown): value is keyof WalletValues {
  return fields.some(([field]) => field === value)
}

export function WalletForm ({ wallet, slot, api, onSaved }: {
  readonly wallet: Wallet | undefined
  readonly slot: WalletSlot
  readonly api: WalletApi
  readonly onSaved: () => void
}) {
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<WalletValues>({
    defaultValues: {
      displayName: "",
      nickname: "",
      network: "",
      profileName: "",
      address: "",
      secondaryAddress: "",
      provider: "",
      referralCode: "",
      email: "",
      ...wallet,
      ens: wallet?.ens.replace(/\.eth$/, "") ?? "",
    },
  })

  async function submit (values: WalletValues) {
    const parsed = walletInputSchema.safeParse({
      ...values,
      ens: values.ens.trim().replace(/\.eth$/i, "") + ".eth",
      aliasOfPrimary: false,
      expectedVersion: wallet?.version ?? 0,
    })

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (isWalletField(field)) setError(field, { message: issue.message }, { shouldFocus: true })
      }

      return
    }

    try {
      await api.save(slot, parsed.data)
      onSaved()
    } catch (error) {
      if (error instanceof ApiClientError) {
        for (const [field, message] of Object.entries(error.fields)) {
          if (isWalletField(field)) setError(field, { message }, { shouldFocus: true })
        }
      }

      setError("root", { message: explainError(error) })
    }
  }

  return (
    <form
      className="mt-6"
      aria-label={slot === "primary" ? "Carteira principal" : "Carteira secundária"}
      noValidate
      onSubmit={(event) => { void handleSubmit(submit)(event) }}
    >
      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-2">
        {fields.map(([field, label]) => {
          const id = slot + "-" + field

          const props = {
            ...(field !== "network" && field !== "provider" ? register(field) : {}),
            id,
            "aria-invalid": Boolean(errors[field]),
            "aria-describedby": errors[field] ? id + "-error" : undefined,
          }

          return (
            <FormField
              variant={field === "secondaryAddress" ? "wallet-optional" : "wallet"}
              key={field}
              id={id}
              label={label}
              required={field !== "secondaryAddress"}
              error={errors[field]?.message}
            >
              {field === "network" || field === "provider" ? (
                <Controller
                  control={control}
                  name={field}
                  render={({ field: selectField }) => (
                    <Select name={selectField.name} value={selectField.value} onValueChange={selectField.onChange}>
                      <SelectTrigger
                        id={id}
                        ref={selectField.ref}
                        onBlur={selectField.onBlur}
                        aria-invalid={Boolean(errors[field])}
                        aria-describedby={errors[field] ? id + "-error" : undefined}
                      >
                        <SelectValue placeholder={field === "network" ? "Selecione uma rede" : "Selecione uma carteira"} />
                      </SelectTrigger>
                      <SelectContent>
                        {field === "network" ? (
                          <>
                            <SelectItem value="ethereum">Ethereum</SelectItem>
                            <SelectItem value="polygon">Polygon</SelectItem>
                            <SelectItem value="solana">Solana</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="metamask">MetaMask</SelectItem>
                            <SelectItem value="walletconnect">WalletConnect</SelectItem>
                            <SelectItem value="coinbase">Coinbase Wallet</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
              ) : field === "ens" ? (
                <div className="flex gap-3">
                  <span className="flex min-w-20 items-center rounded-input border border-input bg-transparent px-3">.eth</span>

                  <Input className="h-11 text-sm" {...props} />
                </div>
              )
                : (
                  <Input
                    className="h-11 text-sm" {...props}
                    type={field === "email" ? "email" : "text"}
                    placeholder={field === "address" ? "Endereço 0x da carteira" : field === "secondaryAddress" ? label : ""}
                    autoComplete={field === "email" ? "email" : "off"}
                  />
                )}
            </FormField>
          )
        })}
      </div>

      {errors.root && (
        <p role="alert" className="mt-2 text-xs leading-5 text-destructive">{errors.root.message}</p>
      )}

      <Button className="mt-8 min-w-32 px-6 py-3 text-sm font-bold" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Salvar carteira"}
      </Button>
    </form>
  )
}
