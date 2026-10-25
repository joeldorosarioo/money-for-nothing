import { type Order, type OrderInput } from "../types/order";

export interface PurchaseAttempt {
  readonly ownerId: string
  readonly key: string
  readonly input: OrderInput
  readonly orderId: string | null
}

export function createPurchaseService ({ submitOrder, getOrder, persistence, createId, isDefinitiveFailure }: {
  readonly submitOrder: (input: OrderInput, key: string) => Promise<Order>
  readonly getOrder: (id: string) => Promise<Order>

  readonly persistence: {
    readonly read: (ownerId: string) => PurchaseAttempt | null
    readonly write: (ownerId: string, attempt: PurchaseAttempt | null) => void
  }

  readonly createId: () => string
  readonly isDefinitiveFailure: (error: unknown) => boolean
}) {
  const inFlight = new Map<string, Promise<Order>>()

  function observe (order: Order) {
    const attempt = persistence.read(order.ownerId)

    if (order.status !== "pending" && attempt?.key === order.idempotencyKey && attempt.orderId === order.id) {
      persistence.write(order.ownerId, null)
    }
  }

  function run (attempt: PurchaseAttempt): Promise<Order> {
    const existing = inFlight.get(attempt.ownerId)
    if (existing) return existing

    const request = Promise.resolve().then(async () => {
      try {
        const order = attempt.orderId
          ? await getOrder(attempt.orderId)
          : await submitOrder(attempt.input, attempt.key)

        if (order.ownerId !== attempt.ownerId) throw new Error("O pedido retornado pertence a outra conta.")
        persistence.write(attempt.ownerId, { ...attempt, orderId: order.id })

        observe(order)
        return order
      } catch (error) {
        if (isDefinitiveFailure(error)) persistence.write(attempt.ownerId, null)
        throw error
      } finally {
        inFlight.delete(attempt.ownerId)
      }
    })

    inFlight.set(attempt.ownerId, request)
    return request
  }

  return {
    read: (ownerId: string) => persistence.read(ownerId),
    observe,

    async submit (ownerId: string, input: OrderInput): Promise<Order> {
      const saved = persistence.read(ownerId)

      if (saved && JSON.stringify(saved.input) !== JSON.stringify(input)) {
        throw new Error("Recupere sua tentativa anterior antes de iniciar outra compra.")
      }

      const attempt = saved ?? {
        ownerId,
        key: createId(),

        input: {
          ...input,
          collector: {
            ...input.collector
          }
        },

        orderId: null,
      }

      persistence.write(ownerId, attempt)
      return run(attempt)
    },

    async recover (ownerId: string): Promise<Order> {
      const attempt = persistence.read(ownerId)
      if (!attempt) throw new Error("Nenhuma tentativa de compra para recuperar.")
      return run(attempt)
    },
  }
}

export type PurchaseService = ReturnType<typeof createPurchaseService>
