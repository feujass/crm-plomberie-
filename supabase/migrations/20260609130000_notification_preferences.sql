-- Préférences de notification granulaires (événement × canal).
alter table public.profiles
  add column if not exists notification_preferences jsonb not null default '{}'::jsonb;
