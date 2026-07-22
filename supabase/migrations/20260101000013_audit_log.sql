-- ============================================================
-- Phase 4: nối bảng audit_log CÓ SẴN (000000_init) cho audit tầng ứng dụng.
--   Bảng audit_log đã tồn tại + RLS "managers read" (000001) + rule chống
--   sửa/xóa (append-only). Ở đây chỉ mở rộng cho nhu cầu app:
--     - action: enum → text (nhận nhãn hành động tiếng Việt tự do).
--     - entity_id: cho phép null; old_value/new_value: jsonb → text (app ghi
--       chuỗi ngắn, không cần jsonb).
--     - Thêm cột: entity_label, brand_id, project_id.
--     - Thêm policy INSERT: người đăng nhập chỉ ghi dòng actor_id = chính mình
--       (không mạo danh). UPDATE/DELETE đã bị chặn bởi rule sẵn có ⇒ append-only.
-- ============================================================

alter table audit_log alter column action type text using action::text;
alter table audit_log alter column entity_id drop not null;
alter table audit_log alter column old_value type text using old_value::text;
alter table audit_log alter column new_value type text using new_value::text;

alter table audit_log add column if not exists entity_label text;
alter table audit_log add column if not exists brand_id     text;
alter table audit_log add column if not exists project_id   uuid references projects(id);

create index if not exists audit_log_created_idx on audit_log (created_at desc);
create index if not exists audit_log_project_idx on audit_log (project_id);
create index if not exists audit_log_entity_idx  on audit_log (entity_type, entity_id);

-- Ghi thêm được (self-insert). Đọc: đã có policy "audit_log: managers read".
drop policy if exists "audit: self insert" on audit_log;
create policy "audit: self insert" on audit_log for insert
  to authenticated with check (actor_id = auth.uid());
