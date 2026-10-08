-- Миграция 007, ЧАСТЬ 3 ИЗ 3 (этап C): загружать фото профиля могут только участники семьи.
-- Нужно потому, что после включения анонимных входов «аккаунт» может создать кто угодно, а право класть файлы
-- в хранилище не должно быть у человека, который не состоит ни в какой семье.
-- Запускать после 11b (если спросит про RLS: «Запуск без RLS»). Фото родителей и детей работают как раньше.

drop policy if exists avatars_insert_own on storage.objects;
drop policy if exists avatars_update_own on storage.objects;

create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.family_members where user_id = auth.uid())
  );
create policy avatars_update_own on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.family_members where user_id = auth.uid())
  );

-- КОНЕЦ ЧАСТИ 3 ИЗ 3
