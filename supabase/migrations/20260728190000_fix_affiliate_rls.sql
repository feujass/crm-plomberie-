-- Corrige l'alerte Supabase rls_disabled_in_public (affiliate_payouts + durcissement affiliation).

alter table public.affiliate_payouts enable row level security;

drop policy if exists affiliate_payouts_select_own on public.affiliate_payouts;
create policy affiliate_payouts_select_own on public.affiliate_payouts
  for select using (
    partner_id in (select id from public.affiliate_partners where user_id = auth.uid())
  );

-- Candidatures : accès réservé au service role (API serveur). Aucune policy = deny pour anon/authenticated.
alter table public.affiliate_applications enable row level security;

-- Sécurité défensive : activer RLS sur toute table public sans RLS (hors tables système).
do $$
declare
  tbl record;
begin
  for tbl in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
      and c.relname not like 'pg_%'
  loop
    execute format('alter table public.%I enable row level security', tbl.table_name);
    raise notice 'RLS enabled on public.%', tbl.table_name;
  end loop;
end $$;
