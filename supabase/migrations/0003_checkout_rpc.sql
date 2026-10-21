-- Checkout atómico: descuenta stock con UPDATE ... WHERE stock_quantity >= cantidad,
-- de forma que dos compras simultáneas nunca puedan dejar el stock en negativo.
-- Si falta stock de cualquier producto, toda la función hace rollback (orden incluida).

create or replace function public.checkout(cart_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id    uuid;
  v_item        jsonb;
  v_product     record;
  v_total       numeric(10, 2) := 0;
  v_buyer_name  text;
  v_buyer_email text;
  v_rows        int;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para comprar';
  end if;

  if jsonb_array_length(cart_items) = 0 then
    raise exception 'El carrito está vacío';
  end if;

  select full_name, email into v_buyer_name, v_buyer_email
  from public.profiles where id = auth.uid();

  insert into public.orders (user_id, buyer_name, buyer_email, total)
  values (auth.uid(), coalesce(v_buyer_name, v_buyer_email), v_buyer_email, 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(cart_items)
  loop
    select id, price, stock_quantity into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
      and is_active = true
    for update;

    if v_product.id is null then
      raise exception 'Producto % no existe o no está disponible', v_item ->> 'product_id';
    end if;

    update public.products
    set stock_quantity = stock_quantity - (v_item ->> 'quantity')::int,
        updated_at = now()
    where id = v_product.id
      and stock_quantity >= (v_item ->> 'quantity')::int;

    get diagnostics v_rows = row_count;

    if v_rows = 0 then
      raise exception 'Stock insuficiente para el producto %', v_product.id;
    end if;

    insert into public.order_items (order_id, product_id, quantity, unit_price)
    values (v_order_id, v_product.id, (v_item ->> 'quantity')::int, v_product.price);

    v_total := v_total + (v_product.price * (v_item ->> 'quantity')::int);
  end loop;

  update public.orders set total = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

grant execute on function public.checkout(jsonb) to authenticated;
