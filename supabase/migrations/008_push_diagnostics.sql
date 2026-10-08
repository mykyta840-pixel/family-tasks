-- Этап D: диагностика push (необязательно, ничего не меняет в работе приложения).
-- Запускать в Supabase -> SQL Editor. Функцию клиент вызвать не может: права только у владельца базы (вы в SQL Editor).
-- Использование: select public.push_diagnostics();  -> прислать результат целиком, если push не приходят.

create or replace function public.push_diagnostics() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_ext boolean; v_trg boolean; v_resp jsonb := '[]'::jsonb;
begin
  select exists (select 1 from pg_extension where extname = 'pg_net') into v_ext;
  select exists (select 1 from pg_trigger where tgname = 'notifications_push' and not tgisinternal) into v_trg;
  -- Последние ответы функции send-push (сюда попадает то, что она вернула базе)
  begin
    execute $q$
      select coalesce(jsonb_agg(r), '[]'::jsonb) from (
        select id, status_code, left(content, 300) as content, left(error_msg, 200) as error_msg, created
        from net._http_response order by created desc limit 10) r
    $q$ into v_resp;
  exception when others then
    v_resp := jsonb_build_array(jsonb_build_object('note', 'не удалось прочитать net._http_response', 'msg', sqlerrm));
  end;
  return jsonb_build_object(
    'pg_net_installed', v_ext,
    'trigger_notifications_push', v_trg,
    'subscriptions_total', (select count(*) from public.push_subscriptions),
    'subscriptions_by_user', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select p.display_name as name, count(*) as devices, max(s.created_at) as last_saved,
               left(max(s.user_agent), 60) as ua
        from public.push_subscriptions s join public.profiles p on p.id = s.user_id group by p.display_name) x),
    'last_notifications', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select type, created_at from public.notifications order by created_at desc limit 5) x),
    'last_function_responses', v_resp
  );
end $$;
revoke all on function public.push_diagnostics() from public, anon, authenticated;
