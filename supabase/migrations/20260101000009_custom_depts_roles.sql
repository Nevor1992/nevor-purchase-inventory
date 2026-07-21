-- ============================================================
-- Tùy chỉnh phòng ban + nhãn vai trò (mô hình kinh doanh thay đổi được).
--   - departments.active: ẩn phòng không dùng nữa mà KHÔNG xoá (giữ dữ liệu cũ).
--   - app_settings: lưu cấu hình nhẹ (hiện dùng cho nhãn 4 vai trò).
--   - RLS: manager/CEO ghi được phòng ban & settings bằng JWT của họ
--     (không cần service_role). Ai cũng đọc để hiển thị.
-- ============================================================

alter table departments add column if not exists active boolean not null default true;

create table if not exists app_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

drop policy if exists "app_settings: read all" on app_settings;
create policy "app_settings: read all" on app_settings for select using (true);

drop policy if exists "app_settings: managers write" on app_settings;
create policy "app_settings: managers write" on app_settings for all
  to authenticated using (is_manager()) with check (is_manager());

-- departments: đã có policy đọc ("everyone reads"); thêm quyền ghi cho manager
drop policy if exists "departments: managers mutate" on departments;
create policy "departments: managers mutate" on departments for all
  to authenticated using (is_manager()) with check (is_manager());
