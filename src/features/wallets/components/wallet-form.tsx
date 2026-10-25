import { useForm } from "react-hook-form";

import { FormField } from "../../../shared/components/form-field";
import { ApiClientError, explainError } from "../../../shared/http/api-client-error";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { NativeSelect, NativeSelectOption } from "../../../shared/ui/native-select";
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
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<WalletValues>({
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
      className="mt-8"
      aria-label={slot === "primary" ? "Carteira principal" : "Carteira secundária"}
      noValidate
      onSubmit={(event) => { void handleSubmit(submit)(event) }}
    >
      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-2 desktop:gap-x-7">
        {fields.map(([field, label]) => {
          const id = slot + "-" + field

          const props = {
            ...register(field),
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
              {field === "network" ? (
                <NativeSelect {...props}>
                  <NativeSelectOption value="">Selecione uma rede</NativeSelectOption>
                  <NativeSelectOption value="ethereum">Ethereum</NativeSelectOption>
                  <NativeSelectOption value="polygon">Polygon</NativeSelectOption>
                  <NativeSelectOption value="solana">Solana</NativeSelectOption>
                </NativeSelect>
              ) : field === "provider" ? (
                <NativeSelect {...props}>
                  <NativeSelectOption value="">Selecione uma carteira</NativeSelectOption>
                  <NativeSelectOption value="metamask">MetaMask</NativeSelectOption>
                  <NativeSelectOption value="walletconnect">WalletConnect</NativeSelectOption>
                  <NativeSelectOption value="coinbase">Coinbase Wallet</NativeSelectOption>
                </NativeSelect>
              ) : field === "ens" ? (
                <div className="flex gap-2.5">
                  <span className="flex min-w-19.5 items-center border border-border bg-transparent px-2.5">.eth
                    <img className="ml-auto h-2 w-3" src="/assets/figma-select-arrow.svg" alt="" />
                  </span>

                  <Input className="h-10 text-sm" {...props} />
                </div>
              )
                : (
                  <Input
                    className="h-10 text-sm" {...props}
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
        <p role="alert" className="mt-1.5 text-xs leading-4.5 text-destructive">{errors.root.message}</p>
      )}

      <Button className="mt-8 min-w-32.75 px-0.5 py-2.5 text-sm font-bold" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Salvar carteira"}
      </Button>
    </form>
  )
}
