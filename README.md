# Tienda AIESEC Alumni Bolivia

Carrito de compras institucional: catálogo con imágenes y stock, login con Google, checkout con descuento de stock atómico y reporte de ventas por comprador.

- **Frontend**: React + Vite + Tailwind CSS, alojado gratis en **GitHub Pages**.
- **Backend**: **Supabase** (Postgres + Auth + Storage), sin servidor propio que mantener — la lógica vive en el esquema SQL (`supabase/migrations/`).
- Identidad visual según el **Manual de Marca AIESEC Alumni Bolivia — Polaris 26.27**.

Todo gratis, sin tarjeta de crédito.

## 1. Crear el proyecto en Supabase

1. Crea una cuenta/proyecto gratis en [supabase.com](https://supabase.com).
2. Instala la CLI: `npm install -g supabase` (o `scoop install supabase` en Windows).
3. Desde la raíz del repo: `supabase login`, luego `supabase link --project-ref <TU_PROJECT_REF>`.
4. Aplica el esquema: `supabase db push` (corre las migraciones de `supabase/migrations/` en orden).
5. En el dashboard de Supabase, ve a **Storage** → crea un bucket llamado `product-images` y márcalo como **público** (la migración `0005` asume que ya existe).
6. (Opcional) Carga datos de prueba: `supabase db execute -f supabase/seed.sql` o pega el contenido en el SQL Editor del dashboard.
7. Marca tu propio usuario como admin **después** de loguearte una vez por Google (ver paso 3 más abajo):
   ```sql
   update public.profiles set role = 'admin' where email = 'tu-correo@gmail.com';
   ```

## 2. Configurar login con Google

**En Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)):
1. Crea un proyecto (o usa uno existente) → **APIs & Services → OAuth consent screen**: tipo *External*, agrega tu correo de soporte. Déjalo en **Testing** (solo los correos que agregues como "Test users" podrán loguear, sin revisión de Google) o publícalo si necesitas acceso abierto.
2. **Credentials → Create Credentials → OAuth client ID → Web application**.
3. **Authorized JavaScript origins**: `https://<tu-usuario>.github.io` y `http://localhost:5173` (desarrollo).
4. **Authorized redirect URIs**: `https://<tu-project-ref>.supabase.co/auth/v1/callback` (lo encuentras en el dashboard de Supabase, ver paso siguiente).
5. Copia el **Client ID** y **Client Secret**.

**En el dashboard de Supabase**:
1. **Authentication → Providers → Google**: actívalo y pega el Client ID/Secret.
2. **Authentication → URL Configuration**: Site URL = `https://<tu-usuario>.github.io/carrito-de-compras/`; agrega esa misma URL (+ `/*`) y `http://localhost:5173/*` en Redirect URLs.
3. **Project Settings → API**: copia el `Project URL` y el `anon public key` — los necesitas en el siguiente paso.

## 3. Correr el frontend en local

```bash
cd frontend
cp .env.example .env.local
# Edita .env.local con tu VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Abre `http://localhost:5173`, inicia sesión con Google, y luego márcate como admin con el SQL del paso 1.7.

## 4. Desplegar a GitHub Pages

1. Sube este repo a GitHub (si el nombre del repo no es `carrito-de-compras`, ajusta `base` en `frontend/vite.config.ts`).
2. En **Settings → Secrets and variables → Actions**, crea los secrets `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. En **Settings → Pages**, pon **Source = GitHub Actions**.
4. Haz push a `main` — el workflow `.github/workflows/deploy.yml` compila y publica automáticamente.
5. Actualiza en Google Cloud Console y en Supabase las URLs de producción (ya no solo localhost) si no lo hiciste antes.

## Notas sobre el free tier

- El proyecto de Supabase se **pausa tras ~7 días de inactividad**. Se reactiva en segundos desde el dashboard, sin pérdida de datos. Si se diera de baja tras una pausa muy prolongada, el esquema se reconstruye con `supabase db push` usando las migraciones versionadas en este repo.
- GitHub Pages y GitHub Actions son gratis sin límite de tiempo para repos públicos.
- El `anon key` de Supabase es público por diseño (queda visible en el código del frontend); la seguridad real la dan las políticas de Row Level Security en `supabase/migrations/0002_rls_policies.sql`.

## Estructura

```
frontend/           App React + Vite + Tailwind
supabase/migrations/ Esquema SQL versionado (tablas, RLS, checkout atómico, reporte de ventas)
.github/workflows/  Despliegue automático a GitHub Pages
```
