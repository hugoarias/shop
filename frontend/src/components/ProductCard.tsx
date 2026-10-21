import type { Product } from '../types/database.types'
import { formatCurrency } from '../lib/format'
import { useCart } from '../context/CartContext'
import { ZoomableImage } from './ZoomableImage'

export function ProductCard({ product }: { product: Product }) {
  const { addItem, items } = useCart()
  const inCart = items.find((item) => item.product.id === product.id)?.quantity ?? 0
  const outOfStock = product.stock_quantity <= 0
  const atLimit = inCart >= product.stock_quantity

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="aspect-square w-full bg-gray-100">
        {product.image_url ? (
          <ZoomableImage
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            Sin imagen
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold text-gray-900">{product.name}</h3>
        {product.description && (
          <p className="line-clamp-2 text-sm text-gray-500">{product.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-display text-xl text-brand-primary">
            {formatCurrency(product.price)}
          </span>
          <span
            className={`text-xs font-medium ${outOfStock ? 'text-red-600' : 'text-gray-500'}`}
          >
            {outOfStock ? 'Sin stock' : `${product.stock_quantity} disponibles`}
          </span>
        </div>
        <button
          onClick={() => addItem(product)}
          disabled={outOfStock || atLimit}
          className="mt-2 rounded-md bg-brand-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {outOfStock ? 'Sin stock' : atLimit ? 'Máximo en carrito' : 'Agregar al carrito'}
        </button>
      </div>
    </div>
  )
}
