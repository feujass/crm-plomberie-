-- Flowo — facturation électronique Phase 0
-- Socle de données EN 16931 / Factur-X. Pas de raccordement PDP.

-- ---------------------------------------------------------------------------
-- Régime TVA unique (remplace les deux booléens contradictoires)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists regime_tva text;

update public.profiles
set regime_tva = case
  when tva_sur_debits_opt_in is true then 'debits'
  else 'encaissements'
end
where regime_tva is null;

alter table public.profiles
  alter column regime_tva set default 'encaissements';

alter table public.profiles
  alter column regime_tva set not null;

alter table public.profiles drop constraint if exists profiles_regime_tva_check;
alter table public.profiles
  add constraint profiles_regime_tva_check
  check (regime_tva in ('encaissements', 'debits', 'franchise_293b'));

alter table public.profiles drop column if exists tva_sur_encaissements;
alter table public.profiles drop column if exists tva_sur_debits_opt_in;

alter table public.profiles
  add column tva_sur_encaissements boolean
  generated always as (regime_tva = 'encaissements') stored;

alter table public.profiles
  add column tva_sur_debits_opt_in boolean
  generated always as (regime_tva = 'debits') stored;

-- Adresse émetteur structurée (nullable, pas de backfill depuis le blob)
alter table public.profiles
  add column if not exists adresse_ligne1 text,
  add column if not exists adresse_ligne2 text,
  add column if not exists adresse_cp text,
  add column if not exists adresse_ville text,
  add column if not exists adresse_pays text not null default 'FR',
  add column if not exists adresse_structure_proposition jsonb,
  add column if not exists adresse_structure_confirmee_at timestamptz;

comment on column public.profiles.regime_tva is 'encaissements | debits | franchise_293b';
comment on column public.profiles.adresse_structure_proposition is 'Proposition de parsing du blob adresse — à confirmer en UI, jamais copiée silencieusement.';
comment on column public.profiles.adresse_structure_confirmee_at is 'Artisan a confirmé l''adresse structurée (émission Factur-X).';

-- ---------------------------------------------------------------------------
-- Clients : type_client généré + adresses structurées
-- ---------------------------------------------------------------------------
alter table public.clients
  add column if not exists adresse_facturation_ligne1 text,
  add column if not exists adresse_facturation_ligne2 text,
  add column if not exists adresse_facturation_cp text,
  add column if not exists adresse_facturation_ville text,
  add column if not exists adresse_facturation_pays text,
  add column if not exists adresse_livraison_ligne1 text,
  add column if not exists adresse_livraison_ligne2 text,
  add column if not exists adresse_livraison_cp text,
  add column if not exists adresse_livraison_ville text,
  add column if not exists adresse_livraison_pays text,
  add column if not exists adresse_structure_proposition jsonb,
  add column if not exists adresse_structure_confirmee_at timestamptz;

alter table public.clients drop column if exists type_client;
alter table public.clients
  add column type_client text
  generated always as (
    case
      when coalesce(secteur_public, false) then 'public'
      when coalesce(categorie_fiscale, 'particulier') in (
        'pro_assujetti',
        'pro_non_assujetti',
        'pro_international'
      ) then 'entreprise'
      else 'particulier'
    end
  ) stored;

comment on column public.clients.type_client is 'GENERATED: public | entreprise | particulier (categorie_fiscale + secteur_public).';

alter table public.clients drop constraint if exists clients_pro_identifiant_chk;
alter table public.clients
  add constraint clients_pro_identifiant_chk
  check (
    type_client = 'particulier'
    or coalesce(btrim(siren), '') <> ''
    or coalesce(btrim(siret), '') <> ''
  ) not valid;

-- ---------------------------------------------------------------------------
-- Compteurs de numérotation (sans trou, verrou de ligne)
-- ---------------------------------------------------------------------------
create table if not exists public.facture_compteurs (
  user_id uuid not null references auth.users (id) on delete cascade,
  annee int not null,
  dernier_numero int not null default 0,
  primary key (user_id, annee)
);

alter table public.facture_compteurs enable row level security;

drop policy if exists facture_compteurs_own on public.facture_compteurs;
create policy facture_compteurs_own on public.facture_compteurs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.facture_compteurs (user_id, annee, dernier_numero)
select
  f.user_id,
  coalesce((regexp_match(f.numero, '^FACT-([0-9]{4})-'))[1]::int, extract(year from f.created_at)::int),
  max(coalesce((regexp_match(f.numero, '^FACT-[0-9]{4}-([0-9]+)$'))[1]::int, 0))
from public.factures f
where f.numero is not null and btrim(f.numero) <> ''
group by 1, 2
on conflict (user_id, annee) do update
set dernier_numero = greatest(public.facture_compteurs.dernier_numero, excluded.dernier_numero);

create or replace function public.allocate_facture_numero(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y int := extract(year from timezone('Europe/Paris', now()))::int;
  n int;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'forbidden';
  end if;

  insert into public.facture_compteurs (user_id, annee, dernier_numero)
  values (p_user_id, y, 1)
  on conflict (user_id, annee)
  do update set dernier_numero = public.facture_compteurs.dernier_numero + 1
  returning dernier_numero into n;

  return 'FACT-' || y::text || '-' || lpad(n::text, 4, '0');
end;
$$;

revoke all on function public.allocate_facture_numero(uuid) from public;
grant execute on function public.allocate_facture_numero(uuid) to authenticated;
grant execute on function public.allocate_facture_numero(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Factures
-- ---------------------------------------------------------------------------
alter table public.factures
  alter column numero drop not null;

alter table public.factures
  add column if not exists nature_operation text,
  add column if not exists option_tva_debits boolean not null default false,
  add column if not exists devise text not null default 'EUR',
  add column if not exists snapshot_emetteur jsonb,
  add column if not exists snapshot_client jsonb,
  add column if not exists statut_cycle_vie text not null default 'brouillon',
  add column if not exists facturx_xml text,
  add column if not exists facturx_pdf_path text;

update public.factures
set statut_cycle_vie = case
  when statut in ('emise', 'partielle', 'payee', 'retard') then 'emise'
  else 'brouillon'
end
where statut_cycle_vie = 'brouillon' and numero is not null;

alter table public.factures drop constraint if exists factures_nature_operation_check;
alter table public.factures
  add constraint factures_nature_operation_check
  check (nature_operation is null or nature_operation in ('biens', 'services', 'mixte'));

alter table public.factures drop constraint if exists factures_devise_check;
alter table public.factures
  add constraint factures_devise_check
  check (devise = 'EUR');

alter table public.factures drop constraint if exists factures_statut_cycle_vie_check;
alter table public.factures
  add constraint factures_statut_cycle_vie_check
  check (statut_cycle_vie in ('brouillon', 'emise', 'deposee', 'rejetee', 'encaissee'));

comment on column public.factures.numero is 'Attribué à l''émission uniquement (allocate_facture_numero). Null tant que brouillon.';
comment on column public.factures.statut_cycle_vie is 'Cycle e-invoicing, orthogonal au statut de paiement.';
comment on column public.factures.snapshot_emetteur is 'Identité artisan figée à l''émission.';
comment on column public.factures.snapshot_client is 'Identité client figée à l''émission (adresses incluses).';

-- ---------------------------------------------------------------------------
-- Lignes de facture
-- ---------------------------------------------------------------------------
alter table public.facture_lignes
  add column if not exists type_ligne text;

update public.facture_lignes
set type_ligne = 'service'
where type_ligne is null;

alter table public.facture_lignes
  alter column type_ligne set default 'service';

alter table public.facture_lignes
  alter column type_ligne set not null;

alter table public.facture_lignes drop constraint if exists facture_lignes_type_ligne_check;
alter table public.facture_lignes
  add constraint facture_lignes_type_ligne_check
  check (type_ligne in ('bien', 'service'));

-- ---------------------------------------------------------------------------
-- Storage Factur-X (privé)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('factures-einvoicing', 'factures-einvoicing', false)
on conflict (id) do nothing;

drop policy if exists "factures-einvoicing read own" on storage.objects;
create policy "factures-einvoicing read own" on storage.objects for select to authenticated
  using (bucket_id = 'factures-einvoicing' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "factures-einvoicing insert own" on storage.objects;
create policy "factures-einvoicing insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'factures-einvoicing' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "factures-einvoicing update own" on storage.objects;
create policy "factures-einvoicing update own" on storage.objects for update to authenticated
  using (bucket_id = 'factures-einvoicing' and split_part(name, '/', 1) = auth.uid()::text)
  with check (bucket_id = 'factures-einvoicing' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "factures-einvoicing delete own" on storage.objects;
create policy "factures-einvoicing delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'factures-einvoicing' and split_part(name, '/', 1) = auth.uid()::text);
