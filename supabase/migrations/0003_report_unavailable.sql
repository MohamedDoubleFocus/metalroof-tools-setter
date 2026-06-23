-- Add the freelancer-supplied reason when a report can't be produced.
alter table public.report_orders
  add column if not exists unavailable_reason text;

-- Expand the status check constraint to allow the new "unavailable" state.
alter table public.report_orders
  drop constraint if exists report_orders_status_check;

alter table public.report_orders
  add constraint report_orders_status_check
  check (status in ('pending', 'in_progress', 'ready', 'delivered', 'unavailable'));

notify pgrst, 'reload schema';
