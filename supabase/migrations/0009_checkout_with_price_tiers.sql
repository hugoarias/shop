-- Reemplaza checkout() (misma firma) para cobrar precios por cantidad (combos).
-- Si el producto no tiene tiers, calc_line_total devuelve precio x cantidad,
-- igual que antes: cero impacto para los productos que no usan combos.

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
  v_variant     record;
  v_variant_id  uuid;
  v_qty         int;
  v_line_total  numeric(10, 2);
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
    v_qty := (v_item ->> 'quantity')::int;
    v_variant_id := nullif(v_item ->> 'variant_id', '')::uuid;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Cantidad inválida';
    end if;

    select id, price, has_variants into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
      and is_active = true
    for update;

    if v_product.id is null then
      raise exception 'Producto % no existe o no está disponible', v_item ->> 'product_id';
    end if;

    v_line_total := public.calc_line_total(v_product.id, v_product.price, v_qty);

    if v_product.has_variants then
      if v_variant_id is null then
        raise exception 'Debes elegir una variante para el producto %', v_product.id;
      end if;

      select id, name, stock_quantity into v_variant
      from public.product_variants
      where id = v_variant_id
        and product_id = v_product.id
        and is_active = true
      for update;

      if v_variant.id is null then
        raise exception 'La variante % no existe o no está disponible', v_variant_id;
      end if;

      update public.product_variants
      set stock_quantity = stock_quantity - v_qty,
          updated_at = now()
      where id = v_variant.id
        and stock_quantity >= v_qty;

      get diagnostics v_rows = row_count;
      if v_rows = 0 then
        raise exception 'Stock insuficiente para la variante % del producto %', v_variant.name, v_product.id;
      end if;

      insert into public.order_items (order_id, product_id, variant_id, variant_name, quantity, unit_price, line_total)
      values (v_order_id, v_product.id, v_variant.id, v_variant.name, v_qty, v_product.price, v_line_total);
    else
      if v_variant_id is not null then
        raise exception 'El producto % no tiene variantes', v_product.id;
      end if;

      update public.products
      set stock_quantity = stock_quantity - v_qty,
          updated_at = now()
      where id = v_product.id
        and stock_quantity >= v_qty;

      get diagnostics v_rows = row_count;
      if v_rows = 0 then
        raise exception 'Stock insuficiente para el producto %', v_product.id;
      end if;

      insert into public.order_items (order_id, product_id, variant_id, variant_name, quantity, unit_price, line_total)
      values (v_order_id, v_product.id, null, null, v_qty, v_product.price, v_line_total);
    end if;

    v_total := v_total + v_line_total;
  end loop;

  update public.orders set total = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

grant execute on function public.checkout(jsonb) to authenticated;
