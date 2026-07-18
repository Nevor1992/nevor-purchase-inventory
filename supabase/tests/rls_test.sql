-- ============================================================
-- NovixWork — RLS test suite (chạy trên Postgres local, xem scripts/test-rls-local.sh)
-- Mô phỏng đúng cơ chế Supabase: mỗi truy vấn chạy dưới role `authenticated`
-- với JWT claim `sub` = id người dùng; RLS là tầng quyết định cuối cùng.
-- Chạy TRONG MỘT TRANSACTION (psql -1) — set_config(..., true) sống theo transaction.
-- ============================================================

create temp table results (ord serial, name text, got text, want text, pass boolean);

-- Đếm số dòng thấy được dưới danh nghĩa user uid
create or replace function run_count(uid uuid, q text) returns bigint
language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute q into n;
  reset role;
  return n;
end $$;

-- Số dòng bị ảnh hưởng bởi UPDATE/DELETE dưới danh nghĩa user uid (RLS ẩn dòng → 0)
create or replace function run_write(uid uuid, q text) returns bigint
language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute q;
  get diagnostics n = row_count;
  reset role;
  return n;
end $$;

-- true nếu câu lệnh bị RLS/quyền từ chối (exception)
create or replace function run_denied(uid uuid, q text) returns boolean
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute q;
  reset role;
  return false;
exception when others then
  return true;
end $$;

create or replace procedure t(p_name text, p_got anyelement, p_want anyelement)
language plpgsql as $$
begin
  insert into results(name, got, want, pass)
  values (p_name, p_got::text, p_want::text, p_got::text = p_want::text);
end $$;

-- ============================================================
-- SEED (chạy bằng superuser — bỏ qua RLS, mô phỏng dữ liệu có sẵn)
-- Dọn sạch trước để file chạy lại được nhiều lần trên cùng DB test.
-- ============================================================

truncate auth.users, audit_log, notifications, comments, request_deadline_proposals,
  requests, task_attachments, task_deadline_history, task_checklist, task_collaborators,
  tasks, recurring_templates, saved_filters, hr_processes, documents, projects, users,
  departments, brands cascade;

insert into brands values ('nevor', 'Nevor', '#111');

insert into departments (id, name, brand_id) values
  ('content', 'Content', 'nevor'),
  ('ecom',    'E-commerce', 'nevor'),
  ('hr',      'Hành chính - Nhân sự', 'nevor');

insert into users (id, email, name, role, dept_id) values
  ('00000000-0000-0000-0000-000000000001', 'ceo@novix.vn',   'CEO',   'ceo',      null),
  ('00000000-0000-0000-0000-000000000002', 'admin@novix.vn', 'Admin', 'admin',    null),
  ('00000000-0000-0000-0000-000000000003', 'linh@novix.vn',  'Linh',  'leader',   'content'),
  ('00000000-0000-0000-0000-000000000004', 'mai@novix.vn',   'Mai',   'employee', 'content'),
  ('00000000-0000-0000-0000-000000000005', 'huy@novix.vn',   'Huy',   'employee', 'ecom'),
  ('00000000-0000-0000-0000-000000000006', 'vy@novix.vn',    'Vy',    'leader',   'hr'),
  ('00000000-0000-0000-0000-000000000007', 'ha@novix.vn',    'Ha',    'leader',   'ecom'),
  ('00000000-0000-0000-0000-000000000008', 'an@novix.vn',    'An',    'employee', 'content');

update departments set leader_id = '00000000-0000-0000-0000-000000000003' where id = 'content';
update departments set leader_id = '00000000-0000-0000-0000-000000000007' where id = 'ecom';
update departments set leader_id = '00000000-0000-0000-0000-000000000006' where id = 'hr';

insert into tasks (id, code, name, creator_id, owner_id, dept_id, visibility, is_confidential, deleted) values
  -- task phòng ban thường (content)
  ('10000000-0000-0000-0000-000000000001', 'T-001', 'Task phòng Content',
   '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'content', 'department', false, false),
  -- task private của Linh (không ai khác involved)
  ('10000000-0000-0000-0000-000000000002', 'T-002', 'Task riêng tư của Linh',
   '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'content', 'private', false, false),
  -- task bảo mật HR (hồ sơ nhân sự)
  ('10000000-0000-0000-0000-000000000003', 'T-003', 'Hồ sơ lương nhân viên',
   '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000006', 'hr', 'department', true, false),
  -- task bảo mật phòng thường (content)
  ('10000000-0000-0000-0000-000000000004', 'T-004', 'Task bảo mật Content',
   '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'content', 'department', true, false),
  -- task đã xoá mềm
  ('10000000-0000-0000-0000-000000000005', 'T-005', 'Task đã xoá',
   '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'content', 'department', false, true),
  -- task nhóm: owner Linh, Mai là collaborator (test checklist)
  ('10000000-0000-0000-0000-000000000006', 'T-006', 'Task nhóm có checklist',
   '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'content', 'department', false, false);

insert into task_collaborators values ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000004');

insert into task_checklist (id, task_id, text, owner_id) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 'Việc của Mai',  '00000000-0000-0000-0000-000000000004'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', 'Việc của Linh', '00000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000006', 'Chưa giao ai',  null);

insert into requests (id, code, title, from_user_id, from_dept_id, to_dept_id, visibility, is_confidential) values
  -- yêu cầu chỉ phòng gửi thấy
  ('30000000-0000-0000-0000-000000000001', 'R-001', 'Yêu cầu nội bộ phòng gửi',
   '00000000-0000-0000-0000-000000000004', 'content', 'ecom', 'SENDER_DEPARTMENT', false),
  -- yêu cầu bảo mật gửi tới HR (nghỉ việc / lương…)
  ('30000000-0000-0000-0000-000000000002', 'R-002', 'Đề xuất điều chỉnh lương',
   '00000000-0000-0000-0000-000000000003', 'content', 'hr', 'BOTH_DEPARTMENTS', true);

insert into notifications (user_id, body) values ('00000000-0000-0000-0000-000000000004', 'Thông báo cho Mai');

insert into audit_log (actor_id, action, entity_type, entity_id)
values ('00000000-0000-0000-0000-000000000002', 'create', 'task', '10000000-0000-0000-0000-000000000001');

-- ============================================================
-- TESTS
-- ============================================================
do $$
declare
  ceo_   uuid := '00000000-0000-0000-0000-000000000001';
  admin_ uuid := '00000000-0000-0000-0000-000000000002';
  linh   uuid := '00000000-0000-0000-0000-000000000003';
  mai    uuid := '00000000-0000-0000-0000-000000000004';
  huy    uuid := '00000000-0000-0000-0000-000000000005';
  vy     uuid := '00000000-0000-0000-0000-000000000006';
  ha     uuid := '00000000-0000-0000-0000-000000000007';
  an     uuid := '00000000-0000-0000-0000-000000000008';
begin
  -- ---- Task: visibility department ----
  call t('task phòng: cùng phòng (An) thấy',        run_count(an,  $q$select count(*) from tasks where code='T-001'$q$), 1::bigint);
  call t('task phòng: khác phòng (Huy) KHÔNG thấy', run_count(huy, $q$select count(*) from tasks where code='T-001'$q$), 0::bigint);
  call t('task phòng: leader phòng khác (Hà) KHÔNG thấy', run_count(ha, $q$select count(*) from tasks where code='T-001'$q$), 0::bigint);
  call t('task phòng: admin thấy',                  run_count(admin_, $q$select count(*) from tasks where code='T-001'$q$), 1::bigint);

  -- ---- Task: private — CHỈ người liên quan, admin/CEO cũng không ----
  call t('task private: owner (Linh) thấy',         run_count(linh, $q$select count(*) from tasks where code='T-002'$q$), 1::bigint);
  call t('task private: cùng phòng (Mai) KHÔNG thấy', run_count(mai, $q$select count(*) from tasks where code='T-002'$q$), 0::bigint);
  call t('task private: admin KHÔNG thấy',          run_count(admin_, $q$select count(*) from tasks where code='T-002'$q$), 0::bigint);
  call t('task private: CEO KHÔNG thấy',            run_count(ceo_, $q$select count(*) from tasks where code='T-002'$q$), 0::bigint);

  -- ---- Task bảo mật HR: admin hệ thống KHÔNG được đọc dữ liệu nhân sự ----
  call t('bảo mật HR: HR leader (Vy) thấy',         run_count(vy, $q$select count(*) from tasks where code='T-003'$q$), 1::bigint);
  call t('bảo mật HR: CEO thấy',                    run_count(ceo_, $q$select count(*) from tasks where code='T-003'$q$), 1::bigint);
  call t('bảo mật HR: ADMIN KHÔNG thấy',            run_count(admin_, $q$select count(*) from tasks where code='T-003'$q$), 0::bigint);
  call t('bảo mật HR: nhân viên (Mai) KHÔNG thấy',  run_count(mai, $q$select count(*) from tasks where code='T-003'$q$), 0::bigint);

  -- ---- Task bảo mật phòng thường ----
  call t('bảo mật Content: owner (Mai) thấy',       run_count(mai, $q$select count(*) from tasks where code='T-004'$q$), 1::bigint);
  call t('bảo mật Content: admin thấy',             run_count(admin_, $q$select count(*) from tasks where code='T-004'$q$), 1::bigint);
  call t('bảo mật Content: cùng phòng không liên quan (An) KHÔNG thấy', run_count(an, $q$select count(*) from tasks where code='T-004'$q$), 0::bigint);

  -- ---- Task đã xoá mềm: chỉ manager/leader phụ trách ----
  call t('task xoá: admin thấy',                    run_count(admin_, $q$select count(*) from tasks where code='T-005'$q$), 1::bigint);
  call t('task xoá: leader phòng (Linh) thấy',      run_count(linh, $q$select count(*) from tasks where code='T-005'$q$), 1::bigint);
  call t('task xoá: owner cũ (Mai) KHÔNG thấy',     run_count(mai, $q$select count(*) from tasks where code='T-005'$q$), 0::bigint);

  -- ---- Task: quyền UPDATE ----
  call t('update task: owner (Mai) sửa được',       run_write(mai, $q$update tasks set name=name where code='T-001'$q$), 1::bigint);
  call t('update task: người ngoài (Huy) KHÔNG sửa được', run_write(huy, $q$update tasks set name=name where code='T-001'$q$), 0::bigint);
  call t('update task: leader phòng (Linh) sửa được', run_write(linh, $q$update tasks set name=name where code='T-001'$q$), 1::bigint);

  -- ---- Task: policy INSERT — creator phải là chính mình ----
  call t('tạo task: creator=mình → được',
    run_denied(mai, $q$insert into tasks (code,name,creator_id,owner_id,dept_id)
      values ('T-INS-1','Task Mai tự tạo','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000004','content')$q$), false);
  call t('tạo task: giả creator người khác → BỊ CHẶN',
    run_denied(mai, $q$insert into tasks (code,name,creator_id,owner_id,dept_id)
      values ('T-INS-2','Task giả mạo','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004','content')$q$), true);

  -- ---- Checklist: collaborator chỉ tick được mục của mình ----
  call t('checklist: Mai tick mục của Mai',         run_write(mai, $q$update task_checklist set done=true  where id='20000000-0000-0000-0000-000000000001'$q$), 1::bigint);
  call t('checklist: Mai KHÔNG tick được mục của Linh', run_write(mai, $q$update task_checklist set done=true where id='20000000-0000-0000-0000-000000000002'$q$), 0::bigint);
  call t('checklist: Mai KHÔNG tick được mục chưa giao', run_write(mai, $q$update task_checklist set done=true where id='20000000-0000-0000-0000-000000000003'$q$), 0::bigint);
  call t('checklist: owner task (Linh) tick mục chưa giao', run_write(linh, $q$update task_checklist set done=true where id='20000000-0000-0000-0000-000000000003'$q$), 1::bigint);

  -- ---- Request: SENDER_DEPARTMENT ----
  call t('req phòng gửi: người gửi (Mai) thấy',     run_count(mai, $q$select count(*) from requests where code='R-001'$q$), 1::bigint);
  call t('req phòng gửi: cùng phòng gửi (An) thấy', run_count(an,  $q$select count(*) from requests where code='R-001'$q$), 1::bigint);
  call t('req phòng gửi: phòng nhận (Huy) KHÔNG thấy', run_count(huy, $q$select count(*) from requests where code='R-001'$q$), 0::bigint);

  -- ---- Request bảo mật: admin hệ thống bị loại ----
  call t('req bảo mật: người gửi (Linh) thấy',      run_count(linh, $q$select count(*) from requests where code='R-002'$q$), 1::bigint);
  call t('req bảo mật: HR leader (Vy) thấy',        run_count(vy, $q$select count(*) from requests where code='R-002'$q$), 1::bigint);
  call t('req bảo mật: CEO thấy',                   run_count(ceo_, $q$select count(*) from requests where code='R-002'$q$), 1::bigint);
  call t('req bảo mật: ADMIN KHÔNG thấy',           run_count(admin_, $q$select count(*) from requests where code='R-002'$q$), 0::bigint);
  call t('req bảo mật: nhân viên cùng phòng (An) KHÔNG thấy', run_count(an, $q$select count(*) from requests where code='R-002'$q$), 0::bigint);

  -- ---- Request: policy INSERT — đúng người, đúng phòng ----
  call t('tạo req: đúng phòng mình → được',
    run_denied(mai, $q$insert into requests (code,title,from_user_id,from_dept_id,to_dept_id)
      values ('R-INS-1','Yêu cầu hợp lệ','00000000-0000-0000-0000-000000000004','content','ecom')$q$), false);
  call t('tạo req: giả phòng khác → BỊ CHẶN',
    run_denied(mai, $q$insert into requests (code,title,from_user_id,from_dept_id,to_dept_id)
      values ('R-INS-2','Yêu cầu giả mạo','00000000-0000-0000-0000-000000000004','ecom','content')$q$), true);

  -- ---- Notifications: chỉ của mình ----
  call t('notif: Mai thấy của mình',                run_count(mai, $q$select count(*) from notifications$q$), 1::bigint);
  call t('notif: Huy không thấy của Mai',           run_count(huy, $q$select count(*) from notifications$q$), 0::bigint);

  -- ---- Users: tự sửa hồ sơ mình, không sửa người khác ----
  call t('users: tự sửa mình → được',               run_write(mai, $q$update users set name=name where email='mai@novix.vn'$q$), 1::bigint);
  call t('users: sửa người khác → 0 dòng',          run_write(mai, $q$update users set name=name where email='linh@novix.vn'$q$), 0::bigint);

  -- ---- Audit log: bất biến, chỉ manager đọc ----
  call t('audit: admin đọc được',                   run_count(admin_, $q$select count(*) from audit_log$q$), 1::bigint);
  call t('audit: nhân viên KHÔNG đọc được',         run_count(mai, $q$select count(*) from audit_log$q$), 0::bigint);
  call t('audit: user thường KHÔNG insert được',    run_denied(linh, $q$insert into audit_log (actor_id,action,entity_type,entity_id)
      values ('00000000-0000-0000-0000-000000000003','create','task','10000000-0000-0000-0000-000000000001')$q$), true);
end $$;

-- audit_log immutable ngay cả với superuser (DDL rule nuốt UPDATE/DELETE)
do $$
declare n bigint;
begin
  update audit_log set reason = 'sửa lịch sử';
  get diagnostics n = row_count;
  call t('audit: UPDATE bị nuốt (rule)', n, 0::bigint);
  delete from audit_log;
  get diagnostics n = row_count;
  call t('audit: DELETE bị nuốt (rule)', n, 0::bigint);
end $$;

-- Trigger auth.users → public.users (tạo tài khoản mới tự có hồ sơ employee)
do $$
declare r users;
begin
  insert into auth.users (email, raw_user_meta_data) values ('newbie@novix.vn', '{"name":"Người Mới"}');
  select * into r from public.users where email = 'newbie@novix.vn';
  call t('trigger auth→users: tạo hồ sơ', coalesce(r.name, '(không có)'), 'Người Mới');
  call t('trigger auth→users: role mặc định employee', coalesce(r.role::text, '(không có)'), 'employee');
end $$;

-- ============================================================
-- KẾT QUẢ
-- ============================================================
select case when pass then 'PASS' else '>>> FAIL' end as kq, name, got, want
from results order by ord;

select count(*) filter (where pass) || '/' || count(*) as "tổng PASS" ,
       count(*) filter (where not pass) as "FAIL"
from results;

-- Thoát lỗi (exit code ≠ 0 với ON_ERROR_STOP) nếu có test fail — cho CI/script.
do $$
declare n int;
begin
  select count(*) into n from results where not pass;
  if n > 0 then raise exception 'RLS TEST FAILED: % test không đạt', n; end if;
end $$;
