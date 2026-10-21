export type UserRole = 'customer' | 'admin'

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
}

export interface ProductVariant {
  id: string
  product_id: string
  name: string
  stock_quantity: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PriceTier {
  id: string
  product_id: string
  min_quantity: number
  bundle_price: number
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  stock_quantity: number
  is_active: boolean
  has_variants: boolean
  variants?: ProductVariant[]
  price_tiers?: PriceTier[]
  created_at: string
  updated_at: string
}

export type OrderStatus = 'completed' | 'cancelled'
export type PaymentStatus = 'pending_payment' | 'pending_verification' | 'verified'

export interface Order {
  id: string
  user_id: string
  buyer_name: string
  buyer_email: string
  total: number
  status: OrderStatus
  payment_proof_path: string | null
  payment_status: PaymentStatus
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  variant_id: string | null
  variant_name: string | null
  quantity: number
  unit_price: number
  line_total: number | null
}

export interface OrderWithItems extends Order {
  order_items: (OrderItem & { products: Pick<Product, 'name' | 'image_url'> | null })[]
}

export interface SalesReportRow {
  buyer_name: string
  buyer_email: string
  total_orders: number
  total_spent: number
  first_purchase: string
  last_purchase: string
}
