import type { CartItem } from '../context/CartContext'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../lib/format'
import { calcLineTotal } from '../lib/pricing'
import { ZoomableImage } from './ZoomableImage'

export function CartItemRow({ item, showPrice = true }: { item: CartItem; showPrice?: boolean }) {
  const { setQuantity, removeItem } = useCart()
  const { product, variant, quantity } = item
  const variantId = variant?.id ?? null
  const maxQty = variant ? variant.stock_quantity : product.stock_quantity
  const lineTotal = calcLineTotal(product.price_tiers, product.price, quantity)
  const savings = product.price * quantity - lineTotal

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 py-4 last:border-0 sm:gap-4">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {product.image_url ? (
          <ZoomableImage src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900">
          {product.name}
          {variant && <span className="font-normal text-gray-500"> · {variant.name}</span>}
        </p>
        <p className="text-sm text-gray-500">{formatCurrency(product.price)} c/u</p>
      </div>

      <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
        <div className="flex items-center rounded-md border border-gray-300">
          <button
            type="button"
            onClick={() => setQuantity(product.id, variantId, quantity - 1)}
            disabled={quantity <= 1}
            aria-label="Disminuir cantidad"
            className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-medium">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(product.id, variantId, quantity + 1)}
            disabled={quantity >= maxQty}
            aria-label="Aumentar cantidad"
            className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            +
          </button>
        </div>

        {showPrice && (
          <span className="text-right sm:w-24">
            <span className="block font-semibold text-gray-900">{formatCurrency(lineTotal)}</span>
            {savings > 0 && (
              <span className="block text-xs font-medium text-green-600">
                Ahorras {formatCurrency(savings)}
              </span>
            )}
          </span>
        )}

        <button
          onClick={() => removeItem(product.id, variantId)}
          className="text-sm font-medium text-red-600 hover:underline"
        >
          Quitar
        </button>
      </div>
    </div>
  )
}
