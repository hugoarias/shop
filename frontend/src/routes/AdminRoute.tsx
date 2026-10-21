import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AdminRoute() {
  const { user, profile, loading, isAdmin } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (profile && !isAdmin) return <Navigate to="/" replace />

  return <Outlet />
}
