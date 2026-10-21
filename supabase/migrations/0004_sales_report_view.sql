-- Vista de reporte de ventas agregada por comprador.
-- security_invoker = on: respeta el RLS del usuario que consulta (un cliente normal
-- solo ve su propia fila vía orders_select_own_or_admin; el admin las ve todas).

create or replace view public.sales_report as
select
  o.buyer_name,
  o.buyer_email,
  count(distinct o.id) as total_orders,
  sum(o.total)         as total_spent,
  min(o.created_at)    as first_purchase,
  max(o.created_at)    as last_purchase
from public.orders o
where o.status = 'completed'
group by o.buyer_name, o.buyer_email
order by total_spent desc;

alter view public.sales_report set (security_invoker = on);
