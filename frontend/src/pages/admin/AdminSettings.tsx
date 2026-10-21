import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

export function AdminSettings() {
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function load() {
    setLoading(true)
    api
      .getPaymentQrUrl()
      .then(setQrUrl)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function guardarQr() {
    if (!file) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      await api.uploadPaymentQr(file)
      setFile(null)
      setSuccess(true)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el QR')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="font-display mb-6 text-3xl text-brand-primary">Configuración</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="mb-3 font-semibold text-gray-900">QR de pago</p>
        <p className="mb-3 text-sm text-gray-500">
          Esta imagen se muestra a los compradores en la pantalla de confirmación de compra.
        </p>

        {loading ? (
          <p className="text-sm text-gray-500">Cargando…</p>
        ) : qrUrl ? (
          <img src={qrUrl} alt="QR de pago actual" className="mb-3 h-48 w-48 rounded-md border border-gray-200 object-contain" />
        ) : (
          <p className="mb-3 text-sm text-gray-500">Todavía no subiste ningún QR.</p>
        )}

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mb-3 w-full text-sm"
        />

        {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {success && (
          <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">QR guardado correctamente</p>
        )}

        <button
          onClick={() => void guardarQr()}
          disabled={!file || saving}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar QR'}
        </button>
      </div>
    </div>
  )
}
