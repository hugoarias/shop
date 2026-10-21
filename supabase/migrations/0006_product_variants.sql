-- Soporte de variantes por producto (ej. tallas S/M/L/XL), cada una con su propio stock.
-- Los 6 productos existentes quedan intactos: has_variants nace en false, que mantiene
-- exactamente el comportamiento actual (un solo stock_quantity en products).

alter table public.products
  add column has_variants boolean not null default false;

create table public.product_variants (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products(id) on delete cascade,
  name            text not null,
  stock_quantity  integer not null default 0 check (stock_quantity >= 0),
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (product_id, name)
);

create index product_variants_product_id_idx on public.product_variants (product_id);

-- Snapshot de la variante comprada (igual patrón que unit_price): si el admin renombra
-- o desactiva una variante despues, el pedido historico conserva el nombre original.
-- Sin on delete cascade/set null (queda RESTRICT): no se puede borrar fisicamente una
-- variante con ventas, igual que ya pasa con products hoy.
alter table public.order_items
  add column variant_id   uuid references public.product_variants(id),
  add column variant_name text;

create index order_items_variant_id_idx on public.order_items (variant_id);

alter table public.product_variants enable row level security;

create policy "product_variants_select_public"
  on public.product_variants for select
  using (true);

create policy "product_variants_insert_admin"
  on public.product_variants for insert
  with check (public.is_admin());

create policy "product_variants_update_admin"
  on public.product_variants for update
  using (public.is_admin());

create policy "product_variants_delete_admin"
  on public.product_variants for delete
  using (public.is_admin());

-- Si has_variants = true, stock_quantity del producto se fuerza a 0: deja de ser la
-- fuente de verdad y evita que alguien mire esa columna directo y se confunda.
create or replace function public.zero_stock_when_variants()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.has_variants then
    new.stock_quantity := 0;
  end if;
  return new;
end;
$$;

create trigger products_zero_stock_when_variants
  before insert or update on public.products
  for each row execute function public.zero_stock_when_variants();
