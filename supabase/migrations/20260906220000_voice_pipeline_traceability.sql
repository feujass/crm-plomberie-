-- Pipeline dictée vocale : traçabilité transcription + origine des prix

alter table public.devis
  add column if not exists transcription_brute text,
  add column if not exists transcription_corrigee text,
  add column if not exists ia_questions jsonb not null default '[]'::jsonb;

alter table public.devis_lignes
  add column if not exists source text,
  add column if not exists origine_prix text check (origine_prix is null or origine_prix in ('dicte', 'prereglage', 'vide')),
  add column if not exists tva_alerte text;

comment on column public.devis.transcription_brute is 'Sortie STT avant correction vocabulaire métier';
comment on column public.devis.transcription_corrigee is 'Transcription après corrigerVocabulaire()';
comment on column public.devis.ia_questions is 'Questions ambiguës remontées par Zeus';
comment on column public.devis_lignes.origine_prix is 'dicte | prereglage | vide';
