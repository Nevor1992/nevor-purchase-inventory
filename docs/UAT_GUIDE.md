# NovixWork — Hướng dẫn UAT (dành cho người dùng)

Cảm ơn bạn tham gia chạy thử NovixWork. Mục tiêu vòng này: kiểm tra **luồng công việc, giao diện, và phân quyền theo vai trò** có đúng và dễ dùng không.

## 1. Cách vào
- Mở link demo (gửi kèm) trên máy tính hoặc điện thoại — **không cần cài đặt, không cần mật khẩu**.
- Ở màn hình đầu, **bấm chọn một tài khoản demo** để đóng vai.
- Muốn đổi vai: bấm avatar góc trên phải → **Đổi tài khoản demo**.

## 2. Lưu ý quan trọng (đây là bản thử nghiệm)
- Đây là **bản demo trải nghiệm luồng** — dữ liệu là mẫu, **thao tác chỉ lưu trong phiên; tải lại trang (refresh) là về mặc định**.
- Mỗi lúc chỉ đóng **một vai**; chưa có nhiều người dùng thật cùng lúc (bản chính thức trên Supabase sẽ có).
- Vì vậy hãy tập trung đánh giá: **thao tác có dễ hiểu không · thông tin có đủ/đúng không · phân quyền có hợp lý không · từ ngữ tiếng Việt có rõ không.**

## 3. Tài khoản demo
| Vai | Tài khoản | Đại diện cho |
|-----|-----------|--------------|
| CEO | Anh Tuấn | Ban giám đốc |
| Admin | Ngọc Vũ | Quản trị hệ thống |
| Leader | Linh (Content) · Hà (E‑com Nevor) · Trung (Growth UHero) · Trang (Booking KOC) | Trưởng phòng |
| Nhân viên | Mai (Content) · Huy (Affiliate) · Đạt (Media) · Thảo (KOC) | Nhân viên |
| HR | Vy | Hành chính – Nhân sự |

## 4. Việc cần thử theo vai

### 👤 Nhân viên (đăng nhập **Mai**)
1. Trang chủ → xem "Việc cần làm hôm nay", "Sắp đến hạn".
2. Mở một task → kéo thanh **Tiến độ**, điền **Kết quả thực tế** (tóm tắt + link) → **Gửi duyệt**.
3. Bấm **+ Tạo công việc** → chỉ điền tên → tạo (mục tiêu: <10 giây).
4. Mở một task có checklist → thử tick (chỉ tick được mục giao cho mình).

### 👥 Leader (đăng nhập **Linh** hoặc **Hà**)
1. Trang chủ → xem khối **"Hôm nay tôi cần xử lý gì?"** (Action Center): chờ duyệt, quá hạn, chưa có người phụ trách…
2. Duyệt một task đang chờ; hoặc **giao việc** cho nhân viên trong phòng.
3. Vào **Yêu cầu phối hợp** → tiếp nhận một yêu cầu, **thoả thuận deadline**.

### 🏢 CEO (đăng nhập **Anh Tuấn**)
1. Trang chủ → **"CEO cần hành động"**: việc cần quyết định, blocker, dự án chậm.
2. Mở một **Dự án** → xem tiến độ, blocker.
3. Đổi bộ lọc **Toàn công ty / Nevor / UHero** để thấy 2 brand tách biệt.

### 🧑‍💼 HR (đăng nhập **Vy**)
1. Vào **Nhân sự** → **Tạo quy trình** → chọn **Thử việc** → đổi số ngày (30/60/90) → xem lịch task tự tính theo ngày.
2. Kiểm tra **task nhân sự bảo mật** hiển thị biểu tượng 🔒.

## 5. Kịch bản theo team

- **Content**: Mai tạo content task → gửi Linh duyệt → Linh duyệt/từ chối. Kiểm tra checklist theo người.
- **Media**: Content gửi **yêu cầu phối hợp** sang Media (Đạt) → Media tiếp nhận, thoả thuận deadline → xử lý → **bàn giao kết quả** (phải có Kết quả thực tế). Xem **timeline tiến trình** yêu cầu.
- **Booking KOC**: Trang/Thảo tạo brief KOC, phối hợp với Content/Media qua yêu cầu.

## 6. Điểm cần soi kỹ (phân quyền & bảo mật)
- Nhân viên **không** chọn được người duyệt là người ngoài phạm vi; **không** sửa được task của người khác.
- **Yêu cầu bảo mật HR** (nghỉ phép, hồ sơ): người ngoài cuộc & admin kỹ thuật **không** xem được.
- Đổi **deadline đã chốt** phải ghi lý do.

## 7. Mẫu ghi nhận góp ý
Sao chép bảng này (hoặc dùng file Google Sheet) để điền khi thử:

| # | Vai/Team | Màn hình · Thao tác | Vấn đề gặp phải | Mức độ (Chặn/Cao/TB/Thấp) | Đề xuất |
|---|----------|---------------------|------------------|----------------------------|---------|
| 1 |  |  |  |  |  |

**Mức độ:** *Chặn* = không làm tiếp được · *Cao* = sai/khó chịu rõ · *TB* = nên cải thiện · *Thấp* = góp ý nhỏ.

## 8. Gửi góp ý
Tổng hợp bảng trên gửi lại đầu mối dự án. Sau khi gom đủ góp ý, đội phát triển sẽ chỉnh và tiến hành nối backend thật (Supabase) để lưu dữ liệu & nhiều người dùng cùng lúc.
