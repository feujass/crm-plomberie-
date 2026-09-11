-- Renommer l’assistant par défaut Rita → Zeus (nom produit actuel).
alter table public.profiles alter column assistant_name set default 'Zeus';

update public.profiles
set assistant_name = 'Zeus'
where assistant_name is null or trim(assistant_name) = '' or lower(trim(assistant_name)) = 'rita';
