# NovixWork — Báo cáo nâng cấp UI/UX

**Phạm vi:** cải thiện giao diện, usability, responsive, information hierarchy, consistency.
**Ràng buộc đã tuân thủ:** không đổi business logic · không đổi permission logic · không xóa module · không đổi flow nghiệp vụ · không đổi cấu trúc dữ liệu · không thêm tính năng ngoài UI/UX.
**Cách làm:** Hybrid — redesign tại chỗ + tách primitive tái dùng ra `src/ui/` (không dùng shadcn để giữ nhẹ).
**Kiểm chứng mỗi đợt:** `npm run build` sạch · `npm test` 44/44 pass · smoke-test bằng Chromium (Playwright), 0 lỗi runtime.

---

## 1. Danh sách màn hình / khu vực đã cải thiện

| Ưu tiên | Màn hình | Thay đổi chính |
|--------|----------|----------------|
| Nền tảng | **Sidebar** | Nhóm lại 4 cụm (Công việc / Điều phối / Tài liệu / Quản trị), active state nhẹ (bg-zinc-100), icon 18px, tooltip khi thu gọn, nhớ trạng thái collapse (localStorage), `aria-current` |
| Nền tảng | **Topbar** | Co gọn trên mobile (search shrink, nút tạo chỉ icon), `aria-label` cho mọi icon button |
| Nền tảng | **Page Header** | Component `PageHeader` thống nhất (tiêu đề 22px + mô tả + action) — áp cho Dashboard, My Tasks, Projects |
| #1 | **Task Drawer** | Header gọn (mã · status dot · priority · tên), checklist kiểu Linear (checkbox 18px, owner canh phải), Actual Output nền xanh khi bàn giao / trung tính khi trống |
| #2 | **My Tasks** | PageHeader + cột Deadline 2 dòng có màu (`DeadlineChip`) |
| #2 | **Quick Create** | Form tạo nhanh 3 trường (Tên + Phụ trách + Deadline + Ưu tiên), "Thêm chi tiết" mở rộng — tạo task <10 giây |
| #3 | **Leader Action Center** | Inbox theo mục, mỗi dòng có Task · Owner · **Deadline có màu** › |
| #5 | **CEO Action Center** | Tương tự, chỉ việc cần CEO quyết định |
| #4 | **Request** | **Timeline tiến trình** (Gửi → Tiếp nhận → Chốt deadline → Đang xử lý → Bàn giao → Hoàn thành) + badge "Mật"; card list dạng ticket |
| #6 | **Project** | Card có badge blocker ⚠, tiến độ theo trọng số effort, deadline màu; guard `canViewProject` |
| #7 | **Mobile (<768px)** | Sửa tràn ngang toàn trang; sidebar → hamburger drawer; table cuộn trong container riêng |
| — | **Empty / Loading / Error** | `EmptyState` nhất quán, `Skeleton`/`SkeletonRows`, `ErrorBoundary` (màn "Thử lại") |

---

## 2. Design System (`src/ui/tokens.js`)

- **Radius:** button/input `rounded-lg` (8px) · card `rounded-xl` (12px) · modal/drawer `rounded-2xl` (16px).
- **Màu:** nền white/zinc; text primary zinc-900 · secondary zinc-600 · muted zinc-400; accent zinc-900. Border zinc-200. Shadow chỉ cho modal/drawer/dropdown/popover.
- **Status:** todo xám · doing xanh dương · waiting amber · review tím · revise cam · done xanh lá · paused xám nhạt (chỉ dùng dot/badge, không đổi màu cả card).
- **Priority:** low xám · normal xanh nhạt · high amber · urgent đỏ.
- **Font:** Be Vietnam Pro (tối ưu tiếng Việt) + fallback hệ thống.
- **Buttons:** `btnPri` / `btnSec` / `btnGhost` / `btnDanger` — đều có `focus-visible:ring` cho bàn phím.

## 3. Component structure (bước đầu tách file — Hybrid)

```
src/
  ui/
    tokens.js        # class-string tokens: buttons, inputs, card, status/priority tones
    primitives.jsx   # PageHeader, DeadlineChip, Skeleton, SkeletonRows, Tooltip, Dot, ErrorBoundary
  App.jsx            # màn hình & logic nghiệp vụ (import tokens/primitives)
```
> Việc tách sâu hơn (TaskDrawer/TaskTable/RequestDrawer… ra file riêng) để dành cho đợt refactor sau UAT, làm cùng dịp wiring Supabase để giảm rủi ro.

## 4. Responsive behavior

- Breakpoint chính `<768px` (md). Đã test 375 / 768 / 1024 / 1280.
- Sidebar desktop ẩn trên mobile → mở bằng hamburger (drawer overlay).
- Grid dashboard/leader/CEO/project có `grid-cols-1` cơ sở → không còn tràn ngang.
- Bảng task cuộn ngang **trong container riêng** (`overflow-x-auto`), thân trang không cuộn ngang.
- `.truncate{min-width:0}` toàn cục để cắt chữ hoạt động đúng trong flex; `html,body{overflow-x:hidden}` làm lưới an toàn.

## 5. Accessibility

- `focus-visible` ring trên toàn bộ button dùng chung.
- `aria-label` cho icon button (hamburger, tạo việc, thông báo, tài khoản, xóa checklist…).
- `aria-current="page"` cho mục nav đang chọn (desktop + mobile).
- Tooltip có thể focus bằng bàn phím (`group-focus-within`).
- Màu không phải tín hiệu duy nhất: status/priority luôn kèm nhãn chữ.
- `ErrorBoundary` tránh màn trắng khi lỗi render.

## 6. Screenshots / preview

Bản demo chạy trực tiếp (cập nhật theo từng đợt): xem link Artifact "NovixWork — Demo". Ảnh từng màn đã gửi kèm trong hội thoại (sidebar, My Tasks, Task Drawer, Quick Create, Request timeline, Projects, mobile).

## 7. UX issue đã sửa

1. Nav phẳng khó quét → nhóm 4 cụm rõ ràng.
2. Active state nền đen quá đậm → nhẹ, calm.
3. Thiếu focus state bàn phím → thêm ring toàn hệ.
4. Radius/nút không nhất quán → chuẩn hóa 1 nguồn token.
5. Form tạo task quá dài → Quick Create 3 trường.
6. Deadline chỉ có ngày → thêm "còn/quá hạn" có màu.
7. Checklist checkbox nhỏ khó tick → 18px, owner canh phải.
8. Actual Output ồn màu amber khi trống → dịu lại (chỉ xanh khi hoàn tất).
9. Action Center chỉ có owner, thiếu deadline → thêm deadline có màu.
10. Request khó biết đang ở bước nào → timeline trực quan.
11. Project card không thấy blocker → badge cảnh báo.
12. **Tràn ngang trên mobile** → sửa triệt để (grid-cols-1 + truncate min-width).
13. Icon button không có nhãn cho screen reader → aria-label.
14. Lỗi render làm trắng màn → ErrorBoundary "Thử lại".

## 8. UX issue / hạng mục còn lại (đề xuất đợt sau)

- **Refactor sâu** TaskDrawer/TaskTable/RequestDrawer… ra file riêng + cân nhắc shadcn (làm cùng wiring Supabase).
- **Global Search dạng Command Palette** (mục 23): hiện có search overlay cơ bản; chưa có nhóm kết quả + điều hướng bàn phím ↑↓↵.
- **Kanban** kéo-thả có animation + toast khi drop sai (mục 13) — chưa rà kỹ.
- **Notification Center phân loại** Action/Updates/Mentions (mục 22) — hiện gộp chung.
- **Table → card view trên mobile** cho My Tasks (hiện dùng cuộn-trong-container, đã hợp lệ nhưng card sẽ dễ đọc hơn).
- **Virtualized list** cho danh sách rất dài (mục 32) — dữ liệu hiện nhỏ, chưa cần.
- Tách nhóm mục cho MobileSidebar giống desktop (hiện phẳng).

---

## Tiêu chí nghiệm thu (mục 38) — tự đánh giá

| # | Tiêu chí | Trạng thái |
|---|----------|-----------|
| 1 | Nhân viên mới hiểu trong 15' | ✓ nav nhóm rõ, nhãn tiếng Việt |
| 2 | Tạo task <10 giây | ✓ Quick Create |
| 3 | Task detail dễ đọc | ✓ hierarchy Drawer |
| 4 | Deadline dễ nhận biết | ✓ DeadlineChip có màu |
| 5 | Không màn quá nhiều màu | ✓ calm, dot/badge |
| 6 | Không quá nhiều card | ✓ giảm nhiễu |
| 7 | Leader biết ngay việc cần xử lý | ✓ Action Center + deadline |
| 8 | CEO không ngập task nhỏ | ✓ CEO Action Center |
| 9 | Request dễ hiểu | ✓ timeline |
| 10 | HR confidential rõ | ✓ badge Mật + gate |
| 11 | Mobile usable | ✓ hết tràn ngang |
| 12 | Không overflow | ✓ đã kiểm 375px |
| 13 | Keyboard navigation | ◑ focus ring + aria; command palette còn lại |
| 14 | Giao diện nhất quán | ✓ token + primitives |
| 15 | Không đổi business logic | ✓ 44/44 test pass |
