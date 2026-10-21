import type { PriceTier, Product, ProductVariant } from '../types/database.types'

/**
 * Calcula el total de una línea del carrito aplicando precios por cantidad
 * ("combos" tipo 3x25Bs): arma primero la mayor cantidad de paquetes del
 * umbral más grande, y así sucesivamente, cobrando el sobrante al precio
 * normal. Espejo exacto de calc_line_total() en supabase/migrations/0008.
 */
export function calcLineTotal(tiers: PriceTier[] | undefined, basePrice: number, quantity: number): number {
  let remaining = quantity
  let total = 0

  const sortedTiers = [...(tiers ?? [])].sort((a, b) => b.min_quantity - a.min_quantity)
  for (const tier of sortedTiers) {
    if (remaining >= tier.min_quantity) {
      const bundles = Math.floor(remaining / tier.min_quantity)
      total += bundles * tier.bundle_price
      remaining -= bundles * tier.min_quantity
    }
  }

  total += remaining * basePrice
  return Math.round(total * 100) / 100
}

interface GroupableCartItem {
  product: Product
  variant: ProductVariant | null
  quantity: number
}

export interface CartItemGroup<T extends GroupableCartItem> {
  key: string
  product: Product
  items: T[]
  isCombo: boolean
  subtotal: number
  savings: number
}

/**
 * Agrupa las líneas del carrito por producto. Si el producto tiene variantes
 * Y precios por cantidad ("combo cruzado"), junta todas sus líneas en un solo
 * grupo y calcula el subtotal sobre la cantidad total sumada entre variantes
 * (ej. 2 RNA + 1 Alumni = 3, aplica el combo). Si no, cada línea sigue siendo
 * su propio grupo de 1, igual que el comportamiento de antes.
 */
export function groupCartItems<T extends GroupableCartItem>(items: T[]): CartItemGroup<T>[] {
  const byProduct = new Map<string, T[]>()
  for (const item of items) {
    const list = byProduct.get(item.product.id) ?? []
    list.push(item)
    byProduct.set(item.product.id, list)
  }

  const groups: CartItemGroup<T>[] = []
  for (const [productId, productItems] of byProduct) {
    const product = productItems[0].product
    const isCombo = product.has_variants && (product.price_tiers?.length ?? 0) > 0

    if (isCombo) {
      const totalQty = productItems.reduce((sum, item) => sum + item.quantity, 0)
      const subtotal = calcLineTotal(product.price_tiers, product.price, totalQty)
      const savings = product.price * totalQty - subtotal
      groups.push({ key: productId, product, items: productItems, isCombo: true, subtotal, savings })
    } else {
      for (const item of productItems) {
        const subtotal = calcLineTotal(product.price_tiers, product.price, item.quantity)
        const savings = product.price * item.quantity - subtotal
        groups.push({
          key: `${productId}:${item.variant?.id ?? 'base'}`,
          product,
          items: [item],
          isCombo: false,
          subtotal,
          savings,
        })
      }
    }
  }
  return groups
}
