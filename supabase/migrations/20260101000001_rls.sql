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

-- Helper: is current user leader of a dept — OR leader of its parent dept
-- (Growth leader manages sub-teams like Booking KOC / Affiliate).
create or replace function is_dept_leader(p_dept_id text)
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from departments d
    where d.id = p_dept_id
      and (
        d.leader_id = auth.uid()
        or exists(select 1 from departments p where p.id = d.parent_dept_id and p.leader_id = auth.uid())
      )
  );
$$;

-- Helper: is current user the CEO
create or replace function is_ceo()
returns boolean language sql security definer stable as $$
  select role = 'ceo' from users where id = auth.uid();
$$;

-- Helper: is current user the HR department leader
create or replace function is_hr_leader()
returns boolean language sql security definer stable as $$
  select exists(select 1 from departments where id = 'hr' and leader_id = auth.uid());
$$;

-- Helper: does the current user have the (separate) HR-confidential access flag.
-- Deliberately NOT the system-admin role — a technical admin has no HR data access.
create or replace function has_hr_confidential_access()
returns boolean language sql security definer stable as $$
  select coalesce((select hr_confidential_access from users where id = auth.uid()), false);
$$;

-- Helper: is current user "involved" in a task (mirrors JS involved())
--   owner / creator / assigner / approver / collaborator / explicit allowed viewer
create or replace function task_involves_me(t tasks)
returns boolean language sql security definer stable as $$
  select t.owner_id = auth.uid()
      or t.creator_id = auth.uid()
      or t.assigner_id = auth.uid()
      or t.approver_id = auth.uid()
      or auth.uid() = any(t.allowed_viewer_ids)
      or exists(select 1 from task_collaborators tc where tc.task_id = t.id and tc.user_id = auth.uid());
$$;

-- Helper: can current user manage the task (mirrors JS canManage())
create or replace function can_manage_task(t tasks)
returns boolean language sql security definer stable as $$
  select is_manager()
      or is_dept_leader(t.dept_id)
      or (t.project_id is not null and exists(
            select 1 from projects p where p.id = t.project_id and p.owner_id = auth.uid()));
$$;

-- Helper: may the current user see the confidential task t (mirrors canSeeConfidential()):
--   HR-dept task  → HR leader / CEO / hr_confidential_access flag (NOT system admin)
--   non-HR task   → system managers (admin/ceo) only, not dept members
create or replace function can_see_confidential(t tasks)
returns boolean language sql security definer stable as $$
  select task_involves_me(t)
      or case when t.dept_id = 'hr'
              then (is_hr_leader() or is_ceo() or has_hr_confidential_access())
              else is_manager()
         end;
$$;

-- Master task-visibility function — mirrors perms.view() in App.jsx exactly.
create or replace function can_view_task(t tasks)
returns boolean language sql security definer stable as $$
  select case
    -- confidential gate applies even to deleted rows: deletion never widens access.
    -- HR-dept confidential excludes the system admin (see can_see_confidential).
    when t.is_confidential and not can_see_confidential(t) then false
    -- deleted → only managers (and confidential gate above already satisfied)
    when t.deleted then can_manage_task(t)
    -- confidential and passed the gate → visible
    when t.is_confidential then true
    -- private → strictly the involved set (managers NOT auto-granted, matching JS order)
    when t.visibility = 'private' then task_involves_me(t)
    -- managers see all remaining non-private, non-confidential tasks
    when is_manager() then true
    when t.visibility = 'company' then true
    when t.visibility = 'project' then (
      task_involves_me(t)
      or (t.project_id is not null and exists(
            select 1 from projects p where p.id = t.project_id and (
              p.owner_id = auth.uid()
              or auth.uid() = any(p.watcher_ids)
              or exists(select 1 from users u where u.id = auth.uid() and u.dept_id = any(p.dept_ids))
            )))
      or is_dept_leader(t.dept_id)
    )
    else -- 'department'
      task_involves_me(t)
      or t.dept_id = (select dept_id from users where id = auth.uid())
      or (select dept_id from users where id = auth.uid()) = any(t.co_dept_ids)
      or is_dept_leader(t.dept_id)
  end;
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

-- Single SELECT policy delegating to can_view_task(), which mirrors perms.view()
-- in App.jsx (confidential gate, deleted-row managers-only, private/project/
-- department/company visibility). Keeping one source of truth avoids drift
-- between the client permission layer and the database.
create policy "tasks: visibility" on tasks for select using (
  can_view_task(tasks)
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
  exists(select 1 from tasks t where t.id = task_id and can_view_task(t))
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
  exists(select 1 from tasks t where t.id = task_id and can_view_task(t))
);

-- Mirrors perms.canToggleChecklistItem: task must be unlocked; task owner and
-- managers may toggle any item; a collaborator may toggle ONLY items assigned to
-- them (owner_id = their id). Unassigned (owner_id null) items are reserved for
-- the task owner/manager — collaborators cannot toggle them.
create policy "task_checklist: toggle own items" on task_checklist for update using (
  exists(select 1 from tasks t where t.id = task_id and not t.locked and (
    t.owner_id = auth.uid()
    or can_manage_task(t)
    or (owner_id = auth.uid()
        and exists(select 1 from task_collaborators tc where tc.task_id = t.id and tc.user_id = auth.uid()))
  ))
);

create policy "task_checklist: mutate by task owner/manager" on task_checklist for all using (
  is_manager()
  or exists(select 1 from tasks t where t.id = task_id and (t.owner_id = auth.uid() or t.assigner_id = auth.uid()))
);

-- ============================================================
-- TASK DEADLINE HISTORY
-- ============================================================

create policy "task_deadline_history: read via task" on task_deadline_history for select using (
  exists(select 1 from tasks t where t.id = task_id and can_view_task(t))
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

-- Mirrors canViewRequest() in App.jsx.
create policy "requests: visibility" on requests for select using (
  case
    when deleted then is_manager()          -- deleted → managers only
    -- direct parties always see it (any visibility, incl. confidential / PRIVATE)
    when from_user_id = auth.uid()
      or receiver_id = auth.uid()
      or handler_id = auth.uid()
      or auth.uid() = any(authorized_sender_ids)
      or auth.uid() = any(allowed_viewer_ids) then true
    -- confidential requests: CEO + both-dept leaders + HR access — NOT the system admin
    when is_confidential then (
      is_ceo()
      or is_dept_leader(from_dept_id)
      or is_dept_leader(to_dept_id)
      or (to_dept_id = 'hr' and (is_hr_leader() or has_hr_confidential_access()))
    )
    when is_manager() then true             -- non-confidential: managers see everything
    when visibility = 'PRIVATE' then false
    when visibility = 'SENDER_DEPARTMENT' then (
      from_dept_id = (select dept_id from users where id = auth.uid())
      or is_dept_leader(from_dept_id)
    )
    when visibility = 'BOTH_DEPARTMENTS' then (
      from_dept_id = (select dept_id from users where id = auth.uid())
      or to_dept_id = (select dept_id from users where id = auth.uid())
      or is_dept_leader(from_dept_id)
      or is_dept_leader(to_dept_id)
    )
    when visibility = 'PROJECT' then (
      case when project_id is not null then exists(
        select 1 from projects p where p.id = project_id and (
          p.owner_id = auth.uid()
          or auth.uid() = any(p.watcher_ids)
          or exists(select 1 from users u where u.id = auth.uid() and u.dept_id = any(p.dept_ids))
        ))
      else
        from_dept_id = (select dept_id from users where id = auth.uid())
        or to_dept_id = (select dept_id from users where id = auth.uid())
      end
    )
    when visibility = 'COMPANY' then true
    else false
  end
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
