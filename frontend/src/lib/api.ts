import { supabase, isMock } from './supabaseClient'
import { mockApi } from './mockBackend'
import type { Product, Profile, OrderWithItems, SalesReportRow } from '../types/database.types'

export { isMock }

export interface AuthUser {
  id: string
  email: string | null
}

const MOCK_USER: AuthUser = { id: 'mock-user-1', email: 'ana.perez.demo@gmail.com' }

export const auth = {
  async getUser(): Promise<AuthUser | null> {
    if (isMock) return mockApi.isSignedIn() ? MOCK_USER : null
    const { data } = await supabase!.auth.getSession()
    const u = data.session?.user
    return u ? { id: u.id, email: u.email ?? null } : null
  },

  /** Devuelve una función para dejar de escuchar cambios de sesión. */
  onChange(callback: (user: AuthUser | null) => void): () => void {
    if (isMock) {
      return mockApi.onAuthChange((signedIn) => callback(signedIn ? MOCK_USER : null))
    }
    const { data } = supabase!.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
      callback(u ? { id: u.id, email: u.email ?? null } : null)
    })
    return () => data.subscription.unsubscribe()
  },

  async signInWithGoogle() {
    if (isMock) return mockApi.signIn()
    await supabase!.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
  },

  async signOut() {
    if (isMock) return mockApi.signOut()
    await supabase!.auth.signOut()
  },
}

export const api = {
  async getProfile(userId: string): Promise<Profile | null> {
    if (isMock) return mockApi.getProfile()
    const { data, error } = await supabase!.from('profiles').select('*').eq('id', userId).single()
    if (error) {
      console.error('No se pudo cargar el perfil:', error.message)
      return null
    }
    return data as Profile
  },

  async listActiveProducts(): Promise<Product[]> {
    if (isMock) return mockApi.listActiveProducts()
    const { data, error } = await supabase!
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Product[]
  },

  async listAllProducts(): Promise<Product[]> {
    if (isMock) return mockApi.listAllProducts()
    const { data, error } = await supabase!
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Product[]
  },

  async getProduct(id: string): Promise<Product | null> {
    if (isMock) return (await mockApi.getProduct(id)) ?? null
    const { data, error } = await supabase!.from('products').select('*').eq('id', id).single()
    if (error) throw error
    return data as Product
  },

  async setProductActive(id: string, is_active: boolean) {
    if (isMock) return mockApi.updateProduct(id, { is_active })
    const { error } = await supabase!.from('products').update({ is_active }).eq('id', id)
    if (error) throw error
  },

  async saveProduct(
    id: string | undefined,
    payload: {
      name: string
      description: string | null
      price: number
      stock_quantity: number
      image_url: string | null
    },
  ) {
    if (isMock) {
      if (id) await mockApi.updateProduct(id, payload)
      else await mockApi.createProduct(payload)
      return
    }
    const { error } = id
      ? await supabase!.from('products').update(payload).eq('id', id)
      : await supabase!.from('products').insert(payload)
    if (error) throw error
  },

  async uploadProductImage(file: File): Promise<string> {
    if (isMock) return mockApi.uploadProductImage(file)
    const ext = file.name.split('.').pop()
    const path = `products/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase!.storage
      .from('product-images')
      .upload(path, file, { upsert: false })
    if (error) throw error
    const { data } = supabase!.storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  },

  async checkout(cartItems: { product_id: string; quantity: number }[]): Promise<string> {
    if (isMock) return mockApi.checkout(cartItems)
    const { data, error } = await supabase!.rpc('checkout', { cart_items: cartItems })
    if (error) throw error
    return data as string
  },

  async listMyOrders(): Promise<OrderWithItems[]> {
    if (isMock) return mockApi.listMyOrders()
    const { data, error } = await supabase!
      .from('orders')
      .select('*, order_items(*, products(name, image_url))')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as unknown as OrderWithItems[]
  },

  async listSalesReport(): Promise<SalesReportRow[]> {
    if (isMock) return mockApi.listSalesReport()
    const { data, error } = await supabase!.from('sales_report').select('*')
    if (error) throw error
    return data as SalesReportRow[]
  },
}
