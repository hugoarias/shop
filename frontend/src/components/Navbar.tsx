import { NavLink, Link } from 'react-router-dom'
import { Logo } from './Logo'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
  }`

export function Navbar() {
  const { user, profile, isAdmin, signInWithGoogle, signOut } = useAuth()
  const { totalItems } = useCart()

  return (
    <header className="bg-brand-primary text-white shadow-md">
      <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <Logo variant="white" className="h-10 w-auto" />
          <span className="font-display text-xl leading-none hidden sm:inline">
            Tienda RNA - Sucre
          </span>
        </Link>

        <div className="flex items-center gap-1 flex-1">
          <NavLink to="/" className={linkClasses} end>
            Catálogo
          </NavLink>
          {user && (
            <NavLink to="/mis-compras" className={linkClasses}>
              Mis compras
            </NavLink>
          )}
          {isAdmin && (
            <>
              <NavLink to="/admin/productos" className={linkClasses}>
                Productos
              </NavLink>
              <NavLink to="/admin/reporte-ventas" className={linkClasses}>
                Reporte de ventas
              </NavLink>
            </>
          )}
        </div>

        <Link
          to="/carrito"
          className="relative rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
        >
          Carrito
          {totalItems > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-secondary px-1 text-xs font-bold text-white">
              {totalItems}
            </span>
          )}
        </Link>

        {user ? (
          <button
            onClick={() => void signOut()}
            className="rounded-md bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20"
            title={profile?.full_name ?? undefined}
          >
            Salir{profile?.full_name ? ` · ${profile.full_name.split(' ')[0]}` : ''}
          </button>
        ) : (
          <button
            onClick={() => void signInWithGoogle()}
            className="rounded-md bg-brand-secondary px-3 py-2 text-sm font-semibold hover:brightness-110"
          >
            Iniciar sesión
          </button>
        )}
      </nav>
    </header>
  )
}
