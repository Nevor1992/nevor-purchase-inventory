-- ============================================================
-- Yêu cầu liên phòng ban: SLA/escalation + đổi deadline 2 chiều + CEO override.
--   - Mốc thời gian để tính SLA 4 pha (Tiếp nhận → Chốt deadline → Thực hiện
--     → Nghiệm thu). SLA & escalation TỰ TÍNH ở client, không lưu.
--   - deadline_change: đề xuất đổi deadline SAU khi đã chốt (deadline cũ vẫn
--     giữ tới khi bên kia duyệt). ceo_override: CEO điều chỉnh trực tiếp (có
--     lý do + audit trong logs).
--   - acceptance_criteria: tiêu chí nghiệm thu, tách khỏi deliverable.
--   RLS theo dòng của bảng requests đã bao trùm các cột này.
-- ============================================================

alter table requests add column if not exists acceptance_criteria text;
alter table requests add column if not exists received_at   timestamptz;
alter table requests add column if not exists delivered_at  timestamptz;
alter table requests add column if not exists confirmed_at  timestamptz;
alter table requests add column if not exists deadline_change jsonb;
alter table requests add column if not exists ceo_override    jsonb;

comment on column requests.deadline_change is 'Đề xuất đổi deadline sau khi chốt: {proposedDeadline,by,side,reason,impact,at,status}. status pending→approved/rejected.';
comment on column requests.ceo_override is 'CEO điều chỉnh deadline trực tiếp: {by,at,reason,urgency,impact,oldDeadline}.';
