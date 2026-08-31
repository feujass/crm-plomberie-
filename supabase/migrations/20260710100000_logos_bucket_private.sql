-- Bucket logos privé : lecture limitée au propriétaire (auth.uid).
update storage.buckets set public = false where id = 'logos';

drop policy if exists "logos read" on storage.objects;
drop policy if exists "logos read own" on storage.objects;

create policy "logos read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'logos' and split_part(name, '/', 1) = auth.uid()::text);
