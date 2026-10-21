import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { SalesReportRow } from '../../types/database.types'
import { formatCurrency, formatDate } from '../../lib/format'

export function AdminSalesReport() {
  const [rows, setRows] = useState<SalesReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listSalesReport()
      .then(setRows)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="p-6 text-center text-gray-500">Cargando reporte…</p>
  if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>

  if (rows.length === 0)
    return <p className="p-6 text-center text-gray-500">Todavía no hay ventas registradas.</p>

  const grandTotal = rows.reduce((sum, row) => sum + row.total_spent, 0)

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="font-display mb-2 text-3xl text-brand-primary">Reporte de ventas</h1>
      <p className="mb-6 text-sm text-gray-500">
        Total vendido: <span className="font-semibold text-gray-900">{formatCurrency(grandTotal)}</span>
      </p>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3">Comprador</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Pedidos</th>
              <th className="px-4 py-3">Total gastado</th>
              <th className="px-4 py-3">Última compra</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.buyer_email}>
                <td className="px-4 py-3 font-medium text-gray-900">{row.buyer_name}</td>
                <td className="px-4 py-3 text-gray-500">{row.buyer_email}</td>
                <td className="px-4 py-3">{row.total_orders}</td>
                <td className="px-4 py-3 font-semibold">{formatCurrency(row.total_spent)}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(row.last_purchase)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
