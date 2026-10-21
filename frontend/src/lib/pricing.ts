import type { PriceTier } from '../types/database.types'

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
