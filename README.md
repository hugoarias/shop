# Tienda AIESEC Alumni Bolivia

Carrito de compras institucional: catálogo con imágenes y stock, login con Google, checkout con descuento de stock atómico y reporte de ventas por comprador.

- **Frontend**: React + Vite + Tailwind CSS, alojado gratis en **GitHub Pages** (`hugoarias/shop` → `https://hugoarias.github.io/shop/`).
- **Backend**: **Supabase** (Postgres + Auth + Storage), proyecto `tienda-aab` (`https://tadhnzajglbvlcldopgk.supabase.co`), sin servidor propio que mantener — la lógica vive en el esquema SQL (`supabase/migrations/`).
- Identidad visual según el **Manual de Marca AIESEC Alumni Bolivia — Polaris 26.27**.

Todo gratis, sin tarjeta de crédito.

## Probarlo ya mismo, sin configurar nada (modo demo)

```bash
cd frontend
npm install
npm run dev
```

Si no existe `frontend/.env.local`, la app detecta que faltan las credenciales de Supabase y arranca sola en **modo demo**: productos, login y compras quedan simulados en memoria (persistidos en `localStorage` de tu navegador), con un aviso amarillo arriba y un botón para reiniciar los datos de prueba. Es la forma más rápida de ver el catálogo, el carrito, el checkout, "mis compras" y el panel de admin con la identidad de marca ya aplicada — sin crear ninguna cuenta.

## Estado de la configuración

Ya quedó hecho (vía Supabase Dashboard y Google Cloud Console):

- ✅ Proyecto Supabase `tienda-aab` creado, con las 5 migraciones de `supabase/migrations/` aplicadas (tablas, RLS, checkout atómico, vista de reporte de ventas).
- ✅ Bucket `product-images` creado como público con sus políticas de Storage.
- ✅ Proyecto de Google Cloud `tienda-aab` creado, con la pantalla de consentimiento OAuth **publicada en producción** (cualquier cuenta de Google puede loguear, sin necesidad de agregarla a mano ni pasar por verificación — solo se piden datos básicos: nombre, correo, foto).
- ✅ Cliente OAuth "Tienda AAB - Web" creado, con `http://localhost:5173` y `https://hugoarias.github.io` como orígenes autorizados, y el callback de Supabase registrado.
- ✅ Proveedor Google activado en Supabase Auth con el Client ID/Secret.
- ✅ Site URL y Redirect URLs de Supabase apuntando a `https://hugoarias.github.io/shop/` y a `http://localhost:5173`.
- ✅ Página de política de privacidad (`frontend/public/privacy.html`), requerida por Google para publicar la app sin verificación.

### Pendiente — pasos que te tocan a ti

1. **Correr en local y marcarte como admin**:
   ```bash
   cd frontend
   cp .env.example .env.local
   # Completa VITE_SUPABASE_URL=https://tadhnzajglbvlcldopgk.supabase.co
   # y VITE_SUPABASE_ANON_KEY=<tu publishable key, Supabase → Settings → API Keys>
   npm install
   npm run dev
   ```
   Abre `http://localhost:5173`, inicia sesión con Google, y en el **SQL Editor de Supabase** ejecuta:
   ```sql
   update public.profiles set role = 'admin' where email = 'tu-correo@gmail.com';
   ```
   (vuelve a cargar la página para ver el panel de admin).

2. **Subir el repo a GitHub** como `hugoarias/shop` (el nombre debe coincidir exactamente, porque `base` en `vite.config.ts` y las URLs de Google/Supabase ya están configuradas para `/shop/`).

3. En **Settings → Secrets and variables → Actions** del repo, crea los secrets `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (mismos valores del paso 1).

4. En **Settings → Pages**, pon **Source = GitHub Actions**.

5. Haz push a `main` — el workflow `.github/workflows/deploy.yml` compila y publica automáticamente en `https://hugoarias.github.io/shop/`.

## Notas sobre el free tier

- El proyecto de Supabase se **pausa tras ~7 días de inactividad**. Se reactiva en segundos desde el dashboard, sin pérdida de datos. Si se diera de baja tras una pausa muy prolongada, el esquema se reconstruye con `supabase db push` usando las migraciones versionadas en este repo.
- GitHub Pages y GitHub Actions son gratis sin límite de tiempo para repos públicos.
- El `anon key` de Supabase es público por diseño (queda visible en el código del frontend); la seguridad real la dan las políticas de Row Level Security en `supabase/migrations/0002_rls_policies.sql`.
- Google Cloud OAuth es gratis sin tarjeta mientras no se usen scopes sensibles (nuestro login básico no los requiere).

## Estructura

```
frontend/           App React + Vite + Tailwind (incluye public/privacy.html)
supabase/migrations/ Esquema SQL versionado (tablas, RLS, checkout atómico, reporte de ventas)
.github/workflows/  Despliegue automático a GitHub Pages
```
