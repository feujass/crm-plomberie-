-- Profil progressif : inscription email-only, complétion ultérieure.
-- Les colonnes prenom, nom, tel, entreprise_nom, siret, adresse étaient déjà nullable.

alter table public.profiles
  add column if not exists profile_voice_prompt_skipped_at timestamptz;

comment on column public.profiles.profile_voice_prompt_skipped_at is
  'Horodatage si l''artisan a ignoré la modale profil avant le premier devis vocal';

comment on column public.profiles.prenom is 'Nullable — complété après inscription (profil progressif)';
comment on column public.profiles.nom is 'Nullable — complété après inscription';
comment on column public.profiles.entreprise_nom is 'Nullable — complété avant le premier devis';
comment on column public.profiles.siret is 'Nullable — demandé au premier export PDF devis';
comment on column public.profiles.adresse is 'Nullable — demandée au premier export PDF devis';
