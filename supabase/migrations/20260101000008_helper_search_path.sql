-- ============================================================
-- Cố định search_path cho các hàm SECURITY DEFINER của tầng RLS.
--
-- Lý do: các hàm này gọi lẫn nhau và tham chiếu bảng public (users,
-- departments, task_collaborators…) KHÔNG kèm schema. Khi được gọi từ một
-- policy ở schema khác — điển hình là Storage RLS (search_path = 'storage')
-- — các tham chiếu không phân giải được → hàm lỗi → policy chặn nhầm.
-- Thêm `set search_path = public` khiến hàm luôn phân giải đúng bất kể
-- ngữ cảnh gọi, đồng thời chặn tấn công search_path (best practice cho
-- SECURITY DEFINER). auth.uid() vẫn phân giải vì đã kèm schema 'auth'.
-- Giữ nguyên logic + các bản vá null-safe ở migration 000004.
-- ============================================================

create or replace function current_user_profile()
returns users language sql security definer stable set search_path = public as $$
  select * from users where id = auth.uid() limit 1;
$$;

create or replace function is_manager()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select role in ('admin','ceo') from users where id = auth.uid()), false);
$$;

create or replace function is_dept_leader(p_dept_id text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from departments d
    where d.id = p_dept_id
      and (
        d.leader_id = auth.uid()
        or exists(select 1 from departments p where p.id = d.parent_dept_id and p.leader_id = auth.uid())
      )
  );
$$;

create or replace function is_ceo()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select role = 'ceo' from users where id = auth.uid()), false);
$$;

create or replace function is_hr_leader()
returns boolean language sql security definer stable set search_path = public as $$
  select exists(select 1 from departments where id = 'hr' and leader_id = auth.uid());
$$;

create or replace function has_hr_confidential_access()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select hr_confidential_access from users where id = auth.uid()), false);
$$;

create or replace function task_involves_me(t tasks)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(
       t.owner_id = auth.uid()
    or t.creator_id = auth.uid()
    or t.assigner_id = auth.uid()
    or t.approver_id = auth.uid()
    or auth.uid() = any(t.allowed_viewer_ids), false)
    or exists(select 1 from task_collaborators tc where tc.task_id = t.id and tc.user_id = auth.uid());
$$;

create or replace function can_manage_task(t tasks)
returns boolean language sql security definer stable set search_path = public as $$
  select is_manager()
      or is_dept_leader(t.dept_id)
      or (t.project_id is not null and exists(
            select 1 from projects p where p.id = t.project_id and p.owner_id = auth.uid()));
$$;

create or replace function can_see_confidential(t tasks)
returns boolean language sql security definer stable set search_path = public as $$
  select task_involves_me(t)
      or case when t.dept_id = 'hr'
              then (is_hr_leader() or is_ceo() or has_hr_confidential_access())
              else is_manager()
         end;
$$;

create or replace function can_view_task(t tasks)
returns boolean language sql security definer stable set search_path = public as $$
  select case
    when t.is_confidential and not can_see_confidential(t) then false
    when t.deleted then can_manage_task(t)
    when t.is_confidential then true
    when t.visibility = 'private' then task_involves_me(t)
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
    else
      task_involves_me(t)
      or t.dept_id = (select dept_id from users where id = auth.uid())
      or (select dept_id from users where id = auth.uid()) = any(t.co_dept_ids)
      or is_dept_leader(t.dept_id)
  end;
$$;
