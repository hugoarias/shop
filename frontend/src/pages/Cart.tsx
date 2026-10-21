import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { CartItemRow } from '../components/CartItemRow'
import { formatCurrency } from '../lib/format'

export function Cart() {
  const { items, totalAmount } = useCart()

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center">
        <h1 className="font-display mb-2 text-3xl text-brand-primary">Carrito</h1>
        <p className="mb-4 text-gray-500">Tu carrito está vacío.</p>
        <Link to="/" className="font-medium text-brand-secondary hover:underline">
          Ver catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="font-display mb-6 text-3xl text-brand-primary">Carrito</h1>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        {items.map((item) => (
          <CartItemRow key={item.product.id} item={item} />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-lg font-semibold text-gray-900">Total</span>
        <span className="font-display text-2xl text-brand-primary">
          {formatCurrency(totalAmount)}
        </span>
      </div>
      <Link
        to="/checkout"
        className="mt-4 block w-full rounded-md bg-brand-primary px-4 py-3 text-center font-semibold text-white hover:brightness-110"
      >
        Continuar al pago
      </Link>
    </div>
  )
}
