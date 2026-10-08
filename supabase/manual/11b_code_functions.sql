-- Миграция 007, ЧАСТЬ 2 ИЗ 3 (этап C): проверка кода, вход по коду, код возврата.
-- Запускать после 11a (если спросит про RLS: «Запуск без RLS»).

-- 1) Проверка кода ДО входа в семью: что это за код (приглашение ребёнка/родителя или код возврата).
--    Неверная попытка записывается; после 8 неверных за 10 минут вход по коду на время закрывается.
create or replace function public.check_invite(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_norm text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_inv public.family_invites;
  v_ret public.child_return_codes;
  v_fname text;
  v_cname text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.family_members where user_id = v_uid) then raise exception 'already_in_family'; end if;
  if (select count(*) from public.code_attempts where user_id = v_uid and at > now() - interval '10 minutes') >= 8 then
    return jsonb_build_object('ok', false, 'reason', 'too_many');
  end if;

  if left(v_norm, 3) = 'RET' then
    select * into v_ret from public.child_return_codes
      where replace(code, '-', '') = v_norm and used_at is null and expires_at > now();
    if found then
      select display_name into v_cname from public.profiles where id = v_ret.child_id;
      return jsonb_build_object('ok', true, 'kind', 'return', 'child', coalesce(v_cname, ''));
    end if;
  else
    select * into v_inv from public.family_invites
      where replace(code, '-', '') = v_norm and used_at is null and expires_at > now();
    if found then
      select name into v_fname from public.families where id = v_inv.family_id;
      return jsonb_build_object('ok', true, 'kind', 'invite', 'role', v_inv.role, 'family', coalesce(v_fname, ''));
    end if;
  end if;

  insert into public.code_attempts (user_id) values (v_uid);
  delete from public.code_attempts where at < now() - interval '1 day';
  return jsonb_build_object('ok', false, 'reason', 'invalid');
end $$;

-- 2) Вход в семью по коду приглашения. Ребёнок: только имя (p_name), без пароля.
--    Анонимный вход может принять ТОЛЬКО код ребёнка: роль родителя без почты и пароля невозможна.
create or replace function public.join_with_code(p_code text, p_name text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_norm text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_anon boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  v_inv public.family_invites;
  v_name text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.family_members where user_id = v_uid) then raise exception 'already_in_family'; end if;
  if (select count(*) from public.code_attempts where user_id = v_uid and at > now() - interval '10 minutes') >= 8 then
    return jsonb_build_object('ok', false, 'reason', 'too_many');
  end if;

  select * into v_inv from public.family_invites
    where replace(code, '-', '') = v_norm and used_at is null and expires_at > now()
    for update;
  if not found then
    insert into public.code_attempts (user_id) values (v_uid);
    delete from public.code_attempts where at < now() - interval '1 day';
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if v_inv.role = 'parent' and v_anon then raise exception 'parent_needs_account'; end if;

  if p_name is not null then
    v_name := btrim(p_name);
    if char_length(v_name) < 1 or char_length(v_name) > 40 then raise exception 'bad_name'; end if;
    update public.profiles set display_name = v_name where id = v_uid;
  end if;

  insert into public.family_members (family_id, user_id, role) values (v_inv.family_id, v_uid, v_inv.role);
  update public.family_invites set used_by = v_uid, used_at = now() where code = v_inv.code;
  select display_name into v_name from public.profiles where id = v_uid;
  perform public.notify_parents(v_inv.family_id, 'member_joined', '👋 ' || coalesce(v_name, '') || ' в семье',
    case when v_inv.role = 'child' then 'Новый ребёнок присоединился.' else 'Второй родитель присоединился.' end,
    jsonb_build_object('user_id', v_uid));
  return jsonb_build_object('ok', true, 'role', v_inv.role);
end $$;

-- 3) Родитель выдаёт код возврата для ребёнка своей семьи. Прежний неиспользованный код этого ребёнка гаснет.
create or replace function public.create_return_code(p_child uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_fid uuid; v_code text;
begin
  select family_id into v_fid from public.family_members where user_id = auth.uid() and role = 'parent';
  if v_fid is null then raise exception 'not_allowed'; end if;
  if not exists (select 1 from public.family_members where family_id = v_fid and user_id = p_child and role = 'child') then
    raise exception 'not_allowed';
  end if;
  delete from public.child_return_codes where child_id = p_child;
  loop
    v_code := 'RET-' || public._rand_code(6);
    exit when not exists (select 1 from public.child_return_codes where code = v_code);
  end loop;
  insert into public.child_return_codes (code, family_id, child_id, created_by) values (v_code, v_fid, p_child, auth.uid());
  return v_code;
end $$;

-- 4) Ребёнок на новом устройстве (новый анонимный вход) вводит код возврата: ВСЕ данные прежнего профиля
--    (участие в семье, задания, баллы, заявки на награды, уведомления, имя, фото, язык) переходят к новому входу.
--    Прежний вход удаляется, код перестаёт существовать (одноразовый).
create or replace function public.redeem_return_code(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_norm text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_anon boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  v_ret public.child_return_codes;
  v_old uuid;
  v_name text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not v_anon then raise exception 'not_allowed'; end if;
  if exists (select 1 from public.family_members where user_id = v_uid) then raise exception 'already_in_family'; end if;
  if (select count(*) from public.code_attempts where user_id = v_uid and at > now() - interval '10 minutes') >= 8 then
    return jsonb_build_object('ok', false, 'reason', 'too_many');
  end if;

  select * into v_ret from public.child_return_codes
    where replace(code, '-', '') = v_norm and used_at is null and expires_at > now()
    for update;
  if not found or not exists (
    select 1 from public.family_members where family_id = v_ret.family_id and user_id = v_ret.child_id and role = 'child'
  ) then
    insert into public.code_attempts (user_id) values (v_uid);
    delete from public.code_attempts where at < now() - interval '1 day';
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  v_old := v_ret.child_id;
  if v_old = v_uid then raise exception 'not_allowed'; end if;

  -- Профиль нового входа создаёт триггер; на случай, если его нет, создаём
  insert into public.profiles (id) values (v_uid) on conflict (id) do nothing;

  -- Переносим всё, что принадлежит прежнему профилю ребёнка
  update public.family_members set user_id = v_uid where user_id = v_old;
  update public.tasks set assigned_to = v_uid where assigned_to = v_old;
  update public.task_submissions set child_id = v_uid where child_id = v_old;
  update public.points_transactions set child_id = v_uid where child_id = v_old;
  update public.reward_redemptions set child_id = v_uid where child_id = v_old;
  update public.notifications set user_id = v_uid where user_id = v_old;
  delete from public.push_subscriptions where user_id = v_old; -- подписки старого устройства больше не нужны

  update public.profiles p
    set display_name = o.display_name, avatar_url = o.avatar_url, bio = o.bio, language = o.language
    from public.profiles o
    where p.id = v_uid and o.id = v_old;

  -- Прежний вход больше не нужен: удаляем (вместе с профилем и кодом возврата). Если удалить вход не вышло,
  -- удаляем хотя бы профиль: на работу семьи это не влияет.
  begin
    delete from auth.users where id = v_old;
  exception when others then
    delete from public.profiles where id = v_old;
  end;

  select display_name into v_name from public.profiles where id = v_uid;
  perform public.notify_parents(v_ret.family_id, 'member_returned', '🔑 ' || coalesce(v_name, '') || ': вход с нового устройства',
    'Ребёнок вернулся в профиль по коду возврата.', jsonb_build_object('user_id', v_uid));
  return jsonb_build_object('ok', true);
end $$;

-- ---------- ПРАВА ----------
revoke all on function public.check_invite(text) from public, anon;
revoke all on function public.join_with_code(text, text) from public, anon;
revoke all on function public.create_return_code(uuid) from public, anon;
revoke all on function public.redeem_return_code(text) from public, anon;
grant execute on function
  public.check_invite(text),
  public.join_with_code(text, text),
  public.create_return_code(uuid),
  public.redeem_return_code(text)
  to authenticated;

-- Старый вход по коду без защиты от перебора больше не нужен: закрываем его.
revoke execute on function public.join_family(text) from public, anon, authenticated;

-- КОНЕЦ ЧАСТИ 2 ИЗ 3
