-- ЧАСТЬ 5 ИЗ 5. Запускайте части строго по порядку.
-- ---------- ПРАВА НА ФУНКЦИИ ----------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.is_family_member(uuid), public.is_family_parent(uuid), public.is_family_child(uuid, uuid),
  public.shares_family_with(uuid),
  public.create_family(text), public.create_invite(text), public.join_family(text), public.remove_child(uuid),
  public.submit_task(uuid), public.approve_submission(uuid), public.reject_submission(uuid, text),
  public.request_reward(uuid), public.approve_redemption(uuid), public.reject_redemption(uuid, text)
  to authenticated;

-- ---------- REALTIME ----------
do $$
declare t text;
begin
  foreach t in array array['tasks','task_submissions','points_transactions','rewards','reward_redemptions','notifications','family_members','profiles']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------- ФОТОГРАФИИ ПРОФИЛЯ (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists avatars_insert_own on storage.objects;
drop policy if exists avatars_update_own on storage.objects;
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- КОНЕЦ ЧАСТИ 5 ИЗ 5
