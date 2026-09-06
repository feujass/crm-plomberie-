-- Métier artisan (onboarding step-1, compte, prompts IA).
alter table public.profiles
  add column if not exists metier text,
  add column if not exists specialites text;

comment on column public.profiles.metier is 'Code métier (plomberie, electricite, …)';
comment on column public.profiles.specialites is 'Libellé libre / domaines d''intervention affichés dans l''app';
