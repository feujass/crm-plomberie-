-- Référence d'origine pour les avoirs (UNTDID 381 / BT-25).
alter table public.factures
  add column if not exists facture_origine_numero text,
  add column if not exists facture_origine_date date;

comment on column public.factures.facture_origine_numero is 'Numéro de la facture d''origine (obligatoire si avoir).';
comment on column public.factures.facture_origine_date is 'Date d''émission de la facture d''origine.';
