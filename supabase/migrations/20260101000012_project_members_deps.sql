-- ============================================================
-- Phase 3: thành viên dự án + phụ thuộc công việc + change request.
--   - projects.members: [{userId,departmentId,projectRole,perms,joinedAt,leftAt}]
--     Vai trò + quyền chi tiết trong dự án (không phải cả phòng tự có quyền).
--   - projects.change_requests: đề xuất thay đổi lớn (mục tiêu/phạm vi/deadline
--     tổng/owner/PM/ngân sách) — CEO duyệt → áp dụng + ghi Decision Log.
--   - projects.budget_reference: tham chiếu ngân sách (chỉ text, không phải kế toán).
--   - tasks.depends_on_task_ids: phụ thuộc; chỉ CẢNH BÁO khi việc trước trễ,
--     không tự đổi deadline việc sau.
--   RLS theo dòng của projects/tasks đã bao trùm các cột JSONB này.
-- ============================================================

alter table projects add column if not exists members         jsonb not null default '[]'::jsonb;
alter table projects add column if not exists change_requests jsonb not null default '[]'::jsonb;
alter table projects add column if not exists budget_reference text;

alter table tasks add column if not exists depends_on_task_ids jsonb not null default '[]'::jsonb;

comment on column projects.members is 'Thành viên dự án: vai trò (PROJECT_OWNER/MANAGER/DEPARTMENT_LEAD/MEMBER/WATCHER/APPROVER) + quyền chi tiết.';
comment on column projects.change_requests is 'Đề xuất thay đổi lớn: {changeType,currentValue,proposedValue,reason,impact,requestedByUserId,approverId,status}.';
comment on column tasks.depends_on_task_ids is 'Danh sách task phụ thuộc trước đó (chỉ cảnh báo, không tự đổi deadline).';
