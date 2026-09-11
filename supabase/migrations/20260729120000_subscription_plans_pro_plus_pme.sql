-- Élargit subscription_plan pour Pro+, PME et statuts Stripe (webhooks).
alter table public.profiles drop constraint if exists profiles_subscription_plan_check;

alter table public.profiles
  add constraint profiles_subscription_plan_check
  check (subscription_plan in ('free', 'pro', 'pro_plus', 'pme'));
