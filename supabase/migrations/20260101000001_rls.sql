-- NovixWork — Row Level Security policies
-- Assumes auth.uid() maps to users.id

alter table users enable row level security;
alter table tasks enable row level security;
alter table task_collaborators enable row level security;
alter table task_checklist enable row level security;
alter table task_deadline_history enable row level security;
alter table task_attachments enable row level security;
alter table requests enable row level security;
alter table request_deadline_proposals enable row level security;
alter table comments enable row level security;
alter table notifications enable row level security;
alter table audit_log enable row level security;
alter table departments enable row level security;
alter table projects enable row level security;
alter table brands enable row level security;
alter table recurring_templates enable row level security;

-- Helper: current user's profile row
create or replace function current_user_profile()
returns users language sql security definer stable as $$
  select * from users where id = auth.uid() limit 1;
$$;

-- Helper: is current user admin or CEO
create or replace function is_manager()
returns boolean language sql security definer stable as $$
  select role in ('admin','ceo') from users where id = auth.uid();
$$;

-- Helper: is current user leader of a dept
create or replace function is_dept_leader(p_dept_id text)
returns boolean language sql security definer stable as $$
  select exists(select 1 from departments where id = p_dept_id and leader_id = auth.uid());
$$;

-- ============================================================
-- BRANDS / DEPARTMENTS / PROJECTS — public read
-- ============================================================

create policy "brands: everyone reads" on brands for select using (true);
create policy "departments: everyone reads" on departments for select using (true);
create policy "projects: members read" on projects for select using (
  is_manager()
  or auth.uid() = owner_id
  or exists(select 1 from users u where u.id = auth.uid() and u.dept_id = any(dept_ids))
);
create policy "projects: admin/ceo mutate" on projects for all using (is_manager());

-- ============================================================
-- USERS — everyone reads basic profile; self/admin edits
-- ============================================================

create policy "users: read all" on users for select using (true);
create policy "users: self update" on users for update using (id = auth.uid());
create policy "users: admin mutate" on users for all using (is_manager());

-- ============================================================
-- TASKS
-- ============================================================

create policy "tasks: visibility" on tasks for select using (
  deleted = false and (
    is_manager()
    or owner_id = auth.uid()
    or creator_id = auth.uid()
    or assigner_id = auth.uid()
    or approver_id = auth.uid()
    or (type = 'personal' and owner_id = auth.uid())
    or (not is_confidential and (
      (visibility = 'BOTH_DEPARTMENTS' and (dept_id = (select dept_id from users where id = auth.uid()) or dept_id = any(co_dept_ids)))
      or (visibility = 'PROJECT' and project_id is not null and exists(
          select 1 from projects p, users u
          where p.id = project_id and u.id = auth.uid() and u.dept_id = any(p.dept_ids)
        ))
      or visibility = 'COMPANY'
    ))
    or (is_confidential and (
      -- confidential: owner/assigner/approver only (already covered above) + HR leaders
      exists(select 1 from departments d where d.id = dept_id and d.leader_id = auth.uid())
      or exists(select 1 from users u where u.id = auth.uid() and u.dept_id in ('hr_nevor','hr_uhero'))
    ))
    or exists(select 1 from task_collaborators tc where tc.task_id = tasks.id and tc.user_id = auth.uid())
  )
);

create policy "tasks: managers see deleted" on tasks for select using (
  deleted = true and is_manager()
);

create policy "tasks: create" on tasks for insert with check (
  auth.uid() is not null
  -- creator must be current user
  and creator_id = auth.uid()
  -- owner must be in same dept or project (enforced in edge function for cross-dept)
);

create policy "tasks: update own or managed" on tasks for update using (
  not locked
  and (
    is_manager()
    or owner_id = auth.uid()
    or assigner_id = auth.uid()
    or approver_id = auth.uid()
    or exists(select 1 from departments d where d.id = dept_id and d.leader_id = auth.uid())
    or exists(select 1 from task_collaborators tc where tc.task_id = id and tc.user_id = auth.uid())
  )
);

create policy "tasks: soft delete managers only" on tasks for update using (
  is_manager()
) with check (deleted = true);

-- ============================================================
-- TASK COLLABORATORS
-- ============================================================

create policy "task_collaborators: read via task" on task_collaborators for select using (
  exists(select 1 from tasks t where t.id = task_id)
);

create policy "task_collaborators: mutate by owner/manager" on task_collaborators for all using (
  is_manager()
  or exists(select 1 from tasks t where t.id = task_id and (t.owner_id = auth.uid() or t.assigner_id = auth.uid()))
  or exists(select 1 from departments d, tasks t where t.id = task_id and d.id = t.dept_id and d.leader_id = auth.uid())
);

-- ============================================================
-- TASK CHECKLIST
-- ============================================================

create policy "task_checklist: read via task" on task_checklist for select using (
  exists(select 1 from tasks t where t.id = task_id)
);

create policy "task_checklist: toggle own items" on task_checklist for update using (
  -- owner_id null = anyone on the task; owner_id set = only that user
  (owner_id is null and exists(
    select 1 from tasks t where t.id = task_id and (
      t.owner_id = auth.uid() or t.assigner_id = auth.uid()
      or exists(select 1 from task_collaborators tc where tc.task_id = t.id and tc.user_id = auth.uid())
    )
  ))
  or owner_id = auth.uid()
  or is_manager()
  or exists(select 1 from tasks t, departments d where t.id = task_id and d.id = t.dept_id and d.leader_id = auth.uid())
);

create policy "task_checklist: mutate by task owner/manager" on task_checklist for all using (
  is_manager()
  or exists(select 1 from tasks t where t.id = task_id and (t.owner_id = auth.uid() or t.assigner_id = auth.uid()))
);

-- ============================================================
-- TASK DEADLINE HISTORY
-- ============================================================

create policy "task_deadline_history: read via task" on task_deadline_history for select using (
  exists(select 1 from tasks t where t.id = task_id)
);
create policy "task_deadline_history: insert via task" on task_deadline_history for insert with check (
  exists(select 1 from tasks t where t.id = task_id)
  and changed_by = auth.uid()
);

-- ============================================================
-- TASK ATTACHMENTS
-- ============================================================

create policy "task_attachments: read via task" on task_attachments for select using (
  exists(select 1 from tasks t where t.id = task_id)
);
create policy "task_attachments: insert collaborators" on task_attachments for insert with check (
  uploaded_by = auth.uid()
  and exists(select 1 from tasks t where t.id = task_id and (
    t.owner_id = auth.uid() or t.creator_id = auth.uid()
    or exists(select 1 from task_collaborators tc where tc.task_id = t.id and tc.user_id = auth.uid())
    or is_manager()
  ))
);

-- ============================================================
-- REQUESTS
-- ============================================================

create policy "requests: visibility" on requests for select using (
  deleted = false and (
    is_manager()
    or from_user_id = auth.uid()
    or receiver_id = auth.uid()
    or handler_id = auth.uid()
    or auth.uid() = any(authorized_sender_ids)
    or (visibility = 'SENDER_DEPARTMENT' and (
      from_dept_id = (select dept_id from users where id = auth.uid())
      or is_dept_leader(from_dept_id)
    ))
    or (visibility = 'BOTH_DEPARTMENTS' and (
      from_dept_id = (select dept_id from users where id = auth.uid())
      or to_dept_id = (select dept_id from users where id = auth.uid())
      or is_dept_leader(from_dept_id)
      or is_dept_leader(to_dept_id)
    ))
    or (visibility = 'PROJECT' and project_id is not null and exists(
      select 1 from projects p, users u
      where p.id = project_id and u.id = auth.uid() and u.dept_id = any(p.dept_ids)
    ))
    or visibility = 'COMPANY'
  )
);

create policy "requests: create sender dept" on requests for insert with check (
  auth.uid() is not null
  and from_user_id = auth.uid()
  and from_dept_id = (select dept_id from users where id = auth.uid())
);

create policy "requests: update parties" on requests for update using (
  is_manager()
  or from_user_id = auth.uid()
  or handler_id = auth.uid()
  or receiver_id = auth.uid()
  or is_dept_leader(from_dept_id)
  or is_dept_leader(to_dept_id)
);

-- ============================================================
-- COMMENTS
-- ============================================================

create policy "comments: read if entity visible" on comments for select using (
  (entity_type = 'task' and exists(select 1 from tasks t where t.id = entity_id))
  or (entity_type = 'request' and exists(select 1 from requests r where r.id = entity_id))
);

create policy "comments: insert self" on comments for insert with check (
  user_id = auth.uid()
);

create policy "comments: update own" on comments for update using (
  user_id = auth.uid()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create policy "notifications: own only" on notifications for select using (user_id = auth.uid());
create policy "notifications: mark read" on notifications for update using (user_id = auth.uid());

-- ============================================================
-- AUDIT LOG — read for managers; insert via service role only
-- ============================================================

create policy "audit_log: managers read" on audit_log for select using (is_manager());
-- Insert done via service-role key in Edge Functions — no user-level insert policy

-- ============================================================
-- RECURRING TEMPLATES
-- ============================================================

create policy "recurring_templates: read dept members" on recurring_templates for select using (
  is_manager()
  or dept_id = (select dept_id from users where id = auth.uid())
  or owner_id = auth.uid()
);
create policy "recurring_templates: mutate owner/manager" on recurring_templates for all using (
  is_manager() or owner_id = auth.uid()
);
