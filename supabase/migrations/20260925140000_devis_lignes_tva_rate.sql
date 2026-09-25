-- Taux de TVA par ligne. Nullable : l'artisan choisit, l'outil ne devine pas.
alter table public.devis_lignes
  add column if not exists tva_rate numeric(5, 2);

comment on column public.devis_lignes.tva_rate is 'Taux choisi par l''artisan (20, 10 ou 5.5). Null tant qu''il n''a pas choisi.';

-- Les devis existants avaient un taux par ligne (souvent le taux unique appliqué à tout le devis).
update public.devis_lignes
set tva_rate = tva
where tva_rate is null;
