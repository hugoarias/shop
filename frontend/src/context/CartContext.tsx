import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Product, ProductVariant } from '../types/database.types'
import { calcLineTotal } from '../lib/pricing'

export interface CartItem {
  product: Product
  variant: ProductVariant | null
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  addItem: (product: Product, variant: ProductVariant | null, quantity?: number) => void
  removeItem: (productId: string, variantId: string | null) => void
  setQuantity: (productId: string, variantId: string | null, quantity: number) => void
  clear: () => void
  totalItems: number
  totalAmount: number
}

const CartContext = createContext<CartContextValue | undefined>(undefined)
const STORAGE_KEY = 'aab-carrito:cart'

function sameLine(item: CartItem, productId: string, variantId: string | null) {
  return item.product.id === productId && (item.variant?.id ?? null) === variantId
}

function maxStock(item: Pick<CartItem, 'product' | 'variant'>): number {
  return item.variant ? item.variant.stock_quantity : item.product.stock_quantity
}

function loadFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadFromStorage())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Almacenamiento no disponible (modo privado, etc.) — se ignora, el carrito sigue en memoria.
    }
  }, [items])

  function addItem(product: Product, variant: ProductVariant | null, quantity = 1) {
    setItems((prev) => {
      const variantId = variant?.id ?? null
      const existing = prev.find((item) => sameLine(item, product.id, variantId))
      const limit = variant ? variant.stock_quantity : product.stock_quantity
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, limit)
        return prev.map((item) =>
          sameLine(item, product.id, variantId) ? { ...item, quantity: nextQty } : item,
        )
      }
      return [...prev, { product, variant, quantity: Math.min(quantity, limit) }]
    })
  }

  function removeItem(productId: string, variantId: string | null) {
    setItems((prev) => prev.filter((item) => !sameLine(item, productId, variantId)))
  }

  function setQuantity(productId: string, variantId: string | null, quantity: number) {
    setItems((prev) =>
      prev
        .map((item) =>
          sameLine(item, productId, variantId)
            ? { ...item, quantity: Math.max(1, Math.min(quantity, maxStock(item))) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  function clear() {
    setItems([])
  }

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])
  const totalAmount = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + calcLineTotal(item.product.price_tiers, item.product.price, item.quantity),
        0,
      ),
    [items],
  )

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, setQuantity, clear, totalItems, totalAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>')
  return ctx
}
