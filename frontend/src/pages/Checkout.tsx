import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { formatCurrency } from '../lib/format'

export function Checkout() {
  const { items, totalAmount, clear } = useCart()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <p className="mb-4 text-gray-500">No tienes productos en el carrito.</p>
        <Link to="/" className="font-medium text-brand-secondary hover:underline">
          Ver catálogo
        </Link>
      </div>
    )
  }

  async function confirmarCompra() {
    setSubmitting(true)
    setError(null)
    const cart_items = items.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      variant_id: item.variant?.id ?? null,
    }))

    try {
      const orderId = await api.checkout(cart_items)
      clear()
      navigate('/mis-compras', { state: { newOrderId: orderId } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la compra')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="font-display mb-4 text-3xl text-brand-primary">Confirmar compra</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="mb-2 text-sm text-gray-500">Comprando como</p>
        <p className="mb-4 font-medium text-gray-900">{profile?.full_name ?? 'Cargando…'}</p>

        <ul className="mb-4 divide-y divide-gray-100">
          {items.map((item) => (
            <li
              key={`${item.product.id}:${item.variant?.id ?? 'base'}`}
              className="flex justify-between py-2 text-sm"
            >
              <span>
                {item.quantity} × {item.product.name}
                {item.variant && ` (talla ${item.variant.name})`}
              </span>
              <span>{formatCurrency(item.quantity * item.product.price)}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-gray-200 pt-3">
          <span className="font-semibold">Total</span>
          <span className="font-display text-xl text-brand-primary">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        onClick={() => void confirmarCompra()}
        disabled={submitting}
        className="mt-4 w-full rounded-md bg-brand-primary px-4 py-3 font-semibold text-white hover:brightness-110 disabled:opacity-60"
      >
        {submitting ? 'Procesando…' : 'Confirmar compra'}
      </button>
    </div>
  )
}
