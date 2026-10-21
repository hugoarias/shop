import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Product } from '../types/database.types'
import { ProductCard } from '../components/ProductCard'

export function Catalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .listActiveProducts()
      .then((data) => {
        if (!cancelled) setProducts(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <p className="p-6 text-center text-gray-500">Cargando productos…</p>
  if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>
  if (products.length === 0)
    return <p className="p-6 text-center text-gray-500">Todavía no hay productos publicados.</p>

  return (
    <div className="mx-auto max-w-6xl p-4">
      <h1 className="font-display mb-6 text-3xl text-brand-primary">Catálogo</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
