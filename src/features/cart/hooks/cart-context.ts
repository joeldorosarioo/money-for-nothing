import { createContext, useContext } from "react";

import { type AddCartItem, type CartView } from "../types/cart";

interface CartContextValue {
  readonly cart: CartView | null
  readonly loading: boolean
  readonly error: Error | null
  readonly adding: boolean
  readonly scope: string
  readonly addItem: (input: AddCartItem) => Promise<CartView>
  readonly changeItem: (id: string, quantity: number, version: number) => Promise<CartView>
  readonly removeItem: (id: string, version: number) => Promise<CartView>
  readonly retry: () => void
}

export const CartContext = createContext<CartContextValue | null>(null)

export function useCart () {
  const context = useContext(CartContext);

  if (!context) throw new Error("CartProvider is required.");
  return context
}
