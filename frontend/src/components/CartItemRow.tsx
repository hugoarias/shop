import type { CartItem } from '../context/CartContext'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../lib/format'
import { ZoomableImage } from './ZoomableImage'

export function CartItemRow({ item }: { item: CartItem }) {
  const { setQuantity, removeItem } = useCart()
  const { product, quantity } = item

  return (
    <div className="flex items-center gap-4 border-b border-gray-200 py-4 last:border-0">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {product.image_url ? (
          <ZoomableImage src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : null}
      </div>

      <div className="flex-1">
        <p className="font-medium text-gray-900">{product.name}</p>
        <p className="text-sm text-gray-500">{formatCurrency(product.price)} c/u</p>
      </div>

      <input
        type="number"
        min={1}
        max={product.stock_quantity}
        value={quantity}
        onChange={(e) => setQuantity(product.id, Number(e.target.value))}
        className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center"
      />

      <span className="w-24 text-right font-semibold text-gray-900">
        {formatCurrency(product.price * quantity)}
      </span>

      <button
        onClick={() => removeItem(product.id)}
        className="text-sm font-medium text-red-600 hover:underline"
      >
        Quitar
      </button>
    </div>
  )
}
