-- Flags jamais lus par le produit (stubs Chorus / e-reporting / e-sign).
alter table public.profiles drop column if exists feature_flag_pdp;
alter table public.profiles drop column if exists feature_flag_ereporting;
alter table public.profiles drop column if exists feature_flag_chorus;
alter table public.profiles drop column if exists feature_flag_esign_advanced;
