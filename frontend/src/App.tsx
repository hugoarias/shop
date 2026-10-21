import { HashRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { ToastProvider } from './context/ToastContext'
import { Navbar } from './components/Navbar'
import { DemoBanner } from './components/DemoBanner'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AdminRoute } from './routes/AdminRoute'
import { Catalog } from './pages/Catalog'
import { Cart } from './pages/Cart'
import { Checkout } from './pages/Checkout'
import { MyOrders } from './pages/MyOrders'
import { Login } from './pages/Login'
import { AdminProducts } from './pages/admin/AdminProducts'
import { AdminProductForm } from './pages/admin/AdminProductForm'
import { AdminSalesReport } from './pages/admin/AdminSalesReport'

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <HashRouter>
            <DemoBanner />
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Catalog />} />
                <Route path="/carrito" element={<Cart />} />
                <Route path="/login" element={<Login />} />

                <Route element={<ProtectedRoute />}>
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/mis-compras" element={<MyOrders />} />
                </Route>

                <Route element={<AdminRoute />}>
                  <Route path="/admin/productos" element={<AdminProducts />} />
                  <Route path="/admin/productos/nuevo" element={<AdminProductForm />} />
                  <Route path="/admin/productos/:id/editar" element={<AdminProductForm />} />
                  <Route path="/admin/reporte-ventas" element={<AdminSalesReport />} />
                </Route>
              </Routes>
            </main>
          </HashRouter>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  )
}
