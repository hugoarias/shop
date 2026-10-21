import { Fragment, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { OrderProofActions, formatCurrency, formatDate, statusLabels } from './shared'
import type { ReportsContext } from './AdminReportsLayout'

export function ReportsByBuyer() {
  const { rows, groupsByBuyer, markOrderVerified } = useOutletContext<ReportsContext>()
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3">Comprador</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Pedidos</th>
              <th className="px-4 py-3">Total gastado</th>
              <th className="px-4 py-3">Última compra</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const isOpen = expanded === row.buyer_email
              const buyerGroups = groupsByBuyer.get(row.buyer_email) ?? []
              return (
                <Fragment key={row.buyer_email}>
                  <tr
                    onClick={() => setExpanded(isOpen ? null : row.buyer_email)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-gray-400">{isOpen ? '▾' : '▸'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.buyer_name}</td>
                    <td className="px-4 py-3 text-gray-500">{row.buyer_email}</td>
                    <td className="px-4 py-3">{row.total_orders}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(row.total_spent)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(row.last_purchase)}</td>
                  </tr>
                  {isOpen && (
                    <tr key={`${row.buyer_email}-detail`}>
                      <td></td>
                      <td colSpan={5} className="bg-gray-50 px-4 py-3">
                        <div className="space-y-3">
                          {buyerGroups.map((group) => (
                            <div key={group.order_id} className="rounded-md border border-gray-200 bg-white p-2">
                              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">{formatDate(group.created_at)}</span>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusLabels[group.payment_status].className}`}
                                  >
                                    {statusLabels[group.payment_status].label}
                                  </span>
                                </div>
                                <OrderProofActions group={group} onVerified={markOrderVerified} />
                              </div>
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
                            </div>
                          ))}
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
