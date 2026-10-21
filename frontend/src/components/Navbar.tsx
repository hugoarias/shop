import { NavLink, Link } from 'react-router-dom'
import { useState } from 'react'
import { Logo } from './Logo'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
  }`

function Icon({ path, className = 'h-5 w-5' }: { path: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
    </svg>
  )
}

const icons = {
  catalog: 'M4 6h16M4 12h16M4 18h7',
  orders: 'M9 14l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  box: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  cart: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 18L18 6M6 6l12 12',
}

export function Navbar() {
  const { user, profile, isAdmin, signInWithGoogle, signOut } = useAuth()
  const { totalItems } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  const navLinks = (
    <>
      <NavLink to="/" className={linkClasses} end onClick={closeMenu}>
        <Icon path={icons.catalog} /> Catálogo
      </NavLink>
      {user && (
        <NavLink to="/mis-compras" className={linkClasses} onClick={closeMenu}>
          <Icon path={icons.orders} /> Mis compras
        </NavLink>
      )}
      {isAdmin && (
        <>
          <NavLink to="/admin/productos" className={linkClasses} onClick={closeMenu}>
            <Icon path={icons.box} /> Productos
          </NavLink>
          <NavLink to="/admin/reporte-ventas" className={linkClasses} onClick={closeMenu}>
            <Icon path={icons.chart} /> Reporte de ventas
          </NavLink>
        </>
      )}
    </>
  )

  const authButton = (extraClass: string) =>
    user ? (
      <button
        onClick={() => void signOut()}
        className={`flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20 ${extraClass}`}
        title={profile?.full_name ?? undefined}
      >
        <Icon path={icons.user} className="h-4 w-4" />
        Salir{profile?.full_name ? ` · ${profile.full_name.split(' ')[0]}` : ''}
      </button>
    ) : (
      <button
        onClick={() => void signInWithGoogle()}
        className={`rounded-md bg-brand-secondary px-3 py-2 text-sm font-semibold hover:brightness-110 ${extraClass}`}
      >
        Iniciar sesión
      </button>
    )

  return (
    <header className="bg-brand-primary text-white shadow-md">
      <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2" onClick={closeMenu}>
          <Logo variant="white" className="h-10 w-auto" />
          <span className="hidden font-display text-xl leading-none sm:inline">Tienda RNA - Sucre</span>
        </Link>

        <div className="hidden flex-1 items-center gap-1 sm:flex">{navLinks}</div>

        <div className="ml-auto flex items-center gap-1 sm:ml-0 sm:gap-2">
          <Link
            to="/carrito"
            className="relative rounded-md p-2.5 text-white/90 hover:bg-white/10 sm:flex sm:items-center sm:gap-2 sm:px-3 sm:py-2 sm:text-sm sm:font-medium"
            onClick={closeMenu}
            aria-label="Carrito"
          >
            <Icon path={icons.cart} />
            <span className="hidden sm:inline">Carrito</span>
            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-secondary px-1 text-xs font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>

          {authButton('hidden sm:flex')}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md p-2.5 hover:bg-white/10 sm:hidden"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
          >
            <Icon path={menuOpen ? icons.close : icons.menu} />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="flex flex-col gap-1 border-t border-white/10 px-4 py-3 sm:hidden">
          {navLinks}
          {authButton('justify-start')}
        </div>
      )}
    </header>
  )
}
