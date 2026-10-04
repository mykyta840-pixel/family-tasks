-- =====================================================================
-- Семейные задания: полная схема базы (таблицы, защита RLS, функции)
-- Запускать ОДИН раз в Supabase -> SQL Editor. При ошибке ничего не применится.
-- =====================================================================

-- ---------- ТАБЛИЦЫ ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Без имени' check (char_length(display_name) between 1 and 40),
  avatar_url text,
  bio text check (char_length(bio) <= 200),
  created_at timestamptz not null default now()
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Роли только parent или child. Нет «главного админа»: оба родителя равны.
-- unique(user_id): один человек состоит только в одной семье (для MVP).
create table public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('parent','child')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id),
  unique (user_id)
);

create table public.family_invites (
  code text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  role text not null check (role in ('parent','child')),
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text check (char_length(description) <= 1000),
  assigned_to uuid not null references public.profiles(id) on delete cascade,
  points int not null check (points between 1 and 10000),
  due_at timestamptz,
  repeat text not null default 'none' check (repeat in ('none','daily','weekdays','weekly','custom')),
  repeat_days smallint[] not null default '{}',   -- для custom: 0=вс ... 6=сб
  priority smallint not null default 0 check (priority in (0,1)),
  status text not null default 'todo' check (status in ('todo','submitted','approved','rejected')),
  reject_reason text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_family_status_idx on public.tasks (family_id, status);
create index tasks_assignee_status_idx on public.tasks (assigned_to, status);

create table public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  reject_reason text
);
-- У задания не может быть двух неразобранных отправок одновременно
create unique index one_pending_submission on public.task_submissions (task_id) where status = 'pending';

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text check (char_length(description) <= 500),
  icon text not null default '🎁',
  cost int not null check (cost between 1 and 100000),
  active boolean not null default true,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  reward_id uuid references public.rewards(id) on delete set null,
  child_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,           -- копия названия на момент запроса
  icon text not null default '🎁',
  cost int not null check (cost > 0),   -- копия цены на момент запроса
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reject_reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
-- Ребёнок не может подать две одинаковые неразобранные заявки
create unique index one_pending_redemption on public.reward_redemptions (child_id, reward_id) where status = 'pending';

-- ЖУРНАЛ БАЛЛОВ. Баланс = сумма записей. Записи только добавляются функциями ниже.
create table public.points_transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null check (amount <> 0),
  kind text not null check (kind in ('task','reward','adjust')),
  title text not null,
  submission_id uuid references public.task_submissions(id) on delete set null,
  redemption_id uuid references public.reward_redemptions(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index points_child_idx on public.points_transactions (child_id, created_at desc);
-- Защита от двойного начисления/списания: одна отправка = максимум одна запись
create unique index points_one_per_submission on public.points_transactions (submission_id) where submission_id is not null;
create unique index points_one_per_redemption on public.points_transactions (redemption_id) where redemption_id is not null;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Баланс каждого ребёнка (считается из журнала)
create view public.child_balances with (security_invoker = true) as
  select child_id, family_id, sum(amount)::int as balance
  from public.points_transactions
  group by child_id, family_id;

-- ---------- ПОМОЩНИКИ ДЛЯ ПРОВЕРКИ ПРАВ ----------
create function public.is_family_member(fid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members where family_id = fid and user_id = auth.uid());
$$;

create function public.is_family_parent(fid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members where family_id = fid and user_id = auth.uid() and role = 'parent');
$$;

create function public.is_family_child(fid uuid, uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members where family_id = fid and user_id = uid and role = 'child');
$$;

create function public.shares_family_with(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_members a join public.family_members b on a.family_id = b.family_id
    where a.user_id = auth.uid() and b.user_id = uid);
$$;

-- ---------- RLS: КТО ЧТО МОЖЕТ ----------
alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.tasks enable row level security;
alter table public.task_submissions enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.points_transactions enable row level security;
alter table public.notifications enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_family_with(id));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy families_select on public.families for select to authenticated using (public.is_family_member(id));
create policy families_update on public.families for update to authenticated
  using (public.is_family_parent(id)) with check (public.is_family_parent(id));

create policy members_select on public.family_members for select to authenticated using (public.is_family_member(family_id));
create policy invites_select on public.family_invites for select to authenticated using (public.is_family_parent(family_id));

-- Задания: родитель видит все в семье, ребёнок только свои. Менять может только родитель.
create policy tasks_select on public.tasks for select to authenticated
  using (public.is_family_parent(family_id) or assigned_to = auth.uid());
create policy tasks_insert on public.tasks for insert to authenticated
  with check (public.is_family_parent(family_id) and public.is_family_child(family_id, assigned_to) and created_by = auth.uid());
create policy tasks_update on public.tasks for update to authenticated
  using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id) and public.is_family_child(family_id, assigned_to));
create policy tasks_delete on public.tasks for delete to authenticated using (public.is_family_parent(family_id));

create policy submissions_select on public.task_submissions for select to authenticated
  using (public.is_family_parent(family_id) or child_id = auth.uid());

create policy rewards_select on public.rewards for select to authenticated using (public.is_family_member(family_id));
create policy rewards_insert on public.rewards for insert to authenticated
  with check (public.is_family_parent(family_id) and created_by = auth.uid());
create policy rewards_update on public.rewards for update to authenticated
  using (public.is_family_parent(family_id)) with check (public.is_family_parent(family_id));
create policy rewards_delete on public.rewards for delete to authenticated using (public.is_family_parent(family_id));

create policy redemptions_select on public.reward_redemptions for select to authenticated
  using (public.is_family_parent(family_id) or child_id = auth.uid());
create policy points_select on public.points_transactions for select to authenticated
  using (public.is_family_parent(family_id) or child_id = auth.uid());

create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

-- ---------- ПРАВА ДОСТУПА К ТАБЛИЦАМ ----------
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
grant insert, update, delete on public.tasks, public.rewards to authenticated;
grant update (display_name, avatar_url, bio) on public.profiles to authenticated;
grant update (name) on public.families to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;
-- Баллы, роли, заявки, отправки: клиенту писать напрямую НЕЛЬЗЯ. Только через функции ниже.

-- ---------- СЛУЖЕБНЫЕ ТРИГГЕРЫ ----------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1), 'Без имени'), 40));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

create function public.notify_parents(p_fid uuid, p_type text, p_title text, p_body text, p_data jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (family_id, user_id, type, title, body, data)
  select p_fid, user_id, p_type, p_title, p_body, p_data
  from public.family_members
  where family_id = p_fid and role = 'parent' and user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
$$;

create function public.notify_user(p_fid uuid, p_uid uuid, p_type text, p_title text, p_body text, p_data jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (family_id, user_id, type, title, body, data)
  values (p_fid, p_uid, p_type, p_title, p_body, p_data);
$$;

create function public.on_task_created() returns trigger
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
create function public.next_due(p_due timestamptz, p_repeat text, p_days smallint[])
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

-- ---------- ФУНКЦИИ-ДЕЙСТВИЯ (атомарные, защищены от двойных нажатий) ----------
create function public.create_family(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_fid uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.family_members where user_id = v_uid) then raise exception 'already_in_family'; end if;
  insert into public.families (name, created_by) values (trim(p_name), v_uid) returning id into v_fid;
  insert into public.family_members (family_id, user_id, role) values (v_fid, v_uid, 'parent');
  return v_fid;
end $$;

create function public.create_invite(p_role text) returns text
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

create function public.join_family(p_code text) returns uuid
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

create function public.remove_child(p_child uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_fid uuid;
begin
  select family_id into v_fid from public.family_members where user_id = auth.uid() and role = 'parent';
  if v_fid is null then raise exception 'not_allowed'; end if;
  delete from public.family_members where family_id = v_fid and user_id = p_child and role = 'child';
end $$;

-- Ребёнок: «Выполнено»
create function public.submit_task(p_task_id uuid) returns void
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
create function public.approve_submission(p_task_id uuid) returns void
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

create function public.reject_submission(p_task_id uuid, p_reason text default null) returns void
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
create function public.request_reward(p_reward_id uuid) returns uuid
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
create function public.approve_redemption(p_id uuid) returns void
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

create function public.reject_redemption(p_id uuid, p_reason text default null) returns void
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
