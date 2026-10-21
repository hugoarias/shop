import { useState } from 'react'
import type { Product } from '../types/database.types'
import { formatCurrency } from '../lib/format'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { ZoomableImage } from './ZoomableImage'

export function ProductCard({ product }: { product: Product }) {
  const { addItem, items } = useCart()
  const { showToast } = useToast()
  const activeVariants = (product.variants ?? []).filter((v) => v.is_active)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const cheapestTier = (product.price_tiers ?? []).slice().sort((a, b) => a.min_quantity - b.min_quantity)[0]

  const selectedVariant = product.has_variants
    ? (activeVariants.find((v) => v.id === selectedVariantId) ?? null)
    : null

  const inCart =
    items.find(
      (item) =>
        item.product.id === product.id &&
        (item.variant?.id ?? null) === (selectedVariant?.id ?? null),
    )?.quantity ?? 0

  const noVariantsAvailable =
    product.has_variants && (activeVariants.length === 0 || activeVariants.every((v) => v.stock_quantity <= 0))
  const outOfStock = product.has_variants ? noVariantsAvailable : product.stock_quantity <= 0
  const needsSelection = product.has_variants && !outOfStock && !selectedVariant
  const stockForSelection = selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity
  const atLimit = !needsSelection && !outOfStock && inCart >= stockForSelection

  function handleAddToCart() {
    addItem(product, selectedVariant)
    const label = selectedVariant ? `${product.name} (talla ${selectedVariant.name})` : product.name
    showToast(`${label} agregado al carrito`)
  }

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
          {!product.has_variants && (
            <span className={`text-xs font-medium ${outOfStock ? 'text-red-600' : 'text-gray-500'}`}>
              {outOfStock ? 'Sin stock' : `${product.stock_quantity} disponibles`}
            </span>
          )}
        </div>

        {cheapestTier && (
          <span className="inline-block w-fit rounded-md bg-brand-secondary/10 px-2 py-0.5 text-xs font-semibold text-brand-secondary">
            {cheapestTier.min_quantity} x {formatCurrency(cheapestTier.bundle_price)}
          </span>
        )}

        {product.has_variants && (
          <div className="flex flex-wrap gap-1.5">
            {noVariantsAvailable ? (
              <span className="text-xs font-medium text-red-600">Sin stock</span>
            ) : (
              activeVariants.map((variant) => {
                const disabled = variant.stock_quantity <= 0
                const selected = selectedVariantId === variant.id
                return (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      disabled
                        ? 'cursor-not-allowed border-gray-200 text-gray-300 line-through'
                        : selected
                          ? 'border-brand-primary bg-brand-primary text-white'
                          : 'border-gray-300 text-gray-700 hover:border-brand-primary'
                    }`}
                  >
                    {variant.name}
                  </button>
                )
              })
            )}
          </div>
        )}

        <button
          onClick={handleAddToCart}
          disabled={outOfStock || needsSelection || atLimit}
          className="mt-2 rounded-md bg-brand-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {outOfStock
            ? 'Sin stock'
            : needsSelection
              ? 'Elige una talla'
              : atLimit
                ? 'Máximo en carrito'
                : 'Agregar al carrito'}
        </button>
      </div>
    </div>
  )
}
