import { type Network } from "../../../shared/types/network";

export interface NftEdition {
  readonly id: string
  readonly label: string
  readonly totalSupply: number
  readonly available: number
  readonly unitPrice: string
}

export interface Nft {
  readonly id: string
  readonly tokenId: string
  readonly name: string
  readonly image: string
  readonly category: string
  readonly network: Network
  readonly creator: string
  readonly description: string
  readonly editions: readonly NftEdition[]
  readonly version: number
  readonly listedAt: number
  readonly popularity: number
  readonly previousPrice: string | null
  readonly attributes: readonly { readonly name: string; readonly value: string }[]
}
