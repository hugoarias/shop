import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'

const emptyForm = {
  name: '',
  description: '',
  price: '',
  stock_quantity: '',
}

interface VariantRow {
  id?: string
  name: string
  stock_quantity: string
}

interface PriceTierRow {
  id?: string
  min_quantity: string
  bundle_price: string
}

export function AdminProductForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [form, setForm] = useState(emptyForm)
  const [hasVariants, setHasVariants] = useState(false)
  const [variantRows, setVariantRows] = useState<VariantRow[]>([])
  const [originalVariantIds, setOriginalVariantIds] = useState<string[]>([])
  const [tierRows, setTierRows] = useState<PriceTierRow[]>([])
  const [originalTierIds, setOriginalTierIds] = useState<string[]>([])
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEditing || !id) return
    api
      .getProduct(id)
      .then((product) => {
        if (!product) {
          setError('Producto no encontrado')
          return
        }
        setForm({
          name: product.name,
          description: product.description ?? '',
          price: String(product.price),
          stock_quantity: String(product.stock_quantity),
        })
        setImageUrl(product.image_url)
        setHasVariants(product.has_variants)
        const variants = (product.variants ?? []).filter((v) => v.is_active)
        setVariantRows(variants.map((v) => ({ id: v.id, name: v.name, stock_quantity: String(v.stock_quantity) })))
        setOriginalVariantIds(variants.map((v) => v.id))
        const tiers = product.price_tiers ?? []
        setTierRows(
          tiers.map((t) => ({ id: t.id, min_quantity: String(t.min_quantity), bundle_price: String(t.bundle_price) })),
        )
        setOriginalTierIds(tiers.map((t) => t.id))
      })
      .catch((err: Error) => setError(err.message))
  }, [id, isEditing])

  function toggleHasVariants(checked: boolean) {
    setHasVariants(checked)
    if (checked && variantRows.length === 0) {
      setVariantRows([{ name: '', stock_quantity: form.stock_quantity || '0' }])
    }
  }

  function updateVariantRow(index: number, patch: Partial<VariantRow>) {
    setVariantRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function removeVariantRow(index: number) {
    setVariantRows((rows) => rows.filter((_, i) => i !== index))
  }

  function addVariantRow() {
    setVariantRows((rows) => [...rows, { name: '', stock_quantity: '0' }])
  }

  function updateTierRow(index: number, patch: Partial<PriceTierRow>) {
    setTierRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function removeTierRow(index: number) {
    setTierRows((rows) => rows.filter((_, i) => i !== index))
  }

  function addTierRow() {
    setTierRows((rows) => [...rows, { min_quantity: '', bundle_price: '' }])
  }

  async function uploadImageIfNeeded(): Promise<string | null> {
    if (!imageFile) return imageUrl
    return api.uploadProductImage(imageFile)
  }

  async function saveVariants(productId: string) {
    const currentIds = new Set<string>()

    for (const [index, row] of variantRows.entries()) {
      const name = row.name.trim()
      if (!name) continue
      const stock_quantity = Number(row.stock_quantity) || 0
      if (row.id) {
        currentIds.add(row.id)
        await api.updateVariant(row.id, { name, stock_quantity, sort_order: index + 1 })
      } else {
        await api.createVariant(productId, { name, stock_quantity, sort_order: index + 1 })
      }
    }

    const removedIds = originalVariantIds.filter((vid) => !currentIds.has(vid))
    for (const variantId of removedIds) {
      try {
        await api.deleteVariant(variantId)
      } catch {
        await api.updateVariant(variantId, { is_active: false })
        showToast('Una variante con ventas registradas se desactivó en vez de eliminarse')
      }
    }
  }

  async function saveTiers(productId: string) {
    const currentIds = new Set<string>()

    for (const row of tierRows) {
      const min_quantity = Number(row.min_quantity)
      const bundle_price = Number(row.bundle_price)
      if (!min_quantity || min_quantity < 2 || Number.isNaN(bundle_price)) continue
      if (row.id) {
        currentIds.add(row.id)
        await api.updatePriceTier(row.id, { min_quantity, bundle_price })
      } else {
        await api.createPriceTier(productId, { min_quantity, bundle_price })
      }
    }

    const removedIds = originalTierIds.filter((tid) => !currentIds.has(tid))
    for (const tierId of removedIds) {
      await api.deletePriceTier(tierId)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const finalImageUrl = await uploadImageIfNeeded()
      const productId = await api.saveProduct(id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        stock_quantity: hasVariants ? 0 : Number(form.stock_quantity),
        image_url: finalImageUrl,
        has_variants: hasVariants,
      })

      if (hasVariants) {
        await saveVariants(productId)
      }
      await saveTiers(productId)

      navigate('/admin/productos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el producto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="font-display mb-6 text-3xl text-brand-primary">
        {isEditing ? 'Editar producto' : 'Nuevo producto'}
      </h1>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            rows={3}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">Precio (Bs.)</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          {!hasVariants && (
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Stock</label>
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={hasVariants}
            onChange={(e) => toggleHasVariants(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Tiene variantes (ej. tallas, colores)
        </label>

        {hasVariants && (
          <div className="space-y-2 rounded-md border border-gray-200 p-3">
            {variantRows.map((row, index) => (
              <div key={row.id ?? `new-${index}`} className="flex items-center gap-2">
                <input
                  placeholder="Variante (ej. S, M, L, Blanco)"
                  value={row.name}
                  onChange={(e) => updateVariantRow(index, { name: e.target.value })}
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Stock"
                  value={row.stock_quantity}
                  onChange={(e) => updateVariantRow(index, { stock_quantity: e.target.value })}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeVariantRow(index)}
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addVariantRow}
              className="text-sm font-medium text-brand-secondary hover:underline"
            >
              + Agregar variante
            </button>
          </div>
        )}

        <div className="space-y-2 rounded-md border border-gray-200 p-3">
          <label className="block text-sm font-medium text-gray-700">
            Precio por cantidad (ej. 3x25Bs)
          </label>
          {tierRows.map((row, index) => (
            <div key={row.id ?? `new-${index}`} className="flex items-center gap-2">
              <input
                type="number"
                min="2"
                step="1"
                placeholder="Cantidad mínima"
                value={row.min_quantity}
                onChange={(e) => updateTierRow(index, { min_quantity: e.target.value })}
                className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Precio del paquete (Bs.)"
                value={row.bundle_price}
                onChange={(e) => updateTierRow(index, { bundle_price: e.target.value })}
                className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => removeTierRow(index)}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Quitar
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addTierRow}
            className="text-sm font-medium text-brand-secondary hover:underline"
          >
            + Agregar precio por cantidad
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Imagen</label>
          {imageUrl && !imageFile && (
            <img src={imageUrl} alt="" className="mb-2 h-24 w-24 rounded-md object-cover" />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-brand-primary px-4 py-3 font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </div>
  )
}
