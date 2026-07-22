-- ============================================================
-- Quản lý dự án: Milestone + Decision Log + Forecast + Project Manager.
--   - Lưu milestones & decisions dạng JSONB trên bảng projects (giống 'issues'
--     đã có), nên tự đồng bộ qua projectToRow — không cần bảng phụ, không cần
--     RLS mới (RLS theo dòng của projects đã bao trùm các cột này).
--   - manager_id: người điều phối (PM) — tách khỏi owner_id (người chịu mục tiêu).
--   - forecast_deadline: dự báo hoàn thành thực tế (khác deadline kế hoạch) →
--     dùng để tính Project Health tự động (AT_RISK khi forecast > planned).
--   - Sức khỏe dự án (ON_TRACK/AT_RISK/OFF_TRACK) KHÔNG lưu DB: luôn tính lại
--     ở client từ blocker/milestone/task/request để không bao giờ lệch thực tế.
-- ============================================================

alter table projects add column if not exists manager_id       uuid references users(id);
alter table projects add column if not exists forecast_deadline date;
alter table projects add column if not exists milestones        jsonb not null default '[]'::jsonb;
alter table projects add column if not exists decisions         jsonb not null default '[]'::jsonb;

comment on column projects.milestones is 'Mốc lớn của dự án (id,name,ownerId,approverId,plannedDeadline,status,weight,expectedOutput,acceptanceCriteria,relatedTaskIds,actualCompletedAt).';
comment on column projects.decisions  is 'Decision Log — append-only. Đổi quyết định cũ = thêm bản mới có supersedesId.';
comment on column projects.forecast_deadline is 'Dự báo hoàn thành thực tế; nếu trễ hơn deadline kế hoạch → dự án AT_RISK.';

-- Ghi dự án: ngoài admin/ceo (policy cũ), cho phép Owner / PM ghi dự án của mình
-- (persist milestone/decision/change_request qua projectToRow). Quyền theo
-- thành viên (members) bổ sung ở migration 000012 sau khi có cột members.
drop policy if exists "projects: owner or manager mutate" on projects;
create policy "projects: owner or manager mutate" on projects for all
  to authenticated
  using (owner_id = auth.uid() or manager_id = auth.uid())
  with check (owner_id = auth.uid() or manager_id = auth.uid());
