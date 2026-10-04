-- ЧАСТЬ 4 ИЗ 5. Запускайте части строго по порядку.
-- ---------- ФУНКЦИИ-ДЕЙСТВИЯ (атомарные, защищены от двойных нажатий) ----------
create or replace function public.create_family(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_fid uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.family_members where user_id = v_uid) then raise exception 'already_in_family'; end if;
  insert into public.families (name, created_by) values (trim(p_name), v_uid) returning id into v_fid;
  insert into public.family_members (family_id, user_id, role) values (v_fid, v_uid, 'parent');
  return v_fid;
end $$;

create or replace function public.create_invite(p_role text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_fid uuid; v_code text;
begin
  if p_role not in ('parent', 'child') then raise exception 'bad_role'; end if;
  select family_id into v_fid from public.family_members where user_id = auth.uid() and role = 'parent';
  if v_fid is null then raise exception 'not_allowed'; end if;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.family_invites (code, family_id, role, created_by) values (v_code, v_fid, p_role, auth.uid());
  return v_code;
end $$;

create or replace function public.join_family(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_inv public.family_invites; v_name text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.family_members where user_id = v_uid) then raise exception 'already_in_family'; end if;
  select * into v_inv from public.family_invites
    where code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')) for update;
  if not found or v_inv.used_at is not null or v_inv.expires_at < now() then raise exception 'invalid_code'; end if;
  insert into public.family_members (family_id, user_id, role) values (v_inv.family_id, v_uid, v_inv.role);
  update public.family_invites set used_by = v_uid, used_at = now() where code = v_inv.code;
  select display_name into v_name from public.profiles where id = v_uid;
  perform public.notify_parents(v_inv.family_id, 'member_joined', '👋 ' || v_name || ' в семье',
    case when v_inv.role = 'child' then 'Новый ребёнок присоединился.' else 'Второй родитель присоединился.' end,
    jsonb_build_object('user_id', v_uid));
  return v_inv.family_id;
end $$;

create or replace function public.remove_child(p_child uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_fid uuid;
begin
  select family_id into v_fid from public.family_members where user_id = auth.uid() and role = 'parent';
  if v_fid is null then raise exception 'not_allowed'; end if;
  delete from public.family_members where family_id = v_fid and user_id = p_child and role = 'child';
end $$;

-- Ребёнок: «Выполнено»
create or replace function public.submit_task(p_task_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_task public.tasks; v_name text;
begin
  select * into v_task from public.tasks where id = p_task_id for update;
  if not found or v_task.assigned_to <> auth.uid() then raise exception 'not_allowed'; end if;
  if v_task.status not in ('todo', 'rejected') then raise exception 'already_submitted'; end if;
  update public.tasks set status = 'submitted', reject_reason = null where id = p_task_id;
  insert into public.task_submissions (task_id, family_id, child_id) values (p_task_id, v_task.family_id, auth.uid());
  select display_name into v_name from public.profiles where id = auth.uid();
  perform public.notify_parents(v_task.family_id, 'task_submitted', '🔔 ' || v_name || ' выполнил задание',
    '«' || v_task.title || '». Проверьте выполнение.', jsonb_build_object('task_id', p_task_id));
end $$;

-- Родитель: «Подтвердить». Повторное нажатие даёт ошибку not_pending и баллы не начисляет.
create or replace function public.approve_submission(p_task_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_task public.tasks; v_sub public.task_submissions; v_next timestamptz;
begin
  select * into v_task from public.tasks where id = p_task_id for update;
  if not found or not public.is_family_parent(v_task.family_id) then raise exception 'not_allowed'; end if;
  if v_task.status <> 'submitted' then raise exception 'not_pending'; end if;
  select * into v_sub from public.task_submissions where task_id = p_task_id and status = 'pending' for update;
  if not found then raise exception 'not_pending'; end if;
  update public.task_submissions set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now() where id = v_sub.id;
  update public.tasks set status = 'approved' where id = p_task_id;
  insert into public.points_transactions (family_id, child_id, amount, kind, title, submission_id, created_by)
    values (v_task.family_id, v_task.assigned_to, v_task.points, 'task', v_task.title, v_sub.id, auth.uid());
  perform public.notify_user(v_task.family_id, v_task.assigned_to, 'task_approved', '⭐ Отлично! Задание подтверждено',
    '+' || v_task.points || ' ⭐ за «' || v_task.title || '»', jsonb_build_object('task_id', p_task_id));
  if v_task.repeat <> 'none' then
    v_next := public.next_due(coalesce(v_task.due_at, now()), v_task.repeat, v_task.repeat_days);
    insert into public.tasks (family_id, title, description, assigned_to, points, due_at, repeat, repeat_days, priority, created_by)
      values (v_task.family_id, v_task.title, v_task.description, v_task.assigned_to, v_task.points, v_next,
              v_task.repeat, v_task.repeat_days, v_task.priority, auth.uid());
  end if;
end $$;

create or replace function public.reject_submission(p_task_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_task public.tasks;
begin
  select * into v_task from public.tasks where id = p_task_id for update;
  if not found or not public.is_family_parent(v_task.family_id) then raise exception 'not_allowed'; end if;
  if v_task.status <> 'submitted' then raise exception 'not_pending'; end if;
  update public.task_submissions set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
    reject_reason = nullif(trim(p_reason), '') where task_id = p_task_id and status = 'pending';
  update public.tasks set status = 'rejected', reject_reason = nullif(trim(p_reason), '') where id = p_task_id;
  perform public.notify_user(v_task.family_id, v_task.assigned_to, 'task_rejected', '🔁 Нужно доработать',
    '«' || v_task.title || '»' || coalesce(': ' || nullif(trim(p_reason), ''), ''), jsonb_build_object('task_id', p_task_id));
end $$;

-- Ребёнок: «Получить награду»
create or replace function public.request_reward(p_reward_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_r public.rewards; v_bal int; v_pending int; v_name text; v_id uuid;
begin
  select * into v_r from public.rewards where id = p_reward_id;
  if not found or not v_r.active or not public.is_family_child(v_r.family_id, auth.uid()) then raise exception 'not_allowed'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  select coalesce(sum(amount), 0) into v_bal from public.points_transactions where child_id = auth.uid();
  select coalesce(sum(cost), 0) into v_pending from public.reward_redemptions where child_id = auth.uid() and status = 'pending';
  if v_bal - v_pending < v_r.cost then raise exception 'not_enough_points'; end if;
  begin
    insert into public.reward_redemptions (family_id, reward_id, child_id, title, icon, cost)
      values (v_r.family_id, v_r.id, auth.uid(), v_r.title, v_r.icon, v_r.cost) returning id into v_id;
  exception when unique_violation then raise exception 'already_requested';
  end;
  select display_name into v_name from public.profiles where id = auth.uid();
  perform public.notify_parents(v_r.family_id, 'reward_requested', '🎁 ' || v_name || ' хочет награду',
    '«' || v_r.title || '» за ' || v_r.cost || ' ⭐', jsonb_build_object('redemption_id', v_id));
  return v_id;
end $$;

-- Родитель: подтвердить выдачу награды (здесь списываются баллы)
create or replace function public.approve_redemption(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_red public.reward_redemptions; v_bal int;
begin
  select * into v_red from public.reward_redemptions where id = p_id for update;
  if not found or not public.is_family_parent(v_red.family_id) then raise exception 'not_allowed'; end if;
  if v_red.status <> 'pending' then raise exception 'not_pending'; end if;
  perform pg_advisory_xact_lock(hashtext(v_red.child_id::text));
  select coalesce(sum(amount), 0) into v_bal from public.points_transactions where child_id = v_red.child_id;
  if v_bal < v_red.cost then raise exception 'not_enough_points'; end if;
  update public.reward_redemptions set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  insert into public.points_transactions (family_id, child_id, amount, kind, title, redemption_id, created_by)
    values (v_red.family_id, v_red.child_id, -v_red.cost, 'reward', v_red.title, p_id, auth.uid());
  perform public.notify_user(v_red.family_id, v_red.child_id, 'reward_approved', '🎁 Награда одобрена',
    '«' || v_red.title || '». Списано ' || v_red.cost || ' ⭐', jsonb_build_object('redemption_id', p_id));
end $$;

create or replace function public.reject_redemption(p_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_red public.reward_redemptions;
begin
  select * into v_red from public.reward_redemptions where id = p_id for update;
  if not found or not public.is_family_parent(v_red.family_id) then raise exception 'not_allowed'; end if;
  if v_red.status <> 'pending' then raise exception 'not_pending'; end if;
  update public.reward_redemptions set status = 'rejected', reject_reason = nullif(trim(p_reason), ''),
    reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  perform public.notify_user(v_red.family_id, v_red.child_id, 'reward_rejected', '🙅 Награда пока недоступна',
    '«' || v_red.title || '»' || coalesce(': ' || nullif(trim(p_reason), ''), ''), jsonb_build_object('redemption_id', p_id));
end $$;

-- КОНЕЦ ЧАСТИ 4 ИЗ 5
