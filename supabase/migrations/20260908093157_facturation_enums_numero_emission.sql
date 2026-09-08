-- Valeurs prod vérifiées avant cette migration (2026-09-08) :
--   profiles.regime_tva          : encaissements (12)
--   clients.type_client          : particulier (10)
--   factures.statut_cycle_vie    : emise (1)
--   factures.nature_operation    : null (1)
--   facture_lignes.type_ligne    : service (6)
--   devis_lignes.ligne_type      : prestation (55), pose (41), fourniture (24)
-- Aucune valeur hors domaine.
--
-- supabase gen types n'émet des unions TS que pour les ENUM Postgres,
-- pas pour un CHECK sur text. On promeut les 6 domaines + CHECK.

-- ---------------------------------------------------------------------------
-- ENUM + CHECK (trigger d'émission après ALTER TYPE)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'regime_tva') then
    create type public.regime_tva as enum ('encaissements', 'debits', 'franchise_293b');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'type_client') then
    create type public.type_client as enum ('particulier', 'entreprise', 'public');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'statut_cycle_vie') then
    create type public.statut_cycle_vie as enum ('brouillon', 'emise', 'deposee', 'rejetee', 'encaissee');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'nature_operation') then
    create type public.nature_operation as enum ('biens', 'services', 'mixte');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'type_ligne') then
    create type public.type_ligne as enum ('bien', 'service');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'ligne_type') then
    create type public.ligne_type as enum ('prestation', 'fourniture', 'pose');
  end if;
end
$$;

-- profiles.regime_tva (colonnes générées à recréer)
alter table public.profiles drop constraint if exists profiles_regime_tva_check;
alter table public.profiles drop column if exists tva_sur_encaissements;
alter table public.profiles drop column if exists tva_sur_debits_opt_in;

alter table public.profiles alter column regime_tva drop default;
alter table public.profiles
  alter column regime_tva type public.regime_tva
  using regime_tva::public.regime_tva;
alter table public.profiles
  alter column regime_tva set default 'encaissements'::public.regime_tva;

alter table public.profiles
  add column tva_sur_encaissements boolean
  generated always as (regime_tva = 'encaissements'::public.regime_tva) stored;
alter table public.profiles
  add column tva_sur_debits_opt_in boolean
  generated always as (regime_tva = 'debits'::public.regime_tva) stored;

alter table public.profiles
  add constraint profiles_regime_tva_check
  check (regime_tva in ('encaissements'::public.regime_tva, 'debits'::public.regime_tva, 'franchise_293b'::public.regime_tva));

-- clients.type_client (GENERATED)
alter table public.clients drop constraint if exists clients_pro_identifiant_chk;
alter table public.clients drop constraint if exists clients_type_client_check;
alter table public.clients drop column if exists type_client;
alter table public.clients
  add column type_client public.type_client
  generated always as (
    case
      when coalesce(secteur_public, false) then 'public'::public.type_client
      when coalesce(categorie_fiscale, 'particulier') in (
        'pro_assujetti',
        'pro_non_assujetti',
        'pro_international'
      ) then 'entreprise'::public.type_client
      else 'particulier'::public.type_client
    end
  ) stored;

alter table public.clients
  add constraint clients_type_client_check
  check (type_client in ('particulier'::public.type_client, 'entreprise'::public.type_client, 'public'::public.type_client));

alter table public.clients
  add constraint clients_pro_identifiant_chk
  check (
    type_client = 'particulier'::public.type_client
    or coalesce(btrim(siren), '') <> ''
    or coalesce(btrim(siret), '') <> ''
  ) not valid;

comment on column public.clients.type_client is
  'GENERATED: public | entreprise | particulier (categorie_fiscale + secteur_public).';

-- factures
alter table public.factures drop constraint if exists factures_statut_cycle_vie_check;
alter table public.factures alter column statut_cycle_vie drop default;
alter table public.factures
  alter column statut_cycle_vie type public.statut_cycle_vie
  using statut_cycle_vie::public.statut_cycle_vie;
alter table public.factures
  alter column statut_cycle_vie set default 'brouillon'::public.statut_cycle_vie;
alter table public.factures
  add constraint factures_statut_cycle_vie_check
  check (statut_cycle_vie in (
    'brouillon'::public.statut_cycle_vie,
    'emise'::public.statut_cycle_vie,
    'deposee'::public.statut_cycle_vie,
    'rejetee'::public.statut_cycle_vie,
    'encaissee'::public.statut_cycle_vie
  ));

alter table public.factures drop constraint if exists factures_nature_operation_check;
alter table public.factures
  alter column nature_operation type public.nature_operation
  using nature_operation::public.nature_operation;
alter table public.factures
  add constraint factures_nature_operation_check
  check (
    nature_operation is null
    or nature_operation in (
      'biens'::public.nature_operation,
      'services'::public.nature_operation,
      'mixte'::public.nature_operation
    )
  );

-- facture_lignes.type_ligne
alter table public.facture_lignes drop constraint if exists facture_lignes_type_ligne_check;
alter table public.facture_lignes alter column type_ligne drop default;
alter table public.facture_lignes
  alter column type_ligne type public.type_ligne
  using type_ligne::public.type_ligne;
alter table public.facture_lignes
  alter column type_ligne set default 'service'::public.type_ligne;
alter table public.facture_lignes
  add constraint facture_lignes_type_ligne_check
  check (type_ligne in ('bien'::public.type_ligne, 'service'::public.type_ligne));

-- devis_lignes.ligne_type
alter table public.devis_lignes drop constraint if exists devis_lignes_ligne_type_check;
alter table public.devis_lignes alter column ligne_type drop default;
alter table public.devis_lignes
  alter column ligne_type type public.ligne_type
  using ligne_type::public.ligne_type;
alter table public.devis_lignes
  alter column ligne_type set default 'prestation'::public.ligne_type;
alter table public.devis_lignes
  add constraint devis_lignes_ligne_type_check
  check (
    ligne_type is null
    or ligne_type in (
      'prestation'::public.ligne_type,
      'fourniture'::public.ligne_type,
      'pose'::public.ligne_type
    )
  );

-- ---------------------------------------------------------------------------
-- Numéro à l'émission, même transaction que l'INSERT/UPDATE
-- (après ALTER TYPE : un trigger ne peut pas dépendre d'une colonne
--  dont on change le type)
-- ---------------------------------------------------------------------------
create or replace function public.factures_assign_numero_at_emission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.numero is null and new.statut_cycle_vie is distinct from 'brouillon' then
    new.numero := public.allocate_facture_numero(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists factures_assign_numero_at_emission on public.factures;
create trigger factures_assign_numero_at_emission
  before insert or update of statut_cycle_vie, numero
  on public.factures
  for each row
  execute function public.factures_assign_numero_at_emission();

comment on function public.factures_assign_numero_at_emission() is
  'Attribue allocate_facture_numero dans la même transaction que le passage hors brouillon.';

