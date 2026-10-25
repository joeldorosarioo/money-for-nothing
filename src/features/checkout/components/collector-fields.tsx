import { type UseFormReturn } from "react-hook-form";

import { FormField } from "../../../shared/components/form-field";
import { Checkbox } from "../../../shared/ui/checkbox";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { NativeSelect, NativeSelectOption } from "../../../shared/ui/native-select";
import { type OrderInput } from "../../orders/index";
import { type Wallet, type WalletProvider } from "../../wallets/index";

export type CollectorValues = OrderInput["collector"]

export function CollectorFields ({ form, wallet, provider, onProviderChange, onWalletChange, wallets, disabled = false }: {
  readonly form: UseFormReturn<CollectorValues>
  readonly wallet: Wallet
  readonly provider: WalletProvider
  readonly onProviderChange: (provider: WalletProvider) => void
  readonly onWalletChange: (id: string) => void
  readonly wallets: readonly Wallet[]
  readonly disabled?: boolean
}) {
  const { register, formState: { errors } } = form

  const fieldProps = (field: keyof CollectorValues) => ({
    ...register(field), id: "purchase-" + field, disabled,
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? "purchase-" + field + "-error" : undefined,
  })

  return <div>
    <h2 className="mb-4 text-lg leading-6 font-bold">Perfil do colecionador</h2>

    <div className="grid grid-cols-1 gap-6 desktop:grid-cols-2">
      <FormField variant="checkout" id="purchase-displayName" label="Nome de exibição" required error={errors.displayName?.message}>
        <Input className="h-11 text-sm" {...fieldProps("displayName")} autoComplete="name" />
      </FormField>

      <FormField variant="checkout" id="purchase-username" label="Nome de usuário" required error={errors.username?.message}>
        <Input className="h-11 text-sm" {...fieldProps("username")} autoComplete="username" />
      </FormField>

      <FormField variant="checkout" id="purchase-network" label="Rede" required error={undefined}>
        <NativeSelect id="purchase-network" value={wallet.network} disabled={disabled} onChange={(event) => {
          const selected = wallets.find((item) => item.network === event.target.value)
          if (selected) onWalletChange(selected.id)
        }}>
          {(["ethereum", "polygon", "solana"] as const).map((network) => (
            <NativeSelectOption key={network} value={network} disabled={!wallets.some((item) => item.network === network)}>
              {network === "ethereum" ? "Ethereum" : network === "polygon" ? "Polygon" : "Solana"}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>

      <FormField variant="checkout" id="purchase-profileName" label="Nome do perfil" required error={undefined}>
        <Input className="h-11 text-sm" id="purchase-profileName" value={wallet.profileName} readOnly />
      </FormField>

      <FormField variant="checkout" id="purchase-address" label="Endereço da carteira" required error={undefined}>
        <Input className="h-11 text-sm" id="purchase-address" value={wallet.address} readOnly title={wallet.address} />
      </FormField>

      <FormField variant="wallet-optional" id="purchase-secondary" label="ENS ou carteira secundária (opcional)" error={undefined}>
        <Input
          className="h-11 text-sm"
          id="purchase-secondary"
          value={wallet.secondaryAddress}
          readOnly
          placeholder="ENS ou carteira secundária (opcional)"
        />
      </FormField>

      <FormField variant="checkout" id="purchase-provider" label="Tipo de carteira" required error={undefined}>
        <NativeSelect
          id="purchase-provider"
          value={provider}
          disabled={disabled}
          onChange={(event) => {
            const value = event.target.value;

            if (value === "metamask" || value === "coinbase" || value === "walletconnect") onProviderChange(value)
          }
          }
        >
          <NativeSelectOption value="metamask" disabled={wallet.network === "solana"}>MetaMask</NativeSelectOption>
          <NativeSelectOption value="walletconnect">WalletConnect</NativeSelectOption>
          <NativeSelectOption value="coinbase" disabled={wallet.network === "solana"}>Coinbase Wallet</NativeSelectOption>
        </NativeSelect>
      </FormField>

      <FormField variant="checkout" id="purchase-referralCode" label="Código de indicação" required error={errors.referralCode?.message}>
        <Input className="h-11 text-sm" {...fieldProps("referralCode")} />
      </FormField>

      <FormField variant="checkout" id="purchase-email" label="E-mail" required error={errors.email?.message}>
        <Input className="h-11 text-sm" {...fieldProps("email")} type="email" autoComplete="email" />
      </FormField>

      <FormField variant="checkout" id="purchase-ens" label="Nome ENS" required error={errors.ens?.message}>
        <div className="flex gap-3">
          <span className="flex h-11 min-w-20 items-center rounded-input border border-input px-3">
            .eth
          </span>

          <Input className="h-11 text-sm" {...fieldProps("ens")} />
        </div>
      </FormField>
    </div>

    <Label className="mt-6 flex min-h-11 cursor-pointer items-center gap-3 leading-6 font-normal">
      <Checkbox
        variant="circle"
        checked={wallet.slot === "secondary"}
        disabled={disabled || wallets.length < 2}
        onCheckedChange={(checked) => {
          const next = wallets.find((item) => item.slot === (checked ? "secondary" : "primary"));
          if (next) onWalletChange(next.id)
        }}
      /> Usar outra carteira?
    </Label>

    <FormField className="mt-6" variant="checkout" id="purchase-notes" label="Observação do colecionador (opcional)" error={errors.notes?.message}>
      <textarea className="min-h-32 w-full resize-y rounded-input border border-input bg-transparent p-3 text-sm" {...fieldProps("notes")} maxLength={1000} />
    </FormField>
  </div>
}
