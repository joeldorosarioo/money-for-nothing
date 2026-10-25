import { type Network } from "../../../shared/types/network";

export interface QuoteItem {
  readonly cartItemId: string
  readonly nftId: string
  readonly editionId: string
  readonly name: string
  readonly tokenId: string
  readonly image: string
  readonly editionLabel: string
  readonly quantity: number
  readonly unitPrice: string
  readonly lineTotal: string
  readonly nftVersion: number
}

export interface QuoteTotals {
  readonly subtotal: string
  readonly discount: string
  readonly networkFee: string
  readonly total: string
}

export interface Quote {
  readonly id: string
  readonly ownerId: string
  readonly cartId: string
  readonly cartVersion: number
  readonly network: Network
  readonly coupon: string | null
  readonly items: readonly QuoteItem[]
  readonly totals: QuoteTotals
  readonly expiresAt: number
  readonly version: number
}
