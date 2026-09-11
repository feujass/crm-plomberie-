alter table public.profiles
  add column if not exists ia_devis_month text,
  add column if not exists ia_devis_count int not null default 0;
