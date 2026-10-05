-- ЧАСТЬ 7. PUSH-УВЕДОМЛЕНИЯ (запускать ПОСЛЕ 01–06, один раз целиком).
-- Что делает: таблица подписок устройств, кнопка «Напомнить», тест-уведомление и
-- автоматическая отправка push при КАЖДОМ новом уведомлении (новое задание, проверка, награда...).
-- Если что-то здесь не сработает, обычные уведомления внутри приложения продолжат работать.

create extension if not exists pg_net;

-- ---------- ПОДПИСКИ УСТРОЙСТВ ----------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
-- Клиент не читает и не пишет эту таблицу напрямую: только через функции ниже.
revoke all on public.push_subscriptions from anon, authenticated;

-- Сохранить подписку этого устройства (забирает устройство себе, если раньше им пользовался другой аккаунт)
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_ua text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or char_length(p_endpoint) > 2000
     or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'bad_subscription';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
    values (v_uid, p_endpoint, p_p256dh, p_auth, left(p_ua, 300));
  -- не больше 10 устройств на человека (старые удаляются)
  delete from public.push_subscriptions
    where user_id = v_uid and id not in (
      select id from public.push_subscriptions where user_id = v_uid order by created_at desc limit 10);
end $$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void language sql security definer set search_path = '' as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

-- ---------- «НАПОМНИТЬ» РЕБЁНКУ ----------
-- Возвращает, на скольких устройствах ребёнка включён push (0 = увидит только внутри приложения).
create or replace function public.remind_task(p_task_id uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare v_task public.tasks; v_lang text; v_parent text; v_title text; v_body text;
begin
  select * into v_task from public.tasks where id = p_task_id;
  if not found or not public.is_family_parent(v_task.family_id) then raise exception 'not_allowed'; end if;
  if v_task.status not in ('todo', 'rejected') then raise exception 'not_pending'; end if;
  if exists (
    select 1 from public.notifications
    where user_id = v_task.assigned_to and type = 'task_reminder'
      and data->>'task_id' = p_task_id::text and created_at > now() - interval '5 minutes'
  ) then raise exception 'remind_too_soon'; end if;
  select language into v_lang from public.profiles where id = v_task.assigned_to;
  select display_name into v_parent from public.profiles where id = auth.uid();
  v_title := case coalesce(v_lang, 'ru')
    when 'en' then '⏰ Reminder: ' when 'de' then '⏰ Erinnerung: ' when 'uk' then '⏰ Нагадування: '
    else '⏰ Напоминание: ' end || v_task.title;
  v_body := case coalesce(v_lang, 'ru')
    when 'en' then v_parent || ' reminds you about this task. +' || v_task.points || ' ⭐'
    when 'de' then v_parent || ' erinnert dich an die Aufgabe. +' || v_task.points || ' ⭐'
    when 'uk' then v_parent || ' нагадує про завдання. +' || v_task.points || ' ⭐'
    else v_parent || ' напоминает про задание. +' || v_task.points || ' ⭐' end;
  perform public.notify_user(v_task.family_id, v_task.assigned_to, 'task_reminder', v_title, v_body,
    jsonb_build_object('task_id', p_task_id));
  return (select count(*)::int from public.push_subscriptions where user_id = v_task.assigned_to);
end $$;

-- ---------- ТЕСТ-УВЕДОМЛЕНИЕ СЕБЕ ----------
create or replace function public.send_test_notification() returns int
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_fid uuid; v_lang text;
begin
  select family_id into v_fid from public.family_members where user_id = v_uid;
  if v_fid is null then raise exception 'not_allowed'; end if;
  select language into v_lang from public.profiles where id = v_uid;
  perform public.notify_user(v_fid, v_uid, 'push_test',
    case coalesce(v_lang, 'ru') when 'en' then '✅ Notifications work' when 'de' then '✅ Benachrichtigungen funktionieren'
      when 'uk' then '✅ Сповіщення працюють' else '✅ Уведомления работают' end,
    case coalesce(v_lang, 'ru') when 'en' then 'This is a test message.' when 'de' then 'Das ist eine Testnachricht.'
      when 'uk' then 'Це тестове повідомлення.' else 'Это тестовое сообщение.' end,
    '{}'::jsonb);
  return (select count(*)::int from public.push_subscriptions where user_id = v_uid);
end $$;

-- ---------- АВТО-ОТПРАВКА PUSH ПРИ КАЖДОМ НОВОМ УВЕДОМЛЕНИИ ----------
-- Адрес функции и секрет: секрет должен совпадать с PUSH_WEBHOOK_SECRET в Supabase (Edge Functions -> Secrets).
create or replace function public.push_on_notification() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.push_subscriptions where user_id = new.user_id) then
    begin
      perform net.http_post(
        url := 'https://iuyxtwastuvgayreqnoc.supabase.co/functions/v1/send-push',
        headers := jsonb_build_object('Content-Type', 'application/json',
                                      'x-webhook-secret', '9e2e18b11b3a60aef83436e2c26790eb52674cb283fdf120'),
        body := jsonb_build_object('id', new.id),
        timeout_milliseconds := 5000
      );
    exception when others then
      null; -- сбой push никогда не ломает создание уведомления
    end;
  end if;
  return new;
end $$;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push after insert on public.notifications
  for each row execute function public.push_on_notification();

-- ---------- ПРАВА ----------
revoke all on function public.push_on_notification() from public, anon, authenticated;
revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
revoke all on function public.delete_push_subscription(text) from public, anon;
revoke all on function public.remind_task(uuid) from public, anon;
revoke all on function public.send_test_notification() from public, anon;
grant execute on function
  public.save_push_subscription(text, text, text, text),
  public.delete_push_subscription(text),
  public.remind_task(uuid),
  public.send_test_notification()
  to authenticated;

-- КОНЕЦ ЧАСТИ 7
