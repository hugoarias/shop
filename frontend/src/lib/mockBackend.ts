import type {
  Order,
  OrderWithItems,
  PriceTier,
  Product,
  ProductVariant,
  Profile,
  SalesReportRow,
} from '../types/database.types'
import { calcLineTotal } from './pricing'

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
  productVariants: ProductVariant[]
  productPriceTiers: PriceTier[]
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
        description: 'Polera institucional AIESEC Alumni Bolivia. Elige tu talla.',
        price: 80,
        image_url: placeholderImage('Polera AAB', '004789'),
        stock_quantity: 0,
        is_active: true,
        has_variants: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'prod-2',
        name: 'Taza AAB',
        description: 'Taza de cerámica con el logo de AIESEC Alumni Bolivia. Lleva 3 y paga menos.',
        price: 45,
        image_url: placeholderImage('Taza AAB', '0192CC'),
        stock_quantity: 15,
        is_active: true,
        has_variants: false,
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
        has_variants: false,
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
        has_variants: false,
        created_at: now,
        updated_at: now,
      },
    ],
    productVariants: [
      { id: 'var-1', product_id: 'prod-1', name: 'S', stock_quantity: 3, is_active: true, sort_order: 1, created_at: now, updated_at: now },
      { id: 'var-2', product_id: 'prod-1', name: 'M', stock_quantity: 5, is_active: true, sort_order: 2, created_at: now, updated_at: now },
      { id: 'var-3', product_id: 'prod-1', name: 'L', stock_quantity: 0, is_active: true, sort_order: 3, created_at: now, updated_at: now },
      { id: 'var-4', product_id: 'prod-1', name: 'XL', stock_quantity: 2, is_active: true, sort_order: 4, created_at: now, updated_at: now },
    ],
    productPriceTiers: [
      { id: 'tier-1', product_id: 'prod-2', min_quantity: 3, bundle_price: 120, created_at: now, updated_at: now },
    ],
    orders: [
      {
        id: 'order-historico-1',
        user_id: MOCK_PROFILE.id,
        buyer_name: MOCK_PROFILE.full_name ?? '',
        buyer_email: MOCK_PROFILE.email ?? '',
        total: 150,
        status: 'completed',
        payment_proof_path: null,
        payment_status: 'pending_payment',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        order_items: [
          {
            id: 'item-historico-1',
            order_id: 'order-historico-1',
            product_id: 'prod-3',
            variant_id: null,
            variant_name: null,
            quantity: 1,
            unit_price: 150,
            line_total: 150,
            products: { name: 'Mochila AAB', image_url: placeholderImage('Mochila AAB', '004789') },
          },
        ],
      },
    ],
    signedIn: false,
  }
}

function load(): MockDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedDb()
    const parsed = JSON.parse(raw) as Partial<MockDb>
    // Compatibilidad con localStorage de versiones anteriores sin variantes/tiers.
    if (
      !parsed.productVariants ||
      !parsed.productPriceTiers ||
      !parsed.products?.[0] ||
      !('has_variants' in parsed.products[0]) ||
      !parsed.orders?.every((o) => 'payment_status' in o)
    ) {
      return seedDb()
    }
    return parsed as MockDb
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

function withExtras(product: Product): Product {
  return {
    ...product,
    variants: db.productVariants
      .filter((v) => v.product_id === product.id)
      .sort((a, b) => a.sort_order - b.sort_order),
    price_tiers: db.productPriceTiers.filter((t) => t.product_id === product.id),
  }
}

type AuthListener = (signedIn: boolean) => void
const authListeners = new Set<AuthListener>()

// Blobs en memoria para comprobantes/QR de pago — no se persisten en localStorage
// porque los object URLs no sobreviven un reload; en modo demo alcanza con esto.
const paymentProofBlobs = new Map<string, string>()
let paymentQrBlobUrl: string | null = null

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
    return delay(db.products.filter((p) => p.is_active).map(withExtras))
  },
  async listAllProducts(): Promise<Product[]> {
    return delay(
      [...db.products].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(withExtras),
    )
  },
  async getProduct(id: string): Promise<Product | undefined> {
    const product = db.products.find((p) => p.id === id)
    return delay(product ? withExtras(product) : undefined)
  },
  async createProduct(
    payload: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'is_active' | 'variants'>,
  ) {
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

  // --- Variantes ---
  async createVariant(productId: string, payload: { name: string; stock_quantity: number; sort_order?: number }) {
    const now = new Date().toISOString()
    const nextOrder =
      payload.sort_order ??
      db.productVariants.filter((v) => v.product_id === productId).length + 1
    const variant: ProductVariant = {
      id: crypto.randomUUID(),
      product_id: productId,
      name: payload.name,
      stock_quantity: payload.stock_quantity,
      is_active: true,
      sort_order: nextOrder,
      created_at: now,
      updated_at: now,
    }
    db.productVariants.push(variant)
    persist()
    return delay(variant)
  },
  async updateVariant(id: string, payload: Partial<ProductVariant>) {
    db.productVariants = db.productVariants.map((v) =>
      v.id === id ? { ...v, ...payload, updated_at: new Date().toISOString() } : v,
    )
    persist()
    return delay(undefined)
  },
  async deleteVariant(id: string) {
    const hasSales = db.orders.some((o) => o.order_items.some((item) => item.variant_id === id))
    if (hasSales) {
      throw new Error('No se puede eliminar: esta variante ya tiene ventas registradas')
    }
    db.productVariants = db.productVariants.filter((v) => v.id !== id)
    persist()
    return delay(undefined)
  },

  // --- Precios por cantidad (combos) ---
  async createPriceTier(productId: string, payload: { min_quantity: number; bundle_price: number }) {
    const now = new Date().toISOString()
    const tier: PriceTier = {
      id: crypto.randomUUID(),
      product_id: productId,
      min_quantity: payload.min_quantity,
      bundle_price: payload.bundle_price,
      created_at: now,
      updated_at: now,
    }
    db.productPriceTiers.push(tier)
    persist()
    return delay(tier)
  },
  async updatePriceTier(id: string, payload: Partial<PriceTier>) {
    db.productPriceTiers = db.productPriceTiers.map((t) =>
      t.id === id ? { ...t, ...payload, updated_at: new Date().toISOString() } : t,
    )
    persist()
    return delay(undefined)
  },
  async deletePriceTier(id: string) {
    db.productPriceTiers = db.productPriceTiers.filter((t) => t.id !== id)
    persist()
    return delay(undefined)
  },

  // --- Comprobantes y QR de pago ---
  async uploadPaymentProof(file: File): Promise<string> {
    const path = `${MOCK_PROFILE.id}/${crypto.randomUUID()}-${file.name}`
    paymentProofBlobs.set(path, URL.createObjectURL(file))
    return delay(path)
  },
  async getPaymentProofUrl(path: string): Promise<string> {
    const url = paymentProofBlobs.get(path)
    if (!url) throw new Error('Comprobante no encontrado')
    return delay(url)
  },
  async submitPaymentProof(orderId: string, file: File): Promise<void> {
    const order = db.orders.find((o) => o.id === orderId)
    if (!order) throw new Error('Pedido no encontrado')
    if (order.payment_status !== 'pending_payment') {
      throw new Error('Este pedido ya tiene un comprobante registrado')
    }
    const path = await mockApi.uploadPaymentProof(file)
    order.payment_proof_path = path
    order.payment_status = 'pending_verification'
    persist()
    return delay(undefined)
  },
  async verifyPayment(orderId: string): Promise<void> {
    const order = db.orders.find((o) => o.id === orderId)
    if (!order) throw new Error('Pedido no encontrado')
    order.payment_status = 'verified'
    persist()
    return delay(undefined)
  },
  async uploadPaymentQr(file: File): Promise<void> {
    paymentQrBlobUrl = URL.createObjectURL(file)
    return delay(undefined)
  },
  async getPaymentQrUrl(): Promise<string | null> {
    return delay(paymentQrBlobUrl)
  },

  // --- Checkout / órdenes ---
  async checkout(
    cartItems: { product_id: string; quantity: number; variant_id: string | null }[],
    paymentProofPath: string,
  ): Promise<string> {
    if (!paymentProofPath) {
      throw new Error('Debes subir tu comprobante de pago')
    }
    for (const { product_id, quantity, variant_id } of cartItems) {
      const product = db.products.find((p) => p.id === product_id)
      if (!product) throw new Error(`Producto ${product_id} no disponible`)
      if (product.has_variants) {
        if (!variant_id) throw new Error(`Debes elegir una opción para ${product.name}`)
        const variant = db.productVariants.find((v) => v.id === variant_id && v.product_id === product_id)
        if (!variant || !variant.is_active) throw new Error(`Variante no disponible para ${product.name}`)
        if (variant.stock_quantity < quantity) {
          throw new Error(`Stock insuficiente para ${product.name} (${variant.name})`)
        }
      } else if (product.stock_quantity < quantity) {
        throw new Error(`Stock insuficiente para ${product.name}`)
      }
    }

    let total = 0
    const items: OrderWithItems['order_items'] = []

    for (const { product_id, quantity, variant_id } of cartItems) {
      const product = db.products.find((p) => p.id === product_id)!
      let unitVariantName: string | null = null

      if (product.has_variants && variant_id) {
        const variant = db.productVariants.find((v) => v.id === variant_id)!
        variant.stock_quantity -= quantity
        variant.updated_at = new Date().toISOString()
        unitVariantName = variant.name
      } else {
        product.stock_quantity -= quantity
        product.updated_at = new Date().toISOString()
      }

      const tiers = db.productPriceTiers.filter((t) => t.product_id === product_id)
      const lineTotal = calcLineTotal(tiers, product.price, quantity)
      total += lineTotal
      items.push({
        id: crypto.randomUUID(),
        order_id: '',
        product_id,
        variant_id: variant_id ?? null,
        variant_name: unitVariantName,
        quantity,
        unit_price: product.price,
        line_total: lineTotal,
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
      payment_proof_path: paymentProofPath,
      payment_status: 'pending_verification',
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
