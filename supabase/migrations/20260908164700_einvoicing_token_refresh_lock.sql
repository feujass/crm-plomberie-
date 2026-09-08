-- Sérialise le refresh OAuth rotatif : deux refresh simultanés invalident
-- le premier refresh_token (invalid_grant) et déconnectent l’artisan.
-- Lease sur la ligne (pas de pg_advisory_lock : connexion poolée / serverless).

alter table public.einvoicing_oauth_tokens
  add column if not exists refresh_lock_until timestamptz;

comment on column public.einvoicing_oauth_tokens.refresh_lock_until is
  'Lease de refresh rotatif. Null = libre. Expiré ( < now() ) = libre. TTL posé par einvoicing_lock_oauth_tokens.';

create or replace function public.einvoicing_lock_oauth_tokens(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role'
     and auth.uid() is distinct from p_user_id then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.einvoicing_oauth_tokens
  set refresh_lock_until = now() + interval '20 seconds'
  where user_id = p_user_id
    and (refresh_lock_until is null or refresh_lock_until < now());

  return found;
end;
$$;

create or replace function public.einvoicing_unlock_oauth_tokens(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role'
     and auth.uid() is distinct from p_user_id then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.einvoicing_oauth_tokens
  set refresh_lock_until = null
  where user_id = p_user_id
    and refresh_lock_until is not null;

  return found;
end;
$$;

revoke all on function public.einvoicing_lock_oauth_tokens(uuid) from public;
revoke all on function public.einvoicing_unlock_oauth_tokens(uuid) from public;
grant execute on function public.einvoicing_lock_oauth_tokens(uuid) to authenticated, service_role;
grant execute on function public.einvoicing_unlock_oauth_tokens(uuid) to authenticated, service_role;

comment on function public.einvoicing_lock_oauth_tokens(uuid) is
  'Prend un lease de 20 s sur einvoicing_oauth_tokens. UPDATE atomique : le second concurrent voit WHERE faux.';
comment on function public.einvoicing_unlock_oauth_tokens(uuid) is
  'Libère le lease de refresh rotatif.';
