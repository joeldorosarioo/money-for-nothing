export type LiveResource = "catalog" | "cart" | "favorites" | "profile" | "wallets" | "order" | "session" | "reset"

export interface LiveEvent {
  readonly id: string
  readonly epoch: string
  readonly resource: LiveResource
  readonly subjectId: string
  readonly ownerId: string | null
  readonly version: number
}
