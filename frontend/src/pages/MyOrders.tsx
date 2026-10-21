import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { OrderWithItems } from '../types/database.types'
import { formatCurrency, formatDate } from '../lib/format'

export function MyOrders() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('orders')
      .select('*, order_items(*, products(name, image_url))')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setOrders(data as unknown as OrderWithItems[])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <p className="p-6 text-center text-gray-500">Cargando tus compras…</p>
  if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>
  if (orders.length === 0)
    return <p className="p-6 text-center text-gray-500">Todavía no realizaste ninguna compra.</p>

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="font-display mb-6 text-3xl text-brand-primary">Mis compras</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">{formatDate(order.created_at)}</span>
              <span className="font-display text-lg text-brand-primary">
                {formatCurrency(order.total)}
              </span>
            </div>
            <ul className="divide-y divide-gray-100">
              {order.order_items.map((item) => (
                <li key={item.id} className="flex justify-between py-1.5 text-sm text-gray-700">
                  <span>
                    {item.quantity} × {item.products?.name ?? 'Producto eliminado'}
                  </span>
                  <span>{formatCurrency(item.quantity * item.unit_price)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
