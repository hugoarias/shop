import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { CartItemRow } from '../components/CartItemRow'
import { formatCurrency } from '../lib/format'
import { groupCartItems } from '../lib/pricing'

export function Cart() {
  const { items, totalAmount } = useCart()
  const groups = groupCartItems(items)

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
        {groups.map((group) => (
          <div key={group.key}>
            {group.items.map((item) => (
              <CartItemRow
                key={`${item.product.id}:${item.variant?.id ?? 'base'}`}
                item={item}
                showPrice={!group.isCombo}
              />
            ))}
            {group.isCombo && (
              <div className="flex items-center justify-between border-b border-gray-200 pb-3 pt-1 last:border-0">
                <span className="text-sm text-gray-500">Subtotal {group.product.name}</span>
                <span className="text-right">
                  <span className="block font-semibold text-gray-900">
                    {formatCurrency(group.subtotal)}
                  </span>
                  {group.savings > 0 && (
                    <span className="block text-xs font-medium text-green-600">
                      Ahorras {formatCurrency(group.savings)}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
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
