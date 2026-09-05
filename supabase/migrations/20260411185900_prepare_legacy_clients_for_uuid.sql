-- À exécuter AVANT `20260411190000_plombicrm_initial.sql` si vous aviez déjà l’ancien CRM
-- (table `public.clients` avec `id` bigint / BIGSERIAL).
--
-- 1) Supprime toutes les contraintes FK qui pointent vers `public.clients`.
-- 2) Renomme l’ancienne table en `clients_legacy_bigint` pour libérer le nom `clients`.
-- La migration suivante pourra alors créer `clients` avec `id uuid`.

do $$
declare
  r record;
  id_type text;
begin
  select c.data_type into id_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'clients'
    and c.column_name = 'id';

  if id_type is null or id_type = 'uuid' then
    return;
  end if;

  for r in
    select con.conname as conname, rel.relname as tbl
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where con.contype = 'f'
      and con.confrelid = 'public.clients'::regclass
      and nsp.nspname = 'public'
  loop
    execute format('alter table public.%I drop constraint if exists %I', r.tbl, r.conname);
  end loop;

  execute 'alter table public.clients rename to clients_legacy_bigint';
end;
$$;
