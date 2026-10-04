-- ЧАСТЬ 3 ИЗ 5. Запускайте части строго по порядку.
-- ---------- СЛУЖЕБНЫЕ ТРИГГЕРЫ ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1), 'Без имени'), 40));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

create or replace function public.notify_parents(p_fid uuid, p_type text, p_title text, p_body text, p_data jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (family_id, user_id, type, title, body, data)
  select p_fid, user_id, p_type, p_title, p_body, p_data
  from public.family_members
  where family_id = p_fid and role = 'parent' and user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
$$;

create or replace function public.notify_user(p_fid uuid, p_uid uuid, p_type text, p_title text, p_body text, p_data jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (family_id, user_id, type, title, body, data)
  values (p_fid, p_uid, p_type, p_title, p_body, p_data);
$$;

create or replace function public.on_task_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (family_id, user_id, type, title, body, data)
  values (new.family_id, new.assigned_to, 'task_new', '🎉 Новое задание: ' || new.title,
          '+' || new.points || ' ⭐', jsonb_build_object('task_id', new.id));
  return new;
end $$;
create trigger tasks_notify after insert on public.tasks
  for each row execute function public.on_task_created();

-- Следующая дата для повторяющегося задания
create or replace function public.next_due(p_due timestamptz, p_repeat text, p_days smallint[])
returns timestamptz language plpgsql stable set search_path = '' as $$
declare
  d timestamptz := p_due;
  i int := 0;
  r text := case when p_repeat = 'custom' and coalesce(cardinality(p_days), 0) = 0 then 'daily' else p_repeat end;
begin
  loop
    i := i + 1;
    d := case when r = 'weekly' then d + interval '7 days' else d + interval '1 day' end;
    exit when i > 800;
    if d > now() then
      if r in ('daily', 'weekly') then exit;
      elsif r = 'weekdays' and extract(isodow from d) between 1 and 5 then exit;
      elsif r = 'custom' and extract(dow from d)::smallint = any (p_days) then exit;
      end if;
    end if;
  end loop;
  return d;
end $$;

-- КОНЕЦ ЧАСТИ 3 ИЗ 5
