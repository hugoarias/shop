-- Esquema inicial: perfiles, productos, órdenes e items de orden.

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  avatar_url  text,
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now()
);

-- Se crea automáticamente un perfil cuando alguien se registra (incluyendo login con Google).
-- El nombre se extrae de los metadatos que entrega el proveedor OAuth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


create table public.products (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  price           numeric(10, 2) not null check (price >= 0),
  image_url       text,
  stock_quantity  integer not null default 0 check (stock_quantity >= 0),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);


create table public.orders (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id),
  buyer_name   text not null,
  buyer_email  text not null,
  total        numeric(10, 2) not null check (total >= 0),
  status       text not null default 'completed' check (status in ('completed', 'cancelled')),
  created_at   timestamptz not null default now()
);

create index orders_user_id_idx on public.orders (user_id);


create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid not null references public.products(id),
  quantity    integer not null check (quantity > 0),
  unit_price  numeric(10, 2) not null check (unit_price >= 0)
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);
