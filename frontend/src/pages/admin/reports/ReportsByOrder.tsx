import { Fragment, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { OrderProofActions, formatCurrency, formatDate, statusLabels } from './shared'
import type { ReportsContext } from './AdminReportsLayout'

export function ReportsByOrder() {
  const { orderGroups, markOrderVerified } = useOutletContext<ReportsContext>()
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Comprador</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orderGroups.map((group) => {
              const isOpen = expandedOrder === group.order_id
              const orderTotal = group.items.reduce((sum, item) => sum + item.line_total, 0)
              return (
                <Fragment key={group.order_id}>
                  <tr
                    onClick={() => setExpandedOrder(isOpen ? null : group.order_id)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-gray-400">{isOpen ? '▾' : '▸'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(group.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{group.buyer_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusLabels[group.payment_status].className}`}
                      >
                        {statusLabels[group.payment_status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(orderTotal)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <OrderProofActions group={group} onVerified={markOrderVerified} />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${group.order_id}-detail`}>
                      <td></td>
                      <td colSpan={5} className="bg-gray-50 px-4 py-3">
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[480px] text-left text-xs">
                            <thead className="text-gray-500">
                              <tr>
                                <th className="py-1 pr-3">Producto</th>
                                <th className="py-1 pr-3">Variante</th>
                                <th className="py-1 pr-3">Cant.</th>
                                <th className="py-1 pr-3">Precio unit.</th>
                                <th className="py-1 pr-3">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {group.items.map((item, index) => (
                                <tr key={`${item.order_id}-${index}`}>
                                  <td className="py-1.5 pr-3 text-gray-900">{item.product_name}</td>
                                  <td className="py-1.5 pr-3 text-gray-500">{item.variant_name ?? '—'}</td>
                                  <td className="py-1.5 pr-3">{item.quantity}</td>
                                  <td className="py-1.5 pr-3">{formatCurrency(item.unit_price)}</td>
                                  <td className="py-1.5 pr-3 font-medium">{formatCurrency(item.line_total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
