-- ЧАСТЬ 2 ИЗ 5. Запускайте части строго по порядку.
-- ---------- ПОМОЩНИКИ ДЛЯ ПРОВЕРКИ ПРАВ ----------
create or replace function public.is_family_member(fid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members where family_id = fid and user_id = auth.uid());
$$;

create or replace function public.is_family_parent(fid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members where family_id = fid and user_id = auth.uid() and role = 'parent');
$$;

create or replace function public.is_family_child(fid uuid, uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members where family_id = fid and user_id = uid and role = 'child');
$$;

create or replace function public.shares_family_with(uid uuid) returns boolean
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

-- КОНЕЦ ЧАСТИ 2 ИЗ 5
