-- ============================================================
-- Phase 4: bảng audit_log riêng (append-only) cho các thao tác quan trọng.
--   Ghi: Actor · Action · Entity · Entity ID/Label · Old/New value · Reason ·
--        Brand · Project · Timestamp.
--   RLS:
--     - INSERT: người đăng nhập chỉ ghi được dòng có actor_id = chính mình
--       (không mạo danh). Ghi thêm, không sửa/xóa (không có policy UPDATE/DELETE).
--     - SELECT: chỉ manager/CEO (is_manager()) đọc toàn bộ; người thường không
--       xem nhật ký hệ thống.
-- ============================================================

create table if not exists audit_log (
  id           text primary key,
  at           timestamptz not null default now(),
  actor_id     text references users(id),
  action       text not null,
  entity       text not null,
  entity_id    text,
  entity_label text,
  field        text,
  old_value    text,
  new_value    text,
  reason       text,
  brand_id     text,
  project_id   text,
  created_at   timestamptz not null default now()
);

create index if not exists audit_log_at_idx on audit_log (at desc);
create index if not exists audit_log_project_idx on audit_log (project_id);
create index if not exists audit_log_entity_idx on audit_log (entity, entity_id);

alter table audit_log enable row level security;

drop policy if exists "audit: managers read" on audit_log;
create policy "audit: managers read" on audit_log for select
  to authenticated using (is_manager());

drop policy if exists "audit: self insert" on audit_log;
create policy "audit: self insert" on audit_log for insert
  to authenticated with check (actor_id = auth.uid()::text);

-- Không có policy UPDATE/DELETE → append-only.
