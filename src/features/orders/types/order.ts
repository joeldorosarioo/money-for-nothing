import { type Network } from "../../../shared/types/network";
import { type QuoteItem, type QuoteTotals } from "../../checkout/types/quote";

export interface OrderInput {
  readonly quoteId: string
  readonly walletConnectionId: string
  readonly collector: {
    readonly displayName: string
    readonly username: string
    readonly email: string
    readonly ens: string
    readonly referralCode: string
    readonly notes: string
  }
}

export interface OrderSnapshot {
  readonly items: readonly QuoteItem[]
  readonly totals: QuoteTotals
  readonly network: Network
  readonly walletAddress: string
  readonly collectorName: string
  readonly collectorEmail: string
}

interface OrderBase {
  readonly id: string
  readonly ownerId: string
  readonly version: number
  readonly createdAt: number
  readonly idempotencyKey: string
  readonly snapshot: OrderSnapshot
}

export interface PendingOrder extends OrderBase {
  readonly status: "pending"
  readonly transactionReference: null
  readonly reason: null
  readonly confirmedAt: null
}

export interface ConfirmedOrder extends OrderBase {
  readonly status: "confirmed"
  readonly transactionReference: string
  readonly reason: null
  readonly confirmedAt: number
}

export interface RejectedOrder extends OrderBase {
  readonly status: "rejected"
  readonly transactionReference: null
  readonly reason: string
  readonly confirmedAt: null
}

export type Order = PendingOrder | ConfirmedOrder | RejectedOrder
