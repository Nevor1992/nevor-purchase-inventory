-- ============================================================
-- RLS fixes found by supabase/tests/rls_test.sql (local Postgres run):
--
-- 1. NULL leak on confidential tasks. task_involves_me() compares
--    assigner_id / approver_id (often NULL) with auth.uid(); NULL propagates
--    through the OR-chain, so can_see_confidential() returned NULL instead of
--    FALSE. In can_view_task() the guard branch
--        when t.is_confidential and not can_see_confidential(t) then false
--    then evaluated to NULL (branch skipped) and control fell through to
--        when t.is_confidential then true
--    → confidential tasks (incl. HR records) were readable by ANY user
--    whenever the task had no approver/assigner. coalesce() every helper
--    that can yield NULL so deny is an explicit FALSE.
--
-- 2. Collaborators could not tick their own checklist items. In the policy
--    "task_checklist: toggle own items" the unqualified owner_id inside the
--    tasks-subquery resolved to tasks.owner_id (innermost scope), not
--    task_checklist.owner_id — the collaborator arm never matched.
-- ============================================================

create or replace function is_manager()
returns boolean language sql security definer stable as $$
  select coalesce((select role in ('admin','ceo') from users where id = auth.uid()), false);
$$;

create or replace function is_ceo()
returns boolean language sql security definer stable as $$
  select coalesce((select role = 'ceo' from users where id = auth.uid()), false);
$$;

create or replace function task_involves_me(t tasks)
returns boolean language sql security definer stable as $$
  select coalesce(
       t.owner_id = auth.uid()
    or t.creator_id = auth.uid()
    or t.assigner_id = auth.uid()
    or t.approver_id = auth.uid()
    or auth.uid() = any(t.allowed_viewer_ids), false)
    or exists(select 1 from task_collaborators tc where tc.task_id = t.id and tc.user_id = auth.uid());
$$;

create or replace function can_see_confidential(t tasks)
returns boolean language sql security definer stable as $$
  select task_involves_me(t)
      or case when t.dept_id = 'hr'
              then (is_hr_leader() or is_ceo() or has_hr_confidential_access())
              else is_manager()
         end;
$$;

drop policy if exists "task_checklist: toggle own items" on task_checklist;
create policy "task_checklist: toggle own items" on task_checklist for update using (
  exists(select 1 from tasks t where t.id = task_id and not t.locked and (
    t.owner_id = auth.uid()
    or can_manage_task(t)
    or (task_checklist.owner_id = auth.uid()
        and exists(select 1 from task_collaborators tc where tc.task_id = t.id and tc.user_id = auth.uid()))
  ))
);
