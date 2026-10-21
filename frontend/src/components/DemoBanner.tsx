import { isMock } from '../lib/api'
import { mockApi } from '../lib/mockBackend'

export function DemoBanner() {
  if (!isMock) return null

  function reiniciar() {
    mockApi.resetDemoData()
    window.location.reload()
  }

  return (
    <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
      Modo demo — datos de prueba en tu navegador, sin conexión a Supabase.{' '}
      <button onClick={reiniciar} className="font-semibold underline">
        Reiniciar datos
      </button>
    </div>
  )
}
