-- Permite que los precios por cantidad (product_price_tiers) se evalúen sumando
-- TODAS las variantes de un producto en el carrito, no solo una línea. Ej.: un
-- combo "3 por Bs 25" en Stickers (con variantes RNA/Alumni) se activa con
-- 2 RNA + 1 Alumni, sin importar la combinación.
--
-- El descuento de stock sigue siendo por variante (eso no cambia). Lo que cambia
-- es cómo se calcula line_total de cada línea: primero se calcula el total "objetivo"
-- por producto con calc_line_total() usando la cantidad SUMADA de todas sus líneas,
-- y después se reparte ese total entre las líneas de ese producto en proporción a su
-- cantidad, con la última línea de cada producto llevándose el resto exacto (evita
-- errores de redondeo). Para productos sin esta combinación, cada producto tiene una
-- sola línea en el carrito, así que el reparto da el mismo resultado que antes.

create or replace function public.checkout(cart_items jsonb, payment_proof_path text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id      uuid;
  v_item          jsonb;
  v_product       record;
  v_variant       record;
  v_variant_id    uuid;
  v_qty           int;
  v_line_total    numeric(10, 2);
  v_total         numeric(10, 2) := 0;
  v_buyer_name    text;
  v_buyer_email   text;
  v_rows          int;
  v_pt_total_qty  int;
  v_pt_target     numeric(10, 2);
  v_pt_allocated  numeric(10, 2);
  v_pt_remaining  int;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para comprar';
  end if;

  if jsonb_array_length(cart_items) = 0 then
    raise exception 'El carrito está vacío';
  end if;

  if payment_proof_path is null or length(trim(payment_proof_path)) = 0 then
    raise exception 'Debes subir tu comprobante de pago';
  end if;

  select full_name, email into v_buyer_name, v_buyer_email
  from public.profiles where id = auth.uid();

  create temporary table tmp_product_totals (
    product_id    uuid primary key,
    total_qty     integer not null,
    target_total  numeric(10, 2) not null,
    allocated     numeric(10, 2) not null default 0,
    remaining     integer not null
  ) on commit drop;

  insert into tmp_product_totals (product_id, total_qty, target_total, remaining)
  select agg.product_id, agg.total_qty, public.calc_line_total(agg.product_id, p.price, agg.total_qty), agg.line_count
  from (
    select
      (elem ->> 'product_id')::uuid as product_id,
      sum((elem ->> 'quantity')::int) as total_qty,
      count(*) as line_count
    from jsonb_array_elements(cart_items) elem
    group by (elem ->> 'product_id')::uuid
  ) agg
  join public.products p on p.id = agg.product_id;

  insert into public.orders (user_id, buyer_name, buyer_email, total, payment_proof_path, payment_status)
  values (auth.uid(), coalesce(v_buyer_name, v_buyer_email), v_buyer_email, 0, payment_proof_path, 'pending_verification')
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

    update tmp_product_totals
    set remaining = remaining - 1
    where product_id = v_product.id
    returning total_qty, target_total, allocated, remaining
    into v_pt_total_qty, v_pt_target, v_pt_allocated, v_pt_remaining;

    if v_pt_remaining = 0 then
      v_line_total := v_pt_target - v_pt_allocated;
    else
      v_line_total := round(v_pt_target * v_qty / v_pt_total_qty, 2);
      update tmp_product_totals set allocated = allocated + v_line_total where product_id = v_product.id;
    end if;

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

grant execute on function public.checkout(jsonb, text) to authenticated;
