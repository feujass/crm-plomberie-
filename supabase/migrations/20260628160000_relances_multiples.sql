-- Relances multiples + compteur par devis/facture
alter table public.profiles
  add column if not exists relance_devis_echeances text not null default '3,7,14';

alter table public.profiles
  add column if not exists relance_facture_echeances text not null default '0,7,14';

alter table public.devis
  add column if not exists relance_count int not null default 0;

alter table public.factures
  add column if not exists relance_count int not null default 0;

-- Anciennes relances uniques : compter comme 1ère relance déjà faite
update public.devis
set relance_count = 1
where derniere_relance_at is not null and relance_count = 0;

update public.factures
set relance_count = 1
where derniere_relance_at is not null and relance_count = 0;

alter table public.profiles
  alter column relance_devis_jours set default 3;
