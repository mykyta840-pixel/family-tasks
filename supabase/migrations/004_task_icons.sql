-- Миграция 004 (этап 1 доработок): встроенные иконки заданий + «кто добавил» при повторах.
-- Только добавления и замена одной функции. Существующие данные не меняются.
-- Запустить один раз в Supabase -> SQL Editor (если спросит про RLS: «Запуск без RLS»).

-- Ключ встроенной иконки задания (например 'dishes'). Старые задания остаются с image_url / без иконки.
alter table public.tasks add column if not exists icon text;
alter table public.tasks drop constraint if exists tasks_icon_check;
alter table public.tasks add constraint tasks_icon_check check (icon is null or char_length(icon) <= 40);

-- Раньше следующее повторяющееся задание получало created_by = родитель, который нажал «Подтвердить».
-- Теперь автор и иконка переходят в следующее задание, поэтому «Добавил: ...» не меняется.
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
    insert into public.tasks (family_id, title, description, assigned_to, points, due_at, repeat, repeat_days, priority, created_by, icon, image_url)
      values (v_task.family_id, v_task.title, v_task.description, v_task.assigned_to, v_task.points, v_next,
              v_task.repeat, v_task.repeat_days, v_task.priority, coalesce(v_task.created_by, auth.uid()), v_task.icon, v_task.image_url);
  end if;
end $$;
revoke all on function public.approve_submission(uuid) from public, anon;
grant execute on function public.approve_submission(uuid) to authenticated;
