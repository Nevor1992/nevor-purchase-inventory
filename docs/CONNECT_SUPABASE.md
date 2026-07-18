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
3. Áp schema + RLS (Dashboard → SQL Editor, dán lần lượt 2 file):
   - `supabase/migrations/20260101000000_init.sql`
   - `supabase/migrations/20260101000001_rls.sql`
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

**Trạng thái:** foundation đã commit. Bước tiếp theo cần **Phần 1** của bạn (tạo project + gửi URL/anon key) để tôi nối và kiểm thử tầng dữ liệu cho chuẩn.
