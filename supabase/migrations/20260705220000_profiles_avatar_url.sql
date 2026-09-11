-- Photo de profil utilisateur (Compte → Profil), distincte du logo entreprise (logo_url).
alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is 'URL photo de profil (Storage logos ou URL externe)';
