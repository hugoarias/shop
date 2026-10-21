import { Fragment, useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import type { OrderWithItems, PaymentStatus, Product, SalesReportRow } from '../../types/database.types'
import { formatCurrency, formatDate } from '../../lib/format'

interface FlatItem {
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

interface OrderGroup {
  order_id: string
  created_at: string
  payment_status: PaymentStatus
  payment_proof_path: string | null
  items: FlatItem[]
}

interface ProductSummaryRow {
  key: string
  product_id: string
  product_name: string
  variant_name: string | null
  units: number
  revenue: number
}

const statusLabels: Record<PaymentStatus, { label: string; className: string }> = {
  pending_payment: { label: 'Pendiente de pago', className: 'bg-red-100 text-red-700' },
  pending_verification: { label: 'Pendiente de verificación', className: 'bg-amber-100 text-amber-700' },
  verified: { label: 'Verificado', className: 'bg-green-100 text-green-700' },
}

function flattenItems(orders: OrderWithItems[]): FlatItem[] {
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

function groupByOrder(items: FlatItem[]): OrderGroup[] {
  const byOrder = new Map<string, OrderGroup>()
  for (const item of items) {
    const existing = byOrder.get(item.order_id)
    if (existing) {
      existing.items.push(item)
    } else {
      byOrder.set(item.order_id, {
        order_id: item.order_id,
        created_at: item.created_at,
        payment_status: item.payment_status,
        payment_proof_path: item.payment_proof_path,
        items: [item],
      })
    }
  }
  return [...byOrder.values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

function buildProductSummary(items: FlatItem[]): ProductSummaryRow[] {
  const byKey = new Map<string, ProductSummaryRow>()
  for (const item of items) {
    const key = `${item.product_id}:${item.variant_name ?? ''}`
    const existing = byKey.get(key)
    if (existing) {
      existing.units += item.quantity
      existing.revenue += item.line_total
    } else {
      byKey.set(key, {
        key,
        product_id: item.product_id,
        product_name: item.product_name,
        variant_name: item.variant_name,
        units: item.quantity,
        revenue: item.line_total,
      })
    }
  }
  return [...byKey.values()].sort((a, b) => b.units - a.units)
}

function buildStockMap(products: Product[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const product of products) {
    if (product.has_variants) {
      for (const variant of product.variants ?? []) {
        map.set(`${product.id}:${variant.name}`, variant.stock_quantity)
      }
    } else {
      map.set(`${product.id}:`, product.stock_quantity)
    }
  }
  return map
}

function toCsvValue(value: string | number): string {
  const str = String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

function downloadCsv(items: FlatItem[]) {
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

function OrderProofActions({
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

export function AdminSalesReport() {
  const [rows, setRows] = useState<SalesReportRow[]>([])
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.listSalesReport(), api.listAllOrders(), api.listAllProducts()])
      .then(([salesReport, allOrders, allProducts]) => {
        setRows(salesReport)
        setOrders(allOrders)
        setProducts(allProducts)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function markOrderVerified(orderId: string) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, payment_status: 'verified' } : o)),
    )
  }

  const items = useMemo(() => flattenItems(orders), [orders])
  const productSummary = useMemo(() => buildProductSummary(items), [items])
  const stockMap = useMemo(() => buildStockMap(products), [products])
  const pendingVerificationCount = useMemo(
    () => new Set(items.filter((i) => i.payment_status === 'pending_verification').map((i) => i.order_id)).size,
    [items],
  )
  const groupsByBuyer = useMemo(() => {
    const byBuyer = new Map<string, FlatItem[]>()
    for (const item of items) {
      const list = byBuyer.get(item.buyer_email) ?? []
      list.push(item)
      byBuyer.set(item.buyer_email, list)
    }
    const map = new Map<string, OrderGroup[]>()
    for (const [email, buyerItems] of byBuyer) {
      map.set(email, groupByOrder(buyerItems))
    }
    return map
  }, [items])

  if (loading) return <p className="p-6 text-center text-gray-500">Cargando reporte…</p>
  if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>

  if (rows.length === 0)
    return <p className="p-6 text-center text-gray-500">Todavía no hay ventas registradas.</p>

  const grandTotal = rows.reduce((sum, row) => sum + row.total_spent, 0)

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-brand-primary">Reporte de ventas</h1>
          <p className="text-sm text-gray-500">
            Total vendido: <span className="font-semibold text-gray-900">{formatCurrency(grandTotal)}</span>
            {pendingVerificationCount > 0 && (
              <span className="ml-3 text-amber-700">
                {pendingVerificationCount} pedido{pendingVerificationCount === 1 ? '' : 's'} pendiente
                {pendingVerificationCount === 1 ? '' : 's'} de verificación
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => downloadCsv(items)}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
        >
          Exportar CSV
        </button>
      </div>

      <h2 className="mb-2 text-lg font-semibold text-gray-900">Por comprador</h2>
      <div className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3">Comprador</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Pedidos</th>
              <th className="px-4 py-3">Total gastado</th>
              <th className="px-4 py-3">Última compra</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const isOpen = expanded === row.buyer_email
              const buyerGroups = groupsByBuyer.get(row.buyer_email) ?? []
              return (
                <Fragment key={row.buyer_email}>
                  <tr
                    onClick={() => setExpanded(isOpen ? null : row.buyer_email)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-gray-400">{isOpen ? '▾' : '▸'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.buyer_name}</td>
                    <td className="px-4 py-3 text-gray-500">{row.buyer_email}</td>
                    <td className="px-4 py-3">{row.total_orders}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(row.total_spent)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(row.last_purchase)}</td>
                  </tr>
                  {isOpen && (
                    <tr key={`${row.buyer_email}-detail`}>
                      <td></td>
                      <td colSpan={5} className="bg-gray-50 px-4 py-3">
                        <div className="space-y-3">
                          {buyerGroups.map((group) => (
                            <div key={group.order_id} className="rounded-md border border-gray-200 bg-white p-2">
                              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">{formatDate(group.created_at)}</span>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusLabels[group.payment_status].className}`}
                                  >
                                    {statusLabels[group.payment_status].label}
                                  </span>
                                </div>
                                <OrderProofActions group={group} onVerified={markOrderVerified} />
                              </div>
                              <div className="overflow-x-auto">
                              <table className="w-full min-w-[480px] text-left text-xs">
                                <thead className="text-gray-500">
                                  <tr>
                                    <th className="py-1 pr-3">Producto</th>
                                    <th className="py-1 pr-3">Variante</th>
                                    <th className="py-1 pr-3">Cant.</th>
                                    <th className="py-1 pr-3">Precio unit.</th>
                                    <th className="py-1 pr-3">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {group.items.map((item, index) => (
                                    <tr key={`${item.order_id}-${index}`}>
                                      <td className="py-1.5 pr-3 text-gray-900">{item.product_name}</td>
                                      <td className="py-1.5 pr-3 text-gray-500">{item.variant_name ?? '—'}</td>
                                      <td className="py-1.5 pr-3">{item.quantity}</td>
                                      <td className="py-1.5 pr-3">{formatCurrency(item.unit_price)}</td>
                                      <td className="py-1.5 pr-3 font-medium">{formatCurrency(item.line_total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      <h2 className="mb-2 text-lg font-semibold text-gray-900">Resumen por producto</h2>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Variante</th>
              <th className="px-4 py-3">Unidades vendidas</th>
              <th className="px-4 py-3">Stock restante</th>
              <th className="px-4 py-3">Total generado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {productSummary.map((row) => {
              const stock = stockMap.get(`${row.product_id}:${row.variant_name ?? ''}`)
              return (
                <tr key={row.key}>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.product_name}</td>
                  <td className="px-4 py-3 text-gray-500">{row.variant_name ?? '—'}</td>
                  <td className="px-4 py-3">{row.units}</td>
                  <td className="px-4 py-3">
                    {stock === undefined ? (
                      <span className="text-gray-400">—</span>
                    ) : stock <= 0 ? (
                      <span className="font-medium text-red-600">Sin stock</span>
                    ) : (
                      stock
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(row.revenue)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
