-- Rotation de clé OAuth (key_id) + statut irrecevable (rejet définitif fr:213 / fr:501).
-- Le CHECK textuel est retiré : l'ENUM suffit. On ne recrée pas le CHECK dans la même
-- transaction que ADD VALUE (Postgres refuse d'utiliser la nouvelle valeur avant COMMIT).

alter table public.factures drop constraint if exists factures_statut_cycle_vie_check;

alter type public.statut_cycle_vie add value if not exists 'irrecevable';

comment on column public.factures.statut_cycle_vie is
  'Cycle e-invoicing. rejetee = refus destinataire corrigeable (fr:210) ; irrecevable = rejet définitif (fr:213, fr:501). Orthogonal au statut de paiement.';

alter table public.einvoicing_oauth_tokens
  add column if not exists key_id text not null default 'v1';

comment on column public.einvoicing_oauth_tokens.key_id is
  'Identifiant de EINVOICING_TOKEN_ENCRYPTION_KEY utilisé pour ce blob (ex. v1). Permet une rotation sans invalider les raccordements.';
