-- Pago por QR con comprobante obligatorio.
-- El bucket "payment-proofs" se crea manualmente desde el dashboard de Supabase
-- (Storage → New bucket → "payment-proofs", SIN marcarlo como público, a diferencia
-- de "product-images") antes de aplicar esta migración. Es privado porque los
-- comprobantes son documentos financieros: se acceden solo con signed URLs.

alter table public.orders add column payment_proof_path text;

alter table public.orders add column payment_status text not null default 'pending_payment'
  check (payment_status in ('pending_payment', 'pending_verification', 'verified'));

-- Backfill explícito: todos los pedidos existentes (incluido cualquier pedido real
-- hecho antes de activar el QR) quedan pendientes de pago hasta que suban su comprobante.
update public.orders set payment_status = 'pending_payment';

create policy "payment_proofs_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "payment_proofs_owner_or_admin_select"
  on storage.objects for select
  using (
    bucket_id = 'payment-proofs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
