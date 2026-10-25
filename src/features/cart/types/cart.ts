import { type Network } from "../../../shared/types/network";

export interface CartItem {
  readonly id: string
  readonly nftId: string
  readonly editionId: string
  readonly quantity: number
}

export interface Cart {
  readonly id: string
  readonly ownerId: string
  readonly version: number
  readonly items: readonly CartItem[]
}

export interface CartLine extends CartItem {
  readonly name: string
  readonly tokenId: string
  readonly image: string
  readonly network: Network
  readonly editionLabel: string
  readonly unitPrice: string
  readonly available: number
  readonly nftVersion: number
}

export interface CartView extends Cart {
  readonly items: readonly CartLine[]
}

export type AddCartItem = Omit<CartItem, "id">

export interface PurchasedItem {
  readonly cartItemId: string
  readonly quantity: number
}

export interface CartAdjustment {
  readonly nftId: string
  readonly editionId: string
  readonly requested: number
  readonly available: number
}
