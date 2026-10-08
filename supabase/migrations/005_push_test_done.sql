-- Миграция 005 (этап 2 доработок): «тест уведомления пройден» хранится в профиле человека (одно значение на аккаунт,
-- действует на всех устройствах). Только добавления, существующие данные не меняются.
-- Запустить один раз в Supabase -> SQL Editor (если спросит про RLS: «Запуск без RLS»).

alter table public.profiles add column if not exists push_test_done_at timestamptz;

-- Клиент не может писать это поле напрямую (у него есть право менять только имя, фото, «о себе»).
-- Отметить тест пройденным можно только через функцию, и только если этому человеку за последние 10 минут
-- действительно создавали тестовое уведомление.
create or replace function public.mark_push_test_done() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_allowed'; end if;
  if not exists (
    select 1 from public.notifications
    where user_id = auth.uid() and type = 'push_test' and created_at > now() - interval '10 minutes'
  ) then raise exception 'not_allowed'; end if;
  update public.profiles set push_test_done_at = coalesce(push_test_done_at, now()) where id = auth.uid();
end $$;
revoke all on function public.mark_push_test_done() from public, anon;
grant execute on function public.mark_push_test_done() to authenticated;
