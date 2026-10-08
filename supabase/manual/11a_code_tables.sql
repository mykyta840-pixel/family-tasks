-- Миграция 007, ЧАСТЬ 1 ИЗ 3 (этап C): вход в семью только по коду, ребёнок без пароля, код возврата.
-- Запускайте части 11a -> 11b -> 11c строго по порядку (если спросит про RLS: «Запуск без RLS»).
-- Эта часть: две новые служебные таблицы, генератор кодов, новый формат кода FAM-XXXXX,
-- запрет создавать семью анонимному входу. Существующие данные не меняются.

-- Журнал неверных попыток ввода кода (защита от перебора). Клиент к таблице доступа не имеет.
create table if not exists public.code_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  at timestamptz not null default now()
);
create index if not exists code_attempts_user_idx on public.code_attempts (user_id, at desc);
alter table public.code_attempts enable row level security;
revoke all on public.code_attempts from anon, authenticated;

-- Коды возврата: родитель выдаёт ребёнку, у которого пропал вход (новый телефон, очистка браузера).
-- Одноразовые, действуют 48 часов. Клиент к таблице доступа не имеет, всё через функции.
create table if not exists public.child_return_codes (
  code text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default now() + interval '48 hours',
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists child_return_codes_child_idx on public.child_return_codes (child_id);
alter table public.child_return_codes enable row level security;
revoke all on public.child_return_codes from anon, authenticated;

-- Случайная часть кода: символы без похожих (нет 0/O, 1/I/L). Только для внутреннего использования.
create or replace function public._rand_code(p_len int) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  alpha constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  b bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  res text := '';
  i int;
begin
  for i in 0 .. least(p_len, 6) - 1 loop
    res := res || substr(alpha, (get_byte(b, i) % 31) + 1, 1);
  end loop;
  return res;
end $$;
revoke all on function public._rand_code(int) from public, anon, authenticated;

-- Семью может создать только обычный аккаунт (почта + пароль), не анонимный вход ребёнка.
create or replace function public.create_family(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_fid uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'not_allowed'; end if;
  if exists (select 1 from public.family_members where user_id = v_uid) then raise exception 'already_in_family'; end if;
  insert into public.families (name, created_by) values (trim(p_name), v_uid) returning id into v_fid;
  insert into public.family_members (family_id, user_id, role) values (v_fid, v_uid, 'parent');
  return v_fid;
end $$;

-- Новый вид кода приглашения: FAM-7K29X (одноразовый, 7 дней). Старые коды продолжают работать.
create or replace function public.create_invite(p_role text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_fid uuid; v_code text;
begin
  if p_role not in ('parent', 'child') then raise exception 'bad_role'; end if;
  select family_id into v_fid from public.family_members where user_id = auth.uid() and role = 'parent';
  if v_fid is null then raise exception 'not_allowed'; end if;
  loop
    v_code := 'FAM-' || public._rand_code(5);
    exit when not exists (select 1 from public.family_invites where code = v_code);
  end loop;
  insert into public.family_invites (code, family_id, role, created_by) values (v_code, v_fid, p_role, auth.uid());
  return v_code;
end $$;

-- КОНЕЦ ЧАСТИ 1 ИЗ 3
