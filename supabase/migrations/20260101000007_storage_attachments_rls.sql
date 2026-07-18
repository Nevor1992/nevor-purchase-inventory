-- ============================================================
-- Storage RLS cho bucket "attachments" (private).
-- Đường dẫn file: `<taskId>/<timestamp>_<tên>` → segment đầu = task id.
-- Quyền phản chiếu tầng app:
--   - upload  : perms.attach  (task chưa khoá, chưa xoá, và xem được task)
--   - đọc/tải : perms.view    (can_view_task)
--   - xoá     : owner/creator/manager
--
-- QUAN TRỌNG: `split_part(name,'/',1)` phải nằm NGOÀI subquery. Nếu đặt trong
-- `select ... from tasks t`, chữ `name` bị bind nhầm vào cột tasks.name (tên
-- task) do che khuất storage.objects.name. Vì vậy ta trích task id ở ngoài rồi
-- so khớp `IN (danh sách id xem được)`. So bằng text nên không cast uuid.
-- ============================================================

drop policy if exists "attachments: upload if can attach" on storage.objects;
create policy "attachments: upload if can attach"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'attachments'
  and split_part(name, '/', 1) in (
    select t.id::text from public.tasks t
    where not t.locked and not t.deleted and public.can_view_task(t)
  )
);

drop policy if exists "attachments: read if can view task" on storage.objects;
create policy "attachments: read if can view task"
on storage.objects for select to authenticated
using (
  bucket_id = 'attachments'
  and split_part(name, '/', 1) in (
    select t.id::text from public.tasks t where public.can_view_task(t)
  )
);

drop policy if exists "attachments: delete by manager or owner" on storage.objects;
create policy "attachments: delete by manager or owner"
on storage.objects for delete to authenticated
using (
  bucket_id = 'attachments'
  and split_part(name, '/', 1) in (
    select t.id::text from public.tasks t
    where t.owner_id = auth.uid() or t.creator_id = auth.uid() or public.is_manager()
  )
);
