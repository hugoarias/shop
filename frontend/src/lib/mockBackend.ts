import type {
  Order,
  OrderWithItems,
  Product,
  Profile,
  SalesReportRow,
} from '../types/database.types'

/**
 * Backend falso en memoria (persistido en localStorage) para previsualizar la app
 * con "npm run dev" sin necesitar un proyecto Supabase. Se activa automáticamente
 * cuando faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (ver supabaseClient.ts).
 * Imita únicamente las operaciones que la app realmente usa, no la API de Supabase.
 */

const STORAGE_KEY = 'aab-carrito:mock-db'

function placeholderImage(label: string, bg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
    <rect width="400" height="400" fill="#${bg}"/>
    <text x="50%" y="50%" font-family="Poppins, sans-serif" font-size="28" fill="#fff"
      text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

interface MockDb {
  products: Product[]
  orders: OrderWithItems[]
  signedIn: boolean
}

const MOCK_PROFILE: Profile = {
  id: 'mock-user-1',
  full_name: 'Ana Pérez (demo)',
  email: 'ana.perez.demo@gmail.com',
  avatar_url: null,
  role: 'admin',
  created_at: new Date().toISOString(),
}

function seedDb(): MockDb {
  const now = new Date().toISOString()
  return {
    products: [
      {
        id: 'prod-1',
        name: 'Polera AAB',
        description: 'Polera institucional AIESEC Alumni Bolivia, talla única.',
        price: 80,
        image_url: placeholderImage('Polera AAB', '004789'),
        stock_quantity: 20,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'prod-2',
        name: 'Taza AAB',
        description: 'Taza de cerámica con el logo de AIESEC Alumni Bolivia.',
        price: 45,
        image_url: placeholderImage('Taza AAB', '0192CC'),
        stock_quantity: 15,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'prod-3',
        name: 'Mochila AAB',
        description: 'Mochila con el isotipo AAB bordado.',
        price: 150,
        image_url: placeholderImage('Mochila AAB', '004789'),
        stock_quantity: 1,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'prod-4',
        name: 'Botella AAB (agotada)',
        description: 'Botella reutilizable — ejemplo de producto sin stock.',
        price: 60,
        image_url: placeholderImage('Botella AAB', '6b7280'),
        stock_quantity: 0,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ],
    orders: [],
    signedIn: false,
  }
}

function load(): MockDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedDb()
    return JSON.parse(raw) as MockDb
  } catch {
    return seedDb()
  }
}

let db = load()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Almacenamiento no disponible: el modo demo sigue funcionando solo en memoria.
  }
}

function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

type AuthListener = (signedIn: boolean) => void
const authListeners = new Set<AuthListener>()

export const mockApi = {
  resetDemoData() {
    db = seedDb()
    persist()
  },

  // --- Auth ---
  isSignedIn: () => db.signedIn,
  onAuthChange(listener: AuthListener) {
    authListeners.add(listener)
    return () => authListeners.delete(listener)
  },
  async signIn() {
    db.signedIn = true
    persist()
    authListeners.forEach((l) => l(true))
    return delay(undefined)
  },
  async signOut() {
    db.signedIn = false
    persist()
    authListeners.forEach((l) => l(false))
    return delay(undefined)
  },
  async getProfile(): Promise<Profile> {
    return delay(MOCK_PROFILE)
  },

  // --- Productos ---
  async listActiveProducts(): Promise<Product[]> {
    return delay(db.products.filter((p) => p.is_active))
  },
  async listAllProducts(): Promise<Product[]> {
    return delay([...db.products].sort((a, b) => b.created_at.localeCompare(a.created_at)))
  },
  async getProduct(id: string): Promise<Product | undefined> {
    return delay(db.products.find((p) => p.id === id))
  },
  async createProduct(payload: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'is_active'>) {
    const now = new Date().toISOString()
    const product: Product = {
      ...payload,
      id: crypto.randomUUID(),
      is_active: true,
      created_at: now,
      updated_at: now,
    }
    db.products.unshift(product)
    persist()
    return delay(product)
  },
  async updateProduct(id: string, payload: Partial<Product>) {
    db.products = db.products.map((p) =>
      p.id === id ? { ...p, ...payload, updated_at: new Date().toISOString() } : p,
    )
    persist()
    return delay(undefined)
  },
  async uploadProductImage(file: File): Promise<string> {
    // En modo demo no hay Storage: se previsualiza la imagen elegida como data URL local.
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
      reader.readAsDataURL(file)
    })
  },

  // --- Checkout / órdenes ---
  async checkout(cartItems: { product_id: string; quantity: number }[]): Promise<string> {
    let total = 0
    const items: OrderWithItems['order_items'] = []

    for (const { product_id, quantity } of cartItems) {
      const product = db.products.find((p) => p.id === product_id)
      if (!product) throw new Error(`Producto ${product_id} no disponible`)
      if (product.stock_quantity < quantity) {
        throw new Error(`Stock insuficiente para ${product.name}`)
      }
    }

    for (const { product_id, quantity } of cartItems) {
      const product = db.products.find((p) => p.id === product_id)!
      product.stock_quantity -= quantity
      product.updated_at = new Date().toISOString()
      total += product.price * quantity
      items.push({
        id: crypto.randomUUID(),
        order_id: '',
        product_id,
        quantity,
        unit_price: product.price,
        products: { name: product.name, image_url: product.image_url },
      })
    }

    const orderId = crypto.randomUUID()
    const order: OrderWithItems = {
      id: orderId,
      user_id: MOCK_PROFILE.id,
      buyer_name: MOCK_PROFILE.full_name ?? MOCK_PROFILE.email ?? 'Comprador demo',
      buyer_email: MOCK_PROFILE.email ?? '',
      total,
      status: 'completed',
      created_at: new Date().toISOString(),
      order_items: items.map((item) => ({ ...item, order_id: orderId })),
    }

    db.orders.unshift(order)
    persist()
    return delay(orderId)
  },
  async listMyOrders(): Promise<OrderWithItems[]> {
    return delay(db.orders)
  },
  async listSalesReport(): Promise<SalesReportRow[]> {
    const byBuyer = new Map<string, Order[]>()
    for (const order of db.orders) {
      const list = byBuyer.get(order.buyer_email) ?? []
      list.push(order)
      byBuyer.set(order.buyer_email, list)
    }
    const rows: SalesReportRow[] = [...byBuyer.entries()].map(([email, orders]) => ({
      buyer_name: orders[0].buyer_name,
      buyer_email: email,
      total_orders: orders.length,
      total_spent: orders.reduce((sum, o) => sum + o.total, 0),
      first_purchase: orders.reduce((min, o) => (o.created_at < min ? o.created_at : min), orders[0].created_at),
      last_purchase: orders.reduce((max, o) => (o.created_at > max ? o.created_at : max), orders[0].created_at),
    }))
    return delay(rows.sort((a, b) => b.total_spent - a.total_spent))
  },
}
