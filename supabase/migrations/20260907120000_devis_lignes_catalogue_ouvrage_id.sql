alter table public.devis_lignes
  add column if not exists catalogue_ouvrage_id uuid references public.ouvrages (id) on delete set null;

comment on column public.devis_lignes.catalogue_ouvrage_id is 'Ouvrage catalogue ayant fourni le tarif par défaut (origine_prix = prereglage).';
