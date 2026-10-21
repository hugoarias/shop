import { Fragment, useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import type { OrderWithItems, SalesReportRow } from '../../types/database.types'
import { formatCurrency, formatDate } from '../../lib/format'

interface FlatItem {
  order_id: string
  created_at: string
  buyer_name: string
  buyer_email: string
  product_id: string
  product_name: string
  variant_name: string | null
  quantity: number
  unit_price: number
  line_total: number
}

interface ProductSummaryRow {
  key: string
  product_name: string
  variant_name: string | null
  units: number
  revenue: number
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
        product_name: item.product_name,
        variant_name: item.variant_name,
        units: item.quantity,
        revenue: item.line_total,
      })
    }
  }
  return [...byKey.values()].sort((a, b) => b.units - a.units)
}

function toCsvValue(value: string | number): string {
  const str = String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

function downloadCsv(items: FlatItem[]) {
  const header = ['Fecha', 'Comprador', 'Correo', 'Producto', 'Variante', 'Cantidad', 'Precio unitario', 'Total línea']
  const lines = items.map((item) =>
    [
      formatDate(item.created_at),
      item.buyer_name,
      item.buyer_email,
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

export function AdminSalesReport() {
  const [rows, setRows] = useState<SalesReportRow[]>([])
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.listSalesReport(), api.listAllOrders()])
      .then(([salesReport, allOrders]) => {
        setRows(salesReport)
        setOrders(allOrders)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const items = useMemo(() => flattenItems(orders), [orders])
  const productSummary = useMemo(() => buildProductSummary(items), [items])
  const itemsByBuyer = useMemo(() => {
    const map = new Map<string, FlatItem[]>()
    for (const item of items) {
      const list = map.get(item.buyer_email) ?? []
      list.push(item)
      map.set(item.buyer_email, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.created_at.localeCompare(a.created_at))
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
        <table className="w-full text-left text-sm">
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
              const buyerItems = itemsByBuyer.get(row.buyer_email) ?? []
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
                        <table className="w-full text-left text-xs">
                          <thead className="text-gray-500">
                            <tr>
                              <th className="py-1 pr-3">Fecha</th>
                              <th className="py-1 pr-3">Producto</th>
                              <th className="py-1 pr-3">Variante</th>
                              <th className="py-1 pr-3">Cant.</th>
                              <th className="py-1 pr-3">Precio unit.</th>
                              <th className="py-1 pr-3">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {buyerItems.map((item, index) => (
                              <tr key={`${item.order_id}-${index}`}>
                                <td className="py-1.5 pr-3 text-gray-500">{formatDate(item.created_at)}</td>
                                <td className="py-1.5 pr-3 text-gray-900">{item.product_name}</td>
                                <td className="py-1.5 pr-3 text-gray-500">{item.variant_name ?? '—'}</td>
                                <td className="py-1.5 pr-3">{item.quantity}</td>
                                <td className="py-1.5 pr-3">{formatCurrency(item.unit_price)}</td>
                                <td className="py-1.5 pr-3 font-medium">{formatCurrency(item.line_total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 text-lg font-semibold text-gray-900">Resumen por producto</h2>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Variante</th>
              <th className="px-4 py-3">Unidades vendidas</th>
              <th className="px-4 py-3">Total generado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {productSummary.map((row) => (
              <tr key={row.key}>
                <td className="px-4 py-3 font-medium text-gray-900">{row.product_name}</td>
                <td className="px-4 py-3 text-gray-500">{row.variant_name ?? '—'}</td>
                <td className="px-4 py-3">{row.units}</td>
                <td className="px-4 py-3 font-semibold">{formatCurrency(row.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
