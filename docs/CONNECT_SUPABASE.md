# Kết nối NovixWork với Supabase (Bước B — đưa vào dùng thật)

App chạy **dual-mode**:
- **Chưa có `.env`** → chế độ prototype in-memory (demo/UAT, refresh mất dữ liệu). Không vỡ gì.
- **Có `.env`** (URL + anon key) → dùng Supabase thật: Auth + Postgres + RLS + Storage.

Cờ điều khiển: `SUPABASE_ENABLED` trong `src/lib/supabase.js` (tự bật khi có đủ 2 biến `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`).

---

## Phần 1 — Bạn làm (tạo hạ tầng, ~1 giờ)

1. Tạo project tại https://supabase.com (region **Singapore** cho gần VN).
2. Lấy khoá: **Project Settings → API**:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY` *(khoá này an toàn để lộ, nằm trong frontend)*
   - ⚠️ **Không chia sẻ `service_role` key** — đó là khoá bí mật, chỉ dùng ở server.
3. Áp schema + RLS (Dashboard → SQL Editor, dán lần lượt **theo đúng thứ tự** các file trong `supabase/migrations/`):
   - `20260101000000_init.sql` — schema chính
   - `20260101000001_rls.sql` — RLS policies
   - `20260101000002_app_tables.sql` — documents / hr_processes / saved_filters + trigger auth→users
   - `20260101000003_ui_columns.sql` — cột bổ sung cho UI
   - `20260101000004_rls_nullsafe.sql` — **bắt buộc**: vá lỗ hổng lộ task bảo mật (NULL leak) + sửa quyền tick checklist
   - `20260101000005_lock_anon.sql` — **bắt buộc**: khoá anon khỏi dữ liệu (chống lộ email/task company)
   - `20260101000006_users_priv_guard.sql` — **bắt buộc**: chặn nhân viên tự nâng quyền admin qua PostgREST
   *(hoặc dùng Supabase CLI: `supabase db push`)*
4. Tạo **Storage bucket** tên `attachments` (private) cho file đính kèm.
5. Tạo user admin đầu tiên: **Authentication → Add user** (email + password), rồi trong SQL Editor thêm dòng vào `public.users` với **cùng `id`** của auth user đó (role `admin`, dept `hr`…).
6. Gửi cho tôi: **Project URL + anon key** (dán vào chat được — anon key vốn công khai). Tôi sẽ nối tầng dữ liệu và kiểm thử trực tiếp.

## Phần 2 — Tôi làm (nối code vào Supabase)

Đã xong (foundation):
- ✅ `@supabase/supabase-js` + client env-gated (`src/lib/supabase.js`)
- ✅ Auth helper (`src/lib/auth.js`): đăng nhập email/password, map `auth.uid()` → `users`
- ✅ `.env.example`

Sẽ làm tiếp (cần project của bạn để kiểm thử đúng):
- **Login thật**: thay màn "chọn tài khoản demo" bằng form đăng nhập khi bật Supabase.
- **Tầng đọc** `loadDb()`: nạp dữ liệu từ Supabase, ráp về đúng shape UI đang dùng.
- **Tầng ghi**: mỗi `act.*` (tạo/sửa task, request, duyệt, checklist…) ghi xuống DB; **RLS chặn quyền ở server** (đã viết sẵn, khớp logic client).
- **Realtime**: đồng bộ đa người dùng.
- **Upload file thật** qua Storage bucket.

## Phần 3 — Cần bổ sung vào schema trước khi nối tầng dữ liệu

Một số phần UI đang có trong prototype nhưng **chưa có bảng** trong migration — tôi sẽ thêm migration mới:
- `documents` (tài liệu liên kết) · `hr_processes` (quy trình nhân sự) · `saved_filters` (bộ lọc đã lưu)
- Trigger đồng bộ `auth.users` → `public.users` khi tạo tài khoản mới
- (tuỳ chọn) `role_logs`, `sent_alerts` phục vụ scheduler

## Phần 4 — Triển khai

1. `.env` trên máy dev (từ `.env.example`).
2. `npm run build` → deploy `dist/` lên Vercel/Netlify/Cloudflare Pages; set 2 biến env trên hosting.
3. `supabase functions deploy scheduler` + bật `pg_cron` (nhắc deadline + task định kỳ chạy server-side).
4. Gắn domain riêng.

---

## Kiểm thử RLS không cần project thật

`scripts/test-rls-local.sh` dựng Postgres cục bộ giả lập môi trường Supabase (schema `auth`, `auth.uid()`, role `authenticated`), áp toàn bộ migrations rồi chạy 48 test phân quyền trong `supabase/tests/rls_test.sql` (task private/bảo mật HR, checklist theo người, request bảo mật, audit log bất biến, trigger auth→users…). Bộ test này đã bắt được 2 lỗi bảo mật thật (xem migration `000004`).

---

**Trạng thái (cập nhật 18/07/2026 — đã có anon key thật):**
- ✅ Tầng code nối xong: login thật, `loadDb()`, sync engine, realtime, Storage (commit `1bd1fe8`).
- ✅ Anon key đã xác thực với project thật; migrations `000000–000003` **đã áp trên server** (đủ bảng, trigger auth→users chạy đúng — hồ sơ tự tạo khi signup).
- ✅ App → Supabase Auth thật hoạt động: đăng nhập trả đúng trạng thái từng trường hợp.
- ✅ **`000004_rls_nullsafe.sql` + `000005_lock_anon.sql` đã áp trên server** (xác nhận từ xa: `is_manager()` trả `false`, anon không còn đọc được bảng `users` của người khác).
- 🔴 **Server CHƯA áp `000006_users_priv_guard.sql`** (chặn nhân viên tự nâng quyền admin qua PostgREST — tái hiện được trên harness). Dán file này vào SQL Editor → Run trước khi cho team dùng.
- ⏳ User UAT `uat.novixwork@cuc.edu.vn` vẫn **"Waiting for verification"** → đăng nhập trả `email_not_confirmed`. Cần: **Authentication → Users → dấu ⋮ cuối dòng → Confirm email** (hoặc tắt "Confirm email" trong **Sign In / Providers → Email** khi UAT).
- ℹ️ Cả 2 user hiện là `employee` — cần ít nhất 1 admin: `update public.users set role='admin' where email='nevorofficial@cuc.edu.vn';`
