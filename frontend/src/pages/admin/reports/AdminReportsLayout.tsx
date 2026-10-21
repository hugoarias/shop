import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { api } from '../../../lib/api'
import type { OrderWithItems, Product, SalesReportRow } from '../../../types/database.types'
import { flattenItems, formatCurrency, groupByOrder, downloadCsv, type FlatItem, type OrderGroup } from './shared'

export interface ReportsContext {
  rows: SalesReportRow[]
  products: Product[]
  items: FlatItem[]
  orderGroups: OrderGroup[]
  groupsByBuyer: Map<string, OrderGroup[]>
  markOrderVerified: (orderId: string) => void
}

const tabClasses = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-medium border-b-2 ${
    isActive ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
  }`

export function AdminReportsLayout() {
  const [rows, setRows] = useState<SalesReportRow[]>([])
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, payment_status: 'verified' } : o)))
  }

  const items = useMemo(() => flattenItems(orders), [orders])
  const orderGroups = useMemo(() => groupByOrder(items), [items])
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

  const context: ReportsContext = { rows, products, items, orderGroups, groupsByBuyer, markOrderVerified }

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-brand-primary">Reportes</h1>
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

      <div className="mb-6 flex gap-4 border-b border-gray-200">
        <NavLink to="pedidos" className={tabClasses}>
          Por pedido
        </NavLink>
        <NavLink to="compradores" className={tabClasses}>
          Por comprador
        </NavLink>
        <NavLink to="productos" className={tabClasses}>
          Por producto
        </NavLink>
      </div>

      <Outlet context={context} />
    </div>
  )
}
