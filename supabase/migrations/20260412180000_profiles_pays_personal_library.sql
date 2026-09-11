-- Champs profil pour l'app mobile (paramètres type assistant)
alter table public.profiles
  add column if not exists pays text not null default 'FR',
  add column if not exists use_personal_library boolean not null default true;

comment on column public.profiles.pays is 'Code pays ISO pour affichage TVA (ex. FR)';
comment on column public.profiles.use_personal_library is 'Utiliser la bibliothèque personnelle d''ouvrages dans les devis';
