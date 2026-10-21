import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import type { Product } from '../../types/database.types'
import { formatCurrency } from '../../lib/format'

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      setProducts(await api.listAllProducts())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function toggleActive(product: Product) {
    try {
      await api.setProductActive(product.id, !product.is_active)
      void load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el producto')
    }
  }

  if (loading) return <p className="p-6 text-center text-gray-500">Cargando…</p>

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl text-brand-primary">Productos</h1>
        <Link
          to="/admin/productos/nuevo"
          className="rounded-md bg-brand-primary px-4 py-2 font-semibold text-white hover:brightness-110"
        >
          + Nuevo producto
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Activo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="flex items-center gap-3 px-4 py-3">
                  <div className="h-10 w-10 overflow-hidden rounded-md bg-gray-100">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    {product.name}
                    {product.has_variants && (
                      <span className="ml-2 rounded-full bg-brand-secondary/10 px-2 py-0.5 text-xs font-medium text-brand-secondary">
                        Con variantes
                      </span>
                    )}
                    {(product.price_tiers?.length ?? 0) > 0 && (
                      <span className="ml-2 rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">
                        Con combos
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">{formatCurrency(product.price)}</td>
                <td className="px-4 py-3">
                  {product.has_variants
                    ? (product.variants ?? [])
                        .filter((v) => v.is_active)
                        .reduce((sum, v) => sum + v.stock_quantity, 0)
                    : product.stock_quantity}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => void toggleActive(product)}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      product.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {product.is_active ? 'Activo' : 'Oculto'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/admin/productos/${product.id}/editar`}
                    className="font-medium text-brand-secondary hover:underline"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
