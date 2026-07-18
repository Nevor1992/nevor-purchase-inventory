# NovixWork — Cẩm nang sử dụng (chi tiết + vì sao)

> Triết lý: **Ai làm gì · Deadline khi nào · Đang vướng ở đâu · Ai xử lý tiếp.**
> Mỗi quy tắc trong app sinh ra để chặn một kiểu "việc rơi" thường gặp ở công ty ~50 người, nhiều phòng ban, 2 brand (Nevor & UHero).

---

## 0. Bốn trụ cột — hiểu cái này là hiểu cả app

| Trụ | Dùng khi | Vì sao tách riêng |
|-----|----------|-------------------|
| **Task (Công việc)** | Việc của một người trong một phòng | Gắn **trách nhiệm cá nhân** rõ ràng — luôn có 1 người "phụ trách chính" |
| **Request (Yêu cầu phối hợp)** | Cần **phòng khác** làm giúp | Việc liên phòng phải là **cam kết 2 chiều có deadline**, không đùn đẩy miệng |
| **Project (Dự án)** | Mục tiêu cần **nhiều phòng** cùng chạy | Nhìn tiến độ & vướng mắc ở tầng mục tiêu, không lạc trong task lẻ |
| **Action Center** | Leader/CEO xem việc **cần can thiệp** | Sếp chỉ thấy việc cần quyết, không ngập trong task nhỏ |

**Vì sao quan trọng:** nếu trộn 3 loại này làm một, sẽ mất dấu trách nhiệm (task), mất SLA liên phòng (request), và mất tầm nhìn mục tiêu (project). Tách ra là để **mỗi việc có đúng một chủ và đúng một luồng**.

---

## 1. Vai trò & phân quyền

| Vai | Thấy & làm được gì |
|-----|--------------------|
| **Nhân viên** | Việc của mình + việc phòng; tạo task cho **chính mình**; gửi duyệt |
| **Leader** | Điều hành **phòng mình**: giao việc, duyệt, điều phối, nhận yêu cầu phối hợp |
| **Admin** | Quản trị hệ thống (thành viên, phòng ban) — **không** mặc định xem hồ sơ HR |
| **CEO** | Xem toàn công ty, quyết định lớn, xem theo brand |
| **HR (Leader HR)** | Quy trình nhân sự + task nhân sự **bảo mật** |

**Vì sao:** phân quyền để **người ta chỉ thấy việc liên quan** — vừa gọn (không nhiễu), vừa an toàn (dữ liệu nhạy cảm không lộ). App chặn quyền ở **tầng dữ liệu**, không chỉ ẩn nút; nên kể cả biết đường link cũng không mở được việc ngoài phạm vi.

**Cấu trúc theo brand & tổ trực thuộc:** mỗi brand (Nevor, UHero) có khối **Growth** riêng; **Booking KOC** và **TikTok Affiliate** là **tổ trực thuộc Growth** của từng brand (khác lĩnh vực). **Leader Growth của brand quản lý** luôn KOC & Affiliate của brand đó (duyệt/xem được), bên cạnh team‑lead của từng tổ. *Vì sao:* phản ánh đúng sơ đồ tổ chức và để việc của KOC/Affiliate luôn có người cấp trên điều phối.

---

## 2. Đăng nhập & tổng quan màn hình
- **Đăng nhập:** bản demo bấm chọn tài khoản; bản chính thức đăng nhập email/mật khẩu.
- **Thanh bên trái** chia 4 cụm: *Công việc · Điều phối · Tài liệu · Quản trị* — **vì sao:** nhóm theo mục đích để quét nhanh, không phải dò trong danh sách phẳng.
- **Thanh trên:** tìm kiếm · **+ Tạo công việc** · chuông thông báo · avatar.
- **Trang chủ** đổi theo vai: nhân viên thấy "việc hôm nay", Leader/CEO thấy Action Center.

---

## 3. TASK — công việc cá nhân

### 3.1 Tạo task
- **Cách làm:** bấm **+ Tạo công việc** → điền **Tên + Người phụ trách + Deadline + Ưu tiên** → Tạo. Cần thêm (mô tả, người duyệt, dự án, checklist…) thì bấm **"Thêm chi tiết"**.
- **Vì sao chỉ 4 ô mặc định:** tạo task phải **nhanh (<10 giây)**, nếu bắt điền 12 ô mọi người sẽ ngại và ghi việc ra ngoài app → mất kiểm soát.
- **Vì sao nhân viên chỉ tạo cho mình:** để không ai "giao việc" lung tung cho người khác/phòng khác ngoài luồng. Cần người khác làm → **dùng Yêu cầu phối hợp** (mục 4).

### 3.2 Vòng đời trạng thái
`Chưa bắt đầu → Đang thực hiện → (Chờ phối hợp) → Chờ duyệt → Hoàn thành` · phụ: *Cần chỉnh sửa*, *Tạm dừng*.
- **Vì sao có "Chờ duyệt" tách khỏi "Hoàn thành":** để **chất lượng được kiểm** trước khi đóng — người làm không tự tuyên bố xong.
- **Vì sao "Tạm dừng" cần lý do:** để sau này biết **vướng ở đâu**, không có task "chết" không rõ nguyên nhân.

### 3.3 Kết quả thực tế (Actual Output) — phần quan trọng nhất
- **Cách làm:** trước khi Gửi duyệt/Hoàn thành, điền **Tóm tắt + ít nhất 1 link hoặc file**.
- **Vì sao bắt buộc:** đây là bằng chứng "việc đã thực sự làm". Không có nó thì "hoàn thành" chỉ là lời nói. App **chặn gửi duyệt nếu thiếu** — kể cả đi qua đường Yêu cầu phối hợp cũng bị chặn như nhau (không có cửa sau).

### 3.4 Checklist theo người
- **Cách làm:** thêm mục checklist, gán người phụ trách từng mục; tick khi xong.
- **Vì sao chỉ tick được mục của mình:** trong 1 task nhiều người cùng làm (VD Tùng quay, Đạt duyệt góc, Mai viết caption), **mỗi người chỉ xác nhận phần của mình** — tránh tick hộ, sai trách nhiệm. Chủ task / Leader tick được mọi mục.

### 3.5 Deadline
- **Cách làm:** đặt deadline; màu tự đổi (xám → amber ≤3 ngày → cam hôm nay → đỏ quá hạn).
- **Vì sao đổi deadline đã chốt phải ghi lý do:** deadline đã cam kết mà đổi âm thầm sẽ phá kế hoạch người khác. Ghi lý do để **minh bạch và có lịch sử**.

### 3.6 Người duyệt
- **Cách làm:** chọn người duyệt (nếu cần duyệt).
- **Vì sao danh sách bị giới hạn:** nhân viên **không** chọn được bất kỳ ai (VD nhảy cóc chọn CEO duyệt task lẻ) — chỉ Leader/cấp phù hợp theo loại việc. **Vì sao:** để **CEO/Leader không bị ngập** yêu cầu duyệt vặt, và duyệt đúng người có thẩm quyền.

### 3.7 Duyệt & khoá
- **Vì sao task được "khoá" sau khi duyệt:** kết quả đã duyệt là bản chính thức; khoá để không ai sửa lén sau đó. Cần mở lại → **Leader/Admin** mở, **bắt buộc ghi lý do**.

### 3.8 Task định kỳ, bảo mật, xoá
- **Định kỳ:** đặt lặp ngày/tuần/tháng — hệ thống tự sinh task mới theo lịch. **Vì sao:** việc lặp (báo cáo ngày, đối soát tuần…) không nên tạo tay mỗi lần.
- **Bảo mật (Mật):** đánh dấu task mật → chỉ người liên quan xem. **Vì sao:** dữ liệu nhạy cảm (đánh giá, hồ sơ) không để cả phòng thấy.
- **Xoá mềm:** task xoá vẫn lưu, Leader/Admin khôi phục được (ghi lý do). **Vì sao:** tránh mất việc do xoá nhầm và giữ dấu vết.

---

## 4. REQUEST — yêu cầu phối hợp liên phòng ban

### 4.1 Vì sao không giao thẳng cho người phòng khác
Nếu Content thêm thẳng bạn Kho vào task, thì **Leader Kho không biết** nhân sự mình đang bị giao việc → workload sai, SLA vô nghĩa. Nên **mọi việc cần phòng khác đều đi qua Yêu cầu** để có cam kết và người tiếp nhận rõ ràng.

### 4.2 Luồng chuẩn (có timeline trực quan trong app)
`Gửi yêu cầu → Phòng nhận tiếp nhận → Chốt deadline (2 bên) → Đang xử lý → Bàn giao → Hoàn thành`
- **Thoả thuận deadline 2 chiều:** bên nhận có thể đề xuất ngày khác; **task phối hợp chỉ được tạo khi 2 bên đồng ý.** *Vì sao:* deadline phải là **cam kết chung**, không phải áp đặt một chiều.
- **Bàn giao phải có Kết quả thực tế** + chỉ **người xử lý / Leader phòng nhận** mới bàn giao. *Vì sao:* đóng việc phải có sản phẩm thật, đúng người.
- **Chỉ bên gửi có thẩm quyền** (người tạo / Leader phòng gửi / người được uỷ quyền) mới **Xác nhận hoàn thành / Huỷ / Gửi lại** — không phải cả phòng. *Vì sao:* tránh người không liên quan đóng/huỷ nhầm.

### 4.3 Yêu cầu bảo mật (HR)
- Yêu cầu loại nhạy cảm (nghỉ phép, hồ sơ, chính sách) tự bật **Bảo mật** → chỉ CEO + Leader 2 phòng + HR xem, **admin kỹ thuật không xem**. *Vì sao:* "quản trị hệ thống ≠ quyền đọc hồ sơ nhân sự".

---

## 5. PROJECT — dự án liên phòng
- **Cách làm:** mỗi dự án có mục tiêu, phòng tham gia, task con, blocker; tab Tổng quan/Công việc/Timeline/Thành viên/Vấn đề.
- **Tiến độ theo trọng số effort (S=1, M=2, L=4)** thay vì đếm số task. *Vì sao:* "Xác nhận lịch họp" (S) không thể tính ngang "Quay 10 video" (L) — trọng số cho **tiến độ phản ánh đúng khối lượng**, tránh CEO nhìn sai.
- **Blocker** hiện badge ⚠ trên thẻ dự án. *Vì sao:* vướng mắc phải **nổi lên ngay**, không chôn trong task.

---

## 6. LEADER — Trung tâm điều hành ("Hôm nay tôi cần xử lý gì?")
Hiển thị dạng hộp thư, mỗi mục có **việc · người · deadline ›**:
- Chờ tôi duyệt · Quá hạn cần can thiệp · Chưa có người phụ trách · Yêu cầu chưa tiếp nhận · Deadline chờ chốt · Blocker · Bị trả sửa ≥2 lần · Nhân sự quá tải.
- **Vì sao thiết kế "inbox" chứ không chỉ con số:** Leader cần **bấm vào xử lý ngay**, và thấy *ai/deadline* để ưu tiên — con số suông không hành động được.

---

## 7. CEO — Trung tâm quyết định
Chỉ gồm việc **cần CEO**: cần quyết định · Blocker CRITICAL · dự án chậm · khẩn cấp quá hạn · yêu cầu liên phòng bị tắc. Lọc theo **Toàn công ty / Nevor / UHero**.
- **Vì sao tách brand:** xem Nevor là chỉ Nevor (không cộng trùng việc chung) để **đánh giá đúng từng brand**.
- **Vì sao gọn:** CEO hiểu tình hình trong <2 phút, **không ngập task nhỏ**.

---

## 8. HR Workspace
- **Quy trình nhân sự:** Onboarding / Thử việc / Đào tạo / Offboarding — tạo quy trình là **tự sinh chuỗi task theo lịch**.
- **Thử việc linh hoạt:** HR nhập **số ngày (30/45/60/90) + ngày giữa kỳ** → deadline từng bước tự tính cho từng người. *Vì sao:* intern/part‑time/thử việc 60 ngày khác nhau — không thể hardcode một lịch cho mọi người.
- **Task nhân sự bảo mật (🔒):** chỉ HR/CEO/người được cấp quyền xem. *Vì sao:* bảo vệ dữ liệu cá nhân nhân sự.

---

## 9. Tiện ích khác
- **Ưu tiên hôm nay:** ghim tối đa 5 task. *Vì sao:* ép chọn trọng tâm, tránh "cái gì cũng gấp".
- **Thông báo:** việc cần duyệt, deadline đổi, được nhắc @… tập trung một nơi.
- **Lịch:** xem deadline theo tuần/tháng, kéo‑thả đổi ngày.
- **Tài liệu liên kết:** gom link Drive/Docs quan trọng; tài liệu HR có kiểm soát quyền.
- **Tìm kiếm:** tìm nhanh task/dự án/yêu cầu/tài liệu/người — **chỉ hiện thứ bạn có quyền xem**.

---

## 10. 10 nguyên tắc vàng (tóm tắt các "vì sao")
1. Mỗi task có **đúng một người phụ trách** — trách nhiệm không mờ.
2. Việc cần phòng khác → **Yêu cầu phối hợp**, không giao thẳng.
3. **Hoàn thành phải có Kết quả thực tế** (tóm tắt + link/file).
4. Việc cần duyệt thì **không tự đóng** — gửi duyệt.
5. **Đổi deadline đã chốt phải ghi lý do.**
6. Deadline liên phòng là **cam kết 2 bên**, đổi phải xác nhận lại.
7. Checklist: **mỗi người tick phần của mình.**
8. Người duyệt **đúng cấp** — không nhảy cóc lên CEO.
9. Dữ liệu HR **bảo mật** — admin kỹ thuật không tự xem.
10. Leader/CEO nhìn **việc cần can thiệp**, không ngập task nhỏ.

> Tóm lại: app không chỉ "lưu việc" mà **ép đúng quy trình** để việc không rơi, trách nhiệm rõ, phối hợp có cam kết, và sếp thấy đúng thứ cần thấy.
