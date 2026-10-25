import { type Network } from "../../../shared/types/network";

export type WalletProvider = "walletconnect" | "metamask" | "coinbase"
export type WalletSlot = "primary" | "secondary"

export interface Wallet {
  readonly id: string
  readonly slot: WalletSlot
  readonly displayName: string
  readonly nickname: string
  readonly network: Network
  readonly profileName: string
  readonly address: string
  readonly secondaryAddress: string
  readonly provider: WalletProvider
  readonly referralCode: string
  readonly email: string
  readonly ens: string
  readonly aliasOfPrimary: boolean
  readonly version: number
}

export interface WalletConnection {
  readonly id: string
  readonly walletId: string
  readonly network: Network
  readonly provider: WalletProvider
  readonly expiresAt: number
}
