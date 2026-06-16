-- Add the freelancer-supplied reason when a report can't be produced.
alter table public.report_orders
  add column if not exists unavailable_reason text;

notify pgrst, 'reload schema';
