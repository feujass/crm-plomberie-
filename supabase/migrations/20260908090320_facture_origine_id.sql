-- Lien applicatif vers la facture d'origine (avoir).
-- Le snapshot légal XML reste facture_origine_numero + facture_origine_date (BT-25).
alter table public.factures
  add column if not exists facture_origine_id uuid references public.factures (id) on delete set null;

comment on column public.factures.facture_origine_id is
  'UUID de la facture d''origine (navigation / intégrité). Le XML Factur-X utilise le snapshot numero+date.';

alter table public.factures
  drop constraint if exists factures_origine_id_ne_self;

alter table public.factures
  add constraint factures_origine_id_ne_self
  check (facture_origine_id is null or facture_origine_id <> id);

create index if not exists factures_origine_id_idx on public.factures (facture_origine_id);
