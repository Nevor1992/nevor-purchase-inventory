-- ============================================================
-- Chặn leo thang đặc quyền qua bảng users.
--
-- Policy "users: self update" (using id = auth.uid()) không giới hạn cột,
-- nên một nhân viên đã đăng nhập có thể PATCH trực tiếp qua PostgREST để
-- tự đổi role='admin', cấp hr_confidential_access, đổi phòng ban…
-- (đã tái hiện được trên harness local). Trigger dưới đây khoá các cột
-- đặc quyền với người không phải admin/CEO; thao tác qua SQL Editor /
-- service_role (auth.uid() null) không bị ảnh hưởng.
-- ============================================================

create or replace function guard_users_privileged_cols()
returns trigger language plpgsql security definer as $$
begin
  if auth.uid() is not null
     and not is_manager()
     and (new.role is distinct from old.role
       or new.hr_confidential_access is distinct from old.hr_confidential_access
       or new.dept_id is distinct from old.dept_id
       or new.brand_id is distinct from old.brand_id
       or new.is_active is distinct from old.is_active) then
    raise exception 'Chỉ admin/CEO được thay đổi role, phòng ban hoặc quyền truy cập'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists users_guard_privileged on public.users;
create trigger users_guard_privileged
  before update on public.users
  for each row execute function guard_users_privileged_cols();
