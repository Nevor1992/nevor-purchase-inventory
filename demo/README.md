# Novix Purchase · Inventory — Bản demo trải nghiệm

File demo cho **nhân sự trải nghiệm** luồng Mua hàng · Tồn kho của Novix
(brand NEVOR · UHERO · MONA MASK). Đây là bản **thử nghiệm giao diện & luồng**,
dữ liệu là **mẫu (129 SKU thật + NCC/PO/kế hoạch demo)**.

## 1. Cách mở — không cần cài đặt, không cần đăng nhập

- Tải file **`novix-purchase-inventory-demo.html`** về máy.
- **Bấm đúp** để mở bằng trình duyệt (Chrome/Edge/Safari/Firefox) — trên máy
  tính hoặc điện thoại đều được.
- Toàn bộ app nằm trong **một file duy nhất**, chạy hoàn toàn ngoại tuyến (offline),
  không cần server, không gửi dữ liệu đi đâu.

## 2. Đổi vai để trải nghiệm phân quyền

Góc trên bên trái có ô **"DEMO ROLE SWITCH"** — chọn vai để xem giao diện &
quyền thao tác thay đổi theo từng người:

| Vai | Trải nghiệm chính |
|-----|-------------------|
| **CEO** | Dashboard tổng, duyệt PR cuối, xem toàn bộ tab |
| **Leader** | Duyệt đề xuất mua (PR), sửa Sales Plan |
| **Purchasing** | Tạo đề xuất mua, tạo & theo dõi PO, quản lý NCC, nhập POS |
| **Warehouse** | Nhận hàng (Goods Receipt), chuyển kho |
| **QC** | Kiểm hàng (QC) cho PO |
| **Accounting** | Xác nhận cọc/thanh toán, ngân sách, chi phí thực |
| **Sales Planner / E-commerce Lead / Growth Lead** | Lập & duyệt kế hoạch bán |
| **Viewer** | Chỉ xem |

## 3. Các màn hình (tab bên trái)

Dữ Liệu · CEO Dashboard · Vốn Chết · Cần Mua · Lịch Nhập · Biến Thể ·
Sales Plan · Leader Duyệt · CEO Duyệt · PO Tracking · NCC · Cashflow · CCC ·
Audit Log · POS Sync · Kho & ATP.

### Gợi ý việc nên thử
- **Dữ Liệu**: xem "Độ sẵn sàng", các SKU thiếu dữ liệu; bấm **Điền** hoặc
  **Điền hàng loạt** để bổ sung Giá bán / Lead time / MOQ…
- **Cần Mua**: xem SKU cần mua gấp, nguy cơ hết hàng; tạo **đề xuất mua (PR)**.
- **Leader Duyệt → CEO Duyệt**: chạy thử luồng duyệt PR nhiều cấp.
- **PO Tracking**: theo dõi PO qua các trạng thái (đặt NCC → cọc → sản xuất →
  QC → vận chuyển → về kho → nhập POS).
- **Vốn Chết / Kho & ATP**: xem tồn thừa, hàng cần xả, tồn khả dụng.
- **Cashflow · CCC**: dòng tiền & vòng quay tiền mặt.

## 4. Lưu ý (đây là bản demo)

- Thao tác được **lưu tạm trong trình duyệt của bạn** (Local Storage) —
  mỗi người một bản riêng, không ảnh hưởng người khác.
- Muốn về mặc định: vào **Dữ Liệu → mục Reset** (với vai có quyền), hoặc xoá
  dữ liệu site trong trình duyệt.
- Đây là bản mô phỏng luồng để **góp ý giao diện, từ ngữ, phân quyền** — chưa
  nối backend thật.

## 5. Dành cho dev — build lại từ mã nguồn

Mã nguồn demo nằm ở `demo/purchase-inventory/` (component gốc: `App.jsx`).

```bash
npm install
npm run build:purchase-demo
# → xuất ra dist-purchase-demo/index.html (file HTML tự chứa, đã gộp toàn bộ)
```

File `demo/novix-purchase-inventory-demo.html` là bản build sẵn để chia sẻ nhanh.
Sau khi chỉnh `demo/purchase-inventory/App.jsx`, chạy lại lệnh trên rồi chép
`dist-purchase-demo/index.html` đè lên file demo đó.

## 6. Deploy demo lên Vercel (URL cho nhân sự truy cập online)

Demo chạy như **project Vercel riêng**, tách biệt hoàn toàn với app chính
(`vercel.json` ở gốc vẫn deploy app chính — không bị đụng). Config demo nằm ở
`vercel.demo.json`:

```json
{ "framework": "vite", "buildCommand": "npm run build:purchase-demo", "outputDirectory": "dist-purchase-demo" }
```

### Cách 1 — Vercel Dashboard (khuyến nghị, ~1 phút)
1. Vào https://vercel.com → **Add New… → Project** → **Import** repo
   `Nevor1992/nevor-purchase-inventory`.
2. Ở màn hình cấu hình, mở **Build & Output Settings** và **Override**:
   - **Build Command**: `npm run build:purchase-demo`
   - **Output Directory**: `dist-purchase-demo`
   - Install Command để mặc định `npm install`.
3. (Tuỳ chọn) **Settings → Git → Production Branch**: đặt
   `claude/demo-file-hr-y4tuth` nếu muốn deploy nhánh này; hoặc merge vào nhánh chính.
4. Bấm **Deploy** → nhận URL dạng `https://<tên-project>.vercel.app` để gửi nhân sự.

> Đặt tên project khác app chính (vd `nevor-purchase-inventory-demo`) để có URL riêng.

### Cách 2 — Vercel CLI (deploy bản tĩnh đã build sẵn)
```bash
npm install
npm run build:purchase-demo          # → dist-purchase-demo/index.html
npx vercel deploy dist-purchase-demo --prod
# Lần đầu: CLI hỏi đăng nhập + chọn scope + đặt tên project. Xong là có URL.
```

Vì demo là **HTML tĩnh tự chứa** (không backend), deploy rất nhẹ, không cần
cấu hình env var nào trên Vercel.
