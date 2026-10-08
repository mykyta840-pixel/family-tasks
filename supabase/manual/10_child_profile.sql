-- Миграция 006 (этап 3 доработок): родитель может менять имя и фото ребёнка своей семьи.
-- Только добавления: существующие данные и права не меняются.
-- Запустить один раз в Supabase -> SQL Editor (если спросит про RLS: «Запуск без RLS»).

-- 1) Функция: родитель меняет имя и/или фото ребёнка той же семьи.
--    p_name = null -> имя не трогаем. p_set_avatar = true -> ставим p_avatar_url (null = убрать фото).
create or replace function public.update_child_profile(
  p_child uuid, p_name text default null, p_set_avatar boolean default false, p_avatar_url text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  if auth.uid() is null then raise exception 'not_allowed'; end if;
  if not exists (
    select 1 from public.family_members m
    where m.user_id = p_child and m.role = 'child' and public.is_family_parent(m.family_id)
  ) then raise exception 'not_allowed'; end if;

  if p_name is not null then
    v_name := btrim(p_name);
    if char_length(v_name) < 1 or char_length(v_name) > 40 then raise exception 'bad_name'; end if;
    update public.profiles set display_name = v_name where id = p_child;
  end if;

  if p_set_avatar then
    if p_avatar_url is not null and (
      char_length(p_avatar_url) > 500
      or position('/avatars/' || p_child::text || '/' in p_avatar_url) = 0
    ) then raise exception 'bad_avatar'; end if;
    update public.profiles set avatar_url = p_avatar_url where id = p_child;
  end if;
end $$;
revoke all on function public.update_child_profile(uuid, text, boolean, text) from public, anon;
grant execute on function public.update_child_profile(uuid, text, boolean, text) to authenticated;

-- 2) Хранилище фото: родитель может класть/заменять/удалять фото ребёнка своей семьи (папка <id ребёнка>/).
--    Свои фото каждый по-прежнему меняет сам. Фото публичные, поэтому право «читать список» безопасно.
drop policy if exists avatars_select_own on storage.objects;
drop policy if exists avatars_select_parent on storage.objects;
drop policy if exists avatars_insert_parent on storage.objects;
drop policy if exists avatars_update_parent on storage.objects;
drop policy if exists avatars_delete_parent on storage.objects;

create policy avatars_select_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_select_parent on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and exists (
    select 1 from public.family_members c
    where c.user_id::text = (storage.foldername(name))[1] and c.role = 'child' and public.is_family_parent(c.family_id)));

create policy avatars_insert_parent on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and exists (
    select 1 from public.family_members c
    where c.user_id::text = (storage.foldername(name))[1] and c.role = 'child' and public.is_family_parent(c.family_id)));

create policy avatars_update_parent on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and exists (
    select 1 from public.family_members c
    where c.user_id::text = (storage.foldername(name))[1] and c.role = 'child' and public.is_family_parent(c.family_id)));

create policy avatars_delete_parent on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and exists (
    select 1 from public.family_members c
    where c.user_id::text = (storage.foldername(name))[1] and c.role = 'child' and public.is_family_parent(c.family_id)));
