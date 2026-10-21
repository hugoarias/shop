-- Precios por cantidad (ej. "3x25Bs"): paquete exacto, no precio continuo por unidad.
-- Los productos sin tiers no se ven afectados (calc_line_total cae a precio x cantidad).

create table public.product_price_tiers (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  min_quantity  integer not null check (min_quantity >= 2),
  bundle_price  numeric(10, 2) not null check (bundle_price >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (product_id, min_quantity)
);

create index product_price_tiers_product_id_idx on public.product_price_tiers (product_id);

alter table public.order_items add column line_total numeric(10, 2);

alter table public.product_price_tiers enable row level security;

create policy "product_price_tiers_select_public"
  on public.product_price_tiers for select
  using (true);

create policy "product_price_tiers_insert_admin"
  on public.product_price_tiers for insert
  with check (public.is_admin());

create policy "product_price_tiers_update_admin"
  on public.product_price_tiers for update
  using (public.is_admin());

create policy "product_price_tiers_delete_admin"
  on public.product_price_tiers for delete
  using (public.is_admin());

-- Calcula el total de una linea armando primero los paquetes mas grandes
-- (greedy) y cobrando el sobrante al precio normal. stable: no modifica datos.
create or replace function public.calc_line_total(p_product_id uuid, p_base_price numeric, p_qty integer)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  v_tier      record;
  v_remaining integer := p_qty;
  v_total     numeric(10, 2) := 0;
  v_bundles   integer;
begin
  for v_tier in
    select min_quantity, bundle_price
    from public.product_price_tiers
    where product_id = p_product_id
    order by min_quantity desc
  loop
    if v_remaining >= v_tier.min_quantity then
      v_bundles := v_remaining / v_tier.min_quantity;
      v_total := v_total + v_bundles * v_tier.bundle_price;
      v_remaining := v_remaining - v_bundles * v_tier.min_quantity;
    end if;
  end loop;

  v_total := v_total + v_remaining * p_base_price;
  return v_total;
end;
$$;
