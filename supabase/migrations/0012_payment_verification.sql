-- Permite subir comprobante a un pedido viejo (hecho antes de activar el QR) y
-- que un admin lo marque como verificado una vez confirma que el pago llegó.

create or replace function public.submit_payment_proof(p_order_id uuid, p_payment_proof_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
begin
  if p_payment_proof_path is null or length(trim(p_payment_proof_path)) = 0 then
    raise exception 'Debes subir tu comprobante de pago';
  end if;

  select id, user_id, payment_status into v_order
  from public.orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception 'Pedido no encontrado';
  end if;

  if v_order.user_id <> auth.uid() then
    raise exception 'Este pedido no te pertenece';
  end if;

  if v_order.payment_status <> 'pending_payment' then
    raise exception 'Este pedido ya tiene un comprobante registrado';
  end if;

  update public.orders
  set payment_proof_path = p_payment_proof_path,
      payment_status = 'pending_verification'
  where id = p_order_id;
end;
$$;

grant execute on function public.submit_payment_proof(uuid, text) to authenticated;

-- El admin puede marcar un pedido como verificado (y, en general, administrar pedidos).
create policy "orders_update_admin"
  on public.orders for update
  using (public.is_admin());
