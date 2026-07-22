-- ============================================================
-- Đồng bộ ràng buộc projects.status với app.
--   App dùng: prep · active · paused · done · cancelled (PROJECT_STATUSES).
--   Schema gốc chỉ cho: active · paused · done · archived → tạo dự án mới
--   (mặc định 'prep') BỊ CHẶN ở chế độ live. Nới check để nhận đủ trạng thái
--   app dùng (giữ 'archived' để không phá dữ liệu cũ nếu có).
-- ============================================================

alter table projects drop constraint if exists projects_status_check;
alter table projects add constraint projects_status_check
  check (status in ('prep', 'active', 'paused', 'done', 'cancelled', 'archived'));
