import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { OrderWithItems, PaymentStatus } from '../types/database.types'
import { formatCurrency, formatDate } from '../lib/format'

const statusLabels: Record<PaymentStatus, { label: string; className: string }> = {
  pending_payment: { label: 'Pendiente de pago', className: 'bg-red-100 text-red-700' },
  pending_verification: { label: 'Pendiente de verificación', className: 'bg-amber-100 text-amber-700' },
  verified: { label: 'Verificado', className: 'bg-green-100 text-green-700' },
}

function PaymentSection({
  order,
  onProofSubmitted,
}: {
  order: OrderWithItems
  onProofSubmitted: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const status = statusLabels[order.payment_status]

  async function submitProof() {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      await api.submitPaymentProof(order.id, file)
      onProofSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el comprobante')
    } finally {
      setUploading(false)
    }
  }

  async function verComprobante() {
    if (!order.payment_proof_path) return
    setViewing(true)
    setError(null)
    try {
      const url = await api.getPaymentProofUrl(order.payment_proof_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir el comprobante')
    } finally {
      setViewing(false)
    }
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
        {status.label}
      </span>

      {order.payment_status === 'pending_payment' && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-xs"
          />
          <button
            onClick={() => void submitProof()}
            disabled={!file || uploading}
            className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? 'Subiendo…' : 'Subir comprobante'}
          </button>
        </div>
      )}

      {order.payment_status !== 'pending_payment' && order.payment_proof_path && (
        <button
          onClick={() => void verComprobante()}
          disabled={viewing}
          className="mt-2 block text-xs font-medium text-brand-secondary hover:underline disabled:opacity-60"
        >
          {viewing ? 'Abriendo…' : 'Ver comprobante'}
        </button>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function MyOrders() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    api
      .listMyOrders()
      .then(setOrders)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
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
                    {item.variant_name && ` (talla ${item.variant_name})`}
                  </span>
                  <span>{formatCurrency(item.line_total ?? item.quantity * item.unit_price)}</span>
                </li>
              ))}
            </ul>
            <PaymentSection order={order} onProofSubmitted={load} />
          </div>
        ))}
      </div>
    </div>
  )
}
