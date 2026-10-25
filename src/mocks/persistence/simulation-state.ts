import { type Session } from "../../features/auth/types/session";
import { type Cart } from "../../features/cart/types/cart";
import { type Nft } from "../../features/catalog/types/nft";
import { type Quote } from "../../features/checkout/types/quote";
import { type CollectorProfile } from "../../features/profile/types/collector-profile";
import { type Wallet, type WalletConnection } from "../../features/wallets/types/wallet";
import { type SimulatedOrder } from "../orders/order-lifecycle";

export interface SimulatedUser {
  readonly id: string
  readonly profile: CollectorProfile
  readonly passwordSalt: string
  readonly passwordHash: string
}

export interface SimulationState {
  readonly schemaVersion: 1
  readonly epoch: string
  scenario: string
  nextId: number
  eventSequence: number
  users: Record<string, SimulatedUser>
  sessions: Record<string, Session>
  nfts: Nft[]
  carts: Record<string, Cart>
  favorites: Record<string, string[]>
  completedMerges: Record<string, true>
  wallets: Record<string, Wallet[]>
  connections: Record<string, WalletConnection>
  quotes: Record<string, Quote>
  orders: Record<string, SimulatedOrder>
  attempts: Record<string, { readonly fingerprint: string; readonly orderId: string }>
}

export function nextId (state: SimulationState, prefix: string): string {
  state.nextId += 1
  return prefix + "-" + state.nextId.toString()
}
