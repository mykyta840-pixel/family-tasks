-- ЧАСТЬ 1 ИЗ 5. Запускайте части строго по порядку.
-- =====================================================================
-- Семейные задания: полная схема базы (таблицы, защита RLS, функции)
-- Запускать ОДИН раз в Supabase -> SQL Editor. При ошибке ничего не применится.
-- =====================================================================

-- Очистка на случай повторного запуска (база новая, данных нет)
drop view if exists public.child_balances;
drop table if exists public.notifications, public.points_transactions, public.reward_redemptions,
  public.rewards, public.task_submissions, public.tasks, public.family_invites,
  public.family_members, public.families, public.profiles cascade;

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

-- КОНЕЦ ЧАСТИ 1 ИЗ 5
