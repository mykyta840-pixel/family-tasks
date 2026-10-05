-- Миграция 002 (только добавления, ничего не удаляет): картинка задания + язык человека.
-- Запустить один раз в Supabase -> SQL Editor (если спросит про RLS: «Запуск без RLS»).

alter table public.tasks add column if not exists image_url text;

alter table public.profiles add column if not exists language text;
alter table public.profiles drop constraint if exists profiles_language_check;
alter table public.profiles add constraint profiles_language_check check (language is null or language in ('en','de','ru','uk'));

-- Язык меняет сам человек, а язык ребёнка — любой родитель его семьи.
create or replace function public.set_member_language(p_user uuid, p_lang text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_lang not in ('en','de','ru','uk') then raise exception 'bad language'; end if;
  if p_user <> auth.uid() and not exists (
    select 1 from public.family_members m
    where m.user_id = p_user and m.role = 'child' and public.is_family_parent(m.family_id)
  ) then raise exception 'not allowed'; end if;
  update public.profiles set language = p_lang where id = p_user;
end $$;
revoke all on function public.set_member_language(uuid, text) from public, anon;
grant execute on function public.set_member_language(uuid, text) to authenticated;

-- Картинки заданий: читают все (публичная ссылка), загружают только родители в папку <family_id>/
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('task-images', 'task-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists task_images_insert on storage.objects;
drop policy if exists task_images_update on storage.objects;
drop policy if exists task_images_delete on storage.objects;
create policy task_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'task-images' and public.is_family_parent(((storage.foldername(name))[1])::uuid));
create policy task_images_update on storage.objects for update to authenticated
  using (bucket_id = 'task-images' and public.is_family_parent(((storage.foldername(name))[1])::uuid));
create policy task_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'task-images' and public.is_family_parent(((storage.foldername(name))[1])::uuid));
