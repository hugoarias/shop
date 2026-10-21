import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { formatCurrency } from '../lib/format'
import { calcLineTotal } from '../lib/pricing'

const MAX_PROOF_SIZE = 5 * 1024 * 1024

export function Checkout() {
  const { items, totalAmount, clear } = useCart()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api
      .getPaymentQrUrl()
      .then(setQrUrl)
      .catch(() => setQrUrl(null))
  }, [])

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (file && file.size > MAX_PROOF_SIZE) {
      setError('El archivo no puede pesar más de 5 MB')
      setProofFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setError(null)
    setProofFile(file)
  }

  async function confirmarCompra() {
    if (!proofFile) {
      setError('Debes subir tu comprobante de pago')
      return
    }

    setSubmitting(true)
    setError(null)
    const cart_items = items.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      variant_id: item.variant?.id ?? null,
    }))

    try {
      const proofPath = await api.uploadPaymentProof(proofFile)
      const orderId = await api.checkout(cart_items, proofPath)
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
                {item.variant && ` (${item.variant.name})`}
              </span>
              <span>
                {formatCurrency(calcLineTotal(item.product.price_tiers, item.product.price, item.quantity))}
              </span>
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

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <p className="mb-3 font-semibold text-gray-900">Paga con QR</p>
        {qrUrl ? (
          <img src={qrUrl} alt="Código QR de pago" className="mx-auto mb-3 h-56 w-56 rounded-md object-contain" />
        ) : (
          <p className="mb-3 text-sm text-gray-500">
            El QR de pago todavía no está disponible. Contacta a un administrador.
          </p>
        )}
        <p className="mb-2 text-sm text-gray-500">
          Escanea el QR, realiza el pago por {formatCurrency(totalAmount)} y sube tu comprobante para confirmar
          la compra.
        </p>

        <label className="mb-1 mt-3 block text-sm font-medium text-gray-700">
          Comprobante de pago <span className="text-red-600">*</span>
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-brand-primary hover:text-brand-primary"
        >
          {proofFile ? 'Cambiar archivo' : 'Elegir archivo'}
        </button>
        {proofFile && <p className="mt-1 text-xs text-gray-500">Seleccionado: {proofFile.name}</p>}
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        onClick={() => void confirmarCompra()}
        disabled={submitting || !proofFile}
        className="mt-4 w-full rounded-md bg-brand-primary px-4 py-3 font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Procesando…' : 'Confirmar compra'}
      </button>
    </div>
  )
}
