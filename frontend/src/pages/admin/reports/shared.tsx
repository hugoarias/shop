import { useState } from 'react'
import { api } from '../../../lib/api'
import type { OrderWithItems, PaymentStatus, Product } from '../../../types/database.types'
import { formatCurrency, formatDate } from '../../../lib/format'

export interface FlatItem {
  order_id: string
  created_at: string
  buyer_name: string
  buyer_email: string
  payment_status: PaymentStatus
  payment_proof_path: string | null
  product_id: string
  product_name: string
  variant_name: string | null
  quantity: number
  unit_price: number
  line_total: number
}

export interface OrderGroup {
  order_id: string
  created_at: string
  buyer_name: string
  buyer_email: string
  payment_status: PaymentStatus
  payment_proof_path: string | null
  items: FlatItem[]
}

export interface ProductReportRow {
  key: string
  product_id: string
  product_name: string
  variant_name: string | null
  stock: number
  units_sold: number
  revenue: number
}

export const statusLabels: Record<PaymentStatus, { label: string; className: string }> = {
  pending_payment: { label: 'Pendiente de pago', className: 'bg-red-100 text-red-700' },
  pending_verification: { label: 'Pendiente de verificación', className: 'bg-amber-100 text-amber-700' },
  verified: { label: 'Verificado', className: 'bg-green-100 text-green-700' },
}

export function flattenItems(orders: OrderWithItems[]): FlatItem[] {
  const items: FlatItem[] = []
  for (const order of orders) {
    if (order.status !== 'completed') continue
    for (const item of order.order_items) {
      items.push({
        order_id: order.id,
        created_at: order.created_at,
        buyer_name: order.buyer_name,
        buyer_email: order.buyer_email,
        payment_status: order.payment_status,
        payment_proof_path: order.payment_proof_path,
        product_id: item.product_id,
        product_name: item.products?.name ?? 'Producto eliminado',
        variant_name: item.variant_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total ?? item.quantity * item.unit_price,
      })
    }
  }
  return items
}

export function groupByOrder(items: FlatItem[]): OrderGroup[] {
  const byOrder = new Map<string, OrderGroup>()
  for (const item of items) {
    const existing = byOrder.get(item.order_id)
    if (existing) {
      existing.items.push(item)
    } else {
      byOrder.set(item.order_id, {
        order_id: item.order_id,
        created_at: item.created_at,
        buyer_name: item.buyer_name,
        buyer_email: item.buyer_email,
        payment_status: item.payment_status,
        payment_proof_path: item.payment_proof_path,
        items: [item],
      })
    }
  }
  return [...byOrder.values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function buildProductReport(products: Product[], items: FlatItem[]): ProductReportRow[] {
  const sales = new Map<string, { units: number; revenue: number }>()
  for (const item of items) {
    const key = `${item.product_id}:${item.variant_name ?? ''}`
    const existing = sales.get(key)
    if (existing) {
      existing.units += item.quantity
      existing.revenue += item.line_total
    } else {
      sales.set(key, { units: item.quantity, revenue: item.line_total })
    }
  }

  const rows: ProductReportRow[] = []
  for (const product of products) {
    if (!product.is_active) continue
    if (product.has_variants) {
      for (const variant of product.variants ?? []) {
        if (!variant.is_active) continue
        const key = `${product.id}:${variant.name}`
        const s = sales.get(key)
        rows.push({
          key,
          product_id: product.id,
          product_name: product.name,
          variant_name: variant.name,
          stock: variant.stock_quantity,
          units_sold: s?.units ?? 0,
          revenue: s?.revenue ?? 0,
        })
      }
    } else {
      const key = `${product.id}:`
      const s = sales.get(key)
      rows.push({
        key,
        product_id: product.id,
        product_name: product.name,
        variant_name: null,
        stock: product.stock_quantity,
        units_sold: s?.units ?? 0,
        revenue: s?.revenue ?? 0,
      })
    }
  }
  return rows.sort(
    (a, b) =>
      a.product_name.localeCompare(b.product_name, 'es') ||
      (a.variant_name ?? '').localeCompare(b.variant_name ?? '', 'es'),
  )
}

export function toCsvValue(value: string | number): string {
  const str = String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function downloadCsv(items: FlatItem[]) {
  const header = [
    'Fecha',
    'Comprador',
    'Correo',
    'Estado de pago',
    'Producto',
    'Variante',
    'Cantidad',
    'Precio unitario',
    'Total línea',
  ]
  const lines = items.map((item) =>
    [
      formatDate(item.created_at),
      item.buyer_name,
      item.buyer_email,
      statusLabels[item.payment_status].label,
      item.product_name,
      item.variant_name ?? '',
      item.quantity,
      item.unit_price,
      item.line_total,
    ]
      .map(toCsvValue)
      .join(','),
  )
  const csv = [header.join(','), ...lines].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `reporte-ventas-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function OrderProofActions({
  group,
  onVerified,
}: {
  group: OrderGroup
  onVerified: (orderId: string) => void
}) {
  const [viewing, setViewing] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function verComprobante() {
    if (!group.payment_proof_path) return
    setViewing(true)
    setError(null)
    try {
      const url = await api.getPaymentProofUrl(group.payment_proof_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir el comprobante')
    } finally {
      setViewing(false)
    }
  }

  async function marcarVerificado() {
    setVerifying(true)
    setError(null)
    try {
      await api.verifyPayment(group.order_id)
      onVerified(group.order_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo verificar el pago')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {group.payment_proof_path && (
        <button
          onClick={() => void verComprobante()}
          disabled={viewing}
          className="text-xs font-medium text-brand-secondary hover:underline disabled:opacity-60"
        >
          {viewing ? 'Abriendo…' : 'Ver comprobante'}
        </button>
      )}
      {group.payment_status === 'pending_verification' && (
        <button
          onClick={() => void marcarVerificado()}
          disabled={verifying}
          className="rounded-md bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {verifying ? 'Guardando…' : 'Marcar como verificado'}
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}

export { formatCurrency, formatDate }
