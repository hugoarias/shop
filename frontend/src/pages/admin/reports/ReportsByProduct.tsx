import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { buildProductReport, formatCurrency } from './shared'
import type { ReportsContext } from './AdminReportsLayout'

export function ReportsByProduct() {
  const { products, items } = useOutletContext<ReportsContext>()
  const report = useMemo(() => buildProductReport(products, items), [products, items])

  if (report.length === 0)
    return <p className="p-6 text-center text-gray-500">No hay productos activos.</p>

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Variante</th>
              <th className="px-4 py-3">Stock restante</th>
              <th className="px-4 py-3">Unidades vendidas</th>
              <th className="px-4 py-3">Total generado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {report.map((row) => (
              <tr key={row.key}>
                <td className="px-4 py-3 font-medium text-gray-900">{row.product_name}</td>
                <td className="px-4 py-3 text-gray-500">{row.variant_name ?? '—'}</td>
                <td className="px-4 py-3">
                  {row.stock <= 0 ? (
                    <span className="font-medium text-red-600">Sin stock</span>
                  ) : (
                    row.stock
                  )}
                </td>
                <td className="px-4 py-3">{row.units_sold}</td>
                <td className="px-4 py-3 font-semibold">{formatCurrency(row.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
