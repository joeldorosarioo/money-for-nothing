import { WalletBrands } from "../../../shared/components/wallet-brands";
import { cn } from "../../../shared/lib/cn";
import { type Network } from "../../../shared/types/network";
import { type Wallet, type WalletProvider } from "../../wallets/index";
import { networkLabels, shortenAddress } from "../helpers/wallet-display";

const providers = [
  { id: "walletconnect", name: "WalletConnect", mark: "W" },
  { id: "metamask", name: "MetaMask", mark: "M" },
  { id: "coinbase", name: "Coinbase Wallet", mark: "" },
] as const

const radioClassName =
  "size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-panel-border checked:border-primary checked:bg-primary checked:inset-ring-3 checked:inset-ring-card focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4";

export function WalletCards ({ wallets, selectedId, onSelect }: {
  readonly wallets: readonly Wallet[]
  readonly selectedId: string
  readonly onSelect: (id: string) => void
}) {
  return <fieldset className="mt-4 flex flex-col gap-5">
    <legend className="sr-only">Carteira para a compra</legend>

    {[...wallets].sort((a, b) => a.slot === b.slot ? 0 : a.slot === "secondary" ? -1 : 1).map((wallet) => (
      <label key={wallet.id} className="relative flex min-h-23.25 cursor-pointer items-center gap-4.75 rounded-artwork bg-card px-4.75 py-3">
        <input
          className={radioClassName}
          type="radio"
          name="purchase-wallet"
          value={wallet.id}
          checked={selectedId === wallet.id}
          onChange={() => { onSelect(wallet.id) }}
        />

        <span className="min-w-0">
          <strong className="text-base leading-5">{wallet.slot === "primary" ? "Principal" : "Reserva"}</strong>

          <span className="mt-1 block text-sm leading-5.5 text-muted-foreground">
            {shortenAddress(wallet.address)}<br />{networkLabels[wallet.network]}
          </span>
        </span>
      </label>
    ))}
  </fieldset>
}

export function WalletOptions ({ provider, network, onChange, disabled = false }: {
  readonly provider: WalletProvider
  readonly network: Network
  readonly onChange: (provider: WalletProvider) => void
  readonly disabled?: boolean
}) {
  return <fieldset className="mt-4 desktop:mt-0">
    <legend className="mb-3 text-base leading-5 font-bold desktop:mb-4 desktop:w-full desktop:text-center desktop:text-[17px]">
      Carteira e rede
    </legend>

    <div className="flex flex-col gap-4">
      {providers.map((item) => (
        <label key={item.id} className={cn(
          "relative flex h-16.25 cursor-pointer items-center gap-3 rounded-artwork bg-card px-3.5 text-sm",
          "desktop:h-11.25 desktop:flex-row-reverse desktop:justify-end desktop:rounded-input desktop:border desktop:border-border desktop:bg-transparent desktop:px-2.5 desktop:text-[15px]",
          provider === item.id && "desktop:border-primary", (disabled || (network === "solana" && item.id !== "walletconnect")) && "cursor-not-allowed opacity-45",
        )}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-raised text-accent desktop:hidden">
            {item.mark || <img src="/assets/figma-checkout-wallet.svg" alt="" />}
          </span>

          <span className={cn(item.id === "walletconnect" && "desktop:hidden")}>{item.name}</span>
          {item.id === "walletconnect" && <WalletBrands className="hidden desktop:block" compact />}


          <input
            className={cn(radioClassName, "ml-auto desktop:ml-0")}
            type="radio"
            name="purchase-provider"
            aria-label={item.name}
            value={item.id}
            checked={provider === item.id}
            disabled={disabled || (network === "solana" && item.id !== "walletconnect")}
            onChange={() => { onChange(item.id) }}
          />
        </label>
      ))}
    </div>
  </fieldset>
}
