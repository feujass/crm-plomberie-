-- Consentement RGPD à l'inscription (preuve + version de la politique acceptée).
alter table public.profiles
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists privacy_policy_version text;

comment on column public.profiles.privacy_accepted_at is 'Horodatage acceptation CGU / politique de confidentialité';
comment on column public.profiles.privacy_policy_version is 'Version de la politique acceptée (ex. 2026-07-14)';
