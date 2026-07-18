-- ============================================================
-- Khoá role `anon` khỏi dữ liệu ứng dụng.
--
-- Phát hiện khi kiểm thử trên project thật: nhiều policy dùng using(true)
-- hoặc nhánh `visibility = 'company' → true` mà không giới hạn
-- `to authenticated`, nên người CHƯA đăng nhập (anon key nằm công khai
-- trong bundle JS) đọc được users (email), brands, departments và mọi
-- task visibility=company. App luôn bắt đăng nhập trước khi đọc dữ liệu,
-- Edge Functions dùng service_role — anon không cần bất kỳ quyền nào
-- trên schema public. Thu hồi toàn bộ là cách chặn triệt để, không phải
-- sửa từng policy.
-- ============================================================

revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

-- Bảng/hàm tạo sau này cũng không cấp cho anon
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
