import { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Package, AlertTriangle, ShoppingCart, BarChart3, DollarSign, Truck, ChevronRight, ChevronDown, Search, CheckCircle, XCircle, Clock, Zap, Users, Box, Target, ThumbsUp, X, Upload, Database, History, Settings, Wallet, Archive, Layers, ShieldAlert, ListChecks, Calendar, TrendingUp, FileText } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

/* ═══════════════════════════════════════════════════════════════
   NOVIX PURCHASE · INVENTORY  —  V9 (nâng cấp từ V8 theo spec)
   Cấu trúc file:
     1. CONSTANTS          — trạng thái, màu, nhãn VN, permission
     2. REAL DATA          — 129 SKU thật (xuất nhập tồn 30 ngày)
     3. DEMO SEED          — NCC / PO / proposal / plan / POS_MAP demo
     4. HELPERS            — storage fallback, ngày, format, validation
     5. ENGINES            — velocity, timeline, enrich, budget, allocation, combo
     6. UI COMPONENTS      — Badge, Card, Modal, Toast, Confirm, bảng
     7. MAIN APP           — state, memo, tab, modal, layout
   ═══════════════════════════════════════════════════════════════ */

/* ═══ 1. CONSTANTS ═══ */
const BRANDS=["NEVOR","UHERO","MONA MASK"];
const PS_C={Launch:{c:"#1D4ED8",bg:"#DBEAFE"},Scale:{c:"#059669",bg:"#D1FAE5"},Maintain:{c:"#6B7280",bg:"#F3F4F6"},Clearance:{c:"#EA580C",bg:"#FFEDD5"},Stop:{c:"#DC2626",bg:"#FEE2E2"}};
const SR_C={Safe:{c:"#059669",bg:"#D1FAE5"},Watch:{c:"#D97706",bg:"#FEF3C7"},"Stockout Risk":{c:"#DC2626",bg:"#FEE2E2"},"Urgent Buy":{c:"#fff",bg:"#DC2626"},"Không mua":{c:"#EA580C",bg:"#FFEDD5"},"Thiếu dữ liệu":{c:"#6B7280",bg:"#F3F4F6"}};
const IR_C={Healthy:{c:"#059669",bg:"#D1FAE5"},Watch:{c:"#D97706",bg:"#FEF3C7"},Excess:{c:"#EA580C",bg:"#FFEDD5"},Liquidate:{c:"#fff",bg:"#991B1B"},"MOQ-bound":{c:"#4338CA",bg:"#E0E7FF"},"Chưa bán":{c:"#6B7280",bg:"#F3F4F6"}};
const IR_HEX={Healthy:"#059669",Watch:"#D97706",Excess:"#EA580C",Liquidate:"#991B1B","MOQ-bound":"#4338CA","Chưa bán":"#9CA3AF"};
const OR_C={Safe:{c:"#059669",bg:"#D1FAE5"},Watch:{c:"#D97706",bg:"#FEF3C7"},Risk:{c:"#EA580C",bg:"#FFEDD5"},"High Risk":{c:"#fff",bg:"#DC2626"},"—":{c:"#9CA3AF",bg:"#F9FAFB"}};
const PR_C={SYSTEM_SUGGESTED:{c:"#6B7280",bg:"#F3F4F6"},DRAFT:{c:"#6B7280",bg:"#E5E7EB"},SUBMITTED_TO_LEADER:{c:"#2563EB",bg:"#DBEAFE"},REVISION_REQUESTED:{c:"#EA580C",bg:"#FFEDD5"},LEADER_REJECTED:{c:"#991B1B",bg:"#FEE2E2"},SUBMITTED_TO_CEO:{c:"#7C3AED",bg:"#EDE9FE"},CEO_APPROVED:{c:"#065F46",bg:"#D1FAE5"},CEO_REJECTED:{c:"#991B1B",bg:"#FEE2E2"},PO_CREATED:{c:"#059669",bg:"#D1FAE5"},CANCELLED:{c:"#6B7280",bg:"#F3F4F6"},CLOSED:{c:"#6B7280",bg:"#F3F4F6"}};
/* PR đang hoạt động — chặn tạo PR trùng nhu cầu (spec P0.1) */
const PR_ACTIVE=["DRAFT","SUBMITTED_TO_LEADER","REVISION_REQUESTED","SUBMITTED_TO_CEO","CEO_APPROVED"];
const ETA_C={ON_TRACK:{c:"#059669",bg:"#D1FAE5"},AT_RISK:{c:"#D97706",bg:"#FEF3C7"},DELAYED_CONFIRMED:{c:"#EA580C",bg:"#FFEDD5"},DELAYED_UNCONFIRMED:{c:"#fff",bg:"#DC2626"},ARRIVED:{c:"#6B7280",bg:"#F3F4F6"}};
const PO_C={Draft:{c:"#6B7280",bg:"#F3F4F6"},"Ordered Supplier":{c:"#2563EB",bg:"#DBEAFE"},"Deposit Confirmed":{c:"#D97706",bg:"#FEF3C7"},"In Production":{c:"#EA580C",bg:"#FFEDD5"},"QC Pending":{c:"#B45309",bg:"#FEF3C7"},"QC Passed":{c:"#065F46",bg:"#D1FAE5"},"Ready To Ship":{c:"#0E7490",bg:"#CFFAFE"},Shipping:{c:"#BE185D",bg:"#FCE7F3"},Customs:{c:"#4338CA",bg:"#E0E7FF"},"Arrived Warehouse":{c:"#0891B2",bg:"#CFFAFE"},"Waiting POS Import":{c:"#D97706",bg:"#FEF3C7"},"POS Synced":{c:"#059669",bg:"#D1FAE5"},"PO Mismatch":{c:"#fff",bg:"#DC2626"},Cancelled:{c:"#6B7280",bg:"#E5E7EB"},Closed:{c:"#6B7280",bg:"#F3F4F6"}};
const SP_C={Draft:{c:"#6B7280",bg:"#F3F4F6"},Submitted:{c:"#2563EB",bg:"#DBEAFE"},Approved:{c:"#065F46",bg:"#D1FAE5"},Locked:{c:"#4338CA",bg:"#E0E7FF"},Completed:{c:"#6B7280",bg:"#E5E7EB"}};
const BC_C={"Transfer":{c:"#0E7490",bg:"#CFFAFE"},"Buy Now":{c:"#fff",bg:"#DC2626"},"Buy This Week":{c:"#D97706",bg:"#FEF3C7"},"Buy Later":{c:"#2563EB",bg:"#DBEAFE"},"Negotiate MOQ":{c:"#4338CA",bg:"#E0E7FF"},"Switch Supplier":{c:"#BE185D",bg:"#FCE7F3"},"Do Not Buy":{c:"#6B7280",bg:"#F3F4F6"}};

/* Nhãn tiếng Việt — hiển thị; mã trạng thái trong code giữ tiếng Anh */
const VN={
 SYSTEM_SUGGESTED:"Hệ thống đề xuất",DRAFT:"PR nháp",SUBMITTED_TO_LEADER:"Chờ Leader duyệt",REVISION_REQUESTED:"Yêu cầu chỉnh sửa",LEADER_REJECTED:"Leader từ chối",SUBMITTED_TO_CEO:"Chờ CEO duyệt",CEO_APPROVED:"CEO đã duyệt",CEO_REJECTED:"CEO từ chối",PO_CREATED:"Đã tạo PO",CANCELLED:"Đã huỷ",CLOSED:"Đã đóng",
 ON_TRACK:"Đúng tiến độ",AT_RISK:"Có rủi ro",DELAYED_CONFIRMED:"Trễ — có ETA mới",DELAYED_UNCONFIRMED:"ETA UNKNOWN — quá hạn",ARRIVED:"Đã về",
 "Urgent Buy":"Cần mua gấp","Stockout Risk":"Nguy cơ hết hàng",Safe:"An toàn",Watch:"Theo dõi","Không mua":"Không mua","Thiếu dữ liệu":"Thiếu dữ liệu",
 Healthy:"Khoẻ",Excess:"Thừa hàng",Liquidate:"Xả tồn","MOQ-bound":"Kẹt MOQ","Chưa bán":"Chưa bán",
 Launch:"Launch",Scale:"Scale",Maintain:"Duy trì",Clearance:"Xả tồn",Stop:"Dừng KD",
 Risk:"Rủi ro","High Risk":"Rủi ro cao","—":"—",
 Draft:"Nháp","Ordered Supplier":"Đã đặt NCC","Deposit Confirmed":"Đã cọc","In Production":"Đang sản xuất","QC Pending":"Chờ QC","QC Passed":"QC đạt","Ready To Ship":"Sẵn sàng giao",Shipping:"Đang vận chuyển",Customs:"Thông quan","Arrived Warehouse":"Về kho","Waiting POS Import":"Chờ nhập POS","POS Synced":"Đã nhập POS","PO Mismatch":"Lệch nhận hàng",Cancelled:"Đã huỷ",Closed:"Đã đóng",
 Submitted:"Đã gửi duyệt",Approved:"Đã duyệt",Locked:"Đã khoá",Completed:"Hoàn tất",
 Transfer:"Chuyển kho",
 "Buy Now":"Mua ngay","Buy This Week":"Mua trong tuần","Buy Later":"Mua sau","Negotiate MOQ":"Đàm phán MOQ","Switch Supplier":"Đổi NCC","Do Not Buy":"Không mua",
};
const vn=s=>VN[s]||s;

const PO_NEXT={
 "Draft":["Ordered Supplier","Cancelled"],
 "Ordered Supplier":["Cancelled"],
 "Deposit Confirmed":["In Production","Cancelled"],
 "In Production":["QC Pending"],
 "QC Pending":["QC Passed"],
 "QC Passed":["Ready To Ship"],
 "Ready To Ship":["Shipping"],
 "Shipping":["Customs"],
 "Customs":["Arrived Warehouse"],
 "Arrived Warehouse":[],   /* chỉ đi tiếp qua Goods Receipt */
 "Waiting POS Import":["POS Synced","PO Mismatch"],
 "PO Mismatch":["POS Synced","Closed"],
 "POS Synced":["Closed"],
};
/* Incoming chỉ tính PO đã chắc chắn (spec §3) */
const INCOMING_ST=["Deposit Confirmed","In Production","QC Pending","QC Passed","Ready To Ship","Shipping","Customs","Arrived Warehouse","Waiting POS Import","PO Mismatch"];
/* Committed = PO đã phát hành, chưa huỷ/chưa đóng (spec §5.2) */
const COMMITTED_ST=["Ordered Supplier","Deposit Confirmed","In Production","QC Pending","QC Passed","Ready To Ship","Shipping","Customs","Arrived Warehouse","Waiting POS Import","PO Mismatch","POS Synced"];
const IN_TRANSIT=["Ordered Supplier","Deposit Confirmed","In Production","QC Pending","QC Passed","Ready To Ship","Shipping","Customs"];
const FINAL_PAY_ST=["QC Passed","Ready To Ship","Shipping"];
const ADJ_REASONS=["MOQ requirement","Supplier discount","Campaign scale","Cashflow limitation","Slow-moving risk","CEO instruction","Bundle/combo plan","Supplier stock limitation"];
const MM_OPTIONS=["NCC giao bù","NCC hoàn tiền","Chấp nhận giao thiếu","Hàng lỗi trả lại","Tạo PO bổ sung","Điều chỉnh PO","Chờ xử lý"];

/* ═══ Phân quyền (spec §24) — demo, không phải bảo mật thật ═══ */
/* P1.5: tách trách nhiệm — Purchasing KHÔNG có po.goodsReceipt / po.qc */
const PERMISSIONS={
 CEO:["proposal.create","proposal.edit","proposal.submitLeader","proposal.reviewLeader","proposal.approveCEO","po.create","po.updateProgress","po.confirmDeposit","po.confirmFinal","po.finalOverride","po.resolveMismatch","po.goodsReceipt","po.qc","po.actualCost","inventory.transfer","supplier.edit","salesPlan.edit","campaign.approve","budget.edit","pos.import","data.edit","config.edit"],
 Leader:["proposal.edit","proposal.reviewLeader","salesPlan.edit","po.updateProgress","data.edit"],
 Purchasing:["proposal.create","proposal.edit","proposal.submitLeader","po.create","po.updateProgress","po.resolveMismatch","supplier.edit","pos.import","data.edit"],
 Warehouse:["po.goodsReceipt","inventory.transfer","pos.import"],
 QC:["po.qc"],
 Accounting:["po.confirmDeposit","po.confirmFinal","po.actualCost","budget.edit","config.edit"],
 "Sales Planner":["salesPlan.edit"],
 "E-commerce Lead":["salesPlan.edit"],
 "Growth Lead":["salesPlan.edit","campaign.approve"],
 Viewer:[],
};
const ROLES=Object.keys(PERMISSIONS);

const NEED_PROFIT=["sellPrice"];
const NEED_BUY=["leadTime","moq","packSize","productStatus"];
const FIELD_VN={sellPrice:"Giá bán",leadTime:"Lead time",moq:"MOQ",packSize:"Pack size",productStatus:"Trạng thái SP",mainSupplier:"NCC chính",sold7:"Bán 7 ngày",sold60:"Bán 60 ngày",owner:"Người phụ trách"};

const DEFAULT_CFG={
  cashBalance:0, dso:7, liqDays:120, excessDays:90,
  minSafetyDays:5, useDynamicSafety:true, depositPct:0.3,
  targetCoverDefault:45,
  feeRate:{NEVOR:0.32,UHERO:0.32,"MONA MASK":0.32},
  brandBudgets:{NEVOR:0,UHERO:0,"MONA MASK":0},   // ngân sách mua hàng/tháng theo brand
};
const REAL_ROWS=[
  {sku:"TCN02",productCode:"TCN02",brand:"NEVOR",name:"Tất vớ thể thao cao cấp Nevor TCN-02 thoáng khí ngăn",stockPOS:71435,stockOffice:32,stockShopee:64429,availableStock:71403,sold30:26799,returned30:2244,received30:37807,landedCost:43045},
  {sku:"GCL03-83",productCode:"GCL03",brand:"UHERO",name:"Gương cầu lồi",variant:"Hộp 2 gương",stockPOS:88555,stockOffice:8,stockShopee:0,availableStock:88547,sold30:23943,returned30:1940,received30:33782,landedCost:20224},
  {sku:"BDG12",productCode:"BDG12",brand:"NEVOR",name:"BÓ ĐẦU GỐI NEVOR BDG12",stockPOS:7517,stockOffice:17,stockShopee:0,availableStock:7500,sold30:4157,returned30:373,received30:3906,landedCost:83833},
  {sku:"DCG04",productCode:"DCG04",brand:"NEVOR",name:"Đai Chống Gù Lưng Cao Cấp DCG04 Hỗ Trợ Thoái Hoá Con",stockPOS:3528,stockOffice:9,stockShopee:0,availableStock:3519,sold30:3173,returned30:383,received30:1996,landedCost:159861},
  {sku:"DTL02",productCode:"DTL02",brand:"NEVOR",name:"Đai lưng cột sống Nevor DTL02",stockPOS:7300,stockOffice:6,stockShopee:0,availableStock:7294,sold30:3000,returned30:442,received30:4940,landedCost:35973},
  {sku:"KL02-1C",productCode:"KL02",brand:"UHERO",name:"UHERO Khăn lau ô tô KL02 sợi superfine fiber 650gsm ",variant:"1 Chiếc khăn 40X40CM",stockPOS:16799,stockOffice:17,stockShopee:0,availableStock:16782,sold30:1710,returned30:64,received30:1,landedCost:13564},
  {sku:"BDG02",productCode:"BDG02",brand:"NEVOR",name:"BÓ ĐẦU GỐI NEVOR BDG02",stockPOS:3617,stockOffice:2,stockShopee:0,availableStock:3615,sold30:22,returned30:0,received30:0,landedCost:56443},
  {sku:"BDG14",productCode:"BDG14",brand:"NEVOR",name:"Bó đầu gối 14",stockPOS:1992,stockOffice:5,stockShopee:0,availableStock:1987,sold30:1039,returned30:105,received30:1848,landedCost:87212},
  {sku:"DCG03",productCode:"DCG03",brand:"NEVOR",name:"Đai chống gù lưng cao cấp Nevor 2023  định hình cột ",stockPOS:1349,stockOffice:2,stockShopee:0,availableStock:1347,sold30:378,returned30:51,received30:200,landedCost:128059},
  {sku:"BQCC04",productCode:"BQCC04",brand:"NEVOR",name:"Băng cuốn cổ chân Nevor BQCC04",stockPOS:3894,stockOffice:7,stockShopee:0,availableStock:3887,sold30:866,returned30:92,received30:2003,landedCost:38854},
  {sku:"PHAV05",productCode:"PHAV05",brand:"UHERO",name:"Giá đỡ điện thoại PHAV05",variant:"Gắn Taplo/Kính",stockPOS:3787,stockOffice:9,stockShopee:9,availableStock:3778,sold30:4526,returned30:328,received30:4025,landedCost:37054},
  {sku:"UTCN01-CS",productCode:"UTCN01",brand:"UHERO",name:"Tấm chắn nắng Uhero UTCN01",variant:"1 Vuông của sau",stockPOS:7802,stockOffice:1,stockShopee:0,availableStock:7801,sold30:2546,returned30:324,received30:6508,landedCost:16967},
  {sku:"CNKL-D",productCode:"CNKL-D",brand:"UHERO",name:"Chắn nắng kính lái dạng dính 62*68 cm",variant:"Bộ 2 chiếc kính truóc dính",stockPOS:1477,stockOffice:2,stockShopee:0,availableStock:1475,sold30:160,returned30:31,received30:1500,landedCost:86273},
  {sku:"BTH01-11",productCode:"BTH01",brand:"UHERO",name:"Búa thoát hiểm 4 trong 1 kiêm bảng số điện thoại",variant:"Đỏ",stockPOS:1875,stockOffice:5,stockShopee:0,availableStock:1870,sold30:30,returned30:2,received30:0,landedCost:60405},
  {sku:"UWCP01-91",productCode:"UWCP01",brand:"UHERO",name:"Bộ Chuyển Đổi Carplay",variant:"Đen",stockPOS:500,stockOffice:0,stockShopee:0,availableStock:500,sold30:0,returned30:0,received30:500,landedCost:180000},
  {sku:"UTCN01-CTP",productCode:"UTCN01",brand:"UHERO",name:"Tấm chắn nắng Uhero UTCN01",variant:"1 Tam giác ghế phụ",stockPOS:4988,stockOffice:1,stockShopee:0,availableStock:4987,sold30:925,returned30:144,received30:3923,landedCost:16956},
  {sku:"BQCC06",productCode:"BQCC06",brand:"NEVOR",name:"Bó cổ chân Nevor BQCC06",stockPOS:1836,stockOffice:1,stockShopee:0,availableStock:1835,sold30:787,returned30:49,received30:1380,landedCost:39583},
  {sku:"CNKL-KD",productCode:"CNKL-KD",brand:"UHERO",name:"chắn năng bản không dính CNKL-KD",variant:"Kính trước không dính",stockPOS:1205,stockOffice:1,stockShopee:0,availableStock:1204,sold30:329,returned30:20,received30:1498,landedCost:59950},
  {sku:"DCG05",productCode:"DCG05",brand:"NEVOR",name:"Đai Chống Gù",stockPOS:532,stockOffice:1,stockShopee:0,availableStock:531,sold30:52,returned30:7,received30:0,landedCost:120148},
  {sku:"UTCN01-CTL",productCode:"UTCN01",brand:"UHERO",name:"Tấm chắn nắng Uhero UTCN01",variant:"1 Tam giác ghê lái",stockPOS:3249,stockOffice:1,stockShopee:0,availableStock:3248,sold30:960,returned30:142,received30:2012,landedCost:16962},
  {sku:"KL01-30x30-01",productCode:"KL01",brand:"UHERO",name:"Khăn lau xe KL01 chuyên dụng Microfiber siêu thấm kh",variant:"Kích Thước:30cnx30cm, Phân Loại:1 ",stockPOS:17044,stockOffice:3,stockShopee:0,availableStock:17041,sold30:2625,returned30:121,received30:0,landedCost:3172},
  {sku:"DTL03",productCode:"DTL03",brand:"NEVOR",name:"Đai Thắt lưng DTL03",stockPOS:461,stockOffice:2,stockShopee:0,availableStock:459,sold30:256,returned30:28,received30:180,landedCost:116085},
  {sku:"TSN01-91",productCode:"TSN01",brand:"UHERO",name:"Tẩu sạc nhanh 48w",variant:"Tẩu Sạc Đen",stockPOS:921,stockOffice:7,stockShopee:1,availableStock:914,sold30:535,returned30:34,received30:1000,landedCost:54772},
  {sku:"BDG06",productCode:"BDG06",brand:"NEVOR",name:"BÓ ĐẦU GỐI NEVOR BDG06",stockPOS:1293,stockOffice:2,stockShopee:0,availableStock:1291,sold30:416,returned30:38,received30:851,landedCost:37347},
  {sku:"TCN06",productCode:"TCN06",brand:"NEVOR",name:"Tất vớ thể thao cao cấp Nevor TCN-06 thoáng khí ngăn",stockPOS:2102,stockOffice:19,stockShopee:0,availableStock:2083,sold30:733,returned30:30,received30:1490,landedCost:22713},
  {sku:"TCN03",productCode:"TCN03",brand:"NEVOR",name:"Tất vớ thể thao công nghệ Nevor TCN-03 thoáng khí ng",stockPOS:2207,stockOffice:9,stockShopee:0,availableStock:2198,sold30:598,returned30:32,received30:0,landedCost:21266},
  {sku:"TCN07",productCode:"TCN07",brand:"NEVOR",name:"Tất thể thao World Cup Nevor TCN07 thoáng khí ngăn n",stockPOS:1970,stockOffice:6,stockShopee:0,availableStock:1964,sold30:112,returned30:12,received30:2070,landedCost:20000},
  {sku:"BQCC05",productCode:"BQCC05",brand:"NEVOR",name:"Băng quốn cổ chân BQCC05",stockPOS:1799,stockOffice:6,stockShopee:0,availableStock:1793,sold30:1056,returned30:73,received30:903,landedCost:20744},
  {sku:"CNC02-91",productCode:"CNC02",brand:"UHERO",name:"Dây Sạc Nhanh CNC-02 Tự Thu Gọn Uhero và Dây Sạc Từ ",variant:"Đen 1 chiếc",stockPOS:604,stockOffice:15,stockShopee:0,availableStock:589,sold30:605,returned30:37,received30:705,landedCost:59694},
  {sku:"BCT02",productCode:"BCT02",brand:"NEVOR",name:"Băng cổ tay cao cấp Nevor BCT02 bảo vệ",stockPOS:1746,stockOffice:2,stockShopee:0,availableStock:1744,sold30:228,returned30:13,received30:0,landedCost:19683},
  {sku:"DCTH",productCode:"DCTH",brand:"UHERO",name:"Đệm ngồi công thái học Uhero ComfortCare mút hoạt tí",variant:"Ruột Đệm công thái học",stockPOS:225,stockOffice:3,stockShopee:0,availableStock:222,sold30:263,returned30:34,received30:0,landedCost:142965},
  {sku:"PHAV03-91",productCode:"PHAV03",brand:"UHERO",name:"Giá đỡ điện thoại sạc nhanh không dây UHERO PHAV03 g",variant:"Giá gắn cửa điều hoà",stockPOS:267,stockOffice:4,stockShopee:0,availableStock:263,sold30:5,returned30:0,received30:0,landedCost:117819},
  {sku:"TSN01-01",productCode:"TSN01",brand:"UHERO",name:"Tẩu sạc nhanh 48w",variant:"Tẩu Sạc Trong Suốt",stockPOS:564,stockOffice:7,stockShopee:3,availableStock:557,sold30:476,returned30:31,received30:0,landedCost:54065},
  {sku:"DN04",productCode:"DN04",brand:"NEVOR",name:"Dây nhảy DN04",stockPOS:2887,stockOffice:0,stockShopee:0,availableStock:2887,sold30:723,returned30:61,received30:0,landedCost:10272},
  {sku:"UTCN01-T",productCode:"UTCN01",brand:"UHERO",name:"Tấm chắn nắng Uhero UTCN01",variant:"Túi đựng",stockPOS:4014,stockOffice:0,stockShopee:0,availableStock:4014,sold30:696,returned30:110,received30:4500,landedCost:7193},
  {sku:"KL02-40X80-1C",productCode:"KL02",brand:"UHERO",name:"UHERO Khăn lau ô tô KL02 sợi superfine fiber 650gsm ",variant:"1 Chiếc khăn 40x80CM",stockPOS:1131,stockOffice:13,stockShopee:0,availableStock:1118,sold30:178,returned30:8,received30:1000,landedCost:24504},
  {sku:"BLTM02-1C",productCode:"BLTM02",brand:"UHERO",name:"UHERO Bơm lốp kích bình ô tô 4in1 ForceX kèm sạc dự ",variant:"1 Bộ Bơm Lốp",stockPOS:42,stockOffice:6,stockShopee:0,availableStock:36,sold30:3,returned30:30,received30:0,landedCost:636132},
  {sku:"BDG17",productCode:"BDG17",brand:"NEVOR",name:"Bó đầu gói BDG17",stockPOS:588,stockOffice:1,stockShopee:0,availableStock:587,sold30:320,returned30:13,received30:0,landedCost:45410},
  {sku:"UTSN",productCode:"UTSN",brand:"UHERO",name:"Tẩu sạc siêu nhanh Supercharge 100W UTSN",variant:"Đen",stockPOS:499,stockOffice:0,stockShopee:0,availableStock:499,sold30:0,returned30:0,received30:500,landedCost:50000},
  {sku:"GCL01",productCode:"GCL01",brand:"UHERO",name:"Gương cầu lồi",variant:"Cặp 2 Gương Cầu lồi",stockPOS:1554,stockOffice:6,stockShopee:0,availableStock:1548,sold30:2375,returned30:127,received30:0,landedCost:15599},
  {sku:"BTH01-81",productCode:"BTH01",brand:"UHERO",name:"Búa thoát hiểm 4 trong 1 kiêm bảng số điện thoại",variant:"Xám",stockPOS:390,stockOffice:4,stockShopee:0,availableStock:386,sold30:87,returned30:3,received30:0,landedCost:60377},
  {sku:"PHAV06",productCode:"PHAV06",brand:"UHERO",name:"Giá đỡ điện thoại PHAV06",variant:"Giá  PHAV06",stockPOS:468,stockOffice:0,stockShopee:0,availableStock:468,sold30:7,returned30:0,received30:0,landedCost:50000},
  {sku:"DKL01",productCode:"DKL01",brand:"NEVOR",name:"Combo Dây Kháng Lực DKL01",stockPOS:5291,stockOffice:0,stockShopee:0,availableStock:5291,sold30:829,returned30:47,received30:0,landedCost:4352},
  {sku:"CNC02-81",productCode:"CNC02",brand:"UHERO",name:"Dây Sạc Nhanh CNC-02 Tự Thu Gọn Uhero và Dây Sạc Từ ",variant:"Xám 1  chiếc",stockPOS:369,stockOffice:16,stockShopee:0,availableStock:353,sold30:357,returned30:25,received30:496,landedCost:60182},
  {sku:"VDCTH-X",productCode:"DCTH",brand:"UHERO",name:"Đệm ngồi công thái học Uhero ComfortCare mút hoạt tí",variant:"Vỏ xám",stockPOS:538,stockOffice:3,stockShopee:0,availableStock:535,sold30:181,returned30:23,received30:0,landedCost:39720},
  {sku:"VDCTH-D",productCode:"DCTH",brand:"UHERO",name:"Đệm ngồi công thái học Uhero ComfortCare mút hoạt tí",variant:"Vỏ đen",stockPOS:539,stockOffice:2,stockShopee:0,availableStock:537,sold30:173,returned30:23,received30:0,landedCost:39571},
  {sku:"BS02-BAC-VN",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Bạc, Cờ Việt Nam",stockPOS:679,stockOffice:2,stockShopee:0,availableStock:677,sold30:176,returned30:1,received30:400,landedCost:29306},
  {sku:"GCL02",productCode:"GCL02",brand:"UHERO",name:"Hộp 2 gương cầu lồi GCL02 xóa điểm mù 2 trong 1 kèm ",variant:"1 Cặp Trái Phải",stockPOS:918,stockOffice:3,stockShopee:0,availableStock:915,sold30:0,returned30:0,received30:0,landedCost:20453},
  {sku:"BDG13",productCode:"BDG13",brand:"NEVOR",name:"Bó Gối Thể Thao Nevor BDG13",stockPOS:295,stockOffice:2,stockShopee:0,availableStock:293,sold30:1,returned30:0,received30:0,landedCost:59169},
  {sku:"BCT01",productCode:"BCT01",brand:"NEVOR",name:"Băng cổ tay BCT01",stockPOS:632,stockOffice:10,stockShopee:0,availableStock:622,sold30:279,returned30:17,received30:0,landedCost:25598},
  {sku:"M01",productCode:"M01",brand:"NEVOR",name:"Mũ thể thao Nevor Ace M01 chắn nắng",stockPOS:779,stockOffice:2,stockShopee:0,availableStock:777,sold30:169,returned30:5,received30:0,landedCost:19683},
  {sku:"TCN01",productCode:"TCN01",brand:"NEVOR",name:"Tất vớ thể thao Nevor TCN-01 cao cấp cải thiện hiệu ",stockPOS:631,stockOffice:12,stockShopee:0,availableStock:619,sold30:295,returned30:13,received30:0,landedCost:21250},
  {sku:"BS02-BAC-10",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Bạc, Xe Vinfast",stockPOS:432,stockOffice:0,stockShopee:0,availableStock:432,sold30:68,returned30:3,received30:0,landedCost:30682},
  {sku:"UGMS-16",productCode:"UGMS",brand:"UHERO",name:"Gạt Nước Mưa Silicon",variant:"16",stockPOS:435,stockOffice:0,stockShopee:0,availableStock:435,sold30:0,returned30:0,received30:435,landedCost:30000},
  {sku:"UGMS-24",productCode:"UGMS",brand:"UHERO",name:"Gạt Nước Mưa Silicon",variant:"24",stockPOS:434,stockOffice:0,stockShopee:0,availableStock:434,sold30:0,returned30:0,received30:434,landedCost:30000},
  {sku:"TDN01-91",productCode:"TDN01",brand:"UHERO",name:"Utility Túi đựng da cao cấp đa năng treo ghế ô tô TD",variant:"Túi đa năng cao cấp TDN-01",stockPOS:166,stockOffice:3,stockShopee:0,availableStock:163,sold30:0,returned30:9,received30:0,landedCost:74880},
  {sku:"UGMS-19",productCode:"UGMS",brand:"UHERO",name:"Gạt Nước Mưa Silicon",variant:"19",stockPOS:375,stockOffice:0,stockShopee:0,availableStock:375,sold30:0,returned30:0,received30:375,landedCost:30000},
  {sku:"UGMS-K-1",productCode:"UGMS-K",brand:"UHERO",name:"Đầu nối cần gạt nước Adapter",variant:"1",stockPOS:1083,stockOffice:0,stockShopee:0,availableStock:1083,sold30:0,returned30:0,received30:1083,landedCost:10000},
  {sku:"BS02-DEN-03",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Đen, Xe Toyota",stockPOS:346,stockOffice:0,stockShopee:0,availableStock:346,sold30:55,returned30:0,received30:300,landedCost:29091},
  {sku:"MC01-91",productCode:"MC01",brand:"UHERO",name:"Móc cài MC01",variant:"Móc cài 01",stockPOS:1420,stockOffice:6,stockShopee:0,availableStock:1414,sold30:721,returned30:42,received30:30,landedCost:6253},
  {sku:"UGMS-18",productCode:"UGMS",brand:"UHERO",name:"Gạt Nước Mưa Silicon",variant:"18",stockPOS:289,stockOffice:0,stockShopee:0,availableStock:289,sold30:0,returned30:0,received30:289,landedCost:30000},
  {sku:"BM01",productCode:"BM01",brand:"NEVOR",name:"Bịt mặt ngủ Nevor BM01 che sáng",stockPOS:823,stockOffice:0,stockShopee:0,availableStock:823,sold30:112,returned30:9,received30:0,landedCost:9000},
  {sku:"UDTL-D",productCode:"UDTL",brand:"UHERO",name:"Đêm tựa lưng",variant:"Đen",stockPOS:111,stockOffice:2,stockShopee:0,availableStock:109,sold30:56,returned30:6,received30:100,landedCost:64324},
  {sku:"BS02-DEN-00",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Đen, Không logo",stockPOS:247,stockOffice:1,stockShopee:0,availableStock:246,sold30:93,returned30:2,received30:100,landedCost:28520},
  {sku:"BS02-DEN-10",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Đen, Xe Vinfast",stockPOS:245,stockOffice:1,stockShopee:0,availableStock:244,sold30:178,returned30:10,received30:100,landedCost:28622},
  {sku:"UGMS-22",productCode:"UGMS",brand:"UHERO",name:"Gạt Nước Mưa Silicon",variant:"22",stockPOS:217,stockOffice:0,stockShopee:0,availableStock:217,sold30:0,returned30:0,received30:217,landedCost:30000},
  {sku:"UGMS-K-6",productCode:"UGMS-K",brand:"UHERO",name:"Đầu nối cần gạt nước Adapter",variant:"6",stockPOS:608,stockOffice:0,stockShopee:0,availableStock:608,sold30:0,returned30:0,received30:608,landedCost:10000},
  {sku:"BS02-DEN-VN",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Đen, Cờ Việt Nam",stockPOS:200,stockOffice:5,stockShopee:0,availableStock:195,sold30:249,returned30:8,received30:0,landedCost:28663},
  {sku:"MD01",productCode:"MD01",brand:"NEVOR",name:"Miếng dan dai thay thế",stockPOS:2303,stockOffice:0,stockShopee:0,availableStock:2303,sold30:18,returned30:0,received30:0,landedCost:2258},
  {sku:"UDTL-X",productCode:"UDTL",brand:"UHERO",name:"Đêm tựa lưng",variant:"Xám",stockPOS:83,stockOffice:2,stockShopee:0,availableStock:81,sold30:38,returned30:1,received30:1,landedCost:60058},
  {sku:"UGMS-26",productCode:"UGMS",brand:"UHERO",name:"Gạt Nước Mưa Silicon",variant:"26",stockPOS:162,stockOffice:0,stockShopee:0,availableStock:162,sold30:0,returned30:0,received30:162,landedCost:30000},
  {sku:"BS02-DEN-09",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Đen, Xe Honda",stockPOS:156,stockOffice:0,stockShopee:0,availableStock:156,sold30:27,returned30:2,received30:150,landedCost:31110},
  {sku:"BTH01-61",productCode:"BTH01",brand:"UHERO",name:"Búa thoát hiểm 4 trong 1 kiêm bảng số điện thoại",variant:"Xanh",stockPOS:76,stockOffice:3,stockShopee:0,availableStock:73,sold30:51,returned30:2,received30:0,landedCost:60787},
  {sku:"BS02-DEN-04",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Đen, Xe Ford",stockPOS:143,stockOffice:0,stockShopee:0,availableStock:143,sold30:30,returned30:0,received30:150,landedCost:28694},
  {sku:"BGN01",productCode:"BGN01",brand:"NEVOR",name:"Bình giữ nhiệt Nevor BGN01 vật liệu inox dung tích 5",stockPOS:30,stockOffice:5,stockShopee:0,availableStock:25,sold30:336,returned30:91,received30:0,landedCost:127654},
  {sku:"BTH01-91",productCode:"BTH01",brand:"UHERO",name:"Búa thoát hiểm 4 trong 1 kiêm bảng số điện thoại",variant:"Đen",stockPOS:54,stockOffice:4,stockShopee:0,availableStock:50,sold30:1,returned30:1,received30:0,landedCost:61803},
  {sku:"BS02-DEN-06",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Đen, Xe Mitsubishi",stockPOS:105,stockOffice:0,stockShopee:0,availableStock:105,sold30:32,returned30:1,received30:100,landedCost:28748},
  {sku:"BS02-DEN-01",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Đen, Xe HyunDai",stockPOS:99,stockOffice:0,stockShopee:0,availableStock:99,sold30:40,returned30:1,received30:0,landedCost:28746},
  {sku:"BS02-DEN-07",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Đen, Xe KIA New",stockPOS:94,stockOffice:0,stockShopee:0,availableStock:94,sold30:43,returned30:2,received30:50,landedCost:29248},
  {sku:"UGMS-14",productCode:"UGMS",brand:"UHERO",name:"Gạt Nước Mưa Silicon",variant:"14",stockPOS:88,stockOffice:0,stockShopee:0,availableStock:88,sold30:0,returned30:0,received30:88,landedCost:30000},
  {sku:"BS02-DEN-05",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Đen, Xe Mercedes",stockPOS:82,stockOffice:0,stockShopee:0,availableStock:82,sold30:20,returned30:1,received30:0,landedCost:30211},
  {sku:"BS02-DEN-02",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Đen, Xe KIA",stockPOS:86,stockOffice:0,stockShopee:0,availableStock:86,sold30:13,returned30:0,received30:0,landedCost:28734},
  {sku:"BS02-BAC-01",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Bạc, Xe HyunDai",stockPOS:82,stockOffice:1,stockShopee:0,availableStock:81,sold30:10,returned30:1,received30:0,landedCost:29752},
  {sku:"BS02-BAC-08",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Bạc, Xe Mazda",stockPOS:82,stockOffice:0,stockShopee:0,availableStock:82,sold30:31,returned30:2,received30:0,landedCost:27342},
  {sku:"BS02-DEN-08",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Đen, Xe Mazda",stockPOS:78,stockOffice:0,stockShopee:0,availableStock:78,sold30:75,returned30:0,received30:0,landedCost:28552},
  {sku:"BS02-BAC-02",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Bạc, Xe KIA",stockPOS:68,stockOffice:0,stockShopee:0,availableStock:68,sold30:7,returned30:0,received30:50,landedCost:26740},
  {sku:"PHAV03-CH",productCode:"PHAV03",brand:"UHERO",name:"Giá đỡ điện thoại sạc nhanh không dây UHERO PHAV03 g",variant:"Chân hút taplo/kính",stockPOS:89,stockOffice:5,stockShopee:0,availableStock:84,sold30:2,returned30:0,received30:0,landedCost:19816},
  {sku:"BS02-BAC-PC",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Bạc, Xe Porsche",stockPOS:59,stockOffice:1,stockShopee:0,availableStock:58,sold30:2,returned30:0,received30:0,landedCost:27279},
  {sku:"UGMS-K-4",productCode:"UGMS-K",brand:"UHERO",name:"Đầu nối cần gạt nước Adapter",variant:"4",stockPOS:152,stockOffice:0,stockShopee:0,availableStock:152,sold30:0,returned30:0,received30:152,landedCost:10000},
  {sku:"UGMS-K-10",productCode:"UGMS-K",brand:"UHERO",name:"Đầu nối cần gạt nước Adapter",variant:"10",stockPOS:150,stockOffice:0,stockShopee:0,availableStock:150,sold30:0,returned30:0,received30:150,landedCost:10000},
  {sku:"BS02-DEN-LX",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Đen, Xe Lexus",stockPOS:49,stockOffice:1,stockShopee:0,availableStock:48,sold30:5,returned30:2,received30:0,landedCost:28546},
  {sku:"UTCN01-1B",productCode:"UTCN01",brand:"UHERO",name:"Tấm chắn nắng Uhero UTCN01",variant:"Bộ 4 tấm ( 2 Cửa trước 2 cửa sau)",stockPOS:19,stockOffice:11,stockShopee:0,availableStock:8,sold30:0,returned30:0,received30:0,landedCost:70048},
  {sku:"BS02-DEN-PC",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Đen, Xe Porsche",stockPOS:46,stockOffice:1,stockShopee:0,availableStock:45,sold30:0,returned30:0,received30:0,landedCost:27453},
  {sku:"DTL01",productCode:"DTL01",brand:"NEVOR",name:"Đai lưng cột sống Nevor DTL01",stockPOS:14,stockOffice:2,stockShopee:0,availableStock:12,sold30:0,returned30:0,received30:0,landedCost:84286},
  {sku:"BS02-BAC-05",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Bạc, Xe Mercedes",stockPOS:37,stockOffice:1,stockShopee:0,availableStock:36,sold30:2,returned30:0,received30:0,landedCost:30040},
  {sku:"BS02-BAC-LX",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Bạc, Xe Lexus",stockPOS:45,stockOffice:1,stockShopee:0,availableStock:44,sold30:6,returned30:0,received30:30,landedCost:19769},
  {sku:"BS02-BAC-07",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Bạc, Xe KIA New",stockPOS:28,stockOffice:0,stockShopee:0,availableStock:28,sold30:9,returned30:0,received30:50,landedCost:30892},
  {sku:"BS02-BAC-00",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Bạc, Không logo",stockPOS:25,stockOffice:1,stockShopee:0,availableStock:24,sold30:45,returned30:4,received30:0,landedCost:27214},
  {sku:"CNC-01-1CL",productCode:"CNC-01",brand:"UHERO",name:"Dây Sạc Nhanh Tự Thu Gọn Uhero và Dây Sạc Từ Tính ch",variant:"Type C to Lightning 27W",stockPOS:13,stockOffice:2,stockShopee:0,availableStock:11,sold30:0,returned30:0,received30:0,landedCost:47778},
  {sku:"BS02-BAC-09",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Bạc, Xe Honda",stockPOS:21,stockOffice:0,stockShopee:0,availableStock:21,sold30:38,returned30:4,received30:0,landedCost:28533},
  {sku:"CNC-01-1UL",productCode:"CNC-01",brand:"UHERO",name:"Dây Sạc Nhanh Tự Thu Gọn Uhero và Dây Sạc Từ Tính ch",variant:"USB to Lightning 12W",stockPOS:12,stockOffice:1,stockShopee:0,availableStock:11,sold30:0,returned30:0,received30:0,landedCost:43975},
  {sku:"UTBH",productCode:"UTBH",brand:"UHERO",name:"[QUÀ TẶNG] THẺ BẢO HÀNH 12 THÁNG - UHERO",variant:"4",stockPOS:4719,stockOffice:0,stockShopee:0,availableStock:4719,sold30:0,returned30:0,received30:0,landedCost:100},
  {sku:"DNTM03",productCode:"DNTM03",brand:"NEVOR",name:"Dây nhảy thể lực thông minh Nevor DNTM03",stockPOS:6,stockOffice:0,stockShopee:0,availableStock:6,sold30:0,returned30:0,received30:0,landedCost:72251},
  {sku:"BS02-BAC-03",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Bạc, Xe Toyota",stockPOS:15,stockOffice:0,stockShopee:0,availableStock:15,sold30:35,returned30:2,received30:0,landedCost:28416},
  {sku:"BS02-BAC-06",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Bạc, Xe Mitsubishi",stockPOS:10,stockOffice:0,stockShopee:0,availableStock:10,sold30:19,returned30:0,received30:0,landedCost:27525},
  {sku:"GDDT03",productCode:"GDDT03",brand:"UHERO",name:"Gía đỡ điện thoại không dây",variant:"Xám",stockPOS:1,stockOffice:1,stockShopee:0,availableStock:0,sold30:0,returned30:0,received30:0,landedCost:225000},
  {sku:"CNC-01-1CC",productCode:"CNC-01",brand:"UHERO",name:"Dây Sạc Nhanh Tự Thu Gọn Uhero và Dây Sạc Từ Tính ch",variant:"Type C to Type C 100W",stockPOS:5,stockOffice:3,stockShopee:0,availableStock:2,sold30:0,returned30:0,received30:0,landedCost:42849},
  {sku:"TL01-SUV",productCode:"TL01",brand:"UHERO",name:"Túi Lưới 3 ngăn co dãn gắn ghế ô tô tiện dụng chất l",variant:"SUV",stockPOS:9,stockOffice:1,stockShopee:0,availableStock:8,sold30:0,returned30:0,received30:0,landedCost:22093},
  {sku:"HDCTH",productCode:"DCTH",brand:"UHERO",name:"Đệm ngồi công thái học Uhero ComfortCare mút hoạt tí",variant:"Hộp đệm công thái học",stockPOS:9,stockOffice:6,stockShopee:0,availableStock:3,sold30:0,returned30:0,received30:0,landedCost:14776},
  {sku:"GDDT01",productCode:"GDDT01",brand:"UHERO",name:"Gía đỡ điện thoại gương chiếu hậu xoay 1200 thế hệ m",variant:"10",stockPOS:1,stockOffice:0,stockShopee:0,availableStock:1,sold30:0,returned30:0,received30:0,landedCost:115000},
  {sku:"UGMS-K-12",productCode:"UGMS-K",brand:"UHERO",name:"Đầu nối cần gạt nước Adapter",variant:"12",stockPOS:10,stockOffice:0,stockShopee:0,availableStock:10,sold30:0,returned30:0,received30:10,landedCost:10000},
  {sku:"UTCO",productCode:"UTCO",brand:"UHERO",name:"[QUÀ TẶNG] THƯ CẢM ƠN - UHERO",variant:"Đen",stockPOS:769,stockOffice:0,stockShopee:0,availableStock:769,sold30:330,returned30:81,received30:0,landedCost:100},
  {sku:"NH01-DHB",productCode:"NH01",brand:"UHERO",name:"Combo mô hình điều hoà khuyếch tán nước hoa bằng năn",variant:"Điều Hòa Bạc",stockPOS:4,stockOffice:0,stockShopee:0,availableStock:4,sold30:0,returned30:0,received30:0,landedCost:16056},
  {sku:"BS02-BAC-TT",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Bạc, Thanh Trượt măt cờ Việt Nam",stockPOS:16,stockOffice:0,stockShopee:0,availableStock:16,sold30:0,returned30:0,received30:0,landedCost:2818},
  {sku:"CNC-01-1UC",productCode:"CNC-01",brand:"UHERO",name:"Dây Sạc Nhanh Tự Thu Gọn Uhero và Dây Sạc Từ Tính ch",variant:"USB to Type C 66W",stockPOS:1,stockOffice:1,stockShopee:0,availableStock:0,sold30:0,returned30:0,received30:0,landedCost:40375},
  {sku:"GCL02-P",productCode:"GCL02",brand:"UHERO",name:"Hộp 2 gương cầu lồi GCL02 xóa điểm mù 2 trong 1 kèm ",variant:"1 Chiếc Phải",stockPOS:4,stockOffice:0,stockShopee:0,availableStock:4,sold30:0,returned30:0,received30:0,landedCost:10000},
  {sku:"BS02-DEN-TT",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Đen, Thanh Trượt măt cờ Việt Nam",stockPOS:14,stockOffice:0,stockShopee:0,availableStock:14,sold30:0,returned30:0,received30:0,landedCost:2818},
  {sku:"NRK02-1M",productCode:"NRK02",brand:"UHERO",name:"Chai Sữa Tẩy Màng Dầu",variant:"1 Mút đánh bóng",stockPOS:39,stockOffice:0,stockShopee:0,availableStock:39,sold30:0,returned30:0,received30:0,landedCost:911},
  {sku:"GDC01-91",productCode:"GDC01",brand:"UHERO",name:"Giá đỡ cốc nước",variant:"1 Chiếc Gương",stockPOS:2,stockOffice:0,stockShopee:0,availableStock:2,sold30:0,returned30:0,received30:0,landedCost:16000},
  {sku:"GCL02-T",productCode:"GCL02",brand:"UHERO",name:"Hộp 2 gương cầu lồi GCL02 xóa điểm mù 2 trong 1 kèm ",variant:"1 chiếc Trái",stockPOS:3,stockOffice:0,stockShopee:0,availableStock:3,sold30:0,returned30:0,received30:0,landedCost:10000},
  {sku:"PHD01-91-1C",productCode:"PHD01",brand:"UHERO",name:"Giá đỡ điện thoại UH bằng kim loại xoay 360 độ tiện ",variant:"Đen, 1 Chiếc",stockPOS:2,stockOffice:0,stockShopee:0,availableStock:2,sold30:0,returned30:0,received30:0,landedCost:12926},
  {sku:"NH01-BCHD",productCode:"NH01",brand:"UHERO",name:"Combo mô hình điều hoà khuyếch tán nước hoa bằng năn",variant:"Bông Chanh Dài",stockPOS:5,stockOffice:0,stockShopee:0,availableStock:5,sold30:0,returned30:0,received30:0,landedCost:4546},
  {sku:"TL01-91",productCode:"TL01",brand:"UHERO",name:"Túi Lưới 3 ngăn co dãn gắn ghế ô tô tiện dụng chất l",variant:"Đen Sandan",stockPOS:1,stockOffice:1,stockShopee:0,availableStock:0,sold30:0,returned30:0,received30:0,landedCost:21288},
  {sku:"DNTE01",productCode:"DNTE01",brand:"NEVOR",name:"Dây nhảy thể lực trẻ em Nevor DNTE01",stockPOS:1,stockOffice:1,stockShopee:0,availableStock:0,sold30:0,returned30:0,received30:0,landedCost:16780},
  {sku:"GCL01-1C",productCode:"GCL01",brand:"UHERO",name:"Gương cầu lồi",variant:"1 Chiếc Gương",stockPOS:2,stockOffice:0,stockShopee:0,availableStock:2,sold30:0,returned30:0,received30:0,landedCost:8197},
  {sku:"NH01-DHX",productCode:"NH01",brand:"UHERO",name:"Combo mô hình điều hoà khuyếch tán nước hoa bằng năn",variant:"Điều Hòa Xám",stockPOS:1,stockOffice:0,stockShopee:0,availableStock:1,sold30:0,returned30:0,received30:0,landedCost:15000},
  {sku:"BS02-BAC-04",productCode:"BS02",brand:"UHERO",name:"Bảng số điện thoại BS02 trên ô tô",variant:"Bạc, Xe Ford",stockPOS:38,stockOffice:0,stockShopee:0,availableStock:38,sold30:24,returned30:1,received30:0,landedCost:0},
  {sku:"PHAV02-S",productCode:"PHAV02-93",brand:"UHERO",name:"Kẹp cửa gió điều hòa PHAV02-93 thế hệ mới 2023",variant:"Đen Sần móc cài 02",stockPOS:-36,stockOffice:0,stockShopee:0,availableStock:-36,sold30:0,returned30:0,received30:0,landedCost:0},
  {sku:"VDCTH-N",productCode:"DCTH",brand:"UHERO",name:"Đệm ngồi công thái học Uhero ComfortCare mút hoạt tí",variant:"Vỏ nâu",stockPOS:2,stockOffice:2,stockShopee:0,availableStock:0,sold30:2,returned30:0,received30:0,landedCost:0}
];

/* ═══ 3. DEMO SEED — dữ liệu mô phỏng để test 15 tình huống (spec §33), gắn nhãn DEMO ═══ */
const SUPPLIERS_SEED=[
 {name:"NCC Đông Quản (DEMO)",contact:"Mr. Chen",moq:5000,lt:30,defect:2.5,onTime:88,quality:80,price:85,depositPct:0.3,paymentTerms:30,status:"Main"},
 {name:"NCC Quảng Châu A (DEMO)",contact:"Ms. Lin",moq:300,lt:25,defect:1.8,onTime:92,quality:85,price:78,depositPct:0.3,paymentTerms:15,status:"Main"},
 {name:"NCC Phật Sơn B (DEMO)",contact:"Mr. Wu",moq:200,lt:18,defect:3.5,onTime:95,quality:75,price:70,depositPct:0.5,paymentTerms:0,status:"Backup"},
 {name:"NCC Ninh Ba (DEMO)",contact:"Ms. Zhao",moq:5000,lt:35,defect:1.2,onTime:90,quality:88,price:82,depositPct:0.3,paymentTerms:45,status:"Main"},
];
const SUP_SKU_SEED=[
 {sku:"TCN02",sup:"NCC Đông Quản (DEMO)",landed:43045,moq:10000,pack:1000,lt:30,defect:2.5,onTime:88,quality:80,price:85,role:"Main"},
 {sku:"DCG04",sup:"NCC Quảng Châu A (DEMO)",landed:159861,moq:300,pack:50,lt:25,defect:1.8,onTime:92,quality:85,price:78,role:"Main"},
 {sku:"DCG04",sup:"NCC Phật Sơn B (DEMO)",landed:166000,moq:200,pack:50,lt:18,defect:3.5,onTime:95,quality:75,price:70,role:"Backup"},
 {sku:"BDG12",sup:"NCC Quảng Châu A (DEMO)",landed:83833,moq:500,pack:100,lt:25,defect:1.8,onTime:92,quality:85,price:78,role:"Main"},
 {sku:"GCL03-83",sup:"NCC Ninh Ba (DEMO)",landed:20224,moq:5000,pack:500,lt:35,defect:1.2,onTime:90,quality:88,price:82,role:"Main"},
 {sku:"KL02-1C",sup:"NCC Ninh Ba (DEMO)",landed:13327,moq:5000,pack:500,lt:35,defect:1.2,onTime:90,quality:88,price:82,role:"Main"},
 {sku:"BQCC06",sup:"NCC Quảng Châu A (DEMO)",landed:39583,moq:500,pack:100,lt:25,defect:1.8,onTime:92,quality:85,price:78,role:"Main"},
 {sku:"DTL02",sup:"NCC Đông Quản (DEMO)",landed:35973,moq:2000,pack:500,lt:30,defect:2.5,onTime:88,quality:80,price:85,role:"Main"},
 {sku:"BDG14",sup:"NCC Quảng Châu A (DEMO)",landed:87212,moq:500,pack:100,lt:25,defect:1.8,onTime:92,quality:85,price:78,role:"Main"},
];
/* Meta demo: chỉ áp khi người dùng CHƯA lưu meta riêng (merge dưới) */
const META_SEED={
 TCN02:{sellPrice:99000,leadTime:30,moq:10000,packSize:1000,productStatus:"Maintain",mainSupplier:"NCC Đông Quản (DEMO)",owner:"Hà",sold7:5900,sold60:51000},
 DCG04:{sellPrice:249000,leadTime:25,moq:300,packSize:50,productStatus:"Scale",mainSupplier:"NCC Quảng Châu A (DEMO)",owner:"Minh",sold7:820,sold60:5900},
 BDG12:{sellPrice:189000,leadTime:25,moq:500,packSize:100,productStatus:"Maintain",mainSupplier:"NCC Quảng Châu A (DEMO)",owner:"Minh",sold7:980,sold60:8100},
 "GCL03-83":{sellPrice:59000,leadTime:35,moq:5000,packSize:500,productStatus:"Scale",mainSupplier:"NCC Ninh Ba (DEMO)",owner:"Hà",sold7:5200,sold60:49000},
 "KL02-1C":{sellPrice:35000,leadTime:35,moq:5000,packSize:500,productStatus:"Clearance",mainSupplier:"NCC Ninh Ba (DEMO)",owner:"Hà",sold7:390,sold60:3600},
 BDG02:{sellPrice:129000,leadTime:25,moq:500,packSize:100,productStatus:"Stop",owner:"Minh"},
 BQCC06:{sellPrice:119000,leadTime:25,moq:500,packSize:100,productStatus:"Maintain",mainSupplier:"NCC Quảng Châu A (DEMO)",owner:"Trang",sold7:170,sold60:1500},
 DTL02:{sellPrice:99000,leadTime:30,moq:2000,packSize:500,productStatus:"Maintain",mainSupplier:"NCC Đông Quản (DEMO)",owner:"Minh",sold7:640,sold60:6100},
 BDG14:{sellPrice:219000,leadTime:25,moq:500,packSize:100,productStatus:"Launch",mainSupplier:"NCC Quảng Châu A (DEMO)",owner:"Trang",sold7:260,sold60:1700},
};
/* P1.1: mỗi liên kết NCC-SKU là một QUOTATION có version — nguồn giá duy nhất của chuỗi duyệt */
SUP_SKU_SEED.forEach(r=>{r.currency=r.currency||"CNY";r.qVer=r.qVer||1;});
const _D=(n)=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
const CUR_MONTH=new Date().toISOString().slice(0,7);
const PO_SEED=[
 /* ① DCG04: 2 PO cùng SKU, 1 về kịp 1 về trễ (spec test 2,3,7) */
 {id:"PO-D001",sup:"NCC Quảng Châu A (DEMO)",currency:"CNY",exchangeRate:3600,freight:1500000,tax:0,otherCost:0,budgetMonth:CUR_MONTH,items:[{sku:"DCG04",name:"Đai Chống Gù DCG04",qty:300,posRcv:0,landed:159861}],deposit:14387490,depSt:"Confirmed",finalPay:33567810,paySt:"Pending",orderDate:_D(-18),eta:_D(5),originalEta:_D(5),revisedEta:null,lastConfirmAt:_D(-3),actual:null,status:"Shipping",owner:"Minh",terms:15},
 {id:"PO-D002",sup:"NCC Quảng Châu A (DEMO)",currency:"CNY",exchangeRate:3600,freight:1200000,tax:0,otherCost:0,budgetMonth:CUR_MONTH,items:[{sku:"DCG04",name:"Đai Chống Gù DCG04",qty:300,posRcv:0,landed:159861}],deposit:14387490,depSt:"Confirmed",finalPay:33567810,paySt:"Pending",orderDate:_D(-6),eta:_D(24),originalEta:_D(24),revisedEta:null,lastConfirmAt:_D(-6),actual:null,status:"In Production",owner:"Minh",terms:15},
 /* ② BDG12: PO nhận lệch (spec test 8,9) */
 {id:"PO-D003",sup:"NCC Quảng Châu A (DEMO)",currency:"CNY",exchangeRate:3600,freight:900000,tax:0,otherCost:0,budgetMonth:CUR_MONTH,items:[{sku:"BDG12",name:"Bó đầu gối BDG12",qty:1000,posRcv:940,landed:83833}],deposit:25149900,depSt:"Confirmed",finalPay:58683100,paySt:"Pending",orderDate:_D(-32),eta:_D(-3),originalEta:_D(-3),revisedEta:null,lastConfirmAt:_D(-10),actual:_D(-1),status:"PO Mismatch",owner:"Minh",terms:15},
 /* ③ TCN02: PO lớn đang sản xuất, ETA xa (test incoming after stockout) */
 {id:"PO-D004",sup:"NCC Đông Quản (DEMO)",currency:"CNY",exchangeRate:3600,freight:8000000,tax:0,otherCost:500000,budgetMonth:CUR_MONTH,items:[{sku:"TCN02",name:"Tất TCN-02",qty:20000,posRcv:0,landed:43045}],deposit:258270000,depSt:"Pending",finalPay:602630000,paySt:"Pending",orderDate:_D(-2),eta:_D(33),originalEta:_D(33),revisedEta:null,lastConfirmAt:_D(-2),actual:null,status:"Ordered Supplier",owner:"Hà",terms:30},
];
/* PurchaseRequest là ENTITY RIÊNG (spec P0.1) — một SKU có nhiều PR qua thời gian */
const PR_SEED=[
 {id:"PR-"+CUR_MONTH.replace("-","")+"-001",sku:"BQCC06",createdAt:_D(-1),createdBy:"Purchasing",status:"SUBMITTED_TO_LEADER",budgetMonth:CUR_MONTH,requestedQty:null,adjustedQty:null,supplierId:"NCC Quảng Châu A (DEMO)",reason:"Bổ sung target",adjustmentReason:null,leaderNote:null,ceoNote:null,snapshotId:null,poId:null,version:1},
 {id:"PR-"+CUR_MONTH.replace("-","")+"-002",sku:"DTL02",createdAt:_D(-4),createdBy:"Purchasing",status:"SUBMITTED_TO_CEO",budgetMonth:CUR_MONTH,requestedQty:null,adjustedQty:null,supplierId:"NCC Đông Quản (DEMO)",reason:"Tồn dưới lead time",adjustmentReason:null,leaderNote:"SL hợp lý, NCC ổn định",ceoNote:null,snapshotId:null,poId:null,version:1},
 {id:"PR-"+CUR_MONTH.replace("-","")+"-003",sku:"BDG14",createdAt:_D(-2),createdBy:"Purchasing",status:"SUBMITTED_TO_CEO",budgetMonth:CUR_MONTH,requestedQty:null,adjustedQty:2000,supplierId:"NCC Quảng Châu A (DEMO)",reason:"Launch theo plan",adjustmentReason:"Campaign scale",leaderNote:"Launch theo plan đã duyệt",ceoNote:null,snapshotId:null,poId:null,version:1},
];
/* PurchaseBudget theo Month × Brand (spec P0.6) — unique (month, brand) */
const BUDGET_SEED=[];
/* P1.4: Campaign chỉ đóng góp incrementalDemand — chống cộng trùng doanh số nền */
const CAMPAIGN_SEED=[
 {id:"CP-001",sku:"BDG14",channel:"TikTok Shop",name:"Mega Live 15.8 (DEMO)",incremental30:400,certainty:"COMMITTED",status:"Approved",creator:"Đạt"},
 {id:"CP-002",sku:"BDG14",channel:"Shopee",name:"Growth push Q3 (DEMO)",incremental30:600,certainty:"STRETCH",status:"Approved",creator:"Minh"},
];
/* Aggregate đa kênh: BASE=Σ plan kênh đã duyệt · COMMITTED=BASE+campaign chắc · STRETCH=COMMITTED+campaign tăng trưởng */
function aggregatePlan(sku,plans,campaigns){
  const ap=plans.filter(p=>p.sku===sku&&["Approved","Locked"].includes(p.status));
  const anyDraft=plans.some(p=>p.sku===sku&&!["Approved","Locked"].includes(p.status));
  const base=ap.reduce((a,p)=>a+num(p.plan30),0);
  const cc=campaigns.filter(c=>c.sku===sku&&c.status==="Approved");
  const committed=base+cc.filter(c=>c.certainty==="COMMITTED").reduce((a,c)=>a+num(c.incremental30),0);
  const stretch=committed+cc.filter(c=>c.certainty==="STRETCH").reduce((a,c)=>a+num(c.incremental30),0);
  return {base,committed,stretch,channels:ap.length,anyApproved:ap.length>0,anyDraft};
}
const PLAN_SEED=[
 {id:"SP-001",sku:"BDG14",brand:"NEVOR",channel:"TikTok Shop",plan7:350,plan14:750,plan30:1700,plan60:3600,base:1400,stretch:2100,uplift:"KOC tháng này",confidence:"Trung bình",status:"Approved",creator:"Trang",createdAt:_D(-9),approver:"CEO",approvedAt:_D(-7),version:2,note:"Launch đợt 1"},
 {id:"SP-002",sku:"DCG04",brand:"NEVOR",channel:"TikTok Shop",plan7:900,plan14:1900,plan30:4200,plan60:8800,base:3800,stretch:4800,uplift:"Livestream x2",confidence:"Cao",status:"Draft",creator:"Đạt",createdAt:_D(-3),approver:"",approvedAt:"",version:1,note:"Chưa gửi duyệt"},
];
/* P1.2: skuType + BOM. Component/Gift/Packaging KHÔNG phải Variant. */
const SKU_TYPES=["FINISHED_GOOD","VARIANT","COMPONENT","PACKAGING","GIFT","BUNDLE","SAMPLE"];
const BOM_SEED=[
 {parent:"SET-GYM-01 (DEMO)",parentName:"Set tập gym (DEMO): 2 tất + 1 bó gối + túi",components:[{sku:"TCN02",qty:2},{sku:"BDG12",qty:1},{sku:"KL02-1C",qty:1}]},
];
/* ATP lắp bộ = min(componentATP ÷ định mức) — spec P1.2 */
const kitATP=(bom,atpOf)=>{if(!bom.components||!bom.components.length)return 0;
  return Math.max(0,Math.min(...bom.components.map(c=>Math.floor(atpOf(c.sku)/(Number(c.qty)||1)))));};
const POS_MAP_SEED=[
 {pos:"TCN02-SHOPEE",type:"alias",internalSku:"TCN02",note:"Mã Shopee cũ"},
 {pos:"COMBO-TCN-BDG",type:"combo",internalSku:"",components:[{sku:"TCN02",qty:2},{sku:"BDG12",qty:1}],note:"Combo 2 tất + 1 bó gối"},
 {pos:"GIFT-KL02",type:"gift",internalSku:"KL02-1C",note:"Khăn tặng kèm — trừ tồn, không tính doanh thu"},
];

/* ═══ 4. HELPERS ═══ */
const STORE_KEY="novix-purchase-v10";
const STORE_KEY_V9="novix-purchase-v9";  /* đọc để migrate */
const D=ms=>new Date(ms).toISOString().slice(0,10);
const todayStr=()=>D(Date.now());
const daysBetween=(a,b)=>Math.round((new Date(b)-new Date(a))/86400000);
const monthOf=d=>String(d||"").slice(0,7);
const addDaysStr=n=>D(Date.now()+(Number(n)||0)*86400000);
const fmt=n=>{n=Number(n)||0;if(Math.abs(n)>=1e9)return (n/1e9).toFixed(2)+" tỷ";if(Math.abs(n)>=1e6)return (n/1e6).toFixed(1)+" tr";if(Math.abs(n)>=1e3)return Math.round(n/1e3)+"k";return n.toLocaleString("vi-VN");};
const fmtFull=n=>(Number(n)||0).toLocaleString("vi-VN")+"₫";
const pct=n=>n===null||n===undefined||isNaN(n)?"—":(n*100).toFixed(0)+"%";
const num=v=>Number(v)||0;

/* Storage fallback: window.storage → localStorage → memory (spec §7) */
let _memStore=null;
async function loadState(){
  try{
    if(typeof window!=="undefined"&&window.storage?.get){
      try{const r=await window.storage.get(STORE_KEY);if(r&&r.value)return {data:JSON.parse(r.value),via:"Window Storage"};}catch(e){}
    }
    if(typeof localStorage!=="undefined"){
      const l=localStorage.getItem(STORE_KEY);
      if(l)return {data:JSON.parse(l),via:"Local Storage"};
      return {data:null,via:"Local Storage"};
    }
  }catch(e){console.warn("loadState",e);}
  return {data:_memStore,via:"Memory"};
}
async function saveState(obj){
  const s=JSON.stringify(obj);
  try{
    if(typeof window!=="undefined"&&window.storage?.set){
      try{const r=await window.storage.set(STORE_KEY,s);if(r)return "Window Storage";}catch(e){}
    }
    if(typeof localStorage!=="undefined"){localStorage.setItem(STORE_KEY,s);return "Local Storage";}
  }catch(e){console.warn("saveState",e);}
  _memStore=obj;return "Memory";
}

/* Validation (spec §25) */
const vErr={
  posInt:(v,name)=>{const n=Number(v);if(isNaN(n)||n<=0)return `${name} phải > 0`;if(!Number.isInteger(n))return `${name} phải là số nguyên`;return null;},
  nonNeg:(v,name)=>{const n=Number(v);if(isNaN(n)||n<0)return `${name} không được âm`;return null;},
};
const validatePO=(po,poList)=>{
  const e=[];
  if(!po.sup)e.push("Thiếu NCC");
  if(!po.orderDate)e.push("Thiếu ngày đặt");
  if(po.eta&&po.orderDate&&po.eta<=po.orderDate)e.push("ETA phải sau ngày đặt");
  if(poList.some(p=>p.id===po.id))e.push("Trùng mã PO");
  (po.items||[]).forEach(i=>{
    if(!i.sku)e.push("Dòng thiếu SKU");
    const q=vErr.posInt(i.qty,`SL ${i.sku}`);if(q)e.push(q);
    const c=vErr.nonNeg(i.landed,`Giá ${i.sku}`);if(c)e.push(c);
  });
  if((po.items||[]).length===0)e.push("PO không có dòng hàng");
  return e;
};

const supScore=s=>{const ot=num(s.onTime),df=num(s.defect),q=num(s.quality),p=num(s.price);
  return Math.round(ot*0.35+Math.max(0,100-df*10)*0.30+q*0.20+p*0.15);};
const effLanded=(l,d)=>{const df=Math.min(95,num(d));return Math.round(num(l)/(1-df/100));};
const poQty=p=>(p.items||[]).reduce((a,i)=>a+num(i.qty),0);
const poRcv=p=>(p.items||[]).reduce((a,i)=>a+num(i.posRcv),0);
const poLineVal=p=>(p.items||[]).reduce((a,i)=>a+num(i.qty)*num(i.landed),0);
const poValue=p=>poLineVal(p)+num(p.freight)+num(p.tax)+num(p.otherCost);
const poMatched=p=>(p.items||[]).length>0&&(p.items||[]).every(i=>num(i.posRcv)===num(i.qty));
const poReceived=p=>(p.items||[]).length>0&&(p.items||[]).every(i=>num(i.posRcv)>0);
const poDelay=p=>{if(!IN_TRANSIT.includes(p.status))return 0;const base=p.revisedEta||p.originalEta||p.eta;if(!base)return 0;const d=daysBetween(base,todayStr());return d>0?d:0;};

/* ═══ 5. ENGINES ═══ */

/* Forecast — trọng số theo cỡ mẫu; Launch/Scale dùng Sales Plan đã duyệt (spec §19) */
function velocity(s,plan){
  const net30=Math.max(0,(s.sold30||0)-(s.returned30||0));
  const v30=net30/30;
  const has7=s.sold7!==undefined&&s.sold7!==""&&s.sold7!==null;
  const has60=s.sold60!==undefined&&s.sold60!==""&&s.sold60!==null;
  let fds=v30,conf="Thấp",src="chỉ 30 ngày";
  if(has7&&has60){
    const n7=num(s.sold7),v7=n7/7,v60=num(s.sold60)/60;
    let w=[0.15,0.45,0.40];
    if(n7>=20)w=[0.50,0.30,0.20];else if(n7>=7)w=[0.35,0.40,0.25];
    fds=v7*w[0]+v30*w[1]+v60*w[2];
    conf=n7>=20?"Cao":n7>=7?"Trung bình":"Thấp";src="7/30/60";
  }else if(has7||has60){
    const other=has7?num(s.sold7)/7:num(s.sold60)/60;
    fds=v30*0.6+other*0.4;conf="Trung bình";src=has7?"7/30":"30/60";
  }
  let planUsed=false,planWarn=false;
  if(["Launch","Scale"].includes(s.productStatus)){
    const ap=plan&&["Approved","Locked"].includes(plan.status)?plan:null;
    if(ap&&num(ap.plan30)>0){
      const pf=num(ap.plan30)/30;
      fds=fds>0?Math.min(Math.max(pf,fds*0.7),fds*1.3):pf;  // kẹp ±30% so với thực tế
      planUsed=true;
      if(ap.optimistic||ap.pessimistic)conf="Thấp";          /* P2.5: lịch sử plan lệch nhiều → hạ tin cậy */
    }else if(plan||fds===0){planWarn=true;}
  }
  return {fds:Math.round(fds*100)/100,conf,src,planUsed,planWarn};
}

/* ── ETA model (spec P0.4): PO quá hạn không có Revised ETA = ETA UNKNOWN, KHÔNG cộng vào timeline ── */
function effectiveEta(p){
  if(p.revisedEta)return p.revisedEta;
  const oe=p.originalEta||p.eta;
  if(oe&&oe>=todayStr())return oe;
  return null;   /* quá hạn, chưa xác nhận lại → không biết ngày về */
}
function etaStatus(p){
  if(["Arrived Warehouse","Waiting POS Import","POS Synced","PO Mismatch","Closed"].includes(p.status))return "ARRIVED";
  const oe=p.originalEta||p.eta;
  if(p.revisedEta){return p.revisedEta>=todayStr()?"DELAYED_CONFIRMED":"DELAYED_UNCONFIRMED";}
  if(oe&&oe<todayStr())return "DELAYED_UNCONFIRMED";
  if(oe&&daysBetween(todayStr(),oe)<=2&&["In Production","QC Pending"].includes(p.status))return "AT_RISK";
  return "ON_TRACK";
}

/* ── P2.3: xác suất trễ NCC từ lịch sử PO đã về; P2.4: score tự sinh, nhập tay chỉ là fallback ── */
function supplierHistory(supName,poList){
  const done=poList.filter(p=>p.sup===supName&&p.actual&&(p.originalEta||p.eta));
  const delays=done.map(p=>daysBetween(p.originalEta||p.eta,p.actual));
  const n=delays.length;
  if(n===0)return {n:0};
  const late=delays.filter(d=>d>0);
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
  const sd=a=>{if(a.length<2)return 0;const m=avg(a);return Math.sqrt(avg(a.map(x=>(x-m)*(x-m))));};
  const avgDelay=avg(late), pLate=late.length/n;
  const leadDays=done.map(p=>daysBetween(p.orderDate,p.actual)).filter(d=>d>0);
  let sRec=0,sOrd=0,sRej=0;
  done.forEach(p=>(p.items||[]).forEach(i=>{sRec+=num(i.posRcv);sOrd+=num(i.qty);sRej+=num(i.rejectedQty);}));
  return {n,pLate,avgDelay:Math.round(avgDelay*10)/10,sdDelay:Math.round(sd(late)*10)/10,
    onTimeRate:1-pLate,defectRate:sRec>0?sRej/sRec:0,qtyAccuracy:sOrd>0?sRec/sOrd:1,
    leadMean:Math.round(avg(leadDays)),leadSd:Math.round(sd(leadDays)*10)/10,
    leadConsistency:avg(leadDays)>0?Math.max(0,1-sd(leadDays)/avg(leadDays)):1};
}
function supplierAutoScore(supName,poList,manual){
  const h=supplierHistory(supName,poList);
  if(h.n<3){const m=manual||{};return {score:supScore(m),src:"manual",n:h.n,note:`Score tạm (nhập tay) — mới ${h.n}/3 PO lịch sử`,h};}
  const score=Math.round(
    h.onTimeRate*100*0.30+Math.max(0,100-h.defectRate*1000)*0.25+
    Math.min(1,h.qtyAccuracy)*100*0.20+h.leadConsistency*100*0.15+
    Math.max(0,100-h.avgDelay*4)*0.10);
  return {score,src:"history",n:h.n,note:`Tự sinh từ ${h.n} PO`,h};
}
/* Khoảng về dự kiến + ETA điều chỉnh rủi ro cho timeline (P2.3) */
function riskAdjustedDay(p,todayS,hist){
  const eff=effectiveEta(p);if(eff===null)return null;
  const base=Math.max(0,daysBetween(todayS,eff));
  if(hist&&hist.n>=3&&hist.pLate>0.5)return {day:base+Math.round(hist.avgDelay),raw:base,adj:true,range:[base,base+Math.round(hist.avgDelay+hist.sdDelay)],pLate:hist.pLate};
  const pl=hist&&hist.n>=3?hist.pLate:null;
  return {day:base,raw:base,adj:false,range:[base,base+(hist&&hist.n>=3?Math.round(hist.avgDelay+hist.sdDelay):0)],pLate:pl};
}
/* ── P2.1: Capital Allocation Score — tổng hợp đa yếu tố ── */
function capitalScore(s,hasCampaign){
  let sc=0;
  sc+=s.deadline<=0?30:s.deadline<=3?26:s.deadline<=7?20:s.deadline<=14?12:5;         /* stockout risk */
  sc+=s.contribPct===null?6:s.contribPct>=0.4?20:s.contribPct>=0.3?16:s.contribPct>=0.2?11:5;  /* margin */
  sc+=s.conf==="Cao"?12:s.conf==="Trung bình"?8:4;                                    /* forecast confidence */
  const pb=s.dailyContrib>0?s.capital/s.dailyContrib:999;
  sc+=pb<30?15:pb<45?12:pb<70?8:3;                                                    /* payback */
  sc-=["Risk","High Risk"].includes(s.ovRisk)?8:0; sc-=s.moqBound?6:0;                /* MOQ/overstock penalty */
  sc+=s.productStatus==="Scale"?10:s.productStatus==="Launch"?8:s.productStatus==="Maintain"?5:0;
  sc+=hasCampaign?8:0;                                                                /* campaign priority */
  return Math.max(0,Math.min(100,Math.round(sc)));
}
/* ── P2.7: Future Excess Exposure — dự phóng tồn 30/60/90/120 ngày ── */
function futureExposure(s,poEvents,approvedQty,ag,cfg){
  const fdsCamp=s.fds, fdsBase=ag&&ag.anyApproved&&ag.base>0?Math.min(s.fds,ag.base/30):s.fds;
  const horizons=[30,60,90,120];
  const rows=horizons.map(d=>{
    const inc=poEvents.filter(e=>e.day<=d).reduce((a,e)=>a+e.qty,0);
    const appr=approvedQty&&(s.leadTime||30)<=d?approvedQty:0;
    /* campaign kết thúc sau 30d → demand rơi về BASE (bắt case "campaign xong hàng vẫn về") */
    const demand=Math.round(fdsCamp*Math.min(d,30)+fdsBase*Math.max(0,d-30));
    const stock=Math.max(0,s.availableStock+inc+appr-demand);
    const cover=fdsBase>0?Math.round(stock/fdsBase):(stock>0?9999:0);
    return {d,inc,appr,demand,stock,cover,
      excess:cover>cfg.excessDays&&stock>0,liq:cover>cfg.liqDays&&stock>0};
  });
  const r90=rows[2];
  const futureDead=r90&&s.fds>0?Math.max(0,(r90.stock-fdsBase*cfg.excessDays))*s.landedCost:0;
  return {rows,futureDead:Math.round(futureDead),
    flags:{futureExcess:rows.some(r=>r.excess),futureLiq:rows.some(r=>r.liq),
      moqOverbuy:s.overCap>0,campaignTail:fdsCamp>fdsBase*1.2&&rows[1]&&rows[1].excess,
      incomingHigh:s.incoming>0&&rows[0]&&rows[0].cover>(s.horizon||60)*1.4}};
}
/* ── Mô phỏng tồn kho TUẦN TỰ (spec P0.3): không phân loại PO trước khi mô phỏng xong.
     PO1 về sớm kéo dài ngày hết hàng → PO2 có thể thành "về kịp" nhờ PO1. ── */
function simulateTimeline(avail,fds,poEvents){
  if(fds<=0)return {stockoutDay:null,gapDays:0,lostUnits:0,events:poEvents,lastCover:9999,rescueQty:poEvents.reduce((a,e)=>a+e.qty,0),lateQty:0};
  const evs=[...poEvents].sort((a,b)=>a.day-b.day);
  let stock=avail,gap=0,lost=0,firstOut=null,ei=0;
  const horizon=Math.min(240,(evs.length?evs[evs.length-1].day:0)+60);
  for(let day=0;day<=horizon;day++){
    while(ei<evs.length&&evs[ei].day===day){
      evs[ei].stockBefore=stock;                       /* tồn NGAY TRƯỚC khi PO này về */
      evs[ei].rescued=firstOut===null||day<=firstOut;  /* kịp nếu chưa từng đứt trước ETA của nó */
      stock+=evs[ei].qty;ei++;
    }
    if(stock<fds){
      if(firstOut===null)firstOut=day;
      gap++;lost+=fds-Math.max(0,stock);stock=0;
    }else stock-=fds;
  }
  /* PO chưa duyệt trong vòng lặp (ETA ngoài horizon) → xét theo firstOut */
  for(;ei<evs.length;ei++)evs[ei].rescued=firstOut===null;
  const rescueQty=evs.filter(e=>e.rescued).reduce((a,e)=>a+e.qty,0);
  const lateQty=evs.filter(e=>!e.rescued).reduce((a,e)=>a+e.qty,0);
  return {stockoutDay:firstOut,gapDays:gap,lostUnits:Math.round(lost),events:evs,lastCover:Math.round(stock/fds),rescueQty,lateQty};
}

/* Enrich — mọi phép tính đều có cổng dữ liệu */
function enrich(s,prop,cfg,inc,onTime,plan,extraFds){
  /* inc = {total, before, after, gapDays, lostUnits, stockoutDay, poCount} */
  let {fds,conf,src,planUsed,planWarn}=velocity(s,plan);
  const bomFds=Number(extraFds)||0;               /* nhu cầu component nổ từ Sales Plan thành phẩm (P1.2) */
  if(bomFds>0)fds=Math.round((fds+bomFds)*100)/100;
  const returnRate=s.sold30>0?(s.returned30||0)/s.sold30:0;
  const missProfit=NEED_PROFIT.filter(f=>!s[f]);
  const missBuy=NEED_BUY.filter(f=>!s[f]);
  const canProfit=missProfit.length===0, canBuy=missBuy.length===0;

  const stockValue=(s.stockPOS||0)*(s.landedCost||0);
  const cover=fds>0?Math.round((s.availableStock+inc.total)/fds):9999;
  const targetCover=num(s.targetCover)||cfg.targetCoverDefault;
  const moqCover=(canBuy&&fds>0)?Math.round(s.moq/fds):0;
  const moqBound=canBuy&&fds>0&&moqCover>cfg.liqDays;

  let invRisk="Healthy";
  if(fds<=0)invRisk="Chưa bán";
  else{
    if(cover>45)invRisk="Watch";
    if(cover>cfg.excessDays)invRisk="Excess";
    if(cover>cfg.liqDays)invRisk="Liquidate";
    if(moqBound&&invRisk!=="Healthy")invRisk="MOQ-bound";
  }
  const deadCap=["Excess","Liquidate"].includes(invRisk)?stockValue:0;

  const feeRate=(cfg.feeRate&&cfg.feeRate[s.brand])??0.32;
  const contrib=canProfit?Math.round(s.sellPrice*(1-feeRate)-s.landedCost):null;
  const contribPct=canProfit&&s.sellPrice?contrib/s.sellPrice:null;
  const dailyContrib=canProfit?Math.round(fds*contrib):null;
  const roicYear=(canProfit&&canBuy&&s.moq&&s.landedCost)?(contrib*fds*365)/((s.moq*s.landedCost)/2):null;
  const lostRevenue=canProfit?Math.round(inc.lostUnits*s.sellPrice):null;

  let safetyDays=0,rop=0,horizon=0,target=0,sysBuy=0,sysOQ=0,actOQ=0,capital=0;
  let daysAfter=0,overBuy=0,overCap=0,ovRisk="—",sRisk="Thiếu dữ liệu",reason="";
  const daysLeft=fds>0?Math.round(s.availableStock/fds):9999;
  let deadline=9999,buyClass="Do Not Buy",buyDate=null;

  if(canBuy){
    const ot=onTime??90;
    const dyn=Math.max(cfg.minSafetyDays,Math.ceil(s.leadTime*(1-ot/100)*2));
    safetyDays=cfg.useDynamicSafety?dyn:(num(s.safetyDays)||cfg.minSafetyDays);
    rop=Math.ceil(fds*(s.leadTime+safetyDays));
    horizon=s.leadTime+targetCover+safetyDays;
    target=Math.ceil(fds*horizon);
    /* Chỉ trừ incoming về TRƯỚC ngày hết hàng (spec §4) */
    sysBuy=Math.max(0,target-s.availableStock-inc.before);
    if(["Clearance","Stop"].includes(s.productStatus))sysBuy=0;
    const minOQ=sysBuy>0?Math.max(sysBuy,s.moq):0;
    sysOQ=minOQ>0?Math.ceil(minOQ/s.packSize)*s.packSize:0;
    actOQ=(prop&&prop.adjQty!==undefined&&prop.adjQty!==null)?prop.adjQty:sysOQ;
    capital=actOQ*s.landedCost;
    const stockAfter=s.availableStock+inc.total+actOQ;
    daysAfter=fds>0?Math.round(stockAfter/fds):(stockAfter>0?9999:0);
    overBuy=Math.max(0,actOQ-sysBuy);
    overCap=overBuy*s.landedCost;
    const ratio=actOQ<=0?0:(fds>0?daysAfter/horizon:9);
    ovRisk="Safe";
    if(ratio>1.15)ovRisk="Watch";
    if(ratio>1.4)ovRisk="Risk";
    if(ratio>1.8)ovRisk="High Risk";
    if(["Clearance","Stop"].includes(s.productStatus))sRisk="Không mua";
    else if(daysLeft<=7)sRisk="Urgent Buy";
    else if(daysLeft<=s.leadTime)sRisk="Stockout Risk";
    else if(daysLeft<=s.leadTime+safetyDays)sRisk="Watch";
    else sRisk="Safe";
    /* Deadline giữ giá trị âm (spec §20): -5 = quá hạn 5 ngày */
    deadline=daysLeft>9000?9999:daysLeft-s.leadTime-safetyDays;
    if(sysBuy>0)reason=sRisk==="Urgent Buy"?"Sắp hết hàng":sRisk==="Stockout Risk"?"Tồn dưới lead time":(s.availableStock<rop?"Dưới ROP":"Bổ sung target");
    buyDate=deadline>9000?null:addDaysStr(Math.max(0,deadline));

    /* Phân loại đề xuất (spec §12) */
    if(["Stop","Clearance"].includes(s.productStatus)||["Excess","Liquidate"].includes(invRisk))buyClass="Do Not Buy";
    else if(sysBuy<=0)buyClass="Do Not Buy";
    else if(moqBound||(sysBuy>0&&sysBuy<s.moq*0.5&&["Risk","High Risk"].includes(ovRisk)))buyClass="Negotiate MOQ";
    else if(deadline<=0)buyClass="Buy Now";
    else if(deadline<=7)buyClass="Buy This Week";
    else buyClass="Buy Later";
  }

  /* Nhóm quyết định Scale (spec §8): Stop > Xả > Scale > Duy trì */
  let decideGroup="Duy trì";
  if(s.productStatus==="Stop")decideGroup="Dừng nhập";
  else if(s.productStatus==="Clearance"||(fds>0&&cover>cfg.liqDays))decideGroup="Nên xả tồn";
  else if(s.productStatus==="Scale"&&fds>0&&cover<=cfg.excessDays&&!["Risk","High Risk"].includes(ovRisk))decideGroup="Nên Scale";
  else if(s.productStatus==="Scale")decideGroup="Scale bị chặn (tồn cao)";
  else if(s.productStatus==="Launch")decideGroup="Launch";

  return {...s,incoming:inc.total,incomingBefore:inc.before,incomingAfter:inc.after,incomingUnknown:inc.unknownQty||0,
    gapDays:inc.gapDays,lostUnits:inc.lostUnits,stockoutDay:inc.stockoutDay,poCount:inc.poCount,lostRevenue,
    fds:Math.round(fds*100)/100,conf,src,planUsed,planWarn,returnRate,stockValue,cover,targetCover,moqCover,moqBound,invRisk,deadCap,
    canProfit,canBuy,missProfit,missBuy,feeRate,contrib,contribPct,dailyContrib,roicYear,
    safetyDays,rop,horizon,target,sysBuy,sysOQ,actOQ,capital,daysAfter,overBuy,overCap,ovRisk,daysLeft,sRisk,deadline,buyDate,buyClass,decideGroup,reason,onTime:onTime??90,bomFds};
}

/* Auto allocation cho mã cha nhiều biến thể (spec §11) */
function allocate(groupSkus,totalQty){
  /* B1: loại Stop/Clearance/không bán */
  const eligible=groupSkus.filter(v=>!["Stop","Clearance"].includes(v.productStatus));
  const excluded=groupSkus.filter(v=>["Stop","Clearance"].includes(v.productStatus));
  const sellers=eligible.filter(v=>v.fds>0);
  const baseArr=sellers.length?sellers:eligible;
  /* B2: chuẩn hoá tỷ lệ về 100% */
  const totalFds=baseArr.reduce((a,v)=>a+Math.max(v.fds,0.01),0);
  /* B3: phân bổ theo nhu cầu thực trước, phần dư theo tỷ lệ */
  const needSum=baseArr.reduce((a,v)=>a+Math.max(0,v.sysBuy||Math.ceil(v.fds*(v.horizon||60))-v.availableStock),0);
  const rows=baseArr.map(v=>{
    const ratio=Math.max(v.fds,0.01)/totalFds;
    const need=Math.max(0,v.sysBuy||0);
    let raw= needSum>0? need + Math.max(0,totalQty-needSum)*ratio : totalQty*ratio;
    /* B4: làm tròn theo pack */
    const pk=num(v.packSize)||1;
    const alloc=Math.ceil(raw/pk)*pk;
    return {sku:v.sku,variant:v.variant,fds:v.fds,ratio,need,raw:Math.round(raw),alloc,
      coverAfter:v.fds>0?Math.round((v.availableStock+(v.incoming||0)+alloc)/v.fds):9999,
      overbuy:Math.max(0,alloc-need),overCap:Math.max(0,alloc-need)*num(v.landedCost)};
  });
  const total=rows.reduce((a,r)=>a+r.alloc,0);
  return {rows,excluded:excluded.map(v=>v.sku),total,
    totalOverCap:rows.reduce((a,r)=>a+r.overCap,0),
    highRisk:rows.some(r=>r.coverAfter>((groupSkus[0]?.horizon||60)*1.8))};
}

/* Phân rã combo & alias khi import POS (spec §13) */
function resolvePosRow(code,posMap){
  const m=posMap.find(x=>x.pos===code);
  if(!m)return {type:"direct",targets:[{sku:code,qty:1}]};
  if(m.type==="alias")return {type:"alias",targets:[{sku:m.internalSku,qty:1}]};
  if(m.type==="gift")return {type:"gift",targets:[{sku:m.internalSku,qty:1}]};
  if(m.type==="combo")return {type:"combo",targets:(m.components||[]).map(c=>({sku:c.sku,qty:num(c.qty)||1}))};
  return {type:"standard",targets:[{sku:m.internalSku||code,qty:1}]};
}
/* Tồn combo khả dụng = min(component/qty) */
function comboAvailable(m,skuIndex){
  if(!m.components||!m.components.length)return 0;
  return Math.min(...m.components.map(c=>{
    const s=skuIndex[c.sku];return s?Math.floor(s.availableStock/(num(c.qty)||1)):0;
  }));
}

/* ═══ 6. UI COMPONENTS ═══ */
const Badge=({children,c="#6B7280",bg="#F3F4F6"})=>(<span style={{color:c,backgroundColor:bg,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:5,whiteSpace:"nowrap"}}>{children}</span>);
const SB=({v,m})=>{const s=(m&&m[v])||{c:"#6B7280",bg:"#F3F4F6"};return(<Badge c={s.c} bg={s.bg}>{vn(v)}</Badge>);};
const BrandB=({b})=>{const map={NEVOR:["#1D4ED8","#DBEAFE"],UHERO:["#7C3AED","#EDE9FE"],"MONA MASK":["#BE185D","#FCE7F3"]};const [c,bg]=map[b]||["#6B7280","#F3F4F6"];return <Badge c={c} bg={bg}>{b}</Badge>;};
const Card=({icon:I,label,value,sub,accent="#2563EB",onClick,alert:al})=>(<div onClick={onClick} style={{background:"#fff",borderRadius:12,padding:"14px 16px",border:al?"1px solid #FECACA":"1px solid #E5E7EB",cursor:onClick?"pointer":"default",display:"flex",flexDirection:"column",gap:4}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:28,height:28,borderRadius:7,background:accent+"14",display:"flex",alignItems:"center",justifyContent:"center"}}><I size={14} color={accent}/></div><span style={{fontSize:11,color:"#6B7280",fontWeight:500}}>{label}</span></div><div style={{fontSize:19,fontWeight:700,color:al?"#991B1B":"#111827",letterSpacing:-0.5}}>{value}</div>{sub&&<div style={{fontSize:10,color:al?"#DC2626":"#9CA3AF"}}>{sub}</div>}</div>);
const TH=({children,r,sortKey,sort,onSort})=>(<th onClick={sortKey&&onSort?()=>onSort(sortKey):undefined} style={{padding:"7px 10px",fontSize:9.5,fontWeight:700,color:sort&&sort.key===sortKey?"#1D4ED8":"#6B7280",textTransform:"uppercase",letterSpacing:0.3,borderBottom:"2px solid #E5E7EB",textAlign:r?"right":"left",position:"sticky",top:0,background:"#fff",zIndex:1,whiteSpace:"nowrap",cursor:sortKey?"pointer":"default"}}>{children}{sortKey&&sort&&sort.key===sortKey?(sort.dir>0?" ▲":" ▼"):""}</th>);
const TD=({children,r,m,b,c})=>(<td style={{padding:"7px 10px",fontSize:11.5,color:c||"#374151",borderBottom:"1px solid #F3F4F6",textAlign:r?"right":"left",fontFamily:m?"monospace":"inherit",fontWeight:b?700:400,whiteSpace:"nowrap"}}>{children}</td>);
const Btn=({children,onClick,color="#2563EB",small,disabled,title})=>(<button title={title} onClick={onClick} disabled={disabled} style={{background:disabled?"#D1D5DB":color,color:"#fff",border:"none",borderRadius:6,padding:small?"3px 8px":"5px 12px",fontSize:small?9:10,fontWeight:700,cursor:disabled?"not-allowed":"pointer",whiteSpace:"nowrap",opacity:disabled?0.5:1}}>{children}</button>);
const Modal=({title,onClose,children,wide})=>{useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[onClose]);
  return (<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:12}} onClick={onClose}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:16,padding:24,width:wide?"820px":"520px",maxWidth:"96vw",maxHeight:"90vh",overflow:"auto"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h3 style={{margin:0,fontSize:16,fontWeight:700}}>{title}</h3><button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF"}}><X size={18}/></button></div>{children}</div></div>);};
const Field=({label,children,hint})=>(<div style={{marginBottom:12}}><label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>{label}</label>{children}{hint&&<div style={{fontSize:9.5,color:"#9CA3AF",marginTop:3}}>{hint}</div>}</div>);
const Inp=({value,onChange,type="text",placeholder})=>(<input value={value??""} onChange={e=>onChange(e.target.value)} type={type} placeholder={placeholder} style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:12,boxSizing:"border-box"}}/>);
const Sel=({value,onChange,children})=>(<select value={value??""} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:12,background:"#fff",boxSizing:"border-box"}}>{children}</select>);
const Panel=({title,children,right})=>(<div style={{background:"#fff",borderRadius:12,border:"1px solid #E5E7EB",overflow:"hidden"}}><div style={{padding:"10px 14px",borderBottom:"1px solid #E5E7EB",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}><span style={{fontSize:13,fontWeight:700}}>{title}</span>{right}</div>{children}</div>);
const Note=({children,tone="info"})=>{const t={info:["#EFF6FF","#BFDBFE","#1E40AF"],warn:["#FFF7ED","#FED7AA","#9A3412"],bad:["#FEF2F2","#FECACA","#991B1B"],ok:["#F0FDF4","#BBF7D0","#065F46"]}[tone];
  return (<div style={{background:t[0],border:`1px solid ${t[1]}`,borderRadius:10,padding:"10px 14px",fontSize:12,color:t[2],display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>{children}</div>);};
const Bar2=({v,c="#2563EB"})=>(<div style={{width:70,height:6,background:"#F3F4F6",borderRadius:3,overflow:"hidden",display:"inline-block",verticalAlign:"middle"}}><div style={{width:`${Math.min(100,v*100)}%`,height:"100%",background:c}}/></div>);
const Toasts=({list})=>(<div style={{position:"fixed",bottom:16,right:16,zIndex:300,display:"flex",flexDirection:"column",gap:8}}>
  {list.map(t=>(<div key={t.id} style={{background:t.tone==="bad"?"#991B1B":t.tone==="warn"?"#B45309":"#065F46",color:"#fff",padding:"10px 16px",borderRadius:10,fontSize:12,fontWeight:600,boxShadow:"0 4px 12px rgba(0,0,0,0.25)",maxWidth:360}}>{t.msg}</div>))}
</div>);

/* ═══ 7. MAIN APP ═══ */
export default function App(){
  const [tab,setTab]=useState("data");
  const [role,setRole]=useState("CEO");
  const [brand,setBrand]=useState("all");
  const [search,setSearch]=useState("");
  const [fIR,setFIR]=useState("all");
  const [fBuyClass,setFBuyClass]=useState("all");
  const [fOwner,setFOwner]=useState("all");
  const [fSup,setFSup]=useState("all");
  const [fPoSt,setFPoSt]=useState("all");
  const [sortMode,setSortMode]=useState("risk");
  const [wbSort,setWbSort]=useState(null);
  const [budgetMonth,setBudgetMonth]=useState(CUR_MONTH);
  const [loaded,setLoaded]=useState(false);
  const [saveInfo,setSaveInfo]=useState({st:"idle",via:""});
  const [toasts,setToasts]=useState([]);
  const [confirmReq,setConfirmReq]=useState(null);   // {title,msg,danger,requireReason,twoStep,onOk}

  const [cfg,setCfg]=useState(DEFAULT_CFG);
  const [skuMeta,setSkuMeta]=useState(META_SEED);
  const [prList,setPrList]=useState(PR_SEED);          /* PurchaseRequest[] — entity riêng, nhiều PR/SKU (P0.1) */
  const [snapshots,setSnapshots]=useState([]);          /* ApprovalSnapshot[] — bất biến (P0.2) */
  const [ledger,setLedger]=useState([]);                /* InventoryTransaction[] (P0.5) */
  const [receipts,setReceipts]=useState([]);            /* GoodsReceipt[] (P0.5) */
  const [budgets,setBudgets]=useState(BUDGET_SEED);     /* PurchaseBudget[] month×brand (P0.6) */
  const [reconAlerts,setReconAlerts]=useState([]);      /* Inventory Reconciliation Required (spec XIV) */
  const [suppliers,setSuppliers]=useState(SUPPLIERS_SEED);
  const [supplierSku,setSupplierSku]=useState(SUP_SKU_SEED);
  const [poList,setPoList]=useState(PO_SEED);
  const [salesPlans,setSalesPlans]=useState(PLAN_SEED);
  const [campaigns,setCampaigns]=useState(CAMPAIGN_SEED);
  const [boms,setBoms]=useState(BOM_SEED);
  const [posImports,setPosImports]=useState([]);        /* P1.3: lịch sử import, idempotent theo fileHash */
  const [mappingQueue,setMappingQueue]=useState([]);    /* P1.3: SKU lạ chờ mapping */
  const [buyTier,setBuyTier]=useState({});              /* P1.4: {sku:"STRETCH"} — CEO chọn Buy for Stretch */
  const [allocOverrides,setAllocOverrides]=useState({}); /* P2.1: CEO override phân bổ vốn */
  const [fcstLog,setFcstLog]=useState([]);               /* P2.5: forecast vs actual theo SKU×tháng */
  const [scenModal,setScenModal]=useState(null);
  const [whyModal,setWhyModal]=useState(null);
  const [posMap,setPosMap]=useState(POS_MAP_SEED);
  const [rowOv,setRowOv]=useState({});
  const [auditLog,setAuditLog]=useState([{id:1,timestamp:new Date().toISOString(),user:"System",role:"System",entityType:"System",entityId:"—",action:"Khởi tạo",before:"",after:"",reason:"Nevor 30 mã · UHero 99 mã mẫu · 9,40 tỷ + demo seed"}]);
  const [lastSync,setLastSync]=useState("—");

  /* toast + confirm */
  const showToast=(msg,tone="ok")=>{const id=Date.now()+Math.random();setToasts(t=>[...t,{id,msg,tone}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3500);};
  const askConfirm=req=>setConfirmReq(req);
  const can=p=>(PERMISSIONS[role]||[]).includes(p);

  /* load / save qua storage fallback */
  useEffect(()=>{(async()=>{
    let {data,via}=await loadState();
    /* Migration V9 → V10 (spec XII): proposals{sku} → PurchaseRequest[]; brandBudgets → PurchaseBudget tháng hiện tại */
    if(!data){try{
      const rawV9=typeof localStorage!=="undefined"?localStorage.getItem(STORE_KEY_V9):null;
      if(rawV9){const v9=JSON.parse(rawV9);
        const st9=s=>({"SUBMITTED_TO_LEADER":"SUBMITTED_TO_LEADER","REVISION_REQUESTED":"REVISION_REQUESTED","LEADER_REJECTED":"LEADER_REJECTED","SUBMITTED_TO_CEO":"SUBMITTED_TO_CEO","CEO_APPROVED":"CEO_APPROVED","CEO_REJECTED":"CEO_REJECTED","PO_CREATED":"PO_CREATED"}[s]||null);
        const prs=Object.entries(v9.proposals||{}).map(([sku,p],i)=>{const st=st9(p.status);if(!st)return null;
          return {id:`PR-MIG-${String(i+1).padStart(3,"0")}`,sku,createdAt:p.submittedAt||todayStr(),createdBy:"Migration",status:st,budgetMonth:p.budgetMonth||CUR_MONTH,requestedQty:null,adjustedQty:p.adjQty??null,supplierId:null,reason:"Migrated từ V9",adjustmentReason:p.adjReason||null,leaderNote:p.leaderNote||null,ceoNote:null,snapshotId:null,poId:null,version:1};}).filter(Boolean);
        const buds=Object.entries((v9.cfg&&v9.cfg.brandBudgets)||{}).filter(([,v])=>num(v)>0).map(([brand,v])=>({month:CUR_MONTH,brand,amount:num(v),createdBy:"Migration"}));
        data={...v9,prList:prs.length?prs:undefined,budgets:buds.length?buds:undefined,proposals:undefined};
        via=via+" (migrated V9)";
      }
    }catch(e){console.warn("migrate v9",e);}}
    if(data){
      if(data.cfg)setCfg({...DEFAULT_CFG,...data.cfg,feeRate:{...DEFAULT_CFG.feeRate,...(data.cfg.feeRate||{})},brandBudgets:{...DEFAULT_CFG.brandBudgets,...(data.cfg.brandBudgets||{})}});
      if(data.skuMeta)setSkuMeta({...META_SEED,...data.skuMeta});
      if(data.prList)setPrList(data.prList);
      if(data.snapshots)setSnapshots(data.snapshots);
      if(data.ledger)setLedger(data.ledger);
      if(data.receipts)setReceipts(data.receipts);
      if(data.budgets)setBudgets(data.budgets);
      if(data.reconAlerts)setReconAlerts(data.reconAlerts);
      if(data.suppliers)setSuppliers(data.suppliers);
      if(data.supplierSku)setSupplierSku(data.supplierSku);
      if(data.poList)setPoList(data.poList);
      if(data.salesPlans)setSalesPlans(data.salesPlans);
      if(data.campaigns)setCampaigns(data.campaigns);
      if(data.boms)setBoms(data.boms);
      if(data.posImports)setPosImports(data.posImports);
      if(data.mappingQueue)setMappingQueue(data.mappingQueue);
      if(data.allocOverrides)setAllocOverrides(data.allocOverrides);
      if(data.fcstLog)setFcstLog(data.fcstLog);
      if(data.posMap)setPosMap(data.posMap);
      if(data.rowOv)setRowOv(data.rowOv);
      if(data.auditLog)setAuditLog(data.auditLog);
      if(data.lastSync)setLastSync(data.lastSync);
    }
    setSaveInfo({st:"saved",via});setLoaded(true);
  })();},[]);
  useEffect(()=>{if(!loaded)return;let alive=true;
    setSaveInfo(s=>({...s,st:"saving"}));
    (async()=>{
      const via=await saveState({cfg,skuMeta,prList,snapshots,ledger,receipts,budgets,reconAlerts,suppliers,supplierSku,poList,salesPlans,campaigns,boms,posImports:posImports.slice(0,60),mappingQueue,allocOverrides,fcstLog:fcstLog.slice(0,600),posMap,rowOv,auditLog:auditLog.slice(0,400),lastSync});
      if(alive)setSaveInfo({st:via?"saved":"error",via:via||""});
    })();
    return ()=>{alive=false;};
  },[cfg,skuMeta,prList,snapshots,ledger,receipts,budgets,reconAlerts,suppliers,supplierSku,poList,salesPlans,campaigns,boms,posImports,mappingQueue,allocOverrides,fcstLog,posMap,rowOv,auditLog,lastSync,loaded]);

  const addLog=(entityType,entityId,action,detail,before,after,reason)=>setAuditLog(p=>[{
    id:Date.now()+Math.random(),timestamp:new Date().toISOString(),user:role,role,
    entityType,entityId,action,before:before!==undefined?String(before):"",after:after!==undefined?String(after):(detail||""),reason:reason||detail||""
  },...p].slice(0,500));
  /* ── PurchaseRequest helpers (P0.1) ── */
  const activePRof=sku=>prList.find(p=>p.sku===sku&&PR_ACTIVE.includes(p.status))||null;
  const prHistory=sku=>prList.filter(p=>p.sku===sku);
  const newPrId=()=>{const pre=`PR-${budgetMonth.replace("-","")}-`;let n=1;
    while(prList.some(p=>p.id===pre+String(n).padStart(3,"0")))n++;return pre+String(n).padStart(3,"0");};
  const createPR=(sku,fields)=>{const id=newPrId();
    const pr={id,sku,createdAt:todayStr(),createdBy:role,status:"DRAFT",budgetMonth,requestedQty:null,adjustedQty:null,supplierId:null,reason:"",adjustmentReason:null,leaderNote:null,ceoNote:null,snapshotId:null,poId:null,version:1,...fields};
    setPrList(l=>[pr,...l]);return pr;};
  /* Optimistic concurrency: cập nhật phải khớp version hiện tại, sai → từ chối (spec X) */
  const updatePR=(id,expectVersion,u,silent)=>{let ok=false;
    setPrList(l=>l.map(p=>{if(p.id!==id)return p;
      if(p.version!==expectVersion){return p;}
      ok=true;return {...p,...u,version:p.version+1};}));
    /* setState là sync-batched trong handler; kiểm version trên bản chụp hiện tại */
    const cur=prList.find(p=>p.id===id);
    if(cur&&cur.version!==expectVersion){if(!silent)showToast("Dữ liệu đã được cập nhật bởi người khác. Vui lòng tải lại.","bad");return false;}
    return true;};
  const gp=sku=>activePRof(sku)||{status:"SYSTEM_SUGGESTED"};   /* tương thích UI cũ */
  const sp=(sku,u)=>{const pr=activePRof(sku);
    if(pr)updatePR(pr.id,pr.version,u,true);
    else if(u.status&&u.status!=="SYSTEM_SUGGESTED")createPR(sku,u);};
  const changeRole=r=>{if(r===role)return;addLog("Auth",role,`Đổi vai trò → ${r}`,"",role,r);setRole(r);
    const acc=TAB_ACCESS[r]||[];if(!acc.includes(tab))setTab(DEFAULT_TAB[r]||acc[0]||"ceo");};

  /* Incoming từ PO — có tách trước/sau stockout (spec §3,4,10) */
  /* P2.3: PO rủi ro trễ cao → mô phỏng ở ETA kỳ vọng có trễ (bảo thủ), ảnh hưởng thẳng ATP dự phóng & đề xuất mua */
  const supHistCache=useMemo(()=>{const c={};
    poList.forEach(p=>{if(!c[p.sup])c[p.sup]=supplierHistory(p.sup,poList);});return c;},[poList]);
  const poEventsBySku=useMemo(()=>{const m={};const u={};
    poList.filter(p=>INCOMING_ST.includes(p.status)).forEach(p=>{
      const ra=riskAdjustedDay(p,todayStr(),supHistCache[p.sup]);
      (p.items||[]).forEach(i=>{
        const remaining=Math.max(0,num(i.qty)-num(i.posRcv));
        if(remaining<=0)return;
        if(ra===null){u[i.sku]=(u[i.sku]||0)+remaining;return;}   /* ETA UNKNOWN — không cộng vào timeline (P0.4) */
        (m[i.sku]=m[i.sku]||[]).push({day:ra.day,rawDay:ra.raw,riskAdj:ra.adj,pLate:ra.pLate,range:ra.range,qty:remaining,id:p.id,eta:effectiveEta(p)});
      });
    });return {m,u};},[poList,supHistCache]);
  const openPoSkus=useMemo(()=>{const m={};poList.filter(p=>!["Closed","Cancelled","POS Synced"].includes(p.status)).forEach(p=>(p.items||[]).forEach(i=>{m[i.sku]=(m[i.sku]||[]).concat(p.id);}));return m;},[poList]);

  const onTimeOf=(sku,supName)=>{const r=supplierSku.find(x=>x.sku===sku&&x.sup===supName);if(r&&r.onTime)return Number(r.onTime);
    const s=suppliers.find(x=>x.name===supName);return s&&s.onTime?Number(s.onTime):90;};
  const planAccuracy=useMemo(()=>{const m={};
    fcstLog.forEach(l=>{const a=m[l.sku]=m[l.sku]||{n:0,accSum:0,biasSum:0,campErr:0,baseErr:0,nc:0};
      a.n++;a.accSum+=l.accuracy;a.biasSum+=(l.plan30-l.actual);
      if(l.hadCampaign){a.campErr+=Math.abs(l.plan30-l.actual);a.nc++;}else a.baseErr+=Math.abs(l.plan30-l.actual);});
    Object.values(m).forEach(a=>{a.avgAcc=a.accSum/a.n;a.bias=a.biasSum/a.n;});
    return m;},[fcstLog]);
  const planOf=sku=>{const ag=aggregatePlan(sku,salesPlans,campaigns);
    if(ag.anyApproved){const tier=buyTier[sku]==="STRETCH"?ag.stretch:ag.committed;
      const acc=planAccuracy[sku];
      return {status:"Approved",plan30:tier,_agg:ag,_acc:acc,
        optimistic:acc&&acc.n>=2&&acc.avgAcc<0.6&&acc.bias>0,pessimistic:acc&&acc.n>=2&&acc.avgAcc<0.6&&acc.bias<0};}
    if(ag.anyDraft)return {status:"Draft",_agg:ag};
    return null;};
  /* P1.2: Sales Plan thành phẩm BOM nổ xuống nhu cầu component (fds cộng thêm) */
  const bomExtraFds=useMemo(()=>{const m={};
    boms.forEach(b=>{const ag=aggregatePlan(b.parent,salesPlans,campaigns);
      if(!ag.anyApproved)return;
      const parentFds=ag.committed/30;
      (b.components||[]).forEach(c=>{m[c.sku]=(m[c.sku]||0)+parentFds*(num(c.qty)||1);});});
    return m;},[boms,salesPlans,campaigns]);

  /* P1.5+P1.6: ledger có location + qcHold; GR 2 pha: Warehouse nhận (GR_RECEIVED→QC) rồi QC kết luận (QC_ACCEPT/QC_REJECT) */
  const ledgerBySku=useMemo(()=>{const m={};
    const at=(t)=>{const a=m[t.sku]=m[t.sku]||{onHand:0,available:0,quarantine:0,qcHold:0,loc:{}};return a;};
    const locAdd=(a,loc,d)=>{if(!loc)return;a.loc[loc]=(a.loc[loc]||0)+d;};
    ledger.forEach(t=>{const a=at(t);
      if(t.type==="PURCHASE_RECEIPT"){a.onHand+=t.qty;a.available+=t.acceptedQty??t.qty;a.quarantine+=Math.max(0,t.qty-(t.acceptedQty??t.qty));locAdd(a,"MAIN",t.acceptedQty??t.qty);}
      else if(t.type==="GR_RECEIVED"){a.onHand+=t.qty;a.qcHold+=t.qty;locAdd(a,"QC",t.qty);}
      else if(t.type==="QC_ACCEPT"){a.available+=t.qty;a.qcHold-=t.qty;locAdd(a,"QC",-t.qty);locAdd(a,"MAIN",t.qty);}
      else if(t.type==="QC_REJECT"){a.quarantine+=t.qty;a.qcHold-=t.qty;locAdd(a,"QC",-t.qty);locAdd(a,"QUARANTINE",t.qty);}
      else if(t.type==="STOCK_ADJUSTMENT"){a.onHand+=t.qty;a.available+=t.qty;locAdd(a,t.loc||"MAIN",t.qty);}
      else if(t.type==="TRANSFER"){locAdd(a,t.fromLoc,-t.qty);locAdd(a,t.toLoc,t.qty);}
      else if(t.type==="SALE"||t.type==="GIFT"||t.type==="COMBO_CONSUMPTION"){a.onHand-=t.qty;a.available-=t.qty;locAdd(a,t.loc||"MAIN",-t.qty);}
      else if(t.type==="CUSTOMER_RETURN"){a.onHand+=t.qty;a.available+=t.qty;locAdd(a,"RETURN",t.qty);}
    });return m;},[ledger]);
  /* P1.6: vị trí tồn theo kênh — nền từ dữ liệu thật + delta ledger. ATP = OnHand − Reserved − Blocked; Incoming KHÔNG cộng. */
  const channelPos=sku=>{const s=skuIndex[sku];if(!s)return null;
    const led=ledgerBySku[sku]||{loc:{},qcHold:0,quarantine:0};
    const baseMain=Math.max(0,(s.stockPOS-(s.stockOffice||0)-(s.stockShopee||0)));
    const reserved=Math.max(0,s.stockPOS-s.availableStock-(led.qcHold||0)-(led.quarantine||0));
    return {onHand:s.stockPOS,reserved,blocked:0,qcHold:led.qcHold||0,quarantine:led.quarantine||0,
      atp:s.availableStock,incoming:s.incoming,
      main:baseMain+(led.loc.MAIN||0),office:(s.stockOffice||0)+(led.loc.OFFICE||0),
      shopee:(s.stockShopee||0)+(led.loc.SHOPEE_FBS||0),tiktok:(led.loc.TIKTOK||0),ret:(led.loc.RETURN||0)};};
  /* P1.6: kênh thiếu nhưng Company ATP đủ → TRANSFER, không mua NCC */
  const transferHint=s=>{if(s.fds<=0)return null;const cp=channelPos(s.sku);if(!cp)return null;
    const needDays=Math.min(14,(s.leadTime||14));
    const chans=[["Shopee FBS",cp.shopee],["Kho chính",cp.main]];
    const short=chans.find(([,v])=>v<s.fds*needDays*0.5);
    if(short&&cp.atp>=s.fds*needDays&&s.sysBuy<=0){
      const from=chans.find(([n])=>n!==short[0]);
      return {to:short[0],from:from[0],qty:Math.ceil(s.fds*needDays-short[1])};}
    return null;};
  const skus=useMemo(()=>REAL_ROWS.map(r=>{
    const m=skuMeta[r.sku]||{};
    const ov=rowOv[r.sku]||{};
    /* Inventory Position = base (opening) + Σ ledger (P0.5): nhận hàng vào tồn NGAY, không đợi POS Sync */
    const led=ledgerBySku[r.sku]||{onHand:0,available:0,quarantine:0};
    const merged={...r,...ov,...m,
      stockPOS:(ov.stockPOS??r.stockPOS)+led.onHand,
      availableStock:(ov.availableStock??r.availableStock)+led.available,
      quarantine:led.quarantine};
    ["sellPrice","moq","packSize","leadTime","sold7","sold60","targetCover"].forEach(k=>{if(merged[k]==="")delete merged[k];else if(merged[k]!==undefined)merged[k]=Number(merged[k]);});
    const {fds}=velocity(merged,planOf(r.sku));
    const evs=poEventsBySku.m[r.sku]||[];
    const unknownQty=poEventsBySku.u[r.sku]||0;
    /* Phân loại kịp/trễ SAU mô phỏng tuần tự — không dùng stockoutDay tĩnh (P0.3) */
    const sim=simulateTimeline(merged.availableStock,fds,evs);
    const inc={total:sim.rescueQty+sim.lateQty+unknownQty,before:sim.rescueQty,after:sim.lateQty,unknownQty,
      gapDays:sim.gapDays,lostUnits:sim.lostUnits,stockoutDay:sim.stockoutDay,poCount:evs.length};
    if(!merged.skuType)merged.skuType=merged.variant?"VARIANT":"FINISHED_GOOD";
    return enrich(merged,activePRof(r.sku),cfg,inc,onTimeOf(r.sku,merged.mainSupplier),planOf(r.sku),bomExtraFds[r.sku]||0);
  }),[skuMeta,rowOv,prList,cfg,poEventsBySku,supplierSku,suppliers,salesPlans,campaigns,buyTier,boms,bomExtraFds,ledgerBySku]);
  const skuIndex=useMemo(()=>Object.fromEntries(skus.map(s=>[s.sku,s])),[skus]);

  const inBrand=s=>brand==="all"||s.brand===brand;
  const scope=useMemo(()=>skus.filter(inBrand),[skus,brand]);
  const supplierNames=useMemo(()=>Array.from(new Set([...suppliers.map(s=>s.name),...supplierSku.map(s=>s.sup)])).filter(Boolean).sort(),[suppliers,supplierSku]);
  const ownerNames=useMemo(()=>Array.from(new Set(skus.map(s=>s.owner).filter(Boolean))).sort(),[skus]);

  /* ═══ NGÂN SÁCH THEO THÁNG (spec §5,6,23) ═══ */
  const budgetOf=(month,brand)=>num((budgets.find(b=>b.month===month&&b.brand===brand)||{}).amount);
  const budget=useMemo(()=>{
    const inMonth=p=>monthOf(p.budgetMonth||p.orderDate)===budgetMonth;
    const pos=poList.filter(inMonth);
    const paid=pos.reduce((a,p)=>a+(p.depSt==="Confirmed"?num(p.deposit):0)+(p.paySt==="Confirmed"?num(p.finalPay):0),0);
    const committed=pos.filter(p=>COMMITTED_ST.includes(p.status)).reduce((a,p)=>a+poValue(p),0);
    /* Approved pending PO: lấy CAPITAL TỪ SNAPSHOT, không từ engine realtime (P0.2) */
    const apPRs=prList.filter(p=>p.status==="CEO_APPROVED"&&p.budgetMonth===budgetMonth);
    const snapCap=pr=>{const sn=snapshots.find(s=>s.id===pr.snapshotId&&!s.superseded)||snapshots.find(s=>s.id===pr.snapshotId);return sn?num(sn.approvedCapital):0;};
    const approvedPendingPO=apPRs.reduce((a,p)=>a+snapCap(p),0);
    const total=BRANDS.reduce((a,b)=>a+budgetOf(budgetMonth,b),0);
    const available=total-committed-approvedPendingPO;
    const perBrand=BRANDS.map(b=>{
      const comB=pos.filter(p=>COMMITTED_ST.includes(p.status)).reduce((a,p)=>{
        const lines=(p.items||[]).filter(i=>skuIndex[i.sku]?.brand===b);
        const lv=lines.reduce((x,i)=>x+num(i.qty)*num(i.landed),0);
        const share=poLineVal(p)>0?lv/poLineVal(p):0;
        return a+lv+share*(num(p.freight)+num(p.tax)+num(p.otherCost));
      },0);
      const apB=apPRs.filter(p=>skuIndex[p.sku]?.brand===b).reduce((a,p)=>a+snapCap(p),0);
      const bud=budgetOf(budgetMonth,b);
      return {brand:b,budget:bud,committed:Math.round(comB),approved:apB,left:bud-Math.round(comB)-apB};
    });
    const newProposalCap=prList.filter(p=>["SUBMITTED_TO_LEADER","SUBMITTED_TO_CEO","REVISION_REQUESTED"].includes(p.status)&&p.budgetMonth===budgetMonth).reduce((a,p)=>a+(skuIndex[p.sku]?.capital||0),0);
    return {paid,committed,approvedPendingPO,total,available,perBrand,newProposalCap,over:Math.max(0,-available)};
  },[poList,prList,snapshots,budgets,skuIndex,budgetMonth]);
  /* Check ngân sách cho một request: BRAND và TỔNG đồng thời (spec P0.6) */
  const budgetCheck=(brand2,capital)=>{
    const pb=budget.perBrand.find(x=>x.brand===brand2)||{budget:0,left:0};
    const brandOver=pb.budget>0&&capital>pb.left;
    const totalOver=budget.total>0&&capital>budget.available;
    return {brandOver,brandLeft:pb.left,totalOver,noBudget:budget.total===0,over:brandOver||totalOver};
  };

  /* Tiền mặt (giữ từ V8, hiển thị ở Cashflow) */
  const pendingDeposit=poList.filter(p=>p.depSt==="Pending"&&!["Closed","Cancelled"].includes(p.status)).reduce((a,p)=>a+num(p.deposit),0);
  const pendingFinal=poList.filter(p=>p.paySt==="Pending"&&!["Closed","Cancelled"].includes(p.status)).reduce((a,p)=>a+num(p.finalPay),0);
  const committedCash=pendingDeposit+pendingFinal;
  const availableCash=cfg.cashBalance-committedCash;

  /* ═══ ĐỘ SẴN SÀNG DỮ LIỆU (giữ từ V8) ═══ */
  const readiness=useMemo(()=>{
    const n=scope.length||1;
    const has=f=>scope.filter(s=>s[f]).length;
    const fields=["sellPrice","leadTime","moq","packSize","productStatus","mainSupplier","sold7","sold60"];
    return {n:scope.length,perField:Object.fromEntries(fields.map(f=>[f,has(f)/n])),
      profit:scope.filter(s=>s.canProfit).length/n,buy:scope.filter(s=>s.canBuy).length/n,
      supplier:supplierSku.length>0?scope.filter(s=>supplierSku.some(x=>x.sku===s.sku))/n||scope.filter(s=>supplierSku.some(x=>x.sku===s.sku)).length/n:0,
      budget:budget.total>0?1:0};
  },[scope,supplierSku,budget.total]);

  /* ═══ TỔNG HỢP ═══ */
  const totalVal=scope.reduce((a,s)=>a+s.stockValue,0);
  const deadCap=scope.reduce((a,s)=>a+s.deadCap,0);
  const moqBoundCap=scope.filter(s=>s.invRisk==="MOQ-bound").reduce((a,s)=>a+s.stockValue,0);
  const idleCap=scope.filter(s=>s.invRisk==="Chưa bán").reduce((a,s)=>a+s.stockValue,0);
  const cogsDay=scope.reduce((a,s)=>a+s.fds*s.landedCost,0);
  const dio=cogsDay>0?Math.round(totalVal/cogsDay):0;
  const shopeeCap=scope.reduce((a,s)=>a+(s.stockShopee||0)*s.landedCost,0);
  const grossSold=scope.reduce((a,s)=>a+s.sold30,0);
  const returned=scope.reduce((a,s)=>a+s.returned30,0);
  const received=scope.reduce((a,s)=>a+s.received30,0);
  const buildUpUnits=received-grossSold;
  const buildUpCap=scope.reduce((a,s)=>a+(s.received30-s.sold30)*s.landedCost,0);
  const riskSKUs=scope.filter(s=>["Urgent Buy","Stockout Risk"].includes(s.sRisk));
  const lostRevTotal=scope.reduce((a,s)=>a+(s.lostRevenue||0),0);
  const liquidate=scope.filter(s=>s.invRisk==="Liquidate");
  const mismatchPOs=poList.filter(p=>p.status==="PO Mismatch");
  const latePOs=poList.filter(p=>poDelay(p)>0);
  const grossFcast=scope.filter(s=>s.canProfit).reduce((a,s)=>a+s.fds*s.sellPrice*30,0);
  /* Pareto thật (spec §28) */
  const pareto=useMemo(()=>{
    const act=scope.filter(s=>s.sold30>0&&s.skuType!=="GIFT").sort((a,b)=>{
      const ra=a.canProfit?a.sold30*a.sellPrice:a.sold30, rb=b.canProfit?b.sold30*b.sellPrice:b.sold30;return rb-ra;});
    if(!act.length)return null;
    const rev=s=>s.canProfit?s.sold30*s.sellPrice:s.sold30;
    const tot=act.reduce((a,s)=>a+rev(s),0);
    const topN=Math.max(1,Math.ceil(act.length*0.2));
    const topRev=act.slice(0,topN).reduce((a,s)=>a+rev(s),0);
    return {topN,n:act.length,share:tot>0?topRev/tot:0,byRevenue:act.some(s=>s.canProfit)};
  },[scope]);

  const brandStats=useMemo(()=>BRANDS.map(b=>{
    const g=skus.filter(s=>s.brand===b);
    if(!g.length)return {brand:b,n:0,val:0,dio:0,dead:0,moqb:0,sold:0,recv:0,buildCap:0,ret:0,top:null};
    const tv=g.reduce((a,s)=>a+s.stockValue,0);
    const cd=g.reduce((a,s)=>a+s.fds*s.landedCost,0);
    return {brand:b,n:g.length,val:tv,dio:cd>0?Math.round(tv/cd):0,
      dead:g.reduce((a,s)=>a+s.deadCap,0),moqb:g.filter(s=>s.invRisk==="MOQ-bound").reduce((a,s)=>a+s.stockValue,0),
      sold:g.reduce((a,s)=>a+s.sold30,0),recv:g.reduce((a,s)=>a+s.received30,0),
      buildCap:g.reduce((a,s)=>a+(s.received30-s.sold30)*s.landedCost,0),ret:g.reduce((a,s)=>a+s.returned30,0),
      top:g.slice().sort((x,y)=>y.stockValue-x.stockValue)[0]};
  }),[skus]);

  /* Nhóm sản phẩm cha (spec §9) */
  const productGroups=useMemo(()=>{
    const m={};scope.forEach(s=>{(m[s.productCode]=m[s.productCode]||[]).push(s);});
    return Object.entries(m).map(([pc,arr])=>{
      const val=arr.reduce((a,s)=>a+s.stockValue,0);
      const sold=arr.reduce((a,s)=>a+s.sold30,0);
      const active=arr.filter(s=>s.fds>0);
      const covers=active.map(s=>s.cover);
      const avgCover=active.length?Math.round(active.reduce((a,s)=>a+s.cover,0)/active.length):0;
      const minSku=active.length?active.reduce((a,s)=>s.cover<a.cover?s:a,active[0]):null;
      const soRisk=arr.filter(s=>["Urgent Buy","Stockout Risk"].includes(s.sRisk));
      const over=arr.filter(s=>["Excess","Liquidate"].includes(s.invRisk));
      const top=arr.slice().sort((a,b)=>b.sold30-a.sold30)[0];
      const rescue=arr.some(s=>s.incomingBefore>0);
      return {pc,arr,n:arr.length,val,sold,brand:arr[0].brand,name:arr[0].name,
        dead:arr.reduce((a,s)=>a+s.deadCap,0),zero:arr.filter(s=>s.sold30===0).length,
        conc:sold>0?top.sold30/sold:0,top,
        avgCover,minCover:covers.length?Math.min(...covers):0,maxCover:covers.length?Math.max(...covers):0,
        minSku,minShare:minSku&&sold>0?minSku.sold30/sold:0,
        nStockout:soRisk.length,nOver:over.length,rescue,
        needTopUp:soRisk.length>0&&avgCover>45};
    }).sort((a,b)=>b.val-a.val);
  },[scope]);

  const concentration=useMemo(()=>{
    const by={};
    scope.filter(s=>s.mainSupplier).forEach(s=>{const k=s.brand+"|"+s.mainSupplier;
      if(!by[k])by[k]={brand:s.brand,sup:s.mainSupplier,n:0,val:0,noBackup:0};
      by[k].n++;by[k].val+=s.stockValue;
      if(supplierSku.filter(x=>x.sku===s.sku&&x.sup!==s.mainSupplier).length===0)by[k].noBackup++;});
    const arr=Object.values(by);
    const totals={};arr.forEach(x=>{totals[x.brand]=(totals[x.brand]||0)+x.val;});
    return arr.map(x=>({...x,share:totals[x.brand]?x.val/totals[x.brand]:0,coverage:x.n?1-x.noBackup/x.n:0})).sort((a,b)=>b.share-a.share);
  },[scope,supplierSku]);

  const filtered=useMemo(()=>scope.filter(s=>{
    if(fIR!=="all"&&s.invRisk!==fIR)return false;
    if(fOwner!=="all"&&s.owner!==fOwner)return false;
    if(fSup!=="all"&&s.mainSupplier!==fSup)return false;
    if(search){const q=search.toLowerCase();if(!s.sku.toLowerCase().includes(q)&&!s.name.toLowerCase().includes(q)&&!(s.variant||"").toLowerCase().includes(q))return false;}
    return true;
  }),[scope,fIR,fOwner,fSup,search]);

  const resetFilters=()=>{setSearch("");setFIR("all");setFBuyClass("all");setFOwner("all");setFSup("all");setFPoSt("all");};

  /* modals state */
  const [metaModal,setMetaModal]=useState(null);
  const [metaForm,setMetaForm]=useState({});
  const [bulkModal,setBulkModal]=useState(false);
  const [bulkForm,setBulkForm]=useState({leadTime:"",moq:"",packSize:"",targetCover:"",productStatus:""});
  const [adjModal,setAdjModal]=useState(null);
  const [adjQty,setAdjQty]=useState(""); const [adjReason,setAdjReason]=useState(""); const [adjNote,setAdjNote]=useState("");
  const [revModal,setRevModal]=useState(null); const [revReason,setRevReason]=useState("");   // Leader yêu cầu sửa / từ chối
  const [supModal,setSupModal]=useState(null);
  const [supMasterModal,setSupMasterModal]=useState(false);
  const [supForm,setSupForm]=useState({});
  const [skuSupModal,setSkuSupModal]=useState(null);
  const [skuSupForm,setSkuSupForm]=useState({});
  const [poStModal,setPoStModal]=useState(null); const [poStReason,setPoStReason]=useState("");
  const [rcvModal,setRcvModal]=useState(null); const [rcvForm,setRcvForm]=useState({}); const [rcvReason,setRcvReason]=useState("");
  const [mmModal,setMmModal]=useState(null); const [mmForm,setMmForm]=useState({});
  const [createPoSku,setCreatePoSku]=useState(null);
  const [mergePoModal,setMergePoModal]=useState(null);
  const [cfgModal,setCfgModal]=useState(false); const [cfgForm,setCfgForm]=useState({});
  const [importPreview,setImportPreview]=useState(null);
  const [allocModal,setAllocModal]=useState(null); const [allocQty,setAllocQty]=useState(""); const [allocReason,setAllocReason]=useState("");
  const [variantModal,setVariantModal]=useState(null);
  const [planModal,setPlanModal]=useState(null); const [planForm,setPlanForm]=useState({});
  const [timelineModal,setTimelineModal]=useState(null);
  const [histModal,setHistModal]=useState(null);

  const openMeta=s=>{setMetaModal(s.sku);setMetaForm({skuType:s.skuType??"",sellPrice:s.sellPrice??"",moq:s.moq??"",packSize:s.packSize??"",leadTime:s.leadTime??"",targetCover:s.targetCover??"",productStatus:s.productStatus??"",mainSupplier:s.mainSupplier??"",owner:s.owner??"",sold7:s.sold7??"",sold60:s.sold60??""});};

  const TABS=[
    {id:"data",label:"Dữ Liệu",icon:ListChecks,badge:Math.round((1-readiness.buy)*readiness.n)||undefined},
    {id:"ceo",label:"CEO Dashboard",icon:BarChart3,badge:(prList.filter(p=>p.status==="SUBMITTED_TO_CEO").length+mismatchPOs.length+latePOs.length)||undefined},
    {id:"cap",label:"Vốn Chết",icon:Archive,badge:liquidate.length||undefined},
    {id:"wb",label:"Cần Mua",icon:ShoppingCart,badge:scope.filter(s=>s.buyClass==="Buy Now").length||undefined},
    {id:"cal",label:"Lịch Nhập",icon:Calendar},
    {id:"var",label:"Biến Thể",icon:Layers},
    {id:"plan",label:"Sales Plan",icon:TrendingUp,badge:salesPlans.filter(p=>p.status==="Submitted").length||undefined},
    {id:"leader",label:"Leader Duyệt",icon:ShieldAlert,badge:prList.filter(p=>["SUBMITTED_TO_LEADER","REVISION_REQUESTED"].includes(p.status)).length||undefined},
    {id:"approve",label:"CEO Duyệt",icon:ThumbsUp,badge:prList.filter(p=>p.status==="SUBMITTED_TO_CEO").length||undefined},
    {id:"po",label:"PO Tracking",icon:Truck,badge:(mismatchPOs.length+latePOs.length)||undefined},
    {id:"supplier",label:"NCC",icon:Users},
    {id:"cash",label:"Cashflow · CCC",icon:Wallet,badge:budget.total===0?1:undefined},
    {id:"audit",label:"Audit Log",icon:History},
    {id:"sync",label:"POS Sync",icon:Database},
    {id:"inv",label:"Kho & ATP",icon:Box,badge:reconAlerts.length||undefined},
  ];
  /* ═══ P1.7: Role-based Navigation — nav là UX, quyền thật vẫn check trong handler ═══ */
  const TAB_ACCESS={
    CEO:["ceo","approve","cap","po","cash","wb","cal","var","plan","leader","supplier","data","audit","sync","inv"],
    Leader:["leader","wb","cal","var","plan","data","cap","inv"],
    Purchasing:["wb","cal","po","supplier","data","sync","leader","inv"],
    Warehouse:["inv","po","sync"],
    QC:["inv","po"],
    Accounting:["cash","po","audit"],
    "Sales Planner":["plan","var","inv"],
    "E-commerce Lead":["plan","var","inv"],
    "Growth Lead":["plan","var","inv","ceo"],
    Viewer:["ceo","cap","wb","cal","var","plan","po","supplier","cash","data","inv"],
  };
  const DEFAULT_TAB={CEO:"ceo",Leader:"leader",Purchasing:"wb",Warehouse:"inv",QC:"po",Accounting:"cash","Sales Planner":"plan","E-commerce Lead":"plan","Growth Lead":"plan",Viewer:"ceo"};
  const visibleTabs=TABS.filter(t=>(TAB_ACCESS[role]||[]).includes(t.id));
  const navS=id=>({display:"flex",alignItems:"center",gap:7,padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:tab===id?700:500,background:tab===id?"#EFF6FF":"transparent",color:tab===id?"#1D4ED8":"#4B5563",border:"none",width:"100%",textAlign:"left"});

  const brandBar=(<div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
    <div style={{display:"flex",gap:2,background:"#F3F4F6",padding:2,borderRadius:8}}>
      {[["all","Tất cả brand"],...BRANDS.map(b=>[b,b])].map(([v,l])=>(
        <button key={v} onClick={()=>setBrand(v)} style={{padding:"5px 10px",borderRadius:6,border:"none",fontSize:11,fontWeight:brand===v?700:500,background:brand===v?"#fff":"transparent",color:brand===v?"#1D4ED8":"#6B7280",cursor:"pointer"}}>{l}</button>))}
    </div>
    <div style={{position:"relative",flex:"1 1 150px"}}><Search size={13} style={{position:"absolute",left:9,top:8,color:"#9CA3AF"}}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm SKU / tên / biến thể..." style={{width:"100%",padding:"6px 8px 6px 28px",borderRadius:8,border:"1px solid #E5E7EB",fontSize:11,outline:"none",boxSizing:"border-box"}}/></div>
    <select value={fIR} onChange={e=>setFIR(e.target.value)} style={{padding:"6px 8px",borderRadius:8,border:"1px solid #E5E7EB",fontSize:11,background:"#fff"}}><option value="all">Sức khoẻ kho</option>{["Healthy","Watch","Excess","Liquidate","MOQ-bound","Chưa bán"].map(o=><option key={o} value={o}>{vn(o)}</option>)}</select>
    <select value={fOwner} onChange={e=>setFOwner(e.target.value)} style={{padding:"6px 8px",borderRadius:8,border:"1px solid #E5E7EB",fontSize:11,background:"#fff"}}><option value="all">Người phụ trách</option>{ownerNames.map(o=><option key={o}>{o}</option>)}</select>
    <select value={fSup} onChange={e=>setFSup(e.target.value)} style={{padding:"6px 8px",borderRadius:8,border:"1px solid #E5E7EB",fontSize:11,background:"#fff"}}><option value="all">NCC</option>{supplierNames.map(o=><option key={o}>{o}</option>)}</select>
    <button onClick={resetFilters} style={{padding:"6px 10px",borderRadius:8,border:"1px solid #E5E7EB",fontSize:10,background:"#fff",cursor:"pointer",color:"#6B7280",fontWeight:600}}>Reset lọc</button>
  </div>);

  /* ═══════════ TAB: DỮ LIỆU ═══════════ */
  const exportTemplate=()=>{
    const rows=scope.map(s=>({sku:s.sku,productCode:s.productCode,brand:s.brand,ten:s.name,bienThe:s.variant||"",
      tonKho:s.stockPOS,giaVon:s.landedCost,ban30:s.sold30,hoan30:s.returned30,
      giaBan:s.sellPrice??"",leadTime:s.leadTime??"",MOQ:s.moq??"",packSize:s.packSize??"",
      targetCover:s.targetCover??"",trangThaiSP:s.productStatus??"",NCCchinh:s.mainSupplier??"",
      nguoiPhuTrach:s.owner??"",ban7:s.sold7??"",ban60:s.sold60??""}));
    const ws=XLSX.utils.json_to_sheet(rows);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"SKU");
    XLSX.writeFile(wb,`novix-sku-can-bo-sung-${todayStr()}.xlsx`);
    addLog("System","—","Export template",`${rows.length} SKU`);showToast("Đã xuất file mẫu");
  };
  const renderData=()=>{
    const missing=scope.filter(s=>!s.canBuy||!s.canProfit).sort((a,b)=>b.stockValue-a.stockValue);
    const L=[
      {k:"Sức khoẻ tồn kho",v:1,note:"Đã có: tồn, bán 30d, hoàn, giá vốn"},
      {k:"Lợi nhuận / ưu tiên vốn",v:readiness.profit,note:"Cần: Giá bán"},
      {k:"Đề xuất mua",v:readiness.buy,note:"Cần: Lead time · MOQ · Pack · Trạng thái SP"},
      {k:"So sánh & chọn NCC",v:readiness.supplier,note:"Cần: bảng NCC theo SKU"},
      {k:"Ngân sách & chặn duyệt",v:readiness.budget,note:"Cần: ngân sách tháng theo brand"},
    ];
    return (<div style={{display:"flex",flexDirection:"column",gap:12}}>
      {brandBar}
      <Note tone="warn"><span><strong>Tool chỉ tính những gì có dữ liệu.</strong> Ô thiếu hiện “—”, không đoán. Một số SKU đã có dữ liệu DEMO để chạy thử luồng.</span>
        {can("data.edit")&&<div style={{display:"flex",gap:6}}><Btn onClick={()=>setBulkModal(true)} color="#4338CA" small>Điền hàng loạt</Btn><Btn onClick={exportTemplate} color="#059669" small>Tải file mẫu Excel</Btn></div>}</Note>
      <Panel title={`Độ sẵn sàng — ${scope.length} SKU${brand!=="all"?` (${brand})`:""}`}>
        <div style={{padding:14,display:"flex",flexDirection:"column",gap:10}}>
          {L.map(x=>(<div key={x.k} style={{display:"flex",alignItems:"center",gap:10,fontSize:12}}>
            <div style={{width:190,fontWeight:600}}>{x.k}</div>
            <Bar2 v={x.v} c={x.v>=1?"#059669":x.v>0?"#D97706":"#DC2626"}/>
            <div style={{width:48,fontWeight:700,color:x.v>=1?"#059669":x.v>0?"#D97706":"#DC2626"}}>{pct(x.v)}</div>
            <div style={{color:"#6B7280",fontSize:11}}>{x.note}</div>
          </div>))}
        </div>
      </Panel>
      <Panel title="Thiếu theo từng trường">
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}><thead><tr><TH>Trường</TH><TH r>Đã có</TH><TH r>Thiếu</TH><TH>Độ phủ</TH><TH>Bắt buộc cho</TH></tr></thead><tbody>
          {Object.entries(readiness.perField).map(([f,v])=>(<tr key={f}>
            <TD b>{FIELD_VN[f]}</TD><TD r>{Math.round(v*scope.length)}</TD>
            <TD r b c={v<1?"#DC2626":"#059669"}>{scope.length-Math.round(v*scope.length)}</TD>
            <TD><Bar2 v={v} c={v>=1?"#059669":"#DC2626"}/> <span style={{fontSize:10,marginLeft:6}}>{pct(v)}</span></TD>
            <TD><span style={{fontSize:10.5,color:"#6B7280"}}>{NEED_PROFIT.includes(f)?"Lợi nhuận, ưu tiên vốn, hoàn vốn":NEED_BUY.includes(f)?"Số lượng đặt, deadline, cờ rủi ro":f==="mainSupplier"?"Tạo PO, safety stock động":"Chống nhiễu forecast"}</span></TD>
          </tr>))}
        </tbody></table></div>
      </Panel>
      <Panel title={`SKU thiếu dữ liệu — ${missing.length} (xếp theo vốn đang chôn)`}>
        <div style={{overflowX:"auto",maxHeight:440}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1050}}><thead><tr>
          <TH>SKU</TH><TH>Brand</TH><TH>Tên</TH><TH r>Tồn</TH><TH r>Vốn</TH><TH r>Bán 30d</TH><TH r>Cover</TH><TH>Thiếu</TH><TH>Action</TH>
        </tr></thead><tbody>
          {missing.slice(0,60).map(s=>(<tr key={s.sku}>
            <TD m b c="#1D4ED8">{s.sku}</TD><TD><BrandB b={s.brand}/></TD>
            <TD><span style={{fontSize:10.5}}>{s.name}{s.variant?` · ${s.variant}`:""}</span></TD>
            <TD r>{s.stockPOS.toLocaleString()}</TD><TD r b>{fmt(s.stockValue)}₫</TD>
            <TD r>{s.sold30}</TD><TD r c={s.cover>cfg.liqDays?"#991B1B":"#374151"}>{s.cover>9000?"∞":s.cover+"d"}</TD>
            <TD><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{[...s.missProfit,...s.missBuy].map(f=><Badge key={f} c="#991B1B" bg="#FEE2E2">{FIELD_VN[f]}</Badge>)}</div></TD>
            <TD>{can("data.edit")&&<Btn onClick={()=>openMeta(s)} small>Điền</Btn>}</TD>
          </tr>))}
        </tbody></table></div>
        {missing.length>60&&<div style={{padding:10,fontSize:11,color:"#6B7280"}}>… và {missing.length-60} SKU nữa.</div>}
      </Panel>
    </div>);
  };

  /* ═══════════ TAB: CEO DASHBOARD — "Cần quyết định hôm nay" trước (spec §27) ═══════════ */
  const invChart=useMemo(()=>["Healthy","Watch","Excess","Liquidate","MOQ-bound","Chưa bán"].map(k=>({name:vn(k),key:k,value:Math.round(scope.filter(s=>s.invRisk===k).reduce((a,s)=>a+s.stockValue,0)/1e6)})).filter(x=>x.value>0),[scope]);
  const topChart=useMemo(()=>[...scope].sort((a,b)=>b.stockValue-a.stockValue).slice(0,8).map(s=>({name:s.sku.slice(0,11),value:Math.round(s.stockValue/1e6)})),[scope]);

  const renderCEO=()=>{
    const waitLeader=prList.filter(p=>["SUBMITTED_TO_LEADER","REVISION_REQUESTED"].includes(p.status)&&(brand==="all"||skuIndex[p.sku]?.brand===brand));
    const waitCEO=prList.filter(p=>p.status==="SUBMITTED_TO_CEO"&&(brand==="all"||skuIndex[p.sku]?.brand===brand));
    const waitCap=waitCEO.reduce((a,p)=>a+(skuIndex[p.sku]?.capital||0),0);
    const decisions=[
      ...waitCEO.map(p=>{const s=skuIndex[p.sku]||{};return {type:"Duyệt mua",id:p.id,detail:`${p.sku} · ${(s.actOQ||0).toLocaleString()} SP · ${fmtFull(s.capital||0)}${(s.capital||0)>budget.available&&budget.total>0?" · VƯỢT NGÂN SÁCH":""}`,val:s.capital||0,act:()=>setTab("approve"),lbl:"Duyệt"};}),
      ...mismatchPOs.map(p=>({type:"Xử lý mismatch",id:p.id,detail:`Nhận ${poRcv(p)}/${poQty(p)} · ${p.sup}`,val:poValue(p),act:()=>setTab("po"),lbl:"Xử lý"})),
      ...latePOs.map(p=>({type:"PO trễ",id:p.id,detail:`Trễ ${poDelay(p)}d · ${vn(p.status)}`,val:poValue(p),act:()=>setTab("po"),lbl:"Xem PO"})),
      ...poList.filter(p=>etaStatus(p)==="DELAYED_UNCONFIRMED"&&INCOMING_ST.includes(p.status)).map(p=>({type:"ETA UNKNOWN",id:p.id,detail:`Quá ETA gốc ${p.originalEta||p.eta}, NCC chưa xác nhận lại — KHÔNG tính vào hàng đang về`,val:poValue(p),act:()=>setTab("po"),lbl:"Cập nhật ETA"})),
      ...scope.filter(s=>s.buyClass==="Negotiate MOQ"&&s.sysBuy>0).slice(0,5).map(s=>({type:"Duyệt overbuy MOQ",id:s.sku,detail:`Cần ${s.sysBuy} nhưng MOQ ${s.moq} → cover ${s.daysAfter}d`,val:s.overCap,act:()=>setTab("wb"),lbl:"Xem"})),
      ...liquidate.slice(0,5).map(s=>({type:"Xả tồn",id:s.sku,detail:`Cover ${s.cover>9000?"∞":s.cover+"d"} · ${fmt(s.stockValue)}₫`,val:s.stockValue,act:()=>setTab("cap"),lbl:"Xem"})),
    ];
    return (<div style={{display:"flex",flexDirection:"column",gap:14}}>
    {brandBar}
    <div style={{fontSize:10,fontWeight:700,color:"#991B1B",letterSpacing:0.5,textTransform:"uppercase"}}>Cần quyết định hôm nay</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8}}>
      <Card icon={ShieldAlert} label="Chờ Leader" value={waitLeader.length} accent="#2563EB" onClick={()=>setTab("leader")}/>
      <Card icon={ThumbsUp} label="Chờ CEO" value={waitCEO.length} sub={fmtFull(waitCap)} accent="#7C3AED" alert={waitCEO.length>0} onClick={()=>setTab("approve")}/>
      <Card icon={AlertTriangle} label="SKU nguy cơ hết" value={riskSKUs.length} accent="#DC2626" alert={riskSKUs.length>0} onClick={()=>setTab("wb")}/>
      <Card icon={Zap} label="Doanh thu nguy cơ mất" value={lostRevTotal?fmt(lostRevTotal)+"₫":"—"} sub="Từ gap thiếu hàng (mô phỏng PO)" accent="#DC2626" alert={lostRevTotal>0}/>
      <Card icon={Truck} label="PO trễ / mismatch" value={`${latePOs.length} / ${mismatchPOs.length}`} accent="#EA580C" alert={latePOs.length+mismatchPOs.length>0} onClick={()=>setTab("po")}/>
      <Card icon={Wallet} label={`Ngân sách còn (${budgetMonth})`} value={budget.total?fmt(budget.available)+"₫":"—"} sub={budget.total?`Cam kết ${fmt(budget.committed)} · chờ PO ${fmt(budget.approvedPendingPO)}`:"Chưa nhập ngân sách"} accent={budget.available<0?"#DC2626":"#059669"} alert={budget.total>0&&budget.available<0} onClick={()=>setTab("cash")}/>
    </div>
    {decisions.length>0&&<Panel title={`Bảng quyết định — ${decisions.length} mục`}>
      <div style={{overflowX:"auto",maxHeight:300}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:820}}><thead><tr><TH>Loại</TH><TH>ID</TH><TH>Chi tiết</TH><TH r>Giá trị</TH><TH>Action</TH></tr></thead><tbody>
        {decisions.map((d,i)=>(<tr key={i}><TD><Badge c="#991B1B" bg="#FEE2E2">{d.type}</Badge></TD><TD m b c="#1D4ED8">{d.id}</TD><TD><span style={{fontSize:10.5}}>{d.detail}</span></TD><TD r b>{fmt(d.val)}₫</TD><TD><Btn onClick={d.act} small>{d.lbl}</Btn></TD></tr>))}
      </tbody></table></div>
    </Panel>}

    <div style={{fontSize:10,fontWeight:700,color:"#6B7280",letterSpacing:0.5,textTransform:"uppercase",marginTop:4}}>Analytics — vốn &amp; vòng quay</div>
    {buildUpCap>0&&<Note tone="bad"><span><strong>Tồn kho tăng {fmt(buildUpCap)}₫ trong 30 ngày.</strong> Nhập {received.toLocaleString()} − bán {grossSold.toLocaleString()} = +{buildUpUnits.toLocaleString()} cái.</span></Note>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>
      <Card icon={DollarSign} label="Giá trị tồn" value={fmt(totalVal)+"₫"} sub={`${scope.length} SKU`} accent="#7C3AED"/>
      <Card icon={Clock} label="DIO" value={dio+" ngày"} sub={`COGS ${fmt(cogsDay)}₫/ngày`} accent={dio>90?"#DC2626":"#059669"} alert={dio>90}/>
      <Card icon={Archive} label="Vốn nguy cơ chết (dự phóng 90d)" value={fmt((()=>{const t=scope.reduce((a,s)=>{if(s.fds<=0)return a;
        const ag=aggregatePlan(s.sku,salesPlans,campaigns);
        const pr=activePRof(s.sku);const sn2=pr&&pr.status==="CEO_APPROVED"?snapshots.find(z=>z.id===pr.snapshotId):null;
        const fe=futureExposure(s,poEventsBySku.m[s.sku]||[],sn2?sn2.approvedQty:0,ag,cfg);
        return a+fe.futureDead;},0);return t;})())+"₫"} sub="Tồn + hàng về + PR duyệt − nhu cầu" accent="#B45309" alert={(()=>{const t=scope.reduce((a,s)=>{if(s.fds<=0)return a;
        const ag=aggregatePlan(s.sku,salesPlans,campaigns);
        const pr=activePRof(s.sku);const sn2=pr&&pr.status==="CEO_APPROVED"?snapshots.find(z=>z.id===pr.snapshotId):null;
        const fe=futureExposure(s,poEventsBySku.m[s.sku]||[],sn2?sn2.approvedQty:0,ag,cfg);
        return a+fe.futureDead;},0);return t;})()>0}/>
      <Card icon={Archive} label="Vốn chết" value={fmt(deadCap)+"₫"} sub={pct(totalVal?deadCap/totalVal:0)+" tồn kho"} accent="#991B1B" alert={deadCap/Math.max(1,totalVal)>0.2} onClick={()=>setTab("cap")}/>
      <Card icon={Package} label="Kẹt MOQ" value={fmt(moqBoundCap)+"₫"} sub="Đàm phán MOQ, không xả" accent="#4338CA"/>
      <Card icon={XCircle} label="Tỷ lệ hoàn" value={pct(grossSold?returned/grossSold:0)} sub={`${returned.toLocaleString()} cái`} accent={returned/Math.max(1,grossSold)>0.05?"#EA580C":"#059669"}/>
      <Card icon={Truck} label="Vốn kho Shopee" value={fmt(shopeeCap)+"₫"} sub={pct(totalVal?shopeeCap/totalVal:0)+" ngoài kho mình"} accent="#EA580C" alert={shopeeCap/Math.max(1,totalVal)>0.3}/>
      {grossFcast>0&&<Card icon={TrendingUp} label="Doanh thu gross dự báo 30d" value={fmt(grossFcast)+"₫"} sub="Chưa trừ voucher, hoàn huỷ, phí sàn, chiết khấu" accent="#0891B2"/>}
      {pareto&&<Card icon={Target} label={pareto.byRevenue?"Pareto doanh thu":"Pareto sản lượng"} value={`Top 20% → ${pct(pareto.share)}`} sub={`${pareto.topN}/${pareto.n} SKU đang bán${pareto.byRevenue?"":" (theo số lượng — chưa đủ giá bán)"}`} accent="#7C3AED"/>}
    </div>

    {brand==="all"&&(<Panel title="So sánh brand">
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1000}}><thead><tr>
        <TH>Brand</TH><TH r>SKU</TH><TH r>Giá trị tồn</TH><TH r>DIO</TH><TH r>Vốn chết</TH><TH r>%</TH><TH r>Kẹt MOQ</TH><TH r>Bán 30d</TH><TH r>Nhập 30d</TH><TH r>Tồn tăng</TH><TH r>Hoàn</TH><TH r>NS tháng</TH><TH r>NS còn</TH>
      </tr></thead><tbody>
        {brandStats.map(b=>{const bb=budget.perBrand.find(x=>x.brand===b.brand)||{};return (<tr key={b.brand}>
          <TD b><BrandB b={b.brand}/></TD>
          <TD r>{b.n}</TD><TD r b>{fmt(b.val)}₫</TD>
          <TD r b c={b.dio>90?"#DC2626":"#059669"}>{b.dio?b.dio+"d":"—"}</TD>
          <TD r b c="#991B1B">{fmt(b.dead)}₫</TD><TD r c={b.val&&b.dead/b.val>0.2?"#DC2626":"#6B7280"}>{b.val?pct(b.dead/b.val):"—"}</TD>
          <TD r c="#4338CA">{fmt(b.moqb)}₫</TD>
          <TD r>{b.sold.toLocaleString()}</TD><TD r>{b.recv.toLocaleString()}</TD>
          <TD r b c={b.buildCap>0?"#DC2626":"#059669"}>{b.buildCap>0?"+":""}{fmt(b.buildCap)}₫</TD>
          <TD r c={b.sold&&b.ret/b.sold>0.05?"#EA580C":"#059669"}>{b.sold?pct(b.ret/b.sold):"—"}</TD>
          <TD r>{fmt(bb.budget||0)}₫</TD>
          <TD r b c={(bb.left||0)<0?"#DC2626":"#059669"}>{fmt(bb.left||0)}₫</TD>
        </tr>);})}
      </tbody></table></div>
    </Panel>)}

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:12}}>
      <Panel title="Vốn theo sức khoẻ kho (triệu ₫)">
        <div style={{padding:12,height:220}}><ResponsiveContainer width="100%" height="100%">
          <BarChart data={invChart}><CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/><XAxis dataKey="name" tick={{fontSize:9}} angle={-18} textAnchor="end" height={48}/><YAxis tick={{fontSize:10}}/><Tooltip formatter={v=>v+" tr₫"}/>
            <Bar dataKey="value" radius={[4,4,0,0]}>{invChart.map((e,i)=><Cell key={i} fill={IR_HEX[e.key]}/>)}</Bar>
          </BarChart></ResponsiveContainer></div>
      </Panel>
      <Panel title="Top 8 SKU giữ vốn (triệu ₫)">
        <div style={{padding:12,height:220}}><ResponsiveContainer width="100%" height="100%">
          <BarChart data={topChart} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/><XAxis type="number" tick={{fontSize:10}}/><YAxis type="category" dataKey="name" width={92} tick={{fontSize:9}}/><Tooltip formatter={v=>v+" tr₫"}/>
            <Bar dataKey="value" fill="#7C3AED" radius={[0,4,4,0]}/>
          </BarChart></ResponsiveContainer></div>
      </Panel>
    </div>
  </div>);};

  /* ═══════════ TAB: VỐN CHẾT ═══════════ */
  const renderCap=()=>{
    const rows=[...filtered].filter(s=>!["Healthy"].includes(s.invRisk)).sort((a,b)=>b.stockValue-a.stockValue);
    const liq=rows.filter(s=>s.invRisk==="Liquidate");
    return (<div style={{display:"flex",flexDirection:"column",gap:12}}>
      {brandBar}
      {(()=>{  /* P2.7: Future Excess Exposure 30/60/90/120 */
        const rows=scope.filter(s=>s.fds>0).map(s=>{
          const ag=aggregatePlan(s.sku,salesPlans,campaigns);
          const pr=activePRof(s.sku);const sn2=pr&&pr.status==="CEO_APPROVED"?snapshots.find(z=>z.id===pr.snapshotId):null;
          const fe=futureExposure(s,poEventsBySku.m[s.sku]||[],sn2?sn2.approvedQty:0,ag,cfg);
          return {s,fe};}).filter(x=>x.fe.futureDead>0||Object.values(x.fe.flags).some(Boolean))
          .sort((a,b)=>b.fe.futureDead-a.fe.futureDead);
        if(rows.length===0)return null;
        return (<Panel title={`⚠ Vốn nguy cơ chết TƯƠNG LAI — ${rows.length} SKU (tồn + đang về + PR đã duyệt − nhu cầu dự phóng)`}>
          <div style={{overflowX:"auto",maxHeight:320}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1150}}><thead><tr>
            <TH>SKU</TH><TH r>Cover +30d</TH><TH r>+60d</TH><TH r>+90d</TH><TH r>+120d</TH><TH r>Vốn nguy cơ</TH><TH>Cờ cảnh báo</TH>
          </tr></thead><tbody>
            {rows.slice(0,25).map(({s,fe})=>(<tr key={s.sku} style={{background:fe.flags.futureLiq?"#FEF2F2":"#FFFBEB"}}>
              <TD m b c="#1D4ED8">{s.sku}</TD>
              {fe.rows.map(r2=>(<TD key={r2.d} r b c={r2.liq?"#991B1B":r2.excess?"#EA580C":"#374151"}>{r2.cover>9000?"∞":r2.cover+"d"}</TD>))}
              <TD r b c="#B45309">{fe.futureDead?fmt(fe.futureDead)+"₫":"—"}</TD>
              <TD><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                {fe.flags.futureLiq&&<Badge c="#fff" bg="#991B1B">Future Liquidate</Badge>}
                {fe.flags.futureExcess&&!fe.flags.futureLiq&&<Badge c="#9A3412" bg="#FFEDD5">Future Excess</Badge>}
                {fe.flags.moqOverbuy&&<Badge c="#B45309" bg="#FEF3C7">MOQ Overbuy</Badge>}
                {fe.flags.campaignTail&&<Badge c="#7C3AED" bg="#EDE9FE">Campaign hết — hàng vẫn về</Badge>}
                {fe.flags.incomingHigh&&<Badge c="#0E7490" bg="#CFFAFE">Incoming đẩy cover quá cao</Badge>}
              </div></TD>
            </tr>))}
          </tbody></table></div>
          <div style={{padding:"8px 14px",fontSize:10,color:"#6B7280",borderTop:"1px solid #F3F4F6"}}>Demand 30 ngày đầu theo CAMPAIGN, sau đó rơi về BASE — bắt đúng case campaign kết thúc nhưng PO vẫn về.</div>
        </Panel>);})()}

      <Note tone={deadCap/Math.max(1,totalVal)>0.2?"bad":"info"}><span><strong>Vốn chết {fmt(deadCap)}₫ ({pct(totalVal?deadCap/totalVal:0)})</strong> · Kẹt MOQ {fmt(moqBoundCap)}₫ · Chưa bán {fmt(idleCap)}₫. Ngưỡng: Thừa &gt;{cfg.excessDays}d · Xả &gt;{cfg.liqDays}d.</span></Note>
      <Note tone="info"><span><strong>Phân biệt:</strong> <em>Xả tồn</em> = hàng ế, xả được. <em>Kẹt MOQ</em> = nhu cầu nhỏ hơn MOQ — <strong>không xả, đàm phán MOQ hoặc bỏ SKU</strong>.</span></Note>
      <Panel title={`${rows.length} SKU cần xử lý · thu hồi ~${fmt(Math.round(liq.reduce((a,s)=>a+s.stockValue,0)*0.5))}₫ nếu xả 50% giá vốn`}>
        <div style={{overflowX:"auto",maxHeight:520}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1250}}><thead><tr>
          <TH>SKU</TH><TH>Brand</TH><TH>Tên</TH><TH r>Tồn</TH><TH r>Bán/ngày</TH><TH r>Cover</TH><TH>Cờ kho</TH><TH>Nhóm QĐ</TH><TH r>MOQ→cover</TH><TH r>Vốn chôn</TH><TH r>ROIC năm</TH><TH>Khuyến nghị</TH>
        </tr></thead><tbody>
          {rows.map(s=>(<tr key={s.sku} style={{background:s.invRisk==="Liquidate"?"#FEF2F2":s.invRisk==="MOQ-bound"?"#EEF2FF":"transparent"}}>
            <TD m b c="#1D4ED8">{s.sku}</TD><TD><BrandB b={s.brand}/></TD>
            <TD><span style={{fontSize:10.5}}>{s.name.slice(0,30)}{s.variant?` · ${s.variant.slice(0,16)}`:""}</span></TD>
            <TD r>{s.stockPOS.toLocaleString()}</TD><TD r b>{s.fds}</TD>
            <TD r b c={s.cover>cfg.liqDays?"#991B1B":"#D97706"}>{s.cover>9000?"∞":s.cover+"d"}</TD>
            <TD><SB v={s.invRisk} m={IR_C}/></TD>
            <TD><span style={{fontSize:10,fontWeight:600,color:s.decideGroup.includes("xả")?"#991B1B":"#6B7280"}}>{s.decideGroup}</span></TD>
            <TD r c="#4338CA">{s.moqCover?s.moqCover+"d":"—"}</TD>
            <TD r b>{fmt(s.stockValue)}₫</TD>
            <TD r b c={s.roicYear===null?"#9CA3AF":s.roicYear>1?"#059669":"#DC2626"}>{s.roicYear===null?"—":pct(s.roicYear)}</TD>
            <TD><span style={{fontSize:10.5}}>{
              s.invRisk==="Chưa bán"?"Chưa từng bán — kiểm quyết định mua":
              s.invRisk==="MOQ-bound"?"Đàm phán MOQ · gom đơn 6 tháng · hoặc bỏ SKU":
              s.invRisk==="Liquidate"?"Thanh lý · bundle với mã bán chạy":
              s.invRisk==="Excess"?"Dừng mua · đẩy KOC · bundle":"Theo dõi"}</span></TD>
          </tr>))}
        </tbody></table></div>
      </Panel>
    </div>);
  };

  /* ═══════════ TAB: CẦN MUA (workbench) — phân loại Buy Class + sort cột (spec §12,30) ═══════════ */
  const doSort=key=>setWbSort(s=>s&&s.key===key?{key,dir:-s.dir}:{key,dir:-1});
  const renderWB=()=>{
    const ready=filtered.filter(s=>s.canBuy);
    const notReady=filtered.filter(s=>!s.canBuy);
    let list=ready.filter(s=>s.sysBuy>0||["Urgent Buy","Stockout Risk","Watch"].includes(s.sRisk)||["Negotiate MOQ"].includes(s.buyClass));
    if(fBuyClass!=="all")list=list.filter(s=>s.buyClass===fBuyClass);
    if(wbSort)list=[...list].sort((a,b)=>((num(a[wbSort.key])-num(b[wbSort.key]))*-wbSort.dir));
    else if(sortMode==="priority")list=[...list].sort((a,b)=>(b.dailyContrib??-1)-(a.dailyContrib??-1));
    else list=[...list].sort((a,b)=>{const o={"Buy Now":0,"Buy This Week":1,"Negotiate MOQ":2,"Switch Supplier":2,"Buy Later":3,"Do Not Buy":4};return (o[a.buyClass]??9)-(o[b.buyClass]??9)||a.deadline-b.deadline;});
    const totalCap=list.filter(s=>s.sysBuy>0).reduce((a,s)=>a+s.capital,0);
    return (<div style={{display:"flex",flexDirection:"column",gap:12}}>
      {brandBar}
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <select value={fBuyClass} onChange={e=>setFBuyClass(e.target.value)} style={{padding:"6px 8px",borderRadius:8,border:"1px solid #E5E7EB",fontSize:11,background:"#fff"}}><option value="all">Mọi phân loại</option>{Object.keys(BC_C).map(k=><option key={k} value={k}>{vn(k)}</option>)}</select>
        <select value={sortMode} onChange={e=>{setSortMode(e.target.value);setWbSort(null);}} style={{padding:"6px 8px",borderRadius:8,border:"1px solid #E5E7EB",fontSize:11,background:"#fff"}}><option value="risk">Sắp xếp: Mức khẩn</option><option value="priority">Sắp xếp: Lợi nhuận/ngày</option></select>
        {Object.keys(BC_C).map(k=>{const n=ready.filter(s=>s.buyClass===k&&(s.sysBuy>0||k==="Do Not Buy")).length;return n?<Badge key={k} c={BC_C[k].c} bg={BC_C[k].bg}>{vn(k)}: {n}</Badge>:null;})}
      </div>
      {notReady.length>0&&<Note tone="warn"><span><strong>{notReady.length}/{filtered.length} SKU không hiện dưới đây</strong> vì thiếu Lead time / MOQ / Pack / Trạng thái.</span><Btn onClick={()=>setTab("data")} color="#EA580C" small>Bổ sung</Btn></Note>}
      {ready.length===0
        ? <Panel title="Chưa có SKU nào đủ dữ liệu"><div style={{padding:20,fontSize:12,color:"#6B7280"}}>Điền Lead time, MOQ, Pack size, Trạng thái ở tab <strong>Dữ Liệu</strong>.</div></Panel>
        : (<Panel title={`Cần mua — ${list.filter(s=>s.sysBuy>0).length} SKU · ${fmt(totalCap)}₫`}>
        <div style={{overflowX:"auto",maxHeight:520}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1750}}><thead><tr>
          <TH>SKU</TH><TH>Brand</TH><TH>Phân loại</TH><TH>St</TH><TH r sortKey="availableStock" sort={wbSort} onSort={doSort}>Tồn</TH><TH r>Về kịp</TH><TH r>Về trễ</TH><TH r sortKey="fds" sort={wbSort} onSort={doSort}>Fcast</TH><TH>Tin cậy</TH><TH r sortKey="daysLeft" sort={wbSort} onSort={doSort}>Còn</TH><TH r sortKey="deadline" sort={wbSort} onSort={doSort}>Deadline</TH><TH r>Gap</TH><TH r sortKey="cover" sort={wbSort} onSort={doSort}>Cover</TH><TH>Kho</TH><TH r sortKey="contrib" sort={wbSort} onSort={doSort}>LN/cái</TH><TH r sortKey="dailyContrib" sort={wbSort} onSort={doSort}>LN/ngày</TH><TH r>Sys</TH><TH r sortKey="actOQ" sort={wbSort} onSort={doSort}>Order</TH><TH r sortKey="capital" sort={wbSort} onSort={doSort}>Vốn</TH><TH>OvR</TH><TH>Prop</TH><TH>Action</TH>
        </tr></thead><tbody>
          {list.map(s=>{const p=gp(s.sku);const openPo=openPoSkus[s.sku];return (
            <tr key={s.sku} style={{background:s.buyClass==="Buy Now"?"#FEF2F2":s.buyClass==="Buy This Week"?"#FFFBEB":"transparent"}}>
              <TD m b c="#1D4ED8">{s.sku}</TD>
              <TD><BrandB b={s.brand}/></TD>
              <TD>{(()=>{const th=transferHint(s);return th?<span title={`${th.from} → ${th.to}: ${th.qty}`}><SB v="Transfer" m={BC_C}/></span>:<SB v={s.buyClass} m={BC_C}/>;})()}
                <div style={{display:"flex",gap:4}}>
                  <button onClick={()=>setWhyModal(s)} style={{fontSize:8.5,color:"#2563EB",background:"none",border:"none",cursor:"pointer",padding:0}}>Vì sao?</button>
                  <button onClick={()=>setScenModal(s)} style={{fontSize:8.5,color:"#7C3AED",background:"none",border:"none",cursor:"pointer",padding:0}}>Scenario</button>
                </div></TD>
              <TD><SB v={s.productStatus} m={PS_C}/>{s.planWarn&&<div><Badge c="#B45309" bg="#FEF3C7">Plan chưa duyệt</Badge></div>}{s.planUsed&&<div><Badge c="#1D4ED8" bg="#DBEAFE">Theo plan</Badge></div>}</TD>
              <TD r>{s.availableStock.toLocaleString()}</TD>
              <TD r c={s.incomingBefore?"#059669":"#9CA3AF"} b>{s.incomingBefore||"—"}</TD>
              <TD r c={s.incomingAfter?"#DC2626":"#9CA3AF"} b title="PO về sau ngày hết hàng — không cứu được">{s.incomingAfter||"—"}</TD>
              <TD r b>{s.fds}</TD>
              <TD><Badge c={s.conf==="Cao"?"#059669":s.conf==="Trung bình"?"#D97706":"#DC2626"} bg={s.conf==="Cao"?"#D1FAE5":s.conf==="Trung bình"?"#FEF3C7":"#FEE2E2"}>{s.conf}</Badge></TD>
              <TD r b c={s.daysLeft<=7?"#DC2626":s.daysLeft<=s.leadTime?"#D97706":"#374151"}>{s.daysLeft>9000?"∞":s.daysLeft+"d"}</TD>
              <TD r b c={s.deadline<=0?"#DC2626":"#6B7280"}>{s.sysBuy>0?(s.deadline<=0?`TRỄ ${Math.abs(s.deadline)}d`:s.deadline+"d"):"—"}</TD>
              <TD r c={s.gapDays>0?"#DC2626":"#9CA3AF"} b title={s.gapDays>0?`Thiếu ${s.lostUnits} SP · mất ~${s.lostRevenue?fmtFull(s.lostRevenue):"?"}`:""}>{s.gapDays>0?s.gapDays+"d":"—"}</TD>
              <TD r c={s.cover>cfg.excessDays?"#991B1B":"#374151"}>{s.cover>9000?"∞":s.cover+"d"}</TD>
              <TD><SB v={s.invRisk} m={IR_C}/></TD>
              <TD r b c={s.canProfit?(s.contrib>0?"#059669":"#DC2626"):"#9CA3AF"}>{s.canProfit?fmt(s.contrib)+"₫":"—"}</TD>
              <TD r b c={s.canProfit?"#7C3AED":"#9CA3AF"}>{s.canProfit?fmt(s.dailyContrib)+"₫":"—"}</TD>
              <TD r>{s.sysBuy||"—"}</TD>
              <TD r b c="#1D4ED8">{s.actOQ?s.actOQ.toLocaleString():"—"}</TD>
              <TD r>{s.capital?fmt(s.capital)+"₫":"—"}</TD>
              <TD><SB v={s.ovRisk} m={OR_C}/></TD>
              <TD><div style={{display:"flex",flexDirection:"column",gap:2}}>
                {activePRof(s.sku)&&<span style={{fontSize:9}}><SB v={p.status} m={PR_C}/> <span style={{color:"#6B7280"}}>{activePRof(s.sku).id}</span></span>}
                {!activePRof(s.sku)&&!openPo&&<SB v="SYSTEM_SUGGESTED" m={PR_C}/>}
                {openPo&&<Badge c="#fff" bg="#EA580C">PO {openPo.join(",")}</Badge>}
                <button onClick={()=>setHistModal(s.sku)} style={{fontSize:8.5,color:"#2563EB",background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left"}}>Lịch sử</button>
              </div></TD>
              <TD>{s.sysBuy>0&&(<div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
                <Btn onClick={()=>setTimelineModal(s)} color="#0891B2" small>Timeline</Btn>
                {can("proposal.edit")&&<Btn onClick={()=>{setAdjModal(s);setAdjQty(String(s.actOQ));setAdjReason("");setAdjNote("");}} color="#D97706" small>Chỉnh</Btn>}
                <Btn onClick={()=>setSupModal(s.sku)} color="#4338CA" small>NCC</Btn>
                {["SYSTEM_SUGGESTED","DRAFT","REVISION_REQUESTED"].includes(p.status)&&can("proposal.submitLeader")&&<Btn onClick={()=>{
                  const pr=activePRof(s.sku);
                  if(pr)updatePR(pr.id,pr.version,{status:"SUBMITTED_TO_LEADER",requestedQty:pr.requestedQty??s.actOQ});
                  else{const npr=createPR(s.sku,{status:"SUBMITTED_TO_LEADER",requestedQty:s.actOQ,supplierId:s.mainSupplier||null,reason:s.reason||(openPo?"PR bổ sung — PO đang về vẫn thiếu "+s.sysBuy:"")});
                    addLog("PurchaseRequest",npr.id,openPo?"Tạo PR BỔ SUNG (đã có PO)":"Tạo PR + gửi Leader",`${s.sku} · ${s.actOQ} SP · ${fmtFull(s.capital)}`,"","SUBMITTED_TO_LEADER");}
                  showToast(`${s.sku} đã gửi Leader`);}} small title={openPo?"PO đang về nhưng vẫn thiếu — tạo PR bổ sung phần còn thiếu":""}>{openPo?"+PR bổ sung":"→ Ldr"}</Btn>}
              </div>)}</TD>
            </tr>);})}
        </tbody></table></div>
      </Panel>)}
    </div>);
  };

  /* ═══════════ TAB: LỊCH NHẬP — nhóm động theo deadline thực (spec §20) ═══════════ */
  const renderCal=()=>{
    const rows=filtered.filter(s=>s.canBuy&&s.sysBuy>0);
    const groups=[
      {k:"Quá hạn",f:s=>s.deadline<0,tone:"#991B1B",bg:"#FEF2F2"},
      {k:"Cần đặt hôm nay",f:s=>s.deadline===0,tone:"#DC2626",bg:"#FEF2F2"},
      {k:"Trong 3 ngày",f:s=>s.deadline>0&&s.deadline<=3,tone:"#EA580C",bg:"#FFF7ED"},
      {k:"Trong 7 ngày",f:s=>s.deadline>3&&s.deadline<=7,tone:"#D97706",bg:"#FFFBEB"},
      {k:"8–14 ngày",f:s=>s.deadline>7&&s.deadline<=14,tone:"#2563EB",bg:"#EFF6FF"},
      {k:"Sau 14 ngày",f:s=>s.deadline>14,tone:"#6B7280",bg:"#F9FAFB"},
    ];
    return (<div style={{display:"flex",flexDirection:"column",gap:12}}>
      {brandBar}
      <Note tone="info"><span>Nhóm theo <strong>hạn đặt thực</strong> (deadline = còn − lead time − safety). Giá trị âm = đã quá hạn.</span></Note>
      {groups.map(g=>{const gs=rows.filter(g.f).sort((a,b)=>a.deadline-b.deadline);
        if(!gs.length)return null;
        return (<Panel key={g.k} title={<span style={{color:g.tone}}>{g.k} — {gs.length} SKU · {fmt(gs.reduce((a,s)=>a+s.capital,0))}₫</span>}>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1150}}><thead><tr>
            <TH>SKU</TH><TH>Brand</TH><TH r>Ngày nên đặt</TH><TH r>Quá hạn</TH><TH r>Dự kiến hết hàng</TH><TH r>Lead</TH><TH r>Safety</TH><TH r>ETA nếu đặt hôm nay</TH><TH r>PO đang về</TH><TH>PO có kịp?</TH><TH r>Order</TH><TH r>Vốn</TH>
          </tr></thead><tbody>
            {gs.map(s=>(<tr key={s.sku} style={{background:g.bg}}>
              <TD m b c="#1D4ED8">{s.sku}</TD><TD><BrandB b={s.brand}/></TD>
              <TD r b>{s.buyDate||"—"}</TD>
              <TD r b c={s.deadline<0?"#991B1B":"#6B7280"}>{s.deadline<0?`${Math.abs(s.deadline)} ngày`:"—"}</TD>
              <TD r>{s.daysLeft>9000?"∞":addDaysStr(s.daysLeft)}</TD>
              <TD r>{s.leadTime}d</TD><TD r>{s.safetyDays}d</TD>
              <TD r>{addDaysStr(s.leadTime)}</TD>
              <TD r c={s.incoming?"#0891B2":"#9CA3AF"}>{s.incoming||"—"}</TD>
              <TD>{s.incoming===0?<span style={{fontSize:10,color:"#9CA3AF"}}>Không có PO</span>:s.incomingBefore>0?<Badge c="#065F46" bg="#D1FAE5">Kịp ({s.incomingBefore})</Badge>:<Badge c="#fff" bg="#DC2626">Không kịp — gap {s.gapDays}d</Badge>}</TD>
              <TD r b c="#1D4ED8">{s.actOQ.toLocaleString()}</TD><TD r>{fmt(s.capital)}₫</TD>
            </tr>))}
          </tbody></table></div>
        </Panel>);})}
      {rows.length===0&&<Panel title="Không có SKU cần đặt trong phạm vi lọc"><div style={{padding:16,fontSize:12,color:"#6B7280"}}>Bổ sung dữ liệu hoặc đổi bộ lọc.</div></Panel>}
    </div>);
  };

  /* ═══════════ TAB: BIẾN THỂ — rủi ro cấp cha TB/Min (spec §9) + allocation (spec §11) ═══════════ */
  const renderVar=()=>{
    const groups=productGroups.filter(g=>g.n>1&&g.arr.some(v=>["VARIANT","FINISHED_GOOD"].includes(v.skuType)));
    return (<div style={{display:"flex",flexDirection:"column",gap:12}}>
    {brandBar}
    <Note tone="info"><span><strong>Rủi ro cấp mã cha:</strong> cột "Còn bán" hiện <strong>TB / Min</strong> — trung bình cao không có nghĩa an toàn nếu một size sắp đứt.</span></Note>
    <Panel title={`${groups.length} mã sản phẩm nhiều biến thể`}>
      <div style={{overflowX:"auto",maxHeight:480}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1300}}><thead><tr>
        <TH>Mã SP</TH><TH>Brand</TH><TH>Tên</TH><TH r>Biến thể</TH><TH r>Bán 0</TH><TH r>Vốn</TH><TH>Còn bán (TB/Min)</TH><TH>SKU nguy hiểm nhất</TH><TH r>Stockout</TH><TH r>Overstock</TH><TH>PO cứu?</TH><TH r>Lệch</TH><TH>Action</TH>
      </tr></thead><tbody>
        {groups.map(g=>{const spread=g.minCover>0?g.maxCover/g.minCover:0;const minLow=g.minSku&&g.minSku.cover<=(g.minSku.leadTime||30);
          return (<tr key={g.pc} style={{background:minLow?"#FEF2F2":spread>8?"#FFF7ED":"transparent"}}>
            <TD m b c="#1D4ED8">{g.pc}</TD><TD><BrandB b={g.brand}/></TD>
            <TD><span style={{fontSize:10.5}}>{g.name.slice(0,30)}</span></TD>
            <TD r b>{g.n}</TD><TD r c={g.zero>0?"#DC2626":"#059669"} b>{g.zero}</TD>
            <TD r b>{fmt(g.val)}₫</TD>
            <TD><span style={{fontWeight:700,color:minLow?"#DC2626":"#374151"}}>TB {g.avgCover?g.avgCover+"d":"—"} / Min <span style={{color:minLow?"#DC2626":"#059669"}}>{g.minCover?g.minCover+"d":"—"}</span></span></TD>
            <TD>{g.minSku?<span style={{fontSize:10.5}}><strong>{g.minSku.sku}</strong> · {pct(g.minShare)} doanh số</span>:"—"}</TD>
            <TD r b c={g.nStockout>0?"#DC2626":"#059669"}>{g.nStockout}</TD>
            <TD r b c={g.nOver>0?"#EA580C":"#059669"}>{g.nOver}</TD>
            <TD>{g.nStockout>0?(g.rescue?<Badge c="#065F46" bg="#D1FAE5">Có</Badge>:<Badge c="#fff" bg="#DC2626">Không</Badge>):<span style={{fontSize:10,color:"#9CA3AF"}}>—</span>}</TD>
            <TD r b c={spread>8?"#DC2626":spread>4?"#D97706":"#059669"}>{spread?spread.toFixed(0)+"×":"—"}</TD>
            <TD><div style={{display:"flex",gap:2}}><Btn onClick={()=>setVariantModal(g)} color="#4338CA" small>Chi tiết</Btn>{can("proposal.edit")&&<Btn onClick={()=>{setAllocModal(g);setAllocQty("");setAllocReason("");}} color="#059669" small>Phân bổ</Btn>}</div></TD>
          </tr>);})}
      </tbody></table></div>
    </Panel>
    <Note tone="warn"><span><strong>Nhóm "Bổ sung SKU thiếu":</strong> {productGroups.filter(g=>g.needTopUp).map(g=>g.pc).join(", ")||"không có"} — mã cha còn nhiều hàng nhưng có size/màu sắp đứt. Đừng scale cả mã, chỉ bù size thiếu.</span></Note>
  </div>);};

  /* ═══════════ TAB: SALES PLAN — workflow Draft→Submitted→Approved→Locked→Completed (spec §18,19) ═══════════ */
  const renderPlan=()=>{
    const rows=salesPlans.filter(p=>brand==="all"||p.brand===brand);
    const canEdit=can("salesPlan.edit");
    return (<div style={{display:"flex",flexDirection:"column",gap:12}}>
      {brandBar}
      <Note tone="info"><span><strong>Sales Plan chỉ dùng cho Launch/Scale khi đã Duyệt hoặc Khoá.</strong> Plan chưa duyệt → tool dùng tốc độ bán thật và gắn cảnh báo trên SKU. Forecast kẹp plan trong ±30% tốc độ thật.</span>
        {canEdit&&<Btn onClick={()=>{setPlanModal("new");setPlanForm({sku:"",brand:brand==="all"?"NEVOR":brand,channel:"TikTok Shop",plan7:"",plan14:"",plan30:"",plan60:"",base:"",stretch:"",uplift:"",confidence:"Trung bình",note:""});}} color="#059669" small>+ Lập plan</Btn>}</Note>
      <Panel title={`Sales Plan — ${rows.length}`}>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1250}}><thead><tr>
          <TH>ID</TH><TH>SKU</TH><TH>Brand</TH><TH>Kênh</TH><TH r>Plan 7</TH><TH r>Plan 30</TH><TH r>Plan 60</TH><TH r>Actual 30</TH><TH r>Lệch</TH><TH>Tin cậy</TH><TH>Người lập</TH><TH>Người duyệt</TH><TH r>V</TH><TH>Status</TH><TH>Action</TH>
        </tr></thead><tbody>
          {rows.length===0&&<tr><TD>Chưa có plan nào.</TD></tr>}
          {rows.map(p=>{const s=skuIndex[p.sku];const act30=s?Math.max(0,s.sold30-s.returned30):0;
            const varc=num(p.plan30)>0?(act30-num(p.plan30))/num(p.plan30):null;
            return (<tr key={p.id} style={{background:p.status==="Submitted"?"#EFF6FF":"transparent"}}>
              <TD m>{p.id}</TD><TD m b c="#1D4ED8">{p.sku}</TD><TD><BrandB b={p.brand}/></TD><TD>{p.channel}</TD>
              <TD r>{p.plan7}</TD><TD r b>{p.plan30}</TD><TD r>{p.plan60}</TD>
              <TD r b>{act30||"—"}</TD>
              <TD r b c={varc===null?"#9CA3AF":Math.abs(varc)>0.3?"#DC2626":"#059669"}>{varc===null?"—":pct(varc)}</TD>
              <TD>{p.confidence}</TD><TD>{p.creator}</TD><TD>{p.approver||"—"}</TD><TD r>{p.version}</TD>
              <TD><SB v={p.status} m={SP_C}/></TD>
              <TD><div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
                {canEdit&&p.status==="Draft"&&<Btn onClick={()=>{setSalesPlans(l=>l.map(x=>x.id===p.id?{...x,status:"Submitted"}:x));addLog("SalesPlan",p.id,"Gửi duyệt","",p.status,"Submitted");showToast(`${p.id} đã gửi duyệt`);}} small>Gửi duyệt</Btn>}
                {can("proposal.approveCEO")&&p.status==="Submitted"&&<Btn onClick={()=>{setSalesPlans(l=>l.map(x=>x.id===p.id?{...x,status:"Approved",approver:role,approvedAt:todayStr()}:x));addLog("SalesPlan",p.id,"Duyệt plan","",p.status,"Approved");showToast(`${p.id} đã duyệt`);}} color="#059669" small>Duyệt</Btn>}
                {can("proposal.approveCEO")&&p.status==="Approved"&&<Btn onClick={()=>{setSalesPlans(l=>l.map(x=>x.id===p.id?{...x,status:"Locked"}:x));addLog("SalesPlan",p.id,"Khoá plan","",p.status,"Locked");}} color="#4338CA" small>Khoá</Btn>}
                {canEdit&&["Approved","Locked"].includes(p.status)&&<Btn onClick={()=>{setSalesPlans(l=>l.map(x=>x.id===p.id?{...x,status:"Completed"}:x));addLog("SalesPlan",p.id,"Hoàn tất","",p.status,"Completed");}} color="#6B7280" small>Hoàn tất</Btn>}
                {canEdit&&p.status==="Draft"&&<Btn onClick={()=>{setPlanModal(p.id);setPlanForm({...p});}} color="#D97706" small>Sửa</Btn>}
              </div></TD>
            </tr>);})}
        </tbody></table></div>
      </Panel>
      {can("salesPlan.edit")&&<Note tone="info"><span><strong>Forecast Accuracy:</strong> cuối mỗi tháng bấm chốt kỳ để ghi Plan vs Actual — hệ thống tự học SKU nào hay lạc quan/bi quan và hạ độ tin cậy forecast tương ứng.</span>
        <Btn onClick={()=>{const month=CUR_MONTH;let n2=0;
          const newLogs=[];
          scope.forEach(s=>{const ag=aggregatePlan(s.sku,salesPlans,campaigns);
            if(!ag.anyApproved)return;
            const actual=Math.max(0,s.sold30-s.returned30);
            const accuracy=Math.max(0,1-Math.abs(ag.committed-actual)/Math.max(actual,1));
            newLogs.push({month,sku:s.sku,plan30:ag.committed,base30:ag.base,actual,accuracy:Math.round(accuracy*100)/100,hadCampaign:ag.committed>ag.base});n2++;});
          setFcstLog(l=>[...newLogs,...l.filter(x=>!(x.month===month&&newLogs.some(y=>y.sku===x.sku)))]);
          addLog("ForecastLog",month,"Chốt kỳ forecast accuracy",`${n2} SKU`);showToast(`Đã ghi accuracy ${n2} SKU cho ${month}`);}} color="#4338CA" small>Chốt kỳ & ghi accuracy</Btn></Note>}
      {fcstLog.length>0&&<Panel title={`Forecast Accuracy / Bias — ${Object.keys(planAccuracy).length} SKU theo dõi`}>
        <div style={{overflowX:"auto",maxHeight:260}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}><thead><tr><TH>SKU</TH><TH r>Số kỳ</TH><TH r>Accuracy TB</TH><TH r>Bias TB</TH><TH>Xu hướng</TH><TH r>Sai lệch Campaign</TH><TH r>Sai lệch Base</TH><TH>Cảnh báo</TH></tr></thead><tbody>
          {Object.entries(planAccuracy).sort((a,b)=>a[1].avgAcc-b[1].avgAcc).map(([sku,a])=>(<tr key={sku} style={{background:a.avgAcc<0.6?"#FEF2F2":"transparent"}}>
            <TD m b c="#1D4ED8">{sku}</TD><TD r>{a.n}</TD>
            <TD r b c={a.avgAcc>=0.8?"#059669":a.avgAcc>=0.6?"#D97706":"#DC2626"}>{Math.round(a.avgAcc*100)}%</TD>
            <TD r b c={a.bias>0?"#DC2626":a.bias<0?"#2563EB":"#059669"}>{a.bias>0?"+":""}{Math.round(a.bias)}</TD>
            <TD><span style={{fontSize:10.5,fontWeight:600}}>{a.bias>5?"Thường LẠC QUAN (plan cao hơn thực)":a.bias<-5?"Thường BI QUAN (plan thấp hơn thực)":"Cân bằng"}</span></TD>
            <TD r>{a.nc>0?Math.round(a.campErr/a.nc):"—"}</TD><TD r>{a.n-a.nc>0?Math.round(a.baseErr/(a.n-a.nc)):"—"}</TD>
            <TD>{a.n>=2&&a.avgAcc<0.6&&<Badge c="#fff" bg="#DC2626">Forecast hạ tin cậy</Badge>}</TD>
          </tr>))}
        </tbody></table></div>
      </Panel>}
      <Panel title={`Campaign — ${campaigns.length} (incremental demand, chống cộng trùng)`}>
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>ID</TH><TH>SKU</TH><TH>Kênh</TH><TH>Tên</TH><TH r>+SP/30d</TH><TH>Chắc chắn</TH><TH>Trạng thái</TH><TH>Action</TH></tr></thead><tbody>
          {campaigns.map(c=>(<tr key={c.id}>
            <TD m>{c.id}</TD><TD m b c="#1D4ED8">{c.sku}</TD><TD>{c.channel}</TD><TD><span style={{fontSize:10.5}}>{c.name}</span></TD>
            <TD r b c="#7C3AED">+{c.incremental30}</TD>
            <TD><Badge c={c.certainty==="COMMITTED"?"#065F46":"#B45309"} bg={c.certainty==="COMMITTED"?"#D1FAE5":"#FEF3C7"}>{c.certainty}</Badge></TD>
            <TD><Badge c={c.status==="Approved"?"#065F46":"#6B7280"} bg={c.status==="Approved"?"#D1FAE5":"#F3F4F6"}>{c.status}</Badge></TD>
            <TD>{c.status!=="Approved"&&can("campaign.approve")&&<Btn onClick={()=>{setCampaigns(l=>l.map(x=>x.id===c.id?{...x,status:"Approved"}:x));addLog("Campaign",c.id,"Duyệt campaign",`${c.sku} +${c.incremental30}`);}} color="#059669" small>Duyệt</Btn>}</TD>
          </tr>))}
        </tbody></table>
        <div style={{padding:"8px 14px",fontSize:10,color:"#6B7280",borderTop:"1px solid #F3F4F6"}}>COMMITTED = Base + campaign chắc chắn (Purchasing mặc định dùng) · STRETCH = Committed + tăng trưởng chưa chắc (chỉ CEO chọn mua theo).</div>
      </Panel>
      <Note tone="warn"><span>Chỉ <strong>CEO, Leader, Sales Planner, E-commerce Lead, Growth Lead</strong> được sửa plan. Purchasing / Kế toán / Viewer chỉ xem. Lệch &gt;30% so với plan → tô đỏ, phải ghi lý do khi lập plan version mới.</span></Note>
    </div>);
  };

  /* ═══════════ TAB: LEADER DUYỆT — thêm Revision Requested / Leader Rejected (spec §2) ═══════════ */
  const propAge=s=>{const a=gp(s.sku).createdAt;return a?daysBetween(a,todayStr()):0;};
  const renderLeader=()=>{
    const pending=scope.filter(s=>gp(s.sku).status==="SUBMITTED_TO_LEADER");
    const revision=scope.filter(s=>gp(s.sku).status==="REVISION_REQUESTED");
    const processed=prList.filter(p=>["SUBMITTED_TO_CEO","CEO_APPROVED","CEO_REJECTED","LEADER_REJECTED","PO_CREATED"].includes(p.status)&&(brand==="all"||skuIndex[p.sku]?.brand===brand)).slice(0,20);
    const canAct=can("proposal.reviewLeader");
    return (<div style={{display:"flex",flexDirection:"column",gap:12}}>{brandBar}
      <Note tone="info"><span><strong>Luồng:</strong> Hệ thống → Leader (kiểm số lượng &amp; NCC) → CEO (kiểm tiền/ngân sách) → PO. Leader có 3 quyền: duyệt lên CEO, yêu cầu chỉnh sửa, từ chối.</span></Note>
      <Panel title={`Chờ Leader — ${pending.length}`}>
        <div style={{overflowX:"auto",maxHeight:380}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1250}}><thead><tr>
          <TH>SKU</TH><TH>Tên</TH><TH>Lý do</TH><TH r>Tuổi</TH><TH r>Còn</TH><TH r>Order</TH><TH r>Vốn</TH><TH r>Cover sau</TH><TH>OvR</TH><TH r>Overbuy</TH><TH>NCC</TH><TH r>Đúng hẹn</TH><TH>Action</TH>
        </tr></thead><tbody>
          {pending.length===0&&<tr><TD>Không có đề xuất chờ.</TD></tr>}
          {pending.map(s=>(<tr key={s.sku}>
            <TD m b c="#1D4ED8">{s.sku}</TD><TD><span style={{fontSize:10.5}}>{s.name.slice(0,24)}</span></TD>
            <TD><span style={{fontSize:10}}>{s.reason}</span></TD>
            <TD r b c={propAge(s)>3?"#DC2626":"#6B7280"}>{propAge(s)}d</TD>
            <TD r b c={s.daysLeft<=7?"#DC2626":"#374151"}>{s.daysLeft>9000?"∞":s.daysLeft+"d"}</TD>
            <TD r b c="#1D4ED8">{s.actOQ.toLocaleString()}</TD><TD r b>{fmtFull(s.capital)}</TD>
            <TD r>{s.daysAfter}d</TD><TD><SB v={s.ovRisk} m={OR_C}/></TD>
            <TD r c={s.overCap>1e6?"#DC2626":"#6B7280"}>{s.overBuy?fmt(s.overCap)+"₫":"—"}</TD>
            <TD><span style={{fontSize:10}}>{s.mainSupplier||"—"}</span></TD>
            <TD r c={s.onTime>=90?"#059669":"#D97706"} b>{s.onTime}%</TD>
            <TD>{canAct?(<div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
              <Btn onClick={()=>{sp(s.sku,{status:"SUBMITTED_TO_CEO",leaderNote:`Leader ${role} duyệt`});addLog("Proposal",s.sku,"Leader duyệt → CEO",`${s.actOQ} SP · ${fmtFull(s.capital)} · NCC ${s.mainSupplier||"—"}`,"SUBMITTED_TO_LEADER","SUBMITTED_TO_CEO");showToast(`${s.sku} → CEO`);}} color="#059669" small>Duyệt → CEO</Btn>
              <Btn onClick={()=>{setAdjModal(s);setAdjQty(String(s.actOQ));setAdjReason("");setAdjNote("");}} color="#D97706" small>Chỉnh</Btn>
              <Btn onClick={()=>{setRevModal({sku:s.sku,mode:"revise"});setRevReason("");}} color="#EA580C" small>Yêu cầu sửa</Btn>
              <Btn onClick={()=>{setRevModal({sku:s.sku,mode:"reject"});setRevReason("");}} color="#DC2626" small>Từ chối</Btn>
            </div>):<span style={{fontSize:10,color:"#9CA3AF"}}>Cần quyền Leader</span>}</TD>
          </tr>))}
        </tbody></table></div>
      </Panel>
      {revision.length>0&&<Panel title={`Đang chờ Purchasing chỉnh sửa — ${revision.length}`}>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr><TH>SKU</TH><TH>Lý do Leader yêu cầu</TH><TH r>Order hiện tại</TH><TH r>Vốn</TH><TH>Action</TH></tr></thead><tbody>
          {revision.map(s=>(<tr key={s.sku} style={{background:"#FFF7ED"}}>
            <TD m b c="#1D4ED8">{s.sku}</TD>
            <TD><span style={{fontSize:11,color:"#9A3412"}}>{gp(s.sku).revisionReason||"—"}</span></TD>
            <TD r b>{s.actOQ.toLocaleString()}</TD><TD r>{fmtFull(s.capital)}</TD>
            <TD>{can("proposal.edit")&&<div style={{display:"flex",gap:2}}>
              <Btn onClick={()=>{setAdjModal(s);setAdjQty(String(s.actOQ));setAdjReason("");setAdjNote("");}} color="#D97706" small>Chỉnh lại</Btn>
              <Btn onClick={()=>{sp(s.sku,{status:"SUBMITTED_TO_LEADER",submittedAt:todayStr()});addLog("Proposal",s.sku,"Gửi lại Leader","","REVISION_REQUESTED","SUBMITTED_TO_LEADER");showToast(`${s.sku} gửi lại Leader`);}} small>Gửi lại</Btn>
            </div>}</TD>
          </tr>))}
        </tbody></table></div>
      </Panel>}
      {processed.length>0&&<Panel title={`Đã xử lý gần đây — ${processed.length}`}>
        <div style={{overflowX:"auto",maxHeight:220}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}><thead><tr><TH>PR / SKU</TH><TH r>Order</TH><TH r>Vốn</TH><TH>Trạng thái</TH><TH>Ghi chú Leader</TH></tr></thead><tbody>
          {processed.map(p=>{const s=skuIndex[p.sku];return (<tr key={p.id}><TD m b c="#1D4ED8">{p.id}<div style={{fontSize:9,color:"#6B7280"}}>{p.sku}</div></TD><TD r>{(p.adjustedQty??p.requestedQty??s?.actOQ??0).toLocaleString()}</TD><TD r>{fmtFull((p.adjustedQty??p.requestedQty??0)*(s?.landedCost||0))}</TD><TD><SB v={p.status} m={PR_C}/></TD><TD><span style={{fontSize:10,color:"#6B7280"}}>{p.leaderNote||p.rejectReason||"—"}</span></TD></tr>);})}
        </tbody></table></div>
      </Panel>}
    </div>);
  };

  /* ═══════════ TAB: CEO DUYỆT — chặn theo ngân sách tháng, ngoại lệ phải có lý do (spec §5,25) ═══════════ */
  const renderApprove=()=>{
    const join=p=>({pr:p,s:skuIndex[p.sku]});
    const inScope=p=>brand==="all"||skuIndex[p.sku]?.brand===brand;
    const pending=prList.filter(p=>p.status==="SUBMITTED_TO_CEO"&&inScope(p)).map(join).filter(x=>x.s);
    const approved=prList.filter(p=>p.status==="CEO_APPROVED"&&inScope(p)).map(join).filter(x=>x.s);
    const decided=prList.filter(p=>["CEO_REJECTED","REVISION_REQUESTED","PO_CREATED","LEADER_REJECTED"].includes(p.status)&&inScope(p)).slice(0,12).map(join).filter(x=>x.s);
    const pendCap=pending.reduce((a,x)=>a+x.s.capital,0);
    /* Gộp PO: cùng NCC + cùng budgetMonth từ snapshot (P0.7) — khác tháng KHÔNG gộp */
    const bySup={};approved.forEach(s=>{const pr=activePRof(s.sku);const sn=pr&&snapshots.find(x=>x.id===pr.snapshotId);
      if(sn&&sn.supplierName)(bySup[sn.supplierName+" · NS "+sn.budgetMonth]=bySup[sn.supplierName+" · NS "+sn.budgetMonth]||{sup:sn.supplierName,month:sn.budgetMonth,arr:[]}).arr.push({s,pr,sn});});
    const noBudget=budget.total===0;
    return (<div style={{display:"flex",flexDirection:"column",gap:12}}>{brandBar}
      <Note tone={noBudget?"warn":(pendCap>budget.available?"bad":"ok")}>
        <span>{noBudget?<strong>Chưa nhập ngân sách tháng — không chặn được duyệt vượt ngân sách.</strong>:<>Ngân sách {budgetMonth} còn <strong>{fmtFull(budget.available)}</strong> · Chờ duyệt <strong>{fmtFull(pendCap)}</strong>{pendCap>budget.available&&<strong> → vượt {fmtFull(pendCap-budget.available)}</strong>}</>}</span>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <input type="month" value={budgetMonth} onChange={e=>setBudgetMonth(e.target.value)} style={{padding:"4px 8px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:11}}/>
          {can("budget.edit")&&<Btn onClick={()=>{setCfgForm(cfg);setCfgModal(true);}} color="#2563EB" small>Nhập ngân sách</Btn>}
        </div>
      </Note>
      {(()=>{  /* P2.1: Capital Allocation Engine */
        const cands=scope.filter(s=>s.sysBuy>0&&["Buy Now","Buy This Week","Buy Later","Negotiate MOQ"].includes(s.buyClass))
          .map(s=>{const hasCamp=campaigns.some(c=>c.sku===s.sku&&c.status==="Approved");
            const score=capitalScore(s,hasCamp);
            const gapD=Math.max(0,(s.leadTime||30)-Math.max(0,s.daysLeft));
            const protRev=s.canProfit!==undefined&&s.sellPrice>0?Math.round(s.fds*gapD*s.sellPrice):0;
            const protProfit=s.dailyContrib>0?Math.round(s.fds>0?s.dailyContrib*gapD:0):0;
            return {s,score,protRev,protProfit};})
          .sort((a,b)=>b.score-a.score);
        if(cands.length===0)return null;
        const avail=budget.total>0?budget.available:Infinity;
        let cum=0;const rows=cands.map(c=>{
          const ov=allocOverrides[c.s.sku];
          let buy=cum+c.s.capital<=avail;
          if(ov)buy=ov.action==="BUY";
          if(buy)cum+=c.s.capital;
          return {...c,buy,cum,ov};});
        const used=rows.filter(r=>r.buy).reduce((a,r)=>a+r.s.capital,0);
        const prot=rows.filter(r=>r.buy).reduce((a,r)=>({rev:a.rev+r.protRev,pf:a.pf+r.protProfit}),{rev:0,pf:0});
        const defer=rows.filter(r=>!r.buy);
        return (<Panel title={`Phân bổ vốn tự động — ${rows.length} SKU cần mua${budget.total>0?` · NS còn ${fmt(budget.available)}₫`:" · CHƯA CÓ NGÂN SÁCH"}`}>
          <div style={{overflowX:"auto",maxHeight:340}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1100}}><thead><tr>
            <TH r>Hạng</TH><TH>SKU</TH><TH r>Score</TH><TH r>SL</TH><TH r>Vốn</TH><TH r>Luỹ kế</TH><TH r>DT bảo vệ</TH><TH r>LN bảo vệ</TH><TH>Quyết định</TH><TH>Action</TH>
          </tr></thead><tbody>
            {rows.map((r,i2)=>(<tr key={r.s.sku} style={{background:r.buy?"transparent":"#FEF2F2"}}>
              <TD r b>{i2+1}</TD><TD m b c="#1D4ED8">{r.s.sku}</TD>
              <TD r b c={r.score>=70?"#059669":r.score>=45?"#D97706":"#6B7280"}>{r.score}</TD>
              <TD r>{r.s.actOQ.toLocaleString()}</TD><TD r b>{fmt(r.s.capital)}₫</TD><TD r c="#6B7280">{r.buy?fmt(r.cum)+"₫":"—"}</TD>
              <TD r c="#0891B2">{r.protRev?fmt(r.protRev)+"₫":"—"}</TD><TD r c="#7C3AED">{r.protProfit?fmt(r.protProfit)+"₫":"—"}</TD>
              <TD>{r.buy?<Badge c="#065F46" bg="#D1FAE5">MUA{r.ov?" (CEO)":""}</Badge>:<Badge c="#991B1B" bg="#FEE2E2">HOÃN{r.ov?" (CEO)":""}</Badge>}{r.ov&&<div style={{fontSize:8.5,color:"#9CA3AF"}}>{r.ov.reason}</div>}</TD>
              <TD>{can("proposal.approveCEO")&&<Btn onClick={()=>askConfirm({title:(r.buy?"Hoãn ":"Mua ")+r.s.sku+" — CEO override",msg:r.buy?`Hoãn mua ${r.s.sku} dù engine xếp hạng ${i2+1}?`:`Mua ${r.s.sku} dù vượt thứ tự phân bổ vốn?`,requireReason:true,onOk:reason=>{setAllocOverrides(o=>({...o,[r.s.sku]:{action:r.buy?"DEFER":"BUY",reason}}));addLog("CapitalAllocation",r.s.sku,"CEO override phân bổ","",r.buy?"MUA":"HOÃN",r.buy?"HOÃN":"MUA",reason);}})} color="#B45309" small>{r.buy?"Hoãn":"Mua"}</Btn>}</TD>
            </tr>))}
          </tbody></table></div>
          <div style={{padding:"10px 14px",fontSize:11.5,borderTop:"1px solid #F3F4F6",display:"flex",gap:16,flexWrap:"wrap"}}>
            <span>Vốn dùng: <strong>{fmt(used)}₫</strong></span>
            <span style={{color:"#0891B2"}}>Doanh thu bảo vệ: <strong>{fmt(prot.rev)}₫</strong></span>
            <span style={{color:"#7C3AED"}}>Lợi nhuận bảo vệ: <strong>{fmt(prot.pf)}₫</strong></span>
            {defer.length>0&&<span style={{color:"#991B1B"}}>Hoãn {defer.length} SKU · rủi ro mất DT ~{fmt(defer.reduce((a,r)=>a+r.protRev,0))}₫</span>}
          </div>
          <div style={{padding:"0 14px 10px",fontSize:10,color:"#6B7280"}}>Score = stockout risk + biên + tin cậy forecast + payback + trạng thái SP + campaign − rủi ro MOQ/overstock. CEO đổi Mua↔Hoãn phải ghi lý do (audit).</div>
        </Panel>);})()}
      <Panel title={`CEO phê duyệt — ${pending.length} chờ`}>
        <div style={{overflowX:"auto",maxHeight:420}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1350}}><thead><tr>
          <TH>SKU</TH><TH>Tên</TH><TH>Ghi chú Leader</TH><TH r>Còn</TH><TH r>Order</TH><TH r>Vốn</TH><TH r>% NS còn</TH><TH r>Biên</TH><TH r>LN/ngày</TH><TH r>Hoàn vốn</TH><TH r>Cover sau</TH><TH>OvR</TH><TH>CEO</TH>
        </tr></thead><tbody>
          {pending.length===0&&approved.length===0&&decided.length===0&&<tr><TD>Không có đề xuất.</TD></tr>}
          {[...pending,...approved,...decided].map(({pr:p,s})=>{const over=!noBudget&&s.capital>budget.available;
            const pb=s.canProfit&&s.dailyContrib>0?Math.round(s.capital/s.dailyContrib):null;
            const makeSnapshot=(pr,reason)=>{const snId=`SN-${Date.now().toString().slice(-7)}`;
              /* P1.1: giá lấy từ QUOTATION (SupplierSku) — freeze cả quotationVersion; fallback landedCost nếu chưa có báo giá */
              const supName=s.mainSupplier||pr.supplierId||"";
              const q=supplierSku.find(x=>x.sku===s.sku&&x.sup===supName);
              const unitCost=q?num(q.landed):s.landedCost;
              const sn={id:snId,purchaseRequestId:pr.id,approvedAt:new Date().toISOString(),approvedBy:role,
                sku:s.sku,productName:s.name,approvedQty:s.actOQ,supplierName:supName,
                quotedUnitCost:unitCost,quotationVersion:q?q.qVer:null,currency:q?q.currency:"VND",
                expectedLandedCost:q?effLanded(q.landed,q.defect):s.landedCost,
                approvedCapital:s.actOQ*unitCost,availableStock:s.availableStock,incomingQty:s.incoming,
                forecastDaily:s.fds,daysOfCoverBefore:s.daysLeft,daysOfCoverAfter:s.daysAfter,leadTime:s.leadTime,safetyDays:s.safetyDays,
                moq:s.moq,packSize:s.packSize,budgetMonth:pr.budgetMonth,contributionPerUnit:s.contrib,engineVersion:"v10",version:(pr.snapshotId?2:1),superseded:false,reason:reason||""};
              setSnapshots(x=>[sn,...x]);return sn;};
            const doApprove=(reason)=>{const pr=p&&p.id?p:activePRof(s.sku);if(!pr)return;
              const sn=makeSnapshot(pr,reason);
              updatePR(pr.id,pr.version,{status:"CEO_APPROVED",snapshotId:sn.id,ceoNote:reason||null});
              addLog("PurchaseRequest",pr.id,"CEO duyệt — snapshot "+sn.id,fmtFull(s.capital),"SUBMITTED_TO_CEO","CEO_APPROVED",reason);
              showToast(`Đã duyệt ${pr.id} · 🔒 snapshot ${sn.id}`);};
            return (<tr key={p.id||s.sku} style={{background:p.status==="CEO_APPROVED"?"#F0FDF4":"transparent"}}>
              <TD m b c="#1D4ED8">{s.sku}<div style={{fontSize:8.5,color:"#9CA3AF"}}>{p.id||""}</div></TD><TD><span style={{fontSize:10.5}}>{s.name.slice(0,22)}</span></TD>
              <TD><span style={{fontSize:10,color:"#6B7280"}}>{p.leaderNote||"—"}</span></TD>
              <TD r b c={s.daysLeft<=7?"#DC2626":"#374151"}>{s.daysLeft>9000?"∞":s.daysLeft+"d"}</TD>
              <TD r b c="#1D4ED8">{s.actOQ.toLocaleString()}</TD><TD r b>{fmtFull(s.capital)}</TD>
              <TD r b c={over?"#DC2626":"#6B7280"}>{noBudget?"—":(budget.available>0?pct(s.capital/budget.available):"∞")}</TD>
              <TD r b c={!s.canProfit?"#9CA3AF":s.contribPct>=0.35?"#059669":"#D97706"}>{pct(s.contribPct)}</TD>
              <TD r b c={s.canProfit?"#7C3AED":"#9CA3AF"}>{s.canProfit?fmt(s.dailyContrib)+"₫":"—"}</TD>
              <TD r b c={pb===null?"#9CA3AF":pb<45?"#059669":"#D97706"}>{pb===null?"—":pb+"d"}</TD>
              <TD r>{s.daysAfter}d</TD><TD><SB v={s.ovRisk} m={OR_C}/></TD>
              <TD>{p.status==="SUBMITTED_TO_CEO"&&can("proposal.approveCEO")?(<div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
                {(()=>{const ag=aggregatePlan(s.sku,salesPlans,campaigns);
                  const hasStretch=ag.anyApproved&&ag.stretch>ag.committed;
                  const bc=budgetCheck(s.brand,s.capital);
                  return bc.over
                  ?<Btn onClick={()=>askConfirm({title:"Duyệt vượt ngân sách — ngoại lệ",msg:`${s.sku} · ${fmtFull(s.capital)}${bc.brandOver?` · Brand ${s.brand} vượt ${fmtFull(s.capital-bc.brandLeft)}`:""}${bc.totalOver?` · Tổng công ty vượt ${fmtFull(s.capital-budget.available)}`:""}. Xác nhận ngoại lệ?`,danger:true,requireReason:true,onOk:reason=>doApprove("[NGOẠI LỆ vượt NS] "+reason)})} color="#B45309" small>Duyệt ngoại lệ</Btn>
                  :<Btn onClick={()=>doApprove(buyTier[s.sku]==="STRETCH"?"[BUY FOR STRETCH]":undefined)} color="#059669" small>Duyệt{buyTier[s.sku]==="STRETCH"?" (Stretch)":""}</Btn>;})()}
                {(()=>{const ag=aggregatePlan(s.sku,salesPlans,campaigns);
                  if(!(ag.anyApproved&&ag.stretch>ag.committed))return null;
                  const extraFdsS=(ag.stretch-ag.committed)/30;
                  const extraQty=Math.ceil(extraFdsS*(s.horizon||60)/(s.packSize||1))*(s.packSize||1);
                  const extraCap=extraQty*s.landedCost;
                  const coverStretch=s.fds+extraFdsS>0?Math.round((s.availableStock+s.incoming+s.actOQ+(buyTier[s.sku]==="STRETCH"?0:extraQty))/(s.fds+extraFdsS)):0;
                  return (<label style={{fontSize:9,display:"flex",gap:4,alignItems:"center",color:"#B45309"}}>
                    <input type="checkbox" checked={buyTier[s.sku]==="STRETCH"} onChange={e=>setBuyTier(t=>({...t,[s.sku]:e.target.checked?"STRETCH":undefined}))}/>
                    Buy for Stretch: +{extraQty.toLocaleString()} SP · +{fmt(extraCap)}₫ · cover ~{coverStretch}d {coverStretch>(s.horizon||60)*1.4?"⚠ overstock":""}
                  </label>);})()}
                <Btn onClick={()=>{setRevModal({sku:s.sku,mode:"ceoRevise"});setRevReason("");}} color="#EA580C" small>Sửa lại</Btn>
                <Btn onClick={()=>{setRevModal({sku:s.sku,mode:"ceoReject"});setRevReason("");}} color="#DC2626" small>Từ chối</Btn>
              </div>):p.status==="CEO_APPROVED"?(()=>{const sn=snapshots.find(x=>x.id===p.snapshotId);
                return (<div style={{display:"flex",gap:3,alignItems:"center",flexWrap:"wrap"}}>
                  <Badge c="#065F46" bg="#D1FAE5">🔒 APPROVAL LOCKED</Badge>
                  {sn&&<span style={{fontSize:9,color:"#6B7280"}}>{sn.approvedQty.toLocaleString()} SP · {fmt(sn.approvedCapital)}₫ · NS {sn.budgetMonth}</span>}
                  {can("po.create")&&<Btn onClick={()=>setCreatePoSku({row:s,pr:p,sn})} color="#0891B2" small>Tạo PO</Btn>}
                </div>);})():(<SB v={p.status} m={PR_C}/>)}</TD>
            </tr>);})}
        </tbody></table></div>
      </Panel>
      {Object.keys(bySup).length>0&&can("po.create")&&(<Panel title="Gộp PO theo NCC">
        <div style={{padding:12,display:"flex",flexDirection:"column",gap:8}}>
          {Object.entries(bySup).map(([key,g])=>(<div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"8px 12px",background:"#F8FAFC",borderRadius:8,flexWrap:"wrap"}}>
            <div style={{fontSize:12}}><strong>{key}</strong> · {g.arr.length} PR · {fmtFull(g.arr.reduce((a,x)=>a+x.sn.approvedCapital,0))}<div style={{fontSize:10,color:"#6B7280"}}>{g.arr.map(x=>`${x.pr.id}: ${x.sn.sku}×${x.sn.approvedQty}`).join(" · ")}</div></div>
            <Btn onClick={()=>setMergePoModal(g)} color="#059669" small>Tạo 1 PO gộp</Btn>
          </div>))}
          <div style={{fontSize:10,color:"#9CA3AF"}}>PR khác tháng ngân sách hiện thành nhóm riêng — không thể gộp chung PO.</div>
        </div></Panel>)}
    </div>);
  };

  /* ═══════════ TAB: PO TRACKING — siết thanh toán + mismatch (spec §15,16,17) ═══════════ */
  const supMeta=n=>suppliers.find(s=>s.name===n)||{depositPct:cfg.depositPct,paymentTerms:0};
  const uniqueId=()=>{let id,n=0;do{id=`PO-${(Date.now()+n).toString().slice(-5)}`;n++;}while(poList.some(p=>p.id===id));return id;};
  const makePO=(sup,items,owner)=>{const m=supMeta(sup);const val=items.reduce((a,i)=>a+i.qty*i.landed,0);
    const dep=Math.round(val*(Number(m.depositPct)||cfg.depositPct));
    const lt=Math.max(...items.map(i=>i.lt||25));
    return {id:uniqueId(),sup,currency:"CNY",exchangeRate:3600,freight:0,tax:0,otherCost:0,budgetMonth,
      items:items.map(i=>({sku:i.sku,name:i.name,qty:i.qty,posRcv:0,landed:i.landed})),
      deposit:dep,depSt:"Pending",finalPay:val-dep,paySt:"Pending",
      orderDate:todayStr(),eta:addDaysStr(lt),actual:null,status:"Draft",owner:owner||role,terms:num(m.paymentTerms)};};
  const setPo=(i,fn)=>setPoList(prev=>prev.map((p,j)=>j===i?fn(p):p));

  const canDeposit=p=>p.status==="Ordered Supplier"&&num(p.deposit)>0&&p.sup&&p.orderDate&&p.terms!==undefined;
  const canFinal=p=>FINAL_PAY_ST.includes(p.status);

  const renderPO=()=>{
    const pos=poList.filter(p=>(fPoSt==="all"||p.status===fPoSt)&&(brand==="all"||(p.items||[]).some(i=>skuIndex[i.sku]?.brand===brand)));
    return (<div style={{display:"flex",flexDirection:"column",gap:12}}>
    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      <select value={fPoSt} onChange={e=>setFPoSt(e.target.value)} style={{padding:"6px 8px",borderRadius:8,border:"1px solid #E5E7EB",fontSize:11,background:"#fff"}}><option value="all">Mọi trạng thái PO</option>{Object.keys(PO_C).map(k=><option key={k} value={k}>{vn(k)}</option>)}</select>
      <input type="month" value={budgetMonth} onChange={e=>setBudgetMonth(e.target.value)} style={{padding:"5px 8px",borderRadius:8,border:"1px solid #E5E7EB",fontSize:11}}/>
      <Badge c="#4338CA" bg="#E0E7FF">Cam kết tháng {budgetMonth}: {fmt(budget.committed)}₫</Badge>
      <Badge c="#065F46" bg="#D1FAE5">Đã trả: {fmt(budget.paid)}₫</Badge>
    </div>
    <Note tone="info"><span><strong>Quy tắc thanh toán:</strong> Cọc chỉ xác nhận khi PO <em>Đã đặt NCC</em> (xác nhận xong tự chuyển <em>Đã cọc</em>). Final chỉ khi <em>QC đạt / Sẵn sàng giao / Đang vận chuyển</em> — hoặc CEO override có lý do.</span></Note>
    {pos.length===0
      ? <Panel title="Không có PO trong bộ lọc"><div style={{padding:20,fontSize:12,color:"#6B7280"}}>PO được tạo từ tab CEO Duyệt sau khi đề xuất được duyệt.</div></Panel>
      : (<Panel title={`${pos.length} PO`}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1450}}><thead><tr>
        <TH>PO</TH><TH>NCC</TH><TH>Dòng hàng</TH><TH r>Đặt</TH><TH r>Nhận</TH><TH r>Giá trị (gồm phí)</TH><TH>Cọc</TH><TH>Final</TH><TH r>Terms</TH><TH>ETA gốc / mới</TH><TH>ETA status</TH><TH>Rủi ro trễ</TH><TH>Status</TH><TH r>Trễ</TH><TH>Tháng NS</TH><TH>Action</TH>
      </tr></thead><tbody>
        {pos.map(p=>{const i=poList.indexOf(p);const q=poQty(p),rc=poRcv(p),dl=poDelay(p);return (
          <tr key={p.id} style={{background:p.status==="PO Mismatch"?"#FEF2F2":dl>0?"#FFFBEB":p.status==="Cancelled"?"#F9FAFB":"transparent"}}>
            <TD m b>{p.id}</TD><TD><span style={{fontSize:10.5}}>{p.sup}</span></TD>
            <TD><span style={{fontSize:10.5}}>{(p.items||[]).map(it=>`${it.sku}×${it.qty}`).join(" · ")}</span></TD>
            <TD r>{q.toLocaleString()}</TD><TD r b c={rc&&rc!==q?"#DC2626":rc?"#059669":"#9CA3AF"}>{rc?rc.toLocaleString():"—"}</TD>
            <TD r b>{fmt(poValue(p))}₫</TD>
            <TD>{can("po.confirmDeposit")&&p.depSt==="Pending"&&canDeposit(p)
              ?<Btn onClick={()=>askConfirm({title:"Xác nhận trả cọc",msg:`Trả CỌC ${fmtFull(p.deposit)} cho ${p.sup} (${p.id})? PO sẽ chuyển sang "Đã cọc".`,onOk:()=>{setPo(i,po=>({...po,depSt:"Confirmed",status:"Deposit Confirmed"}));addLog("PO",p.id,"Xác nhận cọc",fmtFull(p.deposit),"Ordered Supplier","Deposit Confirmed");showToast("Đã xác nhận cọc");}})} color="#059669" small>Trả {fmt(p.deposit)}₫</Btn>
              :<Badge c={p.depSt==="Confirmed"?"#059669":"#D97706"} bg={p.depSt==="Confirmed"?"#D1FAE5":"#FEF3C7"}>{p.depSt==="Confirmed"?"Đã trả":"Chờ"} · {fmt(p.deposit)}₫</Badge>}
              {p.depSt==="Pending"&&!canDeposit(p)&&p.status==="Draft"&&<div style={{fontSize:8.5,color:"#DC2626",marginTop:2}}>PO chưa đặt NCC — không cọc được</div>}</TD>
            <TD>{can("po.confirmFinal")&&p.paySt==="Pending"&&(canFinal(p)
              ?<Btn onClick={()=>askConfirm({title:"Xác nhận trả final",msg:`Trả FINAL ${fmtFull(p.finalPay)} cho ${p.sup} (${p.id})?`,onOk:()=>{setPo(i,po=>({...po,paySt:"Confirmed"}));addLog("PO",p.id,"Xác nhận final",fmtFull(p.finalPay));showToast("Đã xác nhận final");}})} color="#059669" small>Trả {fmt(p.finalPay)}₫</Btn>
              :(can("po.finalOverride")&&!["Closed","Cancelled"].includes(p.status)
                ?<Btn onClick={()=>askConfirm({title:"CEO override trả final sớm",msg:`PO đang ở "${vn(p.status)}" — chưa đạt điều kiện trả final (QC đạt/Sẵn sàng giao/Đang vận chuyển). Override?`,danger:true,requireReason:true,onOk:reason=>{setPo(i,po=>({...po,paySt:"Confirmed"}));addLog("PO",p.id,"CEO OVERRIDE final",fmtFull(p.finalPay),"","",reason);showToast("Final override","warn");}})} color="#B45309" small>Override final</Btn>
                :<Badge c="#D97706" bg="#FEF3C7">Chờ QC · {fmt(p.finalPay)}₫</Badge>))
              ||(!can("po.confirmFinal")&&<Badge c={p.paySt==="Confirmed"?"#059669":"#D97706"} bg={p.paySt==="Confirmed"?"#D1FAE5":"#FEF3C7"}>{p.paySt==="Confirmed"?"Đã trả":"Chờ"} · {fmt(p.finalPay)}₫</Badge>)
              ||(p.paySt==="Confirmed"&&<Badge c="#059669" bg="#D1FAE5">Đã trả · {fmt(p.finalPay)}₫</Badge>)}</TD>
            <TD r>{num(p.terms)}d</TD>
            <TD><span style={{fontSize:10}}>{p.originalEta||p.eta}{p.revisedEta&&<> → <strong>{p.revisedEta}</strong></>}</span>
              {!["Closed","Cancelled"].includes(p.status)&&can("po.updateProgress")&&<div><button onClick={()=>askConfirm({title:"Cập nhật ETA mới từ NCC — "+p.id,msg:"Nhập ETA mới (YYYY-MM-DD) vào ô lý do. Sẽ lưu lần xác nhận cuối = hôm nay.",requireReason:true,onOk:v=>{const d=String(v).trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(d)){showToast("Định dạng ngày sai","bad");return;}setPo(poList.indexOf(p),po=>({...po,revisedEta:d,lastConfirmAt:todayStr()}));addLog("PO",p.id,"ETA Change",`NCC xác nhận ${todayStr()}`,p.revisedEta||p.originalEta||p.eta,d);showToast("Đã cập nhật ETA");}})} style={{fontSize:8.5,color:"#2563EB",background:"none",border:"none",cursor:"pointer",padding:0}}>Cập nhật ETA</button></div>}</TD>
            <TD><SB v={etaStatus(p)} m={ETA_C}/>{p.lastConfirmAt&&<div style={{fontSize:8,color:"#9CA3AF"}}>NCC xác nhận: {p.lastConfirmAt}</div>}</TD>
            <TD>{(()=>{const h=supHistCache[p.sup];
              if(!h||h.n<3)return <span style={{fontSize:9,color:"#9CA3AF"}}>Chưa đủ lịch sử ({h?h.n:0}/3 PO)</span>;
              const ra=riskAdjustedDay(p,todayStr(),h);
              return (<div style={{fontSize:9.5}}>
                <span style={{fontWeight:700,color:h.pLate>0.5?"#DC2626":h.pLate>0.25?"#D97706":"#059669"}}>P(trễ) {Math.round(h.pLate*100)}%</span>
                {ra&&<div style={{color:"#6B7280"}}>Về dự kiến: +{ra.range[0]}→{ra.range[1]}d{ra.adj&&" · timeline đã dời"}</div>}
              </div>);})()}</TD>
            <TD><SB v={p.status} m={PO_C}/></TD>
            <TD r b c={dl>0?"#DC2626":"#059669"}>{dl>0?`+${dl}d`:"—"}</TD>
            <TD><span style={{fontSize:10}}>{p.budgetMonth||monthOf(p.orderDate)}</span></TD>
            <TD>{!["Closed","Cancelled"].includes(p.status)&&(<div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
              {p.status==="Arrived Warehouse"&&!p.pendingGR&&can("po.goodsReceipt")&&<Btn onClick={()=>{setRcvModal({idx:i,po:p});setRcvForm(Object.fromEntries((p.items||[]).map(it=>[it.sku,{rec:String(it.qty)}])));setRcvReason("");}} color="#0891B2" small>GR: Nhận hàng</Btn>}
              {p.status==="Arrived Warehouse"&&p.pendingGR&&can("po.qc")&&<Btn onClick={()=>{setRcvModal({idx:i,po:p});setRcvForm(Object.fromEntries((p.items||[]).map(it=>[it.sku,{acc:String(p.pendingGR[it.sku]||0),rej:"0"}])));}} color="#7C3AED" small>QC kiểm</Btn>}
              {p.status==="Arrived Warehouse"&&p.pendingGR&&!can("po.qc")&&<Badge c="#7C3AED" bg="#EDE9FE">Chờ QC</Badge>}
              {["Waiting POS Import","POS Synced","PO Mismatch","Closed"].includes(p.status)&&can("po.actualCost")&&!p.actualCostDone&&<Btn onClick={()=>askConfirm({title:"Chi phí nhập thực tế — "+p.id,msg:"Nhập tổng chi phí phụ THỰC TẾ (freight+thuế+khác, ₫) vào ô lý do — dạng số.",requireReason:true,onOk:v=>{const n2=Number(String(v).replace(/[^0-9]/g,""));if(isNaN(n2)){showToast("Số không hợp lệ","bad");return;}
                setPo(poList.indexOf(p),po=>({...po,actualExtraCost:n2,actualCostDone:true}));
                const rec2=poRcv(p)||poQty(p);const expUnit=(poLineVal(p)+num(p.freight)+num(p.tax)+num(p.otherCost))/Math.max(1,poQty(p));
                const actUnit=(p.items.reduce((a2,i2)=>a2+num(i2.posRcv||i2.qty)*num(i2.landed),0)+n2)/Math.max(1,rec2);
                const varPct=(actUnit-expUnit)/expUnit;
                addLog("PO",p.id,"Actual Landed Cost",`Expected ${fmtFull(Math.round(expUnit))}/SP → Actual ${fmtFull(Math.round(actUnit))}/SP`,fmtFull(Math.round(expUnit)),fmtFull(Math.round(actUnit)),Math.abs(varPct)>0.05?`⚠ VARIANCE ${(varPct*100).toFixed(1)}%`:`variance ${(varPct*100).toFixed(1)}%`);
                showToast(Math.abs(varPct)>0.05?`⚠ Landed cost lệch ${(varPct*100).toFixed(1)}% so với phê duyệt`:"Đã ghi chi phí thực",Math.abs(varPct)>0.05?"warn":"ok");}})} color="#B45309" small>Chi phí thực</Btn>}
              {p.status==="PO Mismatch"&&can("po.resolveMismatch")&&<Btn onClick={()=>{setMmModal({idx:i,po:p});setMmForm({option:"",reason:"",owner:"",deadline:"",claim:"",replEta:"",note:"",resolved:false,accepted:Object.fromEntries((p.items||[]).map(it=>[it.sku,String(it.posRcv)])),rejected:Object.fromEntries((p.items||[]).map(it=>[it.sku,"0"]))});}} color="#DC2626" small>Xử lý mismatch</Btn>}
              {can("po.updateProgress")&&p.status!=="Arrived Warehouse"&&<Btn onClick={()=>{setPoStModal({idx:i,po:p});setPoStReason("");}} color="#4338CA" small>Cập nhật</Btn>}
            </div>)}</TD>
          </tr>);})}
      </tbody></table></div></Panel>)}
    <Panel title="Luồng PO đầy đủ"><div style={{padding:14,display:"flex",gap:3,flexWrap:"wrap",alignItems:"center"}}>
      {["Draft","Ordered Supplier","Deposit Confirmed","In Production","QC Pending","QC Passed","Ready To Ship","Shipping","Customs","Arrived Warehouse","Waiting POS Import","POS Synced","Closed"].map((s,i,arr)=>(<div key={s} style={{display:"flex",alignItems:"center",gap:3}}><SB v={s} m={PO_C}/>{i<arr.length-1&&<ChevronRight size={10} color="#D1D5DB"/>}</div>))}
    </div></Panel>
  </div>);};

  /* ═══════════ TAB: NCC ═══════════ */
  const applyMainSupplier=r=>{
    setSkuMeta(prev=>({...prev,[r.sku]:{...(prev[r.sku]||{}),mainSupplier:r.sup,moq:num(r.moq),packSize:num(r.pack),leadTime:num(r.lt)}}));
    setSupplierSku(prev=>prev.map(x=>x.sku===r.sku?(x.sup===r.sup?{...x,role:"Main"}:(x.role==="Main"?{...x,role:"Backup"}:x)):x));
    {const pr=activePRof(r.sku);if(pr)updatePR(pr.id,pr.version,{adjustedQty:null,supplierId:r.sup},true);}
    addLog("Supplier",r.sku,`Đổi NCC chính → ${r.sup}`,`MOQ ${r.moq} · LT ${r.lt}d`);
    setSupModal(null);showToast(`${r.sku}: NCC chính = ${r.sup}`);
  };
  const renderSup=()=>(<div style={{display:"flex",flexDirection:"column",gap:12}}>{brandBar}
    {suppliers.length===0&&<Note tone="bad"><span><strong>Chưa có nhà cung cấp.</strong></span></Note>}
    <Note tone="info"><span><strong>Score TỰ SINH từ lịch sử PO</strong> (đúng hẹn 30% · lỗi QC 25% · đủ số lượng 20% · lead ổn định 15% · độ trễ TB 10%) — cần ≥3 PO đã về; chưa đủ hiện "score tạm" từ số nhập tay. ↑↓ = trend nửa kỳ sau so với trước. <strong>Landed thực</strong> = giá ÷ (1 − lỗi%).</span>
      {can("supplier.edit")&&<div style={{display:"flex",gap:6}}><Btn onClick={()=>{setSupForm({name:"",moq:"",lt:"",defect:"",onTime:"",quality:"75",price:"75",paymentTerms:"0",depositPct:"0.3",status:"Main"});setSupMasterModal(true);}} small>+ Thêm NCC</Btn>
      <Btn onClick={()=>{const it=scope[0];setSkuSupModal(it.sku);setSkuSupForm({sku:it.sku,sup:"",landed:it.landedCost,moq:"",pack:"",lt:"",defect:"",onTime:"",role:"Backup"});}} color="#4338CA" small disabled={suppliers.length===0}>+ Gắn NCC vào SKU</Btn></div>}</Note>
    {concentration.length>0&&<Panel title="Rủi ro tập trung NCC (tính TRONG từng brand)">
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}><thead><tr><TH>Brand</TH><TH>NCC</TH><TH r>SKU</TH><TH r>% vốn brand</TH><TH r>Không backup</TH><TH r>Độ phủ backup</TH><TH>Đánh giá</TH></tr></thead><tbody>
        {concentration.map(c=>{const risky=c.share>0.3&&c.coverage<0.5;return (<tr key={c.brand+c.sup} style={{background:risky?"#FEF2F2":"transparent"}}>
          <TD><BrandB b={c.brand}/></TD>
          <TD b><span style={{fontSize:10.5}}>{c.sup}</span></TD><TD r>{c.n}</TD>
          <TD r b c={c.share>0.3?"#DC2626":"#374151"}>{pct(c.share)}</TD>
          <TD r b c={c.noBackup>0?"#DC2626":"#059669"}>{c.noBackup}</TD>
          <TD r b c={c.coverage>=0.5?"#059669":"#DC2626"}>{pct(c.coverage)}</TD>
          <TD><span style={{fontSize:10.5,fontWeight:600,color:risky?"#991B1B":"#059669"}}>{risky?"Rủi ro cao — cần nguồn thứ hai":"Chấp nhận được"}</span></TD>
        </tr>);})}
      </tbody></table></div></Panel>}
    <Panel title={`NCC Master — ${suppliers.length}`}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:950}}><thead><tr><TH>NCC</TH><TH>Liên hệ</TH><TH r>MOQ</TH><TH r>Lead</TH><TH r>Lỗi%</TH><TH r>Đúng hẹn</TH><TH r>Cọc</TH><TH r>Công nợ</TH><TH r>Score</TH><TH>Status</TH><TH>Action</TH></tr></thead><tbody>
        {suppliers.length===0&&<tr><TD>Chưa có NCC.</TD></tr>}
        {suppliers.map(s=>(<tr key={s.name}><TD b><span style={{fontSize:10.5}}>{s.name}</span></TD><TD>{s.contact||"—"}</TD><TD r>{s.moq}</TD><TD r>{s.lt}d</TD>
          <TD r c={s.defect>3?"#DC2626":"#059669"} b>{s.defect}%</TD><TD r c={s.onTime>=90?"#059669":"#D97706"} b>{s.onTime}%</TD>
          <TD r>{pct(Number(s.depositPct)||0)}</TD>
          <TD r b c={num(s.paymentTerms)>=30?"#059669":num(s.paymentTerms)>0?"#D97706":"#DC2626"}>{num(s.paymentTerms)}d</TD>
          <TD r b c={(()=>{const a=supplierAutoScore(s.name,poList,s);return a.score>=85?"#059669":"#D97706";})()}>{(()=>{const a=supplierAutoScore(s.name,poList,s);
            const half=Math.floor(a.h&&a.h.n?a.h.n/2:0);
            let trend="";
            if(a.src==="history"&&half>=2){const done=poList.filter(p2=>p2.sup===s.name&&p2.actual).sort((x,y)=>x.orderDate<y.orderDate?-1:1);
              const sc2=arr=>{const late=arr.filter(p2=>daysBetween(p2.originalEta||p2.eta,p2.actual)>0).length;return 100-Math.round(late/arr.length*100);};
              const oldS=sc2(done.slice(0,half)),newS=sc2(done.slice(half));
              trend=newS>oldS?" ↑":newS<oldS?" ↓":" →";}
            return <span title={a.note}>{a.score}{trend}{a.src==="manual"&&<span style={{fontSize:8,color:"#D97706"}}> tạm</span>}</span>;})()}</TD>
          <TD><Badge c="#059669" bg="#D1FAE5">{s.status}</Badge></TD>
          <TD>{can("supplier.edit")&&<Btn onClick={()=>{setSupForm({...s,oldName:s.name});setSupMasterModal(true);}} color="#6B7280" small>Sửa</Btn>}</TD></tr>))}
      </tbody></table></div>
      <div style={{padding:"8px 14px",fontSize:10,color:"#6B7280",borderTop:"1px solid #F3F4F6"}}>Công nợ dài = DPO cao = CCC thấp. Đàm phán công nợ trước khi đàm phán giá.</div>
    </Panel>
    <Panel title={`NCC theo SKU — ${supplierSku.length} liên kết`}>
      <div style={{overflowX:"auto",maxHeight:380}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1050}}><thead><tr><TH>SKU</TH><TH>NCC</TH><TH>Role</TH><TH r>Báo giá (qVer)</TH><TH r>Landed thực</TH><TH r>MOQ</TH><TH r>Pack</TH><TH r>Lead</TH><TH r>Lỗi%</TH><TH r>Đúng hẹn</TH><TH r>Score</TH><TH>Action</TH></tr></thead><tbody>
        {supplierSku.length===0&&<tr><TD>Chưa gắn NCC nào.</TD></tr>}
        {supplierSku.map((r,i)=>{const cur=skuIndex[r.sku]?.mainSupplier===r.sup;return (<tr key={r.sku+r.sup+i} style={{background:cur?"#F0FDF4":"transparent"}}>
          <TD m b c="#1D4ED8">{r.sku}</TD><TD b><span style={{fontSize:10.5}}>{r.sup}{cur?" ✓":""}</span></TD>
          <TD><Badge c={r.role==="Main"?"#059669":"#2563EB"} bg={r.role==="Main"?"#D1FAE5":"#DBEAFE"}>{r.role}</Badge>
            {(()=>{if(r.role!=="Backup")return null;
              const mainLink=supplierSku.find(x=>x.sku===r.sku&&x.role==="Main");if(!mainLink)return null;
              const aB=supplierAutoScore(r.sup,poList,r),aM=supplierAutoScore(mainLink.sup,poList,mainLink);
              return aB.src==="history"&&aB.score>aM.score+5?<div style={{fontSize:8.5,color:"#B45309",fontWeight:700}}>⚡ Đề xuất lên Main (score {aB.score} &gt; {aM.score})</div>:null;})()}</TD>
          <TD r>{fmtFull(r.landed)} <span style={{fontSize:8.5,color:"#9CA3AF"}}>v{r.qVer||1}·{r.currency||"CNY"}</span></TD><TD r b c="#EA580C">{fmtFull(effLanded(r.landed,r.defect))}</TD>
          <TD r>{r.moq}</TD><TD r>{r.pack}</TD><TD r>{r.lt}d</TD>
          <TD r c={r.defect>3?"#DC2626":"#059669"} b>{r.defect}%</TD><TD r c={r.onTime>=90?"#059669":"#D97706"} b>{r.onTime}%</TD>
          <TD r b>{supScore(r)}</TD>
          <TD>{can("supplier.edit")&&<div style={{display:"flex",gap:3}}>{!cur&&<Btn onClick={()=>applyMainSupplier(r)} color="#059669" small>Chọn Main</Btn>}<Btn onClick={()=>askConfirm({title:"Xoá liên kết NCC",msg:`Xoá ${r.sup} khỏi ${r.sku}?`,danger:true,onOk:()=>{setSupplierSku(p=>p.filter((_,j)=>j!==i));addLog("Supplier",r.sku,`Xoá ${r.sup}`,"");}})} color="#DC2626" small>Xóa</Btn></div>}</TD>
        </tr>);})}
      </tbody></table></div>
    </Panel>
  </div>);

  /* ═══════════ TAB: CASHFLOW · CCC + ngân sách 4 chỉ số (spec §5) ═══════════ */
  const openPoVal=poList.filter(p=>COMMITTED_ST.includes(p.status)).reduce((a,p)=>a+poValue(p),0);
  const dpo=openPoVal>0?Math.round(poList.filter(p=>COMMITTED_ST.includes(p.status)).reduce((a,p)=>a+poValue(p)*num(p.terms),0)/openPoVal):0;
  const ccc=dio+cfg.dso-dpo;
  const renderCash=()=>(<div style={{display:"flex",flexDirection:"column",gap:12}}>{brandBar}
    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      <input type="month" value={budgetMonth} onChange={e=>setBudgetMonth(e.target.value)} style={{padding:"5px 8px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:11}}/>
      {can("budget.edit")&&<Btn onClick={()=>{setCfgForm(cfg);setCfgModal(true);}} color="#2563EB" small>Cập nhật ngân sách & số dư</Btn>}
    </div>
    <div style={{fontSize:10,fontWeight:700,color:"#6B7280",letterSpacing:0.5,textTransform:"uppercase"}}>Ngân sách mua hàng — tháng {budgetMonth}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>
      <Card icon={Wallet} label="Ngân sách tháng" value={budget.total?fmt(budget.total)+"₫":"—"} sub={budget.total?"":"Chưa nhập — vào Cấu hình"} accent="#2563EB" alert={!budget.total}/>
      <Card icon={CheckCircle} label="Đã thanh toán" value={fmt(budget.paid)+"₫"} sub="Cọc + final đã Confirmed" accent="#059669"/>
      <Card icon={FileText} label="Đã cam kết" value={fmt(budget.committed)+"₫"} sub="100% giá trị PO đã phát hành" accent="#7C3AED"/>
      <Card icon={Clock} label="Duyệt chờ tạo PO" value={fmt(budget.approvedPendingPO)+"₫"} accent="#D97706"/>
      <Card icon={DollarSign} label="Còn khả dụng" value={budget.total?fmt(budget.available)+"₫":"—"} sub={budget.over>0?`VƯỢT ${fmt(budget.over)}₫`:""} accent={budget.available<0?"#DC2626":"#059669"} alert={budget.total>0&&budget.available<0}/>
      <Card icon={ShoppingCart} label="Đề xuất đang chờ" value={fmt(budget.newProposalCap)+"₫"} accent="#6B7280"/>
    </div>
    <Panel title="Ngân sách theo brand">
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}><thead><tr><TH>Brand</TH><TH r>Ngân sách</TH><TH r>Đã cam kết</TH><TH r>Duyệt chờ PO</TH><TH r>Còn lại</TH><TH>Trạng thái</TH></tr></thead><tbody>
        {budget.perBrand.map(b=>(<tr key={b.brand} style={{background:b.left<0?"#FEF2F2":"transparent"}}>
          <TD><BrandB b={b.brand}/></TD><TD r b>{fmt(b.budget)}₫</TD><TD r>{fmt(b.committed)}₫</TD><TD r>{fmt(b.approved)}₫</TD>
          <TD r b c={b.left<0?"#DC2626":"#059669"}>{fmt(b.left)}₫</TD>
          <TD>{b.budget===0?<Badge c="#6B7280" bg="#F3F4F6">Chưa nhập NS</Badge>:b.left<0?<Badge c="#fff" bg="#DC2626">Vượt ngân sách</Badge>:<Badge c="#065F46" bg="#D1FAE5">Trong ngân sách</Badge>}</TD>
        </tr>))}
      </tbody></table></div>
    </Panel>
    <div style={{fontSize:10,fontWeight:700,color:"#6B7280",letterSpacing:0.5,textTransform:"uppercase"}}>Vòng quay vốn</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8}}>
      <Card icon={Clock} label="CCC" value={dpo?ccc+"d":"—"} sub={dpo?`DIO ${dio} + DSO ${cfg.dso} − DPO ${dpo}`:"Cần công nợ NCC trên PO"} accent={ccc>90?"#DC2626":"#059669"}/>
      <Card icon={Archive} label="DIO" value={dio+"d"} sub={`${fmt(totalVal)}₫ ÷ ${fmt(cogsDay)}₫/ngày`} accent="#7C3AED"/>
      <Card icon={Truck} label="DPO" value={dpo?dpo+"d":"—"} sub="BQ công nợ theo giá trị PO" accent={dpo<15?"#DC2626":"#059669"}/>
      <Card icon={DollarSign} label="Số dư tiền mặt" value={cfg.cashBalance?fmt(cfg.cashBalance)+"₫":"—"} sub={cfg.cashBalance?`Khả dụng sau cam kết: ${fmt(availableCash)}₫`:"Chưa nhập"} accent="#2563EB"/>
    </div>
    <Note tone="warn"><span><strong>Đòn bẩy CCC:</strong> ① DPO — đàm phán công nợ (mỗi +10d = −10d CCC) → ② DIO — thanh lý {fmt(deadCap)}₫ vốn chết → ③ DSO → ④ rút lead time.</span></Note>
    <Panel title="Lịch thanh toán đang chờ">
      <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>PO</TH><TH>NCC</TH><TH>Loại</TH><TH r>Số tiền</TH><TH>Điều kiện</TH></tr></thead><tbody>
        {poList.filter(p=>p.depSt==="Pending"&&!["Closed","Cancelled"].includes(p.status)).map(p=>(<tr key={p.id+"d"}><TD m b>{p.id}</TD><TD>{p.sup}</TD><TD>Cọc</TD><TD r b>{fmtFull(p.deposit)}</TD><TD><span style={{fontSize:10,color:canDeposit(p)?"#059669":"#DC2626"}}>{canDeposit(p)?"Đủ điều kiện":"Chờ PO đặt NCC"}</span></TD></tr>))}
        {poList.filter(p=>p.paySt==="Pending"&&!["Closed","Cancelled"].includes(p.status)).map(p=>(<tr key={p.id+"f"}><TD m b>{p.id}</TD><TD>{p.sup}</TD><TD>Final</TD><TD r b>{fmtFull(p.finalPay)}</TD><TD><span style={{fontSize:10,color:canFinal(p)?"#059669":"#D97706"}}>{canFinal(p)?"Đủ điều kiện":"Chờ QC đạt / giao hàng"}</span></TD></tr>))}
        {committedCash===0&&<tr><TD>Không có khoản chờ.</TD></tr>}
      </tbody></table>
    </Panel>
  </div>);

  /* ═══════════ TAB: KHO & ATP (P1.6) — SKU × Location, ATP = OnHand − Reserved − Blocked ═══════════ */
  const renderInv=()=>{
    const rows=filtered.slice().sort((a,b)=>b.stockValue-a.stockValue);
    const kits=boms.map(b=>({...b,atp:kitATP(b,sk=>skuIndex[sk]?.availableStock||0)}));
    const transfers=rows.map(s=>({s,hint:transferHint(s)})).filter(x=>x.hint);
    return (<div style={{display:"flex",flexDirection:"column",gap:12}}>
      {brandBar}
      <Note tone="info"><span><strong>ATP = On Hand − Reserved − Blocked.</strong> Incoming hiển thị riêng, KHÔNG cộng vào ATP hiện tại. QC Hold = hàng đã nhận chờ QC. Kênh thiếu nhưng công ty đủ → chuyển kho, không mua NCC.</span></Note>
      {transfers.length>0&&<Panel title={`Đề xuất TRANSFER — ${transfers.length} SKU (kênh thiếu, Company ATP đủ)`}>
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>SKU</TH><TH>Từ</TH><TH>Đến</TH><TH r>SL đề xuất</TH><TH>Action</TH></tr></thead><tbody>
          {transfers.map(({s,hint})=>(<tr key={s.sku} style={{background:"#EFF6FF"}}>
            <TD m b c="#1D4ED8">{s.sku}</TD><TD>{hint.from}</TD><TD b>{hint.to}</TD><TD r b>{hint.qty.toLocaleString()}</TD>
            <TD>{can("inventory.transfer")&&<Btn onClick={()=>{const fromLoc=hint.from==="Kho chính"?"MAIN":"SHOPEE_FBS";const toLoc=hint.to==="Kho chính"?"MAIN":"SHOPEE_FBS";
              setLedger(x=>[{id:`IT-${Date.now()}-tf-${s.sku}`,sku:s.sku,type:"TRANSFER",qty:hint.qty,fromLoc,toLoc,referenceType:"Transfer",createdAt:todayStr(),createdBy:role,note:`${hint.from} → ${hint.to}`},...x]);
              addLog("Transfer",s.sku,"Chuyển kho",`${hint.qty} SP`,hint.from,hint.to);showToast(`Đã chuyển ${hint.qty} ${s.sku}`);}} color="#0891B2" small>Chuyển kho</Btn>}</TD>
          </tr>))}
        </tbody></table>
      </Panel>}
      {kits.length>0&&<Panel title={`Thành phẩm BOM — ${kits.length}`}>
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>Thành phẩm</TH><TH>Công thức</TH><TH r>ATP lắp bộ</TH></tr></thead><tbody>
          {kits.map(k=>(<tr key={k.parent}><TD b>{k.parent}<div style={{fontSize:9,color:"#6B7280"}}>{k.parentName}</div></TD>
            <TD><span style={{fontSize:10.5}}>{k.components.map(c=>`${c.sku}×${c.qty} (ATP ${skuIndex[c.sku]?.availableStock??"?"})`).join(" + ")}</span></TD>
            <TD r b c="#7C3AED">{k.atp.toLocaleString()} bộ</TD></tr>))}
        </tbody></table>
        <div style={{padding:"8px 14px",fontSize:10,color:"#6B7280",borderTop:"1px solid #F3F4F6"}}>ATP lắp bộ = min(ATP component ÷ định mức). Sales Plan thành phẩm tự nổ nhu cầu xuống component trong tab Cần Mua (cột Fcast có phần BOM).</div>
      </Panel>}
      <Panel title={`Tồn theo SKU × Location — ${rows.length} SKU`}>
        <div style={{overflowX:"auto",maxHeight:520}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1350}}><thead><tr>
          <TH>SKU</TH><TH>Loại</TH><TH r>On Hand</TH><TH r>Reserved</TH><TH r>QC Hold</TH><TH r>Quarantine</TH><TH r b>ATP</TH><TH r>Incoming</TH><TH r>Kho chính</TH><TH r>Văn phòng</TH><TH r>Shopee FBS</TH><TH r>TikTok</TH><TH r>Return</TH>
        </tr></thead><tbody>
          {rows.slice(0,80).map(s=>{const cp=channelPos(s.sku);if(!cp)return null;return (<tr key={s.sku}>
            <TD m b c="#1D4ED8">{s.sku}</TD>
            <TD><Badge c={s.skuType==="VARIANT"||s.skuType==="FINISHED_GOOD"?"#2563EB":"#6B7280"} bg={s.skuType==="VARIANT"||s.skuType==="FINISHED_GOOD"?"#DBEAFE":"#F3F4F6"}>{s.skuType}</Badge></TD>
            <TD r>{cp.onHand.toLocaleString()}</TD><TD r c="#6B7280">{cp.reserved.toLocaleString()}</TD>
            <TD r c={cp.qcHold?"#7C3AED":"#9CA3AF"} b>{cp.qcHold||"—"}</TD>
            <TD r c={cp.quarantine?"#991B1B":"#9CA3AF"} b>{cp.quarantine||"—"}</TD>
            <TD r b c="#059669">{cp.atp.toLocaleString()}</TD>
            <TD r c={cp.incoming?"#0891B2":"#9CA3AF"}>{cp.incoming||"—"}</TD>
            <TD r>{cp.main.toLocaleString()}</TD><TD r>{cp.office.toLocaleString()}</TD><TD r>{cp.shopee.toLocaleString()}</TD><TD r>{cp.tiktok||"—"}</TD><TD r>{cp.ret||"—"}</TD>
          </tr>);})}
        </tbody></table></div>
      </Panel>
    </div>);
  };

  /* ═══════════ TAB: AUDIT — before/after/reason, clear 2 bước chỉ CEO (spec §26) ═══════════ */
  const renderAudit=()=>(<div style={{display:"flex",flexDirection:"column",gap:12}}>
    <Note tone="info"><span><strong>Audit log BẤT BIẾN — không xoá được, kể cả CEO.</strong> Lưu before/after/lý do, 400 bản ghi gần nhất trong bản demo (bản production lưu server-side đầy đủ).</span>
      <div style={{display:"flex",gap:6}}>
        <Btn onClick={()=>{const csv=["timestamp,user,role,entityType,entityId,action,before,after,reason",...auditLog.map(l=>[l.timestamp,l.user,l.role,l.entityType,l.entityId,l.action,l.before,l.after,l.reason].map(x=>`"${String(x||"").replace(/"/g,"'")}"`).join(","))].join("\n");
          const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=`audit-${todayStr()}.csv`;a.click();}} color="#6B7280" small>Export CSV</Btn>
        {/* V10: Audit bất biến — không có nút xoá, kể cả CEO (spec IX). Chỉ export/filter. */}
      </div></Note>
    <Panel title={`Audit Log — ${auditLog.length}`}>
      <div style={{overflowX:"auto",maxHeight:560}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1000}}><thead><tr><TH>Thời gian</TH><TH>User</TH><TH>Entity</TH><TH>ID</TH><TH>Action</TH><TH>Trước</TH><TH>Sau</TH><TH>Lý do</TH></tr></thead><tbody>
        {auditLog.slice(0,150).map(l=>(<tr key={l.id}>
          <TD><span style={{fontSize:10}}>{String(l.timestamp).slice(5,16).replace("T"," ")}</span></TD>
          <TD><Badge c="#4338CA" bg="#E0E7FF">{l.user}</Badge></TD>
          <TD>{l.entityType}</TD><TD m b c="#1D4ED8">{l.entityId}</TD><TD b><span style={{fontSize:10.5}}>{l.action}</span></TD>
          <TD><span style={{fontSize:10,color:"#9CA3AF"}}>{String(l.before||"").slice(0,26)}</span></TD>
          <TD><span style={{fontSize:10,color:"#374151"}}>{String(l.after||"").slice(0,26)}</span></TD>
          <TD><span style={{fontSize:10,color:"#6B7280"}}>{String(l.reason||"").slice(0,40)}</span></TD>
        </tr>))}
      </tbody></table></div></Panel>
  </div>);

  /* ═══════════ TAB: POS SYNC — POS_MAP + preview trước khi apply (spec §13,14) ═══════════ */
  /* ── Parser format GỐC Pancake (XNK theo sản phẩm): header 2 tầng, mỗi SP nhiều dòng theo kho ── */
  const parsePancake=arr=>{
    let h=-1;
    for(let i2=0;i2<Math.min(6,arr.length);i2++){const row=(arr[i2]||[]).map(x=>String(x??""));
      if(row.some(x=>x.includes("MÃ SẢN PHẨM"))&&row.some(x=>x.includes("KHO"))){h=i2;break;}}
    if(h<0)return null;
    /* cột cố định của Pancake: 2=Mã · 3=Kho · 6=Nhập NCC · 8=Nhập Trả(hoàn) · 14=Xuất Bán · 18=Tồn cuối SL */
    const agg={};const names={};
    for(let i2=h+1;i2<arr.length;i2++){const r=arr[i2]||[];
      const ma=String(r[2]??"").trim();if(!ma)continue;
      if(r[4]===undefined&&r[14]===undefined&&r[18]===undefined)continue;
      const a=agg[ma]=agg[ma]||{ban:0,tra:0,nhapNCC:0,tonCuoi:0,kho:0};
      a.ban+=num(r[14]);a.tra+=num(r[8]);a.nhapNCC+=num(r[6]);a.tonCuoi+=num(r[18]);a.kho++;
      if(r[1]&&!names[ma])names[ma]=String(r[1]).slice(0,50);
    }
    if(!Object.keys(agg).length)return null;
    /* Phân loại: khớp trực tiếp (qua POS Map: alias/combo/gift) → khớp mã cha (chia biến thể) → không khớp */
    const direct={},parent={},unmatched=[];
    Object.entries(agg).forEach(([ma,a])=>{
      const rv=resolvePosRow(ma,posMap);
      if(rv.type==="combo"){
        rv.targets.forEach(t=>{if(REAL_ROWS.some(x=>x.sku===t.sku)){
          const d=direct[t.sku]=direct[t.sku]||{ban:0,tra:0,nhapNCC:0,tonCuoi:null,via:"combo"};
          d.ban+=a.ban*t.qty;}});
        return;}
      const target=rv.targets[0].sku;
      if(REAL_ROWS.some(x=>x.sku===target)){
        const d=direct[target]=direct[target]||{ban:0,tra:0,nhapNCC:0,tonCuoi:0,via:rv.type};
        d.ban+=a.ban;d.tra+=a.tra;d.nhapNCC+=a.nhapNCC;d.tonCuoi=(d.tonCuoi??0)+a.tonCuoi;
        return;}
      const vars=REAL_ROWS.filter(x=>x.productCode===ma);
      if(vars.length){parent[ma]={...a,nVars:vars.length,name:names[ma]||""};return;}
      unmatched.push(ma);
    });
    return {pancake:true,total:Object.keys(agg).length,direct,parent,unmatched,names};
  };

  /* Import file cột phẳng (file mẫu của tool) */
  const buildFlat=(rows,hash,fname,dup)=>{
    const get=(r,keys)=>{for(const k of keys)if(r[k]!==undefined&&r[k]!=="")return r[k];return undefined;};
    const seen=new Set();
    const res={total:rows.length,updates:{},combo:0,alias:0,gift:0,direct:0,unmatched:[],dups:[],errors:[]};
    rows.forEach((r,idx)=>{
      const code=String(get(r,["sku","SKU","skuCode","Mã SKU","ma_mau","pos","POS"])||"").trim();
      if(!code){res.errors.push(`Dòng ${idx+2}: thiếu mã`);return;}
      if(seen.has(code))res.dups.push(code);seen.add(code);
      const rv=resolvePosRow(code,posMap);
      const anyMatch=rv.targets.some(t=>REAL_ROWS.some(x=>x.sku===t.sku));
      if(!anyMatch){res.unmatched.push(code);return;}
      if(rv.type==="combo")res.combo++;else if(rv.type==="alias")res.alias++;else if(rv.type==="gift")res.gift++;else res.direct++;
      const soldQty=Number(get(r,["ban30","sold30","Bán 30"]))||0;
      rv.targets.forEach(t=>{
        if(!REAL_ROWS.some(x=>x.sku===t.sku)){res.unmatched.push(`${code}→${t.sku}`);return;}
        const u=res.updates[t.sku]=res.updates[t.sku]||{meta:{},soldDelta:0,giftUnits:0};
        if(rv.type==="combo"&&soldQty)u.soldDelta+=soldQty*t.qty;
        else if(rv.type==="gift"&&soldQty)u.giftUnits+=soldQty*t.qty;
        else{
          const n=keys=>{const v=get(r,keys);return v!==undefined?Number(v):undefined;};
          const set=(k,v)=>{if(v!==undefined&&!isNaN(v))u.meta[k]=v;};
          set("sellPrice",n(["giaBan","sellPrice","Giá bán"]));set("leadTime",n(["leadTime","Lead time"]));
          set("moq",n(["MOQ","moq"]));set("packSize",n(["packSize","pack"]));set("targetCover",n(["targetCover"]));
          set("sold7",n(["ban7","sold7"]));set("sold60",n(["ban60","sold60"]));
          const ps=get(r,["trangThaiSP","productStatus"]);if(ps&&PS_C[ps])u.meta.productStatus=ps;
          const sup=get(r,["NCCchinh","mainSupplier","NCC"]);if(sup)u.meta.mainSupplier=String(sup);
          const ow=get(r,["nguoiPhuTrach","owner"]);if(ow)u.meta.owner=String(ow);
        }
      });
    });
    setImportPreview({...res,fileHash:hash,fileName:fname,duplicate:!!dup,dupOf:dup?.id});
  };

  /* P1.3: hash nội dung file (FNV-1a) — demo client-side; bản backend dùng SHA-256 */
  const fileHash=bytes=>{let h=0x811c9dc5;const u=new Uint8Array(bytes);
    for(let i2=0;i2<u.length;i2++){h^=u[i2];h=Math.imul(h,0x01000193)>>>0;}
    return "fh-"+h.toString(16)+"-"+u.length;};
  const handleFile=e=>{
    const file=e.target.files?.[0];if(!file)return;
    const ext=file.name.split(".").pop().toLowerCase();
    const rd=new FileReader();
    rd.onload=ev=>{
      const hash=fileHash(ev.target.result);
      const dup=posImports.find(x=>x.fileHash===hash&&x.status==="Applied");
      if(ext==="csv"){const txt=new TextDecoder().decode(ev.target.result);
        Papa.parse(txt,{header:true,skipEmptyLines:true,complete:r=>buildFlat(r.data,hash,file.name,dup)});return;}
      const wb=XLSX.read(ev.target.result,{type:"array"});
      const sheet=wb.Sheets[wb.SheetNames[0]];
      const arr=XLSX.utils.sheet_to_json(sheet,{header:1,defval:undefined});
      const pk=parsePancake(arr);
      if(pk){setImportPreview({...pk,period:"7",distribute:true,updStock:false,fileHash:hash,fileName:file.name,duplicate:!!dup,dupOf:dup?.id});return;}
      buildFlat(XLSX.utils.sheet_to_json(sheet),hash,file.name,dup);
    };rd.readAsArrayBuffer(file);
    e.target.value="";
  };
  /* Áp dụng file Pancake: chọn kỳ 7/30/60 → ghi đúng trường; mã cha chia theo tỷ trọng bán 30d */
  const applyPancake=()=>{
    const r=importPreview;if(!r)return;
    if(r.duplicate){showToast("File trùng import "+(r.dupOf||"trước đó")+" — bị chặn (idempotent)","bad");return;}
    const key=r.period==="7"?"sold7":r.period==="60"?"sold60":"sold30";
    const nm={...skuMeta};const nov={...rowOv};let cnt=0;
    const apply=(sku,d,est)=>{
      if(key==="sold30"){
        const cur=nov[sku]||{};
        nov[sku]={...cur,sold30:Math.round(d.ban),returned30:Math.round(d.tra||0),received30:Math.round(d.nhapNCC||0)};
      }else{
        nm[sku]={...(nm[sku]||{}),[key]:Math.round(d.ban)};
      }
      if(r.updStock&&!est&&d.tonCuoi!==null&&d.tonCuoi!==undefined){
        /* P1.3: POS lệch Inventory → LUÔN vào hàng đợi Reconciliation, KHÔNG tự overwrite tồn */
        const target=Math.round(d.tonCuoi);
        const curRow=skuIndex[sku];
        if(curRow&&target!==curRow.availableStock){
          setReconAlerts(a=>[{id:Date.now()+sku,sku,at:todayStr(),systemATP:curRow.availableStock,posStock:target,delta:target-curRow.availableStock,status:"Pending",note:target<0?"Tồn POS ÂM":"POS lệch hệ thống"},...a.filter(x=>x.sku!==sku)]);
        }
      }
      cnt++;
    };
    Object.entries(r.direct).forEach(([sku,d])=>apply(sku,d,false));
    if(r.distribute)Object.entries(r.parent).forEach(([ma,a])=>{
      const vars=REAL_ROWS.filter(x=>x.productCode===ma);
      const tot=vars.reduce((s,v)=>s+v.sold30,0);
      vars.forEach(v=>{
        const share=tot>0?v.sold30/tot:1/vars.length;
        apply(v.sku,{ban:a.ban*share,tra:a.tra*share,nhapNCC:a.nhapNCC*share},true);
      });
    });
    /* P1.3: backup giá trị cũ để Reverse bằng transaction, không xoá lịch sử */
    const touched=new Set([...Object.keys(r.direct),...(r.distribute?Object.entries(r.parent).flatMap(([ma])=>REAL_ROWS.filter(x=>x.productCode===ma).map(x=>x.sku)):[])]);
    const metaBefore={};const ovBefore={};
    touched.forEach(sk=>{metaBefore[sk]={sold7:skuMeta[sk]?.sold7,sold60:skuMeta[sk]?.sold60};ovBefore[sk]=rowOv[sk]?{...rowOv[sk]}:null;});
    const impId=`IMP-${Date.now().toString().slice(-6)}`;
    setPosImports(x=>[{id:impId,fileHash:r.fileHash,fileName:r.fileName||"pancake.xlsx",at:new Date().toLocaleString("vi-VN"),by:role,kind:"pancake",period:r.period,status:"Applied",nSku:cnt,metaBefore,ovBefore,unmatched:r.unmatched},...x]);
    if(r.unmatched.length)setMappingQueue(q=>[...new Set([...q,...r.unmatched])]);
    setSkuMeta(nm);setRowOv(nov);setLastSync(new Date().toLocaleString("vi-VN"));
    addLog("POSImport",impId,`Import Pancake ${r.period} ngày`,"","",`${cnt} SKU`,`hash ${r.fileHash} · trực tiếp ${Object.keys(r.direct).length} · mã cha ${r.distribute?Object.keys(r.parent).length:0} · Mapping Required ${r.unmatched.length}`);
    showToast(`Đã áp dụng ${impId} — ${cnt} SKU (kỳ ${r.period} ngày)`);
    setImportPreview(null);
  };
  /* P1.3: Reverse Import — khôi phục bằng transaction, giữ nguyên lịch sử */
  const reverseImport=imp=>{
    if(!can("pos.import")){showToast("Không có quyền","bad");return;}
    setSkuMeta(prev=>{const n2={...prev};Object.entries(imp.metaBefore||{}).forEach(([sk,b])=>{n2[sk]={...(n2[sk]||{})};
      ["sold7","sold60"].forEach(k=>{if(b[k]===undefined)delete n2[sk][k];else n2[sk][k]=b[k];});});return n2;});
    setRowOv(prev=>{const n2={...prev};Object.entries(imp.ovBefore||{}).forEach(([sk,b])=>{if(b===null)delete n2[sk];else n2[sk]=b;});return n2;});
    setPosImports(x=>x.map(z=>z.id===imp.id?{...z,status:"Reversed",reversedAt:todayStr(),reversedBy:role}:z));
    addLog("POSImport",imp.id,"REVERSE IMPORT","",`Applied`,`Reversed`,"Khôi phục giá trị trước import — lịch sử giữ nguyên");
    showToast(`Đã reverse ${imp.id}`,"warn");
  };
  const applyImport=()=>{
    const res=importPreview;if(!res)return;
    const nm={...skuMeta};const nov={...rowOv};let cnt=0;
    Object.entries(res.updates).forEach(([sku,u])=>{
      if(Object.keys(u.meta).length){nm[sku]={...(nm[sku]||{}),...u.meta};cnt++;}
      if(u.soldDelta||u.giftUnits){
        const base=REAL_ROWS.find(x=>x.sku===sku);
        const cur=nov[sku]||{};
        nov[sku]={...cur,
          sold30:(cur.sold30??base.sold30)+u.soldDelta,                      /* combo cộng bán */
          availableStock:Math.max(0,(cur.availableStock??base.availableStock)-u.soldDelta-u.giftUnits),  /* gift trừ tồn, không cộng bán */
          stockPOS:Math.max(0,(cur.stockPOS??base.stockPOS)-u.giftUnits)};
        cnt++;
      }
    });
    setSkuMeta(nm);setRowOv(nov);setLastSync(new Date().toLocaleString("vi-VN"));
    addLog("System","Import","Áp dụng import POS",`${cnt} SKU · ${res.total} dòng · combo ${res.combo} · alias ${res.alias} · gift ${res.gift} · lỗi ${res.errors.length}`);
    showToast(`Đã cập nhật ${cnt} SKU`);setImportPreview(null);
  };
  const renderSync=()=>(<div style={{display:"flex",flexDirection:"column",gap:12}}>
    {reconAlerts.length>0&&<Panel title={`Inventory Reconciliation Required — ${reconAlerts.length} SKU (POS lệch hệ thống, KHÔNG tự ghi đè)`}>
      <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>SKU</TH><TH r>Hệ thống ATP</TH><TH r>POS</TH><TH r>Lệch</TH><TH>Ghi chú</TH><TH>Action</TH></tr></thead><tbody>
        {reconAlerts.map(a=>(<tr key={a.id} style={{background:a.posStock<0?"#FEF2F2":"#FFFBEB"}}>
          <TD m b c="#1D4ED8">{a.sku}</TD><TD r>{a.systemATP??"—"}</TD><TD r b c={a.posStock<0?"#991B1B":"#374151"}>{a.posStock}</TD>
          <TD r b c="#DC2626">{a.delta>0?"+":""}{a.delta??"—"}</TD><TD><span style={{fontSize:10}}>{a.note}</span></TD>
          <TD><div style={{display:"flex",gap:3}}>
            {can("inventory.transfer")&&a.posStock>=0&&<Btn onClick={()=>{setLedger(x=>[{id:`IT-${Date.now()}-rec-${a.sku}`,sku:a.sku,type:"STOCK_ADJUSTMENT",qty:a.delta,referenceType:"Reconciliation",referenceId:String(a.id),createdAt:todayStr(),createdBy:role,note:`Đối soát xác nhận: ${a.systemATP} → ${a.posStock}`},...x]);setReconAlerts(q=>q.filter(z=>z.id!==a.id));addLog("Reconciliation",a.sku,"Warehouse xác nhận điều chỉnh","",String(a.systemATP),String(a.posStock));showToast(`${a.sku}: đã điều chỉnh theo kiểm kho`);}} color="#059669" small>Xác nhận điều chỉnh</Btn>}
            <Btn onClick={()=>{setReconAlerts(q=>q.filter(z=>z.id!==a.id));addLog("Reconciliation",a.sku,"Bỏ qua cảnh báo","","","");}} color="#6B7280" small>Bỏ qua</Btn>
          </div></TD>
        </tr>))}
      </tbody></table>
    </Panel>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}>
      <Card icon={Database} label="Nguồn" value="Xuất nhập tồn 30d" accent="#2563EB"/>
      <Card icon={Clock} label="Last sync" value={lastSync} accent="#059669"/>
      <Card icon={CheckCircle} label="SKU" value={REAL_ROWS.length} sub="Nevor 30 · UHero 99" accent="#059669"/>
      <Card icon={Layers} label="POS Map" value={posMap.length} sub={`combo ${posMap.filter(m=>m.type==="combo").length} · alias ${posMap.filter(m=>m.type==="alias").length} · gift ${posMap.filter(m=>m.type==="gift").length}`} accent="#7C3AED"/>
    </div>
    {can("pos.import")&&<Panel title="Nạp dữ liệu (có preview trước khi áp dụng)">
      <div style={{padding:16}}>
        <label style={{border:"2px dashed #3B82F6",borderRadius:10,padding:28,textAlign:"center",color:"#2563EB",display:"block",cursor:"pointer",background:"#EFF6FF"}}>
          <Upload size={24} style={{marginBottom:6}} color="#3B82F6"/>
          <div style={{fontSize:13,fontWeight:600}}>Chọn file Excel / CSV</div>
          <div style={{fontSize:11,marginTop:4,color:"#6B7280"}}>Nhận 2 loại file: ① Báo cáo XUẤT NHẬP TỒN gốc từ Pancake (7/30/60 ngày — tool tự nhận diện, gộp các kho, hỏi kỳ báo cáo trước khi áp dụng) · ② File mẫu cột phẳng của tool (sku · giaBan · leadTime · MOQ…). Mã đều được tra qua POS Map.</div>
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} style={{display:"none"}}/>
        </label>
      </div>
    </Panel>}
    {mappingQueue.length>0&&<Panel title={`Mapping Required — ${mappingQueue.length} mã lạ`}>
      <div style={{padding:12,display:"flex",flexDirection:"column",gap:6}}>
        {mappingQueue.map(code=>(<div key={code} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <Badge c="#991B1B" bg="#FEE2E2">{code}</Badge>
          {can("pos.import")&&<><select id={"map-"+code} defaultValue="" style={{padding:"4px 8px",borderRadius:6,border:"1px solid #D1D5DB",fontSize:11}}><option value="">Gắn alias → SKU nội bộ...</option>{REAL_ROWS.map(x=><option key={x.sku} value={x.sku}>{x.sku}</option>)}</select>
          <Btn onClick={()=>{const sel=document.getElementById("map-"+code);const tgt=sel&&sel.value;if(!tgt){showToast("Chọn SKU đích","bad");return;}
            setPosMap(m2=>[...m2,{pos:code,type:"alias",internalSku:tgt,note:"Mapping Required → gắn "+todayStr()}]);
            setMappingQueue(q=>q.filter(c=>c!==code));
            addLog("POSMap",code,"Gắn alias từ Mapping Required","","",tgt);showToast(`${code} → ${tgt}. Import lại file để nhận số.`);}} small>Gắn</Btn></>}
          <Btn onClick={()=>setMappingQueue(q=>q.filter(c=>c!==code))} color="#6B7280" small>Bỏ</Btn>
        </div>))}
      </div>
    </Panel>}
    {posImports.length>0&&<Panel title={`Import History — ${posImports.length}`}>
      <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>ID</TH><TH>File</TH><TH>Lúc</TH><TH>Bởi</TH><TH r>Kỳ</TH><TH r>SKU</TH><TH>Hash</TH><TH>Trạng thái</TH><TH>Action</TH></tr></thead><tbody>
        {posImports.map(im=>(<tr key={im.id}>
          <TD m b>{im.id}</TD><TD><span style={{fontSize:10}}>{im.fileName}</span></TD><TD><span style={{fontSize:10}}>{im.at}</span></TD><TD>{im.by}</TD>
          <TD r>{im.period||"—"}d</TD><TD r>{im.nSku}</TD><TD><span style={{fontSize:8.5,color:"#9CA3AF"}}>{im.fileHash}</span></TD>
          <TD><Badge c={im.status==="Applied"?"#065F46":im.status==="Reversed"?"#B45309":"#991B1B"} bg={im.status==="Applied"?"#D1FAE5":im.status==="Reversed"?"#FEF3C7":"#FEE2E2"}>{im.status}</Badge></TD>
          <TD>{im.status==="Applied"&&can("pos.import")&&<Btn onClick={()=>askConfirm({title:"Reverse import "+im.id,msg:"Khôi phục giá trị trước import bằng transaction? Lịch sử giữ nguyên.",danger:true,onOk:()=>reverseImport(im)})} color="#DC2626" small>Reverse</Btn>}</TD>
        </tr>))}
      </tbody></table>
    </Panel>}
    <Panel title={`POS Map — ${posMap.length} mapping`}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}><thead><tr><TH>Mã POS</TH><TH>Loại</TH><TH>Trỏ về</TH><TH r>Tồn combo khả dụng</TH><TH>Ghi chú</TH></tr></thead><tbody>
        {posMap.map((m,i)=>(<tr key={i}>
          <TD m b c="#1D4ED8">{m.pos}</TD>
          <TD><Badge c={m.type==="combo"?"#7C3AED":m.type==="alias"?"#2563EB":m.type==="gift"?"#BE185D":"#6B7280"} bg={m.type==="combo"?"#EDE9FE":m.type==="alias"?"#DBEAFE":m.type==="gift"?"#FCE7F3":"#F3F4F6"}>{m.type}</Badge></TD>
          <TD><span style={{fontSize:10.5}}>{m.type==="combo"?(m.components||[]).map(c=>`${c.sku}×${c.qty}`).join(" + "):m.internalSku}</span></TD>
          <TD r b c="#7C3AED">{m.type==="combo"?comboAvailable(m,skuIndex).toLocaleString():"—"}</TD>
          <TD><span style={{fontSize:10,color:"#6B7280"}}>{m.note||""}</span></TD>
        </tr>))}
      </tbody></table></div>
      <div style={{padding:"8px 14px",fontSize:10,color:"#6B7280",borderTop:"1px solid #F3F4F6"}}>Tồn combo = min(tồn component ÷ số lượng trong combo). Combo không bao giờ vào bảng Cần Mua — nhu cầu nổ về SKU con.</div>
    </Panel>
    {can("data.edit")&&<Panel title="Reset"><div style={{padding:14,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <span style={{fontSize:11,color:"#6B7280"}}>Xoá dữ liệu bổ sung + overrides import. Không ảnh hưởng PO, plan, audit.</span>
      <Btn onClick={()=>askConfirm({title:"Reset dữ liệu bổ sung",msg:"Xoá toàn bộ meta đã điền và overrides import?",danger:true,onOk:()=>{setSkuMeta({});setRowOv({});addLog("System","—","Reset skuMeta + rowOv","");showToast("Đã reset","warn");}})} color="#DC2626" small>Reset</Btn>
    </div></Panel>}
  </div>);

  /* ═══════════ MODALS ═══════════ */
  const modals=(<>
    {/* Confirm dialog dùng chung — thay window.confirm (spec §29) */}
    {confirmReq&&(()=>{const r=confirmReq;
      return (<Modal title={r.title} onClose={()=>setConfirmReq(null)}>
        <div style={{fontSize:12.5,lineHeight:1.7,color:"#374151",marginBottom:14}}>{r.msg}</div>
        {r.requireReason&&<Field label="Lý do *"><Inp value={r._reason||""} onChange={v=>setConfirmReq(q=>({...q,_reason:v}))} placeholder="Bắt buộc nhập lý do..."/></Field>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn onClick={()=>setConfirmReq(null)} color="#6B7280">Hủy</Btn>
          <Btn disabled={r.requireReason&&!r._reason} onClick={()=>{const fn=r.onOk;const reason=r._reason;setConfirmReq(null);fn&&fn(reason);}} color={r.danger?"#DC2626":"#059669"}>Xác nhận</Btn>
        </div>
      </Modal>);})()}

    {/* Leader/CEO yêu cầu sửa hoặc từ chối */}
    {revModal&&(()=>{const {sku,mode}=revModal;
      const titles={revise:"Leader yêu cầu chỉnh sửa",reject:"Leader từ chối",ceoRevise:"CEO yêu cầu sửa lại",ceoReject:"CEO từ chối"};
      return (<Modal title={`${titles[mode]} — ${sku}`} onClose={()=>setRevModal(null)}>
        <Field label="Lý do *"><Inp value={revReason} onChange={setRevReason} placeholder="VD: Số lượng quá cao so với plan..."/></Field>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn onClick={()=>setRevModal(null)} color="#6B7280">Hủy</Btn>
          <Btn disabled={!revReason} onClick={()=>{
            const from=gp(sku).status;
            if(mode==="revise")sp(sku,{status:"REVISION_REQUESTED",revisionReason:revReason});
            else if(mode==="reject")sp(sku,{status:"LEADER_REJECTED",rejectReason:revReason});
            else if(mode==="ceoRevise")sp(sku,{status:"REVISION_REQUESTED",revisionReason:`[CEO] ${revReason}`});
            else sp(sku,{status:"CEO_REJECTED",rejectReason:revReason});
            const to=gp(sku).status;
            addLog("Proposal",sku,titles[mode],"",from,mode==="revise"||mode==="ceoRevise"?"REVISION_REQUESTED":mode==="reject"?"LEADER_REJECTED":"CEO_REJECTED",revReason);
            showToast(`${sku}: ${titles[mode]}`,"warn");setRevModal(null);
          }} color="#DC2626">Xác nhận</Btn>
        </div>
      </Modal>);})()}

    {/* Điền dữ liệu 1 SKU */}
    {metaModal&&(()=>{const s=skuIndex[metaModal];if(!s)return null;return (
      <Modal title={`Bổ sung dữ liệu — ${s.sku}`} onClose={()=>setMetaModal(null)} wide>
        <div style={{fontSize:11.5,background:"#F8FAFC",padding:12,borderRadius:8,marginBottom:14,lineHeight:1.8}}>
          <div><strong>{s.name}</strong>{s.variant?` · ${s.variant}`:""} · <BrandB b={s.brand}/></div>
          <div>Tồn {s.stockPOS.toLocaleString()} · Giá vốn {fmtFull(s.landedCost)} · Bán 30d {s.sold30} · Hoàn {pct(s.returnRate)} · Bán/ngày <strong>{s.fds}</strong></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Giá bán *"><Inp value={metaForm.sellPrice} onChange={v=>setMetaForm(p=>({...p,sellPrice:v}))} type="number"/></Field>
          <Field label="Loại SKU"><Sel value={metaForm.skuType} onChange={v=>setMetaForm(p2=>({...p2,skuType:v}))}><option value="">Tự nhận (Variant/Finished)</option>{SKU_TYPES.map(k=><option key={k}>{k}</option>)}</Sel></Field>
          <Field label="Trạng thái SP *"><Sel value={metaForm.productStatus} onChange={v=>setMetaForm(p=>({...p,productStatus:v}))}><option value="">Chọn...</option>{Object.keys(PS_C).map(k=><option key={k} value={k}>{vn(k)}</option>)}</Sel></Field>
          <Field label="Lead time (ngày) *"><Inp value={metaForm.leadTime} onChange={v=>setMetaForm(p=>({...p,leadTime:v}))} type="number"/></Field>
          <Field label="MOQ *"><Inp value={metaForm.moq} onChange={v=>setMetaForm(p=>({...p,moq:v}))} type="number"/></Field>
          <Field label="Pack size *"><Inp value={metaForm.packSize} onChange={v=>setMetaForm(p=>({...p,packSize:v}))} type="number"/></Field>
          <Field label="Target cover (ngày)" hint={`Mặc định ${cfg.targetCoverDefault}`}><Inp value={metaForm.targetCover} onChange={v=>setMetaForm(p=>({...p,targetCover:v}))} type="number"/></Field>
          <Field label="NCC chính"><Sel value={metaForm.mainSupplier} onChange={v=>setMetaForm(p=>({...p,mainSupplier:v}))}><option value="">Chọn...</option>{supplierNames.map(n=><option key={n}>{n}</option>)}</Sel></Field>
          <Field label="Người phụ trách"><Inp value={metaForm.owner} onChange={v=>setMetaForm(p=>({...p,owner:v}))}/></Field>
          <Field label="Bán 7 ngày"><Inp value={metaForm.sold7} onChange={v=>setMetaForm(p=>({...p,sold7:v}))} type="number"/></Field>
          <Field label="Bán 60 ngày"><Inp value={metaForm.sold60} onChange={v=>setMetaForm(p=>({...p,sold60:v}))} type="number"/></Field>
        </div>
        {metaForm.sellPrice>0&&<Note tone={metaForm.sellPrice*(1-s.feeRate)-s.landedCost>0?"ok":"bad"}><span>LN/cái sau phí sàn {pct(s.feeRate)}: <strong>{fmtFull(Math.round(metaForm.sellPrice*(1-s.feeRate)-s.landedCost))}</strong></span></Note>}
        {metaForm.moq>0&&s.fds>0&&<Note tone={metaForm.moq/s.fds>cfg.liqDays?"warn":"info"}><span>MOQ {metaForm.moq} ÷ {s.fds}/ngày = <strong>{Math.round(metaForm.moq/s.fds)} ngày cover</strong> mỗi lần mua{metaForm.moq/s.fds>cfg.liqDays?" → sẽ gắn cờ Kẹt MOQ":""}</span></Note>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
          <Btn onClick={()=>setMetaModal(null)} color="#6B7280">Hủy</Btn>
          <Btn onClick={()=>{
            const errs=[];
            ["sellPrice","leadTime","moq","packSize","sold7","sold60","targetCover"].forEach(k=>{const v=metaForm[k];if(v!==""&&v!==undefined&&v!==null){const e=vErr.nonNeg(v,FIELD_VN[k]||k);if(e)errs.push(e);if(["leadTime","moq","packSize"].includes(k)&&Number(v)===0)errs.push(`${FIELD_VN[k]} phải > 0`);}});
            if(errs.length){showToast(errs[0],"bad");return;}
            const c={};Object.entries(metaForm).forEach(([k,v])=>{if(v!==""&&v!==undefined)c[k]=v;});
            const before=JSON.stringify(skuMeta[metaModal]||{}).slice(0,60);
            setSkuMeta(p=>({...p,[metaModal]:{...(p[metaModal]||{}),...c}}));
            addLog("Data",metaModal,"Bổ sung dữ liệu",Object.keys(c).map(k=>FIELD_VN[k]||k).join(", "),before,JSON.stringify(c).slice(0,60));
            setMetaModal(null);showToast(`Đã lưu ${metaModal}`);}} color="#059669">Lưu</Btn>
        </div>
      </Modal>);})()}

    {/* Điền hàng loạt */}
    {bulkModal&&(<Modal title="Điền hàng loạt" onClose={()=>setBulkModal(false)} wide>
      <Note tone="warn"><span>Chỉ ghi vào SKU <strong>đang trống</strong> trường đó. Áp dụng: {brand==="all"?"tất cả brand":brand} — {scope.length} SKU.</span></Note>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}>
        <Field label="Lead time (ngày)"><Inp value={bulkForm.leadTime} onChange={v=>setBulkForm(p=>({...p,leadTime:v}))} type="number" placeholder="VD: 30"/></Field>
        <Field label="MOQ"><Inp value={bulkForm.moq} onChange={v=>setBulkForm(p=>({...p,moq:v}))} type="number" placeholder="VD: 500"/></Field>
        <Field label="Pack size"><Inp value={bulkForm.packSize} onChange={v=>setBulkForm(p=>({...p,packSize:v}))} type="number" placeholder="VD: 100"/></Field>
        <Field label="Target cover"><Inp value={bulkForm.targetCover} onChange={v=>setBulkForm(p=>({...p,targetCover:v}))} type="number" placeholder="VD: 45"/></Field>
        <Field label="Trạng thái SP"><Sel value={bulkForm.productStatus} onChange={v=>setBulkForm(p=>({...p,productStatus:v}))}><option value="">Không đổi</option><option value="__auto">Tự suy đoán từ dữ liệu bán</option>{Object.keys(PS_C).map(k=><option key={k} value={k}>{vn(k)}</option>)}</Sel></Field>
      </div>
      <div style={{fontSize:10.5,color:"#6B7280",marginTop:4}}>Tự suy đoán: nhập &gt;0 &amp; bán = 0 → Launch · bán = 0 &amp; nhập = 0 → Stop · còn lại → Duy trì. Scale gán tay.</div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
        <Btn onClick={()=>setBulkModal(false)} color="#6B7280">Hủy</Btn>
        <Btn onClick={()=>{
          const nm={...skuMeta};let cnt=0;
          scope.forEach(s=>{const u={};
            ["leadTime","moq","packSize","targetCover"].forEach(k=>{if(bulkForm[k]&&!s[k])u[k]=Number(bulkForm[k]);});
            if(bulkForm.productStatus&&!s.productStatus){
              u.productStatus=bulkForm.productStatus==="__auto"
                ?(s.received30>0&&s.sold30===0?"Launch":(s.sold30===0?"Stop":"Maintain"))
                :bulkForm.productStatus;}
            if(Object.keys(u).length){nm[s.sku]={...(nm[s.sku]||{}),...u};cnt++;}});
          setSkuMeta(nm);addLog("Data","bulk","Điền hàng loạt",`${cnt} SKU · ${brand}`);setBulkModal(false);showToast(`Đã điền ${cnt} SKU`);
        }} color="#059669">Áp dụng</Btn>
      </div>
    </Modal>)}

    {/* Chỉnh SL — validate MOQ/pack + lý do bắt buộc */}
    {adjModal&&(()=>{const s=adjModal;const q=Number(adjQty)||0;
      const errMoq=q>0&&q<s.moq, errPack=q>0&&q%s.packSize!==0, errZero=adjQty!==""&&q<=0;
      const nAfter=s.fds>0?Math.round((s.availableStock+s.incoming+q)/s.fds):9999;
      const warn=s.horizon&&nAfter/s.horizon>1.4;
      return (<Modal title={`Chỉnh số lượng — ${s.sku}`} onClose={()=>setAdjModal(null)}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,fontSize:12,marginBottom:14,background:"#F8FAFC",padding:12,borderRadius:8}}>
          <div>Hệ thống: <strong>{s.sysBuy}</strong></div><div>MOQ: <strong>{s.moq}</strong></div>
          <div>Pack: <strong>{s.packSize}</strong></div><div>Đang chọn: <strong>{s.actOQ}</strong></div>
        </div>
        <Field label="Số lượng mới *" hint={`≥ MOQ ${s.moq}, bội số ${s.packSize}`}><Inp value={adjQty} onChange={setAdjQty} type="number"/></Field>
        {errZero&&<Note tone="bad"><span>Số lượng phải &gt; 0.</span></Note>}
        {errMoq&&<Note tone="bad"><span>Dưới MOQ {s.moq}. Muốn mua ít hơn → đổi NCC có MOQ thấp hơn.</span></Note>}
        {errPack&&<Note tone="bad"><span>Không phải bội số {s.packSize}.</span></Note>}
        {q>0&&!errMoq&&!errPack&&<div style={{fontSize:11,padding:"8px 10px",background:warn?"#FFF7ED":"#F0FDF4",borderRadius:6,margin:"8px 0"}}>
          Vốn <strong>{fmtFull(q*s.landedCost)}</strong> · Cover sau <strong>{nAfter}d</strong>{warn&&<div style={{color:"#9A3412",marginTop:4}}>⚠ Vượt 1,4× horizon — chôn thêm {fmtFull(Math.max(0,q-s.sysBuy)*s.landedCost)}</div>}
        </div>}
        <Field label="Lý do *"><Sel value={adjReason} onChange={setAdjReason}><option value="">Chọn...</option>{ADJ_REASONS.map(r=><option key={r}>{r}</option>)}</Sel></Field>
        <Field label="Ghi chú"><Inp value={adjNote} onChange={setAdjNote} placeholder="Tuỳ chọn"/></Field>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn onClick={()=>setAdjModal(null)} color="#6B7280">Hủy</Btn>
          <Btn disabled={!q||errMoq||errPack||errZero||!adjReason} onClick={()=>{
            const pr=activePRof(s.sku);
            if(pr){const ok=updatePR(pr.id,pr.version,{adjustedQty:q,adjustmentReason:adjReason+(adjNote?` · ${adjNote}`:"")});if(!ok)return;}
            else createPR(s.sku,{status:"DRAFT",requestedQty:s.sysOQ,adjustedQty:q,adjustmentReason:adjReason,supplierId:s.mainSupplier||null,reason:s.reason||""});
            addLog("PurchaseRequest",pr?pr.id:s.sku,"Chỉnh số lượng","",String(s.actOQ),String(q),adjReason+(adjNote?` · ${adjNote}`:""));setAdjModal(null);showToast(`${s.sku}: ${s.actOQ} → ${q}`);}}>Lưu</Btn>
        </div>
      </Modal>);})()}

    {/* Timeline mô phỏng PO (spec §10) */}
    {timelineModal&&(()=>{const s=timelineModal;const evs=poEventsBySku[s.sku]||[];
      const sim=simulateTimeline(s.availableStock,s.fds,evs);
      return (<Modal title={`Timeline tồn kho — ${s.sku}`} onClose={()=>setTimelineModal(null)} wide>
        <div style={{fontSize:12,background:"#F8FAFC",padding:12,borderRadius:8,marginBottom:12,lineHeight:1.8}}>
          Tồn khả dụng <strong>{s.availableStock.toLocaleString()}</strong> · bán <strong>{s.fds}/ngày</strong> · {evs.length} PO đang về
          {sim.stockoutDay!==null?<div style={{color:"#991B1B",fontWeight:700}}>Hết hàng dự kiến: ngày +{sim.stockoutDay} ({addDaysStr(sim.stockoutDay)}) · gap {sim.gapDays} ngày · thiếu ~{sim.lostUnits.toLocaleString()} SP{s.lostRevenue?` · mất ~${fmtFull(s.lostRevenue)}`:""}</div>:<div style={{color:"#065F46",fontWeight:700}}>Không đứt hàng trong cửa sổ mô phỏng.</div>}
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>PO</TH><TH>ETA</TH><TH r>Ngày +</TH><TH r>Số lượng về</TH><TH>Kịp trước khi hết?</TH></tr></thead><tbody>
          {evs.length===0&&<tr><TD>Không có PO đang về.</TD></tr>}
          {evs.sort((a,b)=>a.day-b.day).map((e,i)=>(<tr key={i}>
            <TD m b>{e.id}</TD><TD>{e.eta}</TD><TD r>+{e.day}d</TD><TD r b>{e.qty.toLocaleString()}</TD>
            <TD>{sim.stockoutDay===null||e.day<=sim.stockoutDay?<Badge c="#065F46" bg="#D1FAE5">Kịp</Badge>:<Badge c="#fff" bg="#DC2626">Về sau khi hết {e.day-sim.stockoutDay}d</Badge>}</TD>
          </tr>))}
        </tbody></table>
        <Note tone="info"><span>Đề xuất mua chỉ trừ hàng <strong>về kịp</strong> ({s.incomingBefore.toLocaleString()} SP). Hàng về trễ ({s.incomingAfter.toLocaleString()} SP) không cứu được đợt đứt hàng này.</span></Note>
      </Modal>);})()}

    {/* Phân bổ tự động cho mã cha (spec §11) */}
    {allocModal&&(()=>{const g=allocModal;const tq=Number(allocQty)||0;
      const res=tq>0?allocate(g.arr,tq):null;
      return (<Modal title={`Phân bổ tự động — ${g.pc} (${g.n} biến thể)`} onClose={()=>setAllocModal(null)} wide>
        <Field label="Tổng số lượng cần phân bổ *" hint="VD: MOQ của cả mã, hoặc tổng dự kiến mua đợt này"><Inp value={allocQty} onChange={setAllocQty} type="number"/></Field>
        {res&&(<>
          {res.excluded.length>0&&<Note tone="warn"><span>Loại khỏi phân bổ (Stop/Xả tồn): {res.excluded.join(", ")}</span></Note>}
          <table style={{width:"100%",borderCollapse:"collapse",marginTop:10}}><thead><tr><TH>SKU</TH><TH>Biến thể</TH><TH r>Bán/ngày</TH><TH r>Tỷ lệ</TH><TH r>Cần thật</TH><TH r>Phân bổ</TH><TH r>Cover sau</TH><TH r>Overbuy</TH></tr></thead><tbody>
            {res.rows.map(r=>(<tr key={r.sku} style={{background:r.coverAfter>((g.arr[0]?.horizon||60)*1.8)?"#FEF2F2":"transparent"}}>
              <TD m b c="#1D4ED8">{r.sku}</TD><TD><span style={{fontSize:10}}>{r.variant||"—"}</span></TD>
              <TD r>{r.fds}</TD><TD r>{pct(r.ratio)}</TD><TD r>{r.need||"—"}</TD>
              <TD r b c="#1D4ED8">{r.alloc.toLocaleString()}</TD>
              <TD r b c={r.coverAfter>((g.arr[0]?.horizon||60)*1.8)?"#DC2626":"#374151"}>{r.coverAfter>9000?"∞":r.coverAfter+"d"}</TD>
              <TD r c={r.overCap>0?"#DC2626":"#059669"}>{r.overCap?fmt(r.overCap)+"₫":"—"}</TD>
            </tr>))}
            <tr style={{background:"#F8FAFC"}}><TD b>TỔNG</TD><TD/><TD/><TD/><TD/><TD r b>{res.total.toLocaleString()}</TD><TD/><TD r b c="#DC2626">{res.totalOverCap?fmt(res.totalOverCap)+"₫":"—"}</TD></tr>
          </tbody></table>
          {res.highRisk&&(<div style={{marginTop:10}}><Note tone="bad"><span><strong>Có biến thể vượt 1,8× horizon.</strong> Áp dụng phải kèm lý do (audit ghi lại).</span></Note>
            <Field label="Lý do áp dụng có điều kiện *"><Inp value={allocReason} onChange={setAllocReason} placeholder="VD: MOQ theo màu bắt buộc..."/></Field></div>)}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
            <Btn onClick={()=>setAllocModal(null)} color="#6B7280">Hủy</Btn>
            <Btn disabled={res.highRisk&&!allocReason} onClick={()=>{
              res.rows.forEach(r=>{if(r.alloc>0){const pr=activePRof(r.sku);if(pr)updatePR(pr.id,pr.version,{adjustedQty:r.alloc,adjustmentReason:"Bundle/combo plan · Phân bổ "+g.pc},true);else createPR(r.sku,{status:"DRAFT",requestedQty:r.alloc,adjustedQty:r.alloc,adjustmentReason:"Phân bổ "+g.pc});}});
              addLog("Allocation",g.pc,"Phân bổ tự động",`${tq} SP → ${res.rows.length} biến thể`,"",res.rows.map(r=>`${r.sku}:${r.alloc}`).join(" "),allocReason);
              showToast(`Đã phân bổ ${g.pc}`);setAllocModal(null);
            }} color="#059669">{res.highRisk?"Áp dụng có điều kiện":"Áp dụng"}</Btn>
          </div>
        </>)}
      </Modal>);})()}

    {/* Chi tiết biến thể */}
    {variantModal&&(()=>{const g=variantModal;return (<Modal title={`${g.pc} — ${g.n} biến thể`} onClose={()=>setVariantModal(null)} wide>
      <Note tone={g.zero>0?"warn":"info"}><span>{g.zero>0?`${g.zero} biến thể bán 0 trong 30 ngày.`:"Mọi biến thể đều có bán."} Còn bán: TB {g.avgCover}d / Min {g.minCover}d{g.minSku?` (${g.minSku.sku})`:""}. Tập trung: {pct(g.conc)}.</span></Note>
      <table style={{width:"100%",borderCollapse:"collapse",marginTop:10}}><thead><tr><TH>Biến thể</TH><TH>Phân loại</TH><TH r>Bán 30d</TH><TH r>% doanh số</TH><TH r>Tồn</TH><TH r>Đang về</TH><TH r>Cover</TH><TH>Cờ</TH><TH r>Vốn</TH></tr></thead><tbody>
        {[...g.arr].sort((a,b)=>b.sold30-a.sold30).map(v=>(<tr key={v.sku} style={{background:v.sold30===0?"#FEF2F2":"transparent"}}>
          <TD m b c="#1D4ED8">{v.sku}</TD><TD><span style={{fontSize:10.5}}>{v.variant||"—"}</span></TD>
          <TD r b>{v.sold30}</TD><TD r>{pct(g.sold?v.sold30/g.sold:0)}</TD>
          <TD r>{v.stockPOS.toLocaleString()}</TD><TD r c={v.incoming?"#0891B2":"#9CA3AF"}>{v.incoming||"—"}</TD>
          <TD r b c={v.cover>cfg.liqDays?"#991B1B":v.cover>cfg.excessDays?"#EA580C":"#059669"}>{v.cover>9000?"∞":v.cover+"d"}</TD>
          <TD><SB v={v.invRisk} m={IR_C}/></TD><TD r>{fmt(v.stockValue)}₫</TD>
        </tr>))}
      </tbody></table>
      <Note tone="info"><span><strong>Đặt hàng đúng:</strong> chia theo % doanh số thật, không chia đều. Bỏ biến thể bán 0. Dùng nút <strong>Phân bổ</strong> để tính tự động.</span></Note>
    </Modal>);})()}

    {/* Sales Plan create/edit */}
    {planModal&&(<Modal title={planModal==="new"?"Lập Sales Plan":"Sửa Sales Plan"} onClose={()=>setPlanModal(null)} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="SKU *"><Sel value={planForm.sku} onChange={v=>{const s=skuIndex[v];setPlanForm(p=>({...p,sku:v,brand:s?.brand||p.brand}));}}><option value="">Chọn...</option>{skus.map(s=><option key={s.sku} value={s.sku}>{s.sku} — {s.name.slice(0,26)}</option>)}</Sel></Field>
        <Field label="Kênh"><Sel value={planForm.channel} onChange={v=>setPlanForm(p=>({...p,channel:v}))}><option>TikTok Shop</option><option>Shopee</option><option>Facebook/Zalo</option><option>DTC Website</option><option>B2B</option><option>Tổng hợp</option></Sel></Field>
        <Field label="Plan 7 ngày"><Inp value={planForm.plan7} onChange={v=>setPlanForm(p=>({...p,plan7:v}))} type="number"/></Field>
        <Field label="Plan 14 ngày"><Inp value={planForm.plan14} onChange={v=>setPlanForm(p=>({...p,plan14:v}))} type="number"/></Field>
        <Field label="Plan 30 ngày *" hint="Số này dùng cho forecast Launch/Scale"><Inp value={planForm.plan30} onChange={v=>setPlanForm(p=>({...p,plan30:v}))} type="number"/></Field>
        <Field label="Plan 60 ngày"><Inp value={planForm.plan60} onChange={v=>setPlanForm(p=>({...p,plan60:v}))} type="number"/></Field>
        <Field label="Kịch bản base"><Inp value={planForm.base} onChange={v=>setPlanForm(p=>({...p,base:v}))} type="number"/></Field>
        <Field label="Kịch bản stretch"><Inp value={planForm.stretch} onChange={v=>setPlanForm(p=>({...p,stretch:v}))} type="number"/></Field>
        <Field label="Uplift (campaign/KOC)"><Inp value={planForm.uplift} onChange={v=>setPlanForm(p=>({...p,uplift:v}))}/></Field>
        <Field label="Độ tin cậy"><Sel value={planForm.confidence} onChange={v=>setPlanForm(p=>({...p,confidence:v}))}><option>Cao</option><option>Trung bình</option><option>Thấp</option></Sel></Field>
      </div>
      <Field label="Ghi chú"><Inp value={planForm.note} onChange={v=>setPlanForm(p=>({...p,note:v}))}/></Field>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
        <Btn onClick={()=>setPlanModal(null)} color="#6B7280">Hủy</Btn>
        <Btn disabled={!planForm.sku||!planForm.plan30} onClick={()=>{
          const e=vErr.posInt(planForm.plan30,"Plan 30");if(e){showToast(e,"bad");return;}
          if(planModal==="new"){
            const id=`SP-${String(salesPlans.length+1).padStart(3,"0")}`;
            setSalesPlans(l=>[{...planForm,id,status:"Draft",creator:role,createdAt:todayStr(),approver:"",approvedAt:"",version:1},...l]);
            addLog("SalesPlan",id,"Lập plan",`${planForm.sku} · plan30 ${planForm.plan30}`);showToast(`Đã lập ${id}`);
          }else{
            setSalesPlans(l=>l.map(x=>x.id===planModal?{...x,...planForm,version:x.version+1}:x));
            addLog("SalesPlan",planModal,"Sửa plan",`v+1`);showToast("Đã cập nhật plan");
          }
          setPlanModal(null);
        }} color="#059669">Lưu</Btn>
      </div>
    </Modal>)}

    {/* So sánh NCC */}
    {supModal&&(()=>{const sk=skuIndex[supModal];const need=sk?.sysBuy||0;
      const cands=supplierSku.filter(x=>x.sku===supModal).map(x=>{const eff=effLanded(x.landed,x.defect);
        const qty=need>0?Math.ceil(Math.max(need,x.moq)/x.pack)*x.pack:0;
        return {...x,score:supScore(x),eff,qty,total:qty*eff,over:Math.max(0,qty-need)*eff,slow:sk&&sk.daysLeft<=x.lt};}).sort((a,b)=>a.total-b.total);
      const best=cands[0];
      return (<Modal title={`So sánh NCC — ${supModal} (cần ${need})`} onClose={()=>setSupModal(null)} wide>
        {cands.length===0&&<Note tone="warn"><span>Chưa gắn NCC nào cho SKU này. Vào tab NCC → “+ Gắn NCC vào SKU”.</span></Note>}
        {cands.length>0&&<table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>NCC</TH><TH r>Giá niêm yết</TH><TH r>Landed thực</TH><TH r>MOQ</TH><TH r>SL đặt</TH><TH r>Tổng tiền đơn</TH><TH r>Chôn vốn</TH><TH r>Lead</TH><TH r>Score</TH><TH>Action</TH></tr></thead><tbody>
          {cands.map(s2=>{const cur=sk?.mainSupplier===s2.sup;const isBest=s2.sup===best.sup;return (<tr key={s2.sup} style={{background:isBest?"#F0FDF4":"transparent"}}>
            <TD b><span style={{fontSize:10.5}}>{s2.sup}{cur?" ✓":""}</span>{isBest&&<Badge c="#065F46" bg="#D1FAE5"> Rẻ nhất</Badge>}</TD>
            <TD r>{fmtFull(s2.landed)}</TD><TD r b c="#EA580C">{fmtFull(s2.eff)}<div style={{fontSize:9,color:"#9CA3AF"}}>+{s2.defect}% lỗi</div></TD>
            <TD r>{s2.moq}</TD><TD r b>{s2.qty}</TD><TD r b c={isBest?"#059669":"#374151"}>{fmtFull(s2.total)}</TD>
            <TD r c={s2.over>0?"#DC2626":"#059669"}>{s2.over>0?fmtFull(s2.over):"—"}</TD>
            <TD r c={s2.slow?"#DC2626":"#374151"} b>{s2.lt}d{s2.slow&&" ⚠"}</TD><TD r b>{s2.score}</TD>
            <TD>{!cur&&can("supplier.edit")?<Btn onClick={()=>applyMainSupplier(s2)} color="#059669" small>Chọn Main</Btn>:cur?<span style={{fontSize:10,color:"#059669",fontWeight:600}}>Đang dùng</span>:null}</TD>
          </tr>);})}
        </tbody></table>}
        {sk&&sk.buyClass==="Switch Supplier"&&<Note tone="warn"><span>SKU này được phân loại <strong>Đổi NCC</strong>: NCC chính giao không kịp deadline, có backup nhanh hơn.</span></Note>}
        <div style={{fontSize:10,color:"#6B7280",marginTop:10}}>So theo <strong>tổng tiền đơn</strong> (MOQ + pack + tỷ lệ lỗi), không so đơn giá.</div>
      </Modal>);})()}

    {/* NCC master form */}
    {supMasterModal&&(<Modal title={supForm.oldName?`Sửa NCC — ${supForm.oldName}`:"Thêm NCC"} onClose={()=>setSupMasterModal(false)} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Tên NCC *"><Inp value={supForm.name} onChange={v=>setSupForm(p=>({...p,name:v}))}/></Field>
        <Field label="Trạng thái"><Sel value={supForm.status} onChange={v=>setSupForm(p=>({...p,status:v}))}><option>Main</option><option>Backup</option><option>Warning</option><option>Trial</option></Sel></Field>
        <Field label="Liên hệ"><Inp value={supForm.contact} onChange={v=>setSupForm(p=>({...p,contact:v}))}/></Field>
        <Field label="MOQ mặc định"><Inp value={supForm.moq} onChange={v=>setSupForm(p=>({...p,moq:v}))} type="number"/></Field>
        <Field label="Lead time"><Inp value={supForm.lt} onChange={v=>setSupForm(p=>({...p,lt:v}))} type="number"/></Field>
        <Field label="Tỷ lệ lỗi %"><Inp value={supForm.defect} onChange={v=>setSupForm(p=>({...p,defect:v}))} type="number"/></Field>
        <Field label="Đúng hẹn %"><Inp value={supForm.onTime} onChange={v=>setSupForm(p=>({...p,onTime:v}))} type="number"/></Field>
        <Field label="Quality score"><Inp value={supForm.quality} onChange={v=>setSupForm(p=>({...p,quality:v}))} type="number"/></Field>
        <Field label="Price score"><Inp value={supForm.price} onChange={v=>setSupForm(p=>({...p,price:v}))} type="number"/></Field>
        <Field label="% Cọc" hint="0.3 = 30%"><Inp value={supForm.depositPct} onChange={v=>setSupForm(p=>({...p,depositPct:v}))} type="number"/></Field>
        <Field label="Công nợ (ngày) — DPO"><Inp value={supForm.paymentTerms} onChange={v=>setSupForm(p=>({...p,paymentTerms:v}))} type="number"/></Field>
      </div>
      <Note tone="info"><span>Score tự tính: <strong>{supScore(supForm)}</strong></span></Note>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
        <Btn onClick={()=>setSupMasterModal(false)} color="#6B7280">Hủy</Btn>
        <Btn disabled={!supForm.name} onClick={()=>{
          const row={name:supForm.name,moq:num(supForm.moq),lt:num(supForm.lt),defect:num(supForm.defect),onTime:num(supForm.onTime),quality:num(supForm.quality),price:num(supForm.price),depositPct:Number(supForm.depositPct)||cfg.depositPct,paymentTerms:num(supForm.paymentTerms),status:supForm.status||"Main",contact:supForm.contact||""};
          setSuppliers(prev=>supForm.oldName?prev.map(x=>x.name===supForm.oldName?row:x):[row,...prev]);
          addLog("Supplier",row.name,supForm.oldName?"Sửa NCC":"Thêm NCC",`Score ${supScore(row)} · DPO ${row.paymentTerms}d`);
          setSupMasterModal(false);showToast("Đã lưu NCC");}} color="#059669">Lưu</Btn>
      </div>
    </Modal>)}

    {/* Gắn NCC vào SKU */}
    {skuSupModal&&(<Modal title="Gắn NCC vào SKU" onClose={()=>setSkuSupModal(null)} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="SKU *"><Sel value={skuSupForm.sku} onChange={v=>{const it=skuIndex[v];setSkuSupForm(p=>({...p,sku:v,landed:it?.landedCost||p.landed}));}}>{scope.map(s=><option key={s.sku} value={s.sku}>{s.sku} — {s.name.slice(0,24)}</option>)}</Sel></Field>
        <Field label="NCC *"><Sel value={skuSupForm.sup} onChange={v=>{const m=supMeta(v);setSkuSupForm(p=>({...p,sup:v,defect:m.defect??p.defect,onTime:m.onTime??p.onTime,lt:m.lt||p.lt,moq:m.moq||p.moq}));}}><option value="">Chọn...</option>{supplierNames.map(n=><option key={n}>{n}</option>)}</Sel></Field>
        <Field label="Role"><Sel value={skuSupForm.role} onChange={v=>setSkuSupForm(p=>({...p,role:v}))}><option>Main</option><option>Backup</option><option>Trial</option></Sel></Field>
        <Field label="Landed cost *"><Inp value={skuSupForm.landed} onChange={v=>setSkuSupForm(p=>({...p,landed:v}))} type="number"/></Field>
        <Field label="MOQ *"><Inp value={skuSupForm.moq} onChange={v=>setSkuSupForm(p=>({...p,moq:v}))} type="number"/></Field>
        <Field label="Pack size *"><Inp value={skuSupForm.pack} onChange={v=>setSkuSupForm(p=>({...p,pack:v}))} type="number"/></Field>
        <Field label="Lead time *"><Inp value={skuSupForm.lt} onChange={v=>setSkuSupForm(p=>({...p,lt:v}))} type="number"/></Field>
        <Field label="Tỷ lệ lỗi %"><Inp value={skuSupForm.defect} onChange={v=>setSkuSupForm(p=>({...p,defect:v}))} type="number"/></Field>
        <Field label="Đúng hẹn %"><Inp value={skuSupForm.onTime} onChange={v=>setSkuSupForm(p=>({...p,onTime:v}))} type="number"/></Field>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
        <Btn onClick={()=>setSkuSupModal(null)} color="#6B7280">Hủy</Btn>
        <Btn disabled={!skuSupForm.sku||!skuSupForm.sup||!skuSupForm.moq||!skuSupForm.lt} onClick={()=>{
          const f=skuSupForm;
          const errs=[vErr.posInt(f.moq,"MOQ"),vErr.posInt(f.lt,"Lead time"),vErr.nonNeg(f.landed,"Landed")].filter(Boolean);
          if(errs.length){showToast(errs[0],"bad");return;}
          const row={sku:f.sku,sup:f.sup,landed:num(f.landed),moq:num(f.moq),pack:num(f.pack)||1,lt:num(f.lt),defect:num(f.defect),onTime:num(f.onTime),quality:75,price:75,role:f.role||"Backup",currency:"CNY",qVer:1};
          setSupplierSku(prev=>{const ex=prev.find(x=>x.sku===row.sku&&x.sup===row.sup);
            if(ex){row.qVer=num(ex.landed)!==row.landed?(ex.qVer||1)+1:(ex.qVer||1);row.currency=ex.currency||"CNY";
              if(row.qVer!==(ex.qVer||1))addLog("Quotation",row.sku+"·"+row.sup,"Báo giá version mới v"+row.qVer,"",fmtFull(ex.landed),fmtFull(row.landed));
              return prev.map(x=>x.sku===row.sku&&x.sup===row.sup?row:x);}
            return [row,...prev];});
          if(row.role==="Main")applyMainSupplier(row);
          addLog("Supplier",row.sku,`Gắn ${row.role} · ${row.sup}`,`MOQ ${row.moq} · LT ${row.lt}d`);
          setSkuSupModal(null);showToast("Đã gắn NCC");}} color="#059669">Lưu</Btn>
      </div>
    </Modal>)}

    {/* Tạo PO đơn lẻ — nguồn dữ liệu: ApprovalSnapshot, KHÔNG lấy realtime (P0.2), budgetMonth từ snapshot (P0.7) */}
    {createPoSku&&(()=>{const {row:s,pr,sn}=createPoSku;
      if(!sn)return (<Modal title="Thiếu snapshot" onClose={()=>setCreatePoSku(null)}><Note tone="bad"><span>PR chưa có Approval Snapshot — cần CEO duyệt lại.</span></Note></Modal>);
      const m=supMeta(sn.supplierName);const dep=Math.round(sn.approvedCapital*(Number(m.depositPct)||cfg.depositPct));
      /* Stale check: dữ liệu đổi lớn sau phê duyệt (spec P0.2) */
      const stale=[];
      const qNow=supplierSku.find(x=>x.sku===sn.sku&&x.sup===sn.supplierName);
      if(s.mainSupplier&&s.mainSupplier!==sn.supplierName)stale.push(`NCC đổi: ${sn.supplierName} → ${s.mainSupplier}`);
      if(qNow&&sn.quotationVersion!==null&&qNow.qVer!==sn.quotationVersion)stale.push(`Báo giá đổi version v${sn.quotationVersion} → v${qNow.qVer} (${fmtFull(sn.quotedUnitCost)} → ${fmtFull(qNow.landed)})`);
      else if(qNow&&Math.abs(num(qNow.landed)-sn.quotedUnitCost)/Math.max(1,sn.quotedUnitCost)>0.05)stale.push(`Giá NCC đổi ${fmtFull(sn.quotedUnitCost)} → ${fmtFull(qNow.landed)} (>5%)`);
      if(s.moq!==sn.moq)stale.push(`MOQ đổi ${sn.moq} → ${s.moq}`);
      const doCreate=()=>{const po=makePO(sn.supplierName,[{sku:sn.sku,name:sn.productName,qty:sn.approvedQty,landed:sn.quotedUnitCost,lt:sn.leadTime}],pr.createdBy);
        po.budgetMonth=sn.budgetMonth;   /* inherit từ snapshot — KHÔNG lấy UI filter (P0.7) */
        po.sourcePR=pr.id;po.snapshotId=sn.id;po.originalEta=po.eta;po.revisedEta=null;po.lastConfirmAt=todayStr();
        const errs=validatePO(po,poList);if(errs.length){showToast(errs[0],"bad");return;}
        setPoList(x=>[po,...x]);updatePR(pr.id,pr.version,{status:"PO_CREATED",poId:po.id});
        addLog("PO",po.id,"Tạo PO từ snapshot",`${pr.id} · ${sn.id} · ${sn.approvedQty} SP · NS ${sn.budgetMonth}`);
        setCreatePoSku(null);showToast(`Đã tạo ${po.id} (Draft) — NS ${sn.budgetMonth}`);};
      return (<Modal title={`Tạo PO — ${sn.sku} (từ ${pr.id})`} onClose={()=>setCreatePoSku(null)}>
        <div style={{fontSize:12,lineHeight:1.9,background:"#F0FDF4",padding:12,borderRadius:8,margin:"10px 0",border:"1px solid #BBF7D0"}}>
          <div><Badge c="#065F46" bg="#D1FAE5">🔒 SNAPSHOT {sn.id}</Badge> · duyệt {String(sn.approvedAt).slice(0,10)} bởi {sn.approvedBy}</div>
          <div><strong>SL đã duyệt:</strong> {sn.approvedQty.toLocaleString()} · <strong>Đơn giá:</strong> {fmtFull(sn.quotedUnitCost)} · <strong>Vốn:</strong> {fmtFull(sn.approvedCapital)}</div>
          <div><strong>NCC:</strong> {sn.supplierName} · <strong>Tháng NS:</strong> {sn.budgetMonth} (từ snapshot, không theo bộ lọc UI)</div>
          <div><strong>Cọc:</strong> {fmtFull(dep)} · <strong>Final:</strong> {fmtFull(sn.approvedCapital-dep)}</div>
        </div>
        {stale.length>0&&(<><Note tone="bad"><span><strong>Dữ liệu đã thay đổi sau phê duyệt:</strong> {stale.join(" · ")}</span></Note>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:10,flexWrap:"wrap"}}>
            <Btn onClick={()=>setCreatePoSku(null)} color="#6B7280">Hủy</Btn>
            <Btn onClick={()=>{updatePR(pr.id,pr.version,{status:"SUBMITTED_TO_CEO"});setSnapshots(x=>x.map(z=>z.id===sn.id?{...z,superseded:true}:z));addLog("PurchaseRequest",pr.id,"Trả lại CEO duyệt (stale)","",  "CEO_APPROVED","SUBMITTED_TO_CEO",stale.join("; "));setCreatePoSku(null);showToast("Đã trả lại hàng đợi CEO","warn");}} color="#EA580C">Quay lại CEO duyệt</Btn>
            {can("proposal.approveCEO")&&<Btn onClick={()=>askConfirm({title:"CEO Override — snapshot mới",msg:"Tạo snapshot v"+(sn.version+1)+" theo dữ liệu hiện tại (snapshot cũ giữ nguyên, đánh dấu superseded)?",danger:true,requireReason:true,onOk:reason=>{
              const sn2={...sn,id:`SN-${Date.now().toString().slice(-7)}`,approvedAt:new Date().toISOString(),approvedBy:role,approvedQty:s.actOQ,supplierName:s.mainSupplier||sn.supplierName,quotedUnitCost:s.landedCost,approvedCapital:s.actOQ*s.landedCost,moq:s.moq,version:sn.version+1,superseded:false,reason};
              setSnapshots(x=>[sn2,...x.map(z=>z.id===sn.id?{...z,superseded:true}:z)]);
              updatePR(pr.id,pr.version,{snapshotId:sn2.id});
              addLog("ApprovalSnapshot",sn2.id,"CEO OVERRIDE — version "+sn2.version,`${sn.id} → ${sn2.id}`,fmtFull(sn.approvedCapital),fmtFull(sn2.approvedCapital),reason);
              setCreatePoSku(null);showToast("Snapshot mới "+sn2.id+" — mở lại Tạo PO","warn");}})} color="#B45309">CEO Override</Btn>}
          </div></>)}
        {stale.length===0&&(<div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn onClick={()=>setCreatePoSku(null)} color="#6B7280">Hủy</Btn>
          <Btn onClick={doCreate} color="#059669">Tạo PO theo snapshot</Btn>
        </div>)}
      </Modal>);})()}

    {/* Tạo PO gộp — dữ liệu từ snapshots, budgetMonth chung (P0.7) */}
    {mergePoModal&&(()=>{const {sup,month,arr}=mergePoModal;const val=arr.reduce((a,x)=>a+x.sn.approvedCapital,0);
      return (<Modal title={`Tạo PO gộp — ${sup} · NS ${month}`} onClose={()=>setMergePoModal(null)} wide>
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>PR</TH><TH>SKU</TH><TH r>SL duyệt</TH><TH r>Đơn giá</TH><TH r>Thành tiền</TH></tr></thead><tbody>
          {arr.map(x=><tr key={x.pr.id}><TD m>{x.pr.id}</TD><TD m b>{x.sn.sku}</TD><TD r>{x.sn.approvedQty}</TD><TD r>{fmtFull(x.sn.quotedUnitCost)}</TD><TD r b>{fmtFull(x.sn.approvedCapital)}</TD></tr>)}
          <tr style={{background:"#F8FAFC"}}><TD b>TỔNG</TD><TD/><TD r b>{arr.reduce((a,x)=>a+x.sn.approvedQty,0)}</TD><TD/><TD r b c="#1D4ED8">{fmtFull(val)}</TD></tr>
        </tbody></table>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
          <Btn onClick={()=>setMergePoModal(null)} color="#6B7280">Hủy</Btn>
          <Btn onClick={()=>{const po=makePO(sup,arr.map(x=>({sku:x.sn.sku,name:x.sn.productName,qty:x.sn.approvedQty,landed:x.sn.quotedUnitCost,lt:x.sn.leadTime})),role);
            po.budgetMonth=month;po.sourcePR=arr.map(x=>x.pr.id).join(",");po.originalEta=po.eta;po.revisedEta=null;po.lastConfirmAt=todayStr();
            const errs=validatePO(po,poList);if(errs.length){showToast(errs[0],"bad");return;}
            setPoList(x=>[po,...x]);arr.forEach(x=>updatePR(x.pr.id,x.pr.version,{status:"PO_CREATED",poId:po.id}));
            addLog("PO",po.id,"Tạo PO gộp từ snapshots",`${sup} · ${arr.length} PR · ${fmtFull(poValue(po))} · NS ${month}`);
            setMergePoModal(null);setTab("po");showToast(`Đã tạo ${po.id}`);}} color="#059669">Tạo PO gộp</Btn>
        </div>
      </Modal>);})()}

    {/* P1.5: GR 2 pha — Warehouse nhập SỐ NHẬN (vào khu QC), QC nhập ĐẠT/LỖI. Purchasing không đụng được cả hai. */}
    {rcvModal&&(()=>{const p=rcvModal.po;const items=p.items||[];
      const phase=p.pendingGR?"qc":"receive";
      const isWH=can("po.goodsReceipt"),isQC=can("po.qc");
      const gf=(sku,k)=>rcvForm[sku]?.[k]??"";
      const setF=(sku,k,v)=>setRcvForm(f=>({...f,[sku]:{...(f[sku]||{}),[k]:v}}));
      const rows=items.map(i2=>{const rec=phase==="qc"?num(p.pendingGR[i2.sku]):Number(gf(i2.sku,"rec"));
        const acc=Number(gf(i2.sku,"acc")),rej=Number(gf(i2.sku,"rej"));
        return {i:i2,rec,acc,rej,badR:isNaN(rec)||rec<0,badQ:phase==="qc"&&(isNaN(acc)||isNaN(rej)||acc<0||rej<0||acc+rej!==rec)};});
      const anyBad=rows.some(r=>phase==="receive"?r.badR:r.badQ);
      const anyOver=rows.some(r=>r.rec>r.i.qty);
      const allMatch=rows.every(r=>r.rec===r.i.qty&&(phase!=="qc"||r.rej===0));
      return (<Modal title={phase==="receive"?`Goods Receipt (Warehouse) — ${p.id}`:`QC kiểm hàng — ${p.id}`} onClose={()=>setRcvModal(null)} wide>
        {phase==="receive"&&!isWH&&<Note tone="bad"><span><strong>Chỉ Warehouse (hoặc CEO) được nhận hàng.</strong> Vai trò hiện tại: {role}.</span></Note>}
        {phase==="qc"&&!isQC&&<Note tone="bad"><span><strong>Chỉ QC (hoặc CEO) được kết luận đạt/lỗi.</strong> Purchasing không tự QC được — vai trò hiện tại: {role}.</span></Note>}
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>SKU</TH><TH r>Đặt</TH><TH>Thực nhận</TH>{phase==="qc"&&<><TH>QC đạt</TH><TH>QC lỗi</TH></>}<TH r>Thiếu</TH></tr></thead><tbody>
          {rows.map(({i:i2,rec,badR,badQ})=>(<tr key={i2.sku} style={{background:(badR||badQ)?"#FEF2F2":"transparent"}}>
            <TD m b c="#1D4ED8">{i2.sku}</TD><TD r b>{i2.qty.toLocaleString()}</TD>
            <TD>{phase==="receive"?<input value={gf(i2.sku,"rec")} onChange={e=>setF(i2.sku,"rec",e.target.value)} type="number" disabled={!isWH} style={{width:100,padding:"5px 8px",borderRadius:6,border:"1px solid #D1D5DB",fontSize:12}}/>:<strong>{rec}</strong>}</TD>
            {phase==="qc"&&<>{["acc","rej"].map(k=><TD key={k}><input value={gf(i2.sku,k)} onChange={e=>setF(i2.sku,k,e.target.value)} type="number" disabled={!isQC} style={{width:90,padding:"5px 8px",borderRadius:6,border:"1px solid #D1D5DB",fontSize:12}}/></TD>)}</>}
            <TD r b c={rec<i2.qty?"#DC2626":"#059669"}>{isNaN(rec)?"—":i2.qty-rec}</TD>
          </tr>))}
        </tbody></table>
        {phase==="qc"&&anyBad&&<Note tone="bad"><span>Đạt + lỗi phải bằng đúng số đã nhận, không âm.</span></Note>}
        {phase==="receive"&&anyOver&&<Field label="Lý do nhận vượt số đặt *"><Inp value={rcvReason} onChange={setRcvReason}/></Field>}
        <Note tone="info"><span>{phase==="receive"?"Bước 1/2: hàng vào khu QC (On Hand + nhận · QC Hold + nhận). ATP CHƯA tăng cho tới khi QC đạt.":"Bước 2/2: QC đạt → ATP + đạt · QC lỗi → Quarantine. PO khớp đủ và không lỗi → chờ đối soát POS; lệch → mismatch."}</span></Note>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
          <Btn onClick={()=>setRcvModal(null)} color="#6B7280">Hủy</Btn>
          {phase==="receive"&&<Btn disabled={!isWH||anyBad||rows.some(r=>gf(r.i.sku,"rec")==="")||(anyOver&&!rcvReason)} onClick={()=>{
            if(!can("po.goodsReceipt")){showToast("Không có quyền nhận hàng","bad");return;}
            const grId=`GR-${Date.now().toString().slice(-6)}`;
            setReceipts(x=>[{id:grId,poId:p.id,receivedAt:todayStr(),receivedBy:role,status:"Awaiting QC",lines:rows.map(({i:i2,rec})=>({sku:i2.sku,orderedQty:i2.qty,receivedQty:rec}))},...x]);
            setLedger(x=>[...rows.filter(r=>r.rec>0).map(({i:i2,rec})=>({id:`IT-${Date.now()}-${i2.sku}`,sku:i2.sku,type:"GR_RECEIVED",qty:rec,referenceType:"GoodsReceipt",referenceId:grId,createdAt:todayStr(),createdBy:role})),...x]);
            setPo(rcvModal.idx,po=>({...po,pendingGR:Object.fromEntries(rows.map(r=>[r.i.sku,r.rec])),grId}));
            addLog("GoodsReceipt",grId,"Warehouse nhận hàng → chờ QC",rows.map(r=>`${r.i.sku}:${r.rec}/${r.i.qty}`).join(" · "),"","Awaiting QC",anyOver?rcvReason:"");
            setRcvModal(null);showToast("Đã nhận — hàng nằm khu QC, chờ QC kiểm");}} color="#0891B2">Ghi nhận số nhận</Btn>}
          {phase==="qc"&&<Btn disabled={!isQC||anyBad||rows.some(r=>gf(r.i.sku,"acc")===""||gf(r.i.sku,"rej")==="")} onClick={()=>{
            if(!can("po.qc")){showToast("Không có quyền QC","bad");return;}
            setLedger(x=>[...rows.flatMap(({i:i2,acc,rej})=>[
              ...(acc>0?[{id:`IT-${Date.now()}-qa-${i2.sku}`,sku:i2.sku,type:"QC_ACCEPT",qty:acc,referenceType:"GoodsReceipt",referenceId:p.grId,createdAt:todayStr(),createdBy:role}]:[]),
              ...(rej>0?[{id:`IT-${Date.now()}-qr-${i2.sku}`,sku:i2.sku,type:"QC_REJECT",qty:rej,referenceType:"GoodsReceipt",referenceId:p.grId,createdAt:todayStr(),createdBy:role}]:[])]),...x]);
            setReceipts(x=>x.map(g=>g.id===p.grId?{...g,status:"Confirmed",lines:g.lines.map(l=>{const r=rows.find(z=>z.i.sku===l.sku);return {...l,acceptedQty:r.acc,rejectedQty:r.rej};})}:g));
            const st=allMatch?"Waiting POS Import":"PO Mismatch";
            setPo(rcvModal.idx,po=>({...po,items:po.items.map(i2=>{const r=rows.find(z=>z.i.sku===i2.sku);return {...i2,posRcv:r.rec,acceptedQty:r.acc,rejectedQty:r.rej};}),status:st,actual:todayStr(),pendingGR:undefined}));
            addLog("GoodsReceipt",p.grId||p.id,"QC kết luận",rows.map(r=>`${r.i.sku}: đạt ${r.acc}, lỗi ${r.rej}`).join(" · "),"Awaiting QC",st);
            setRcvModal(null);showToast(allMatch?"QC xong — ATP đã cập nhật":"QC xong — có lệch/lỗi, PO sang mismatch",allMatch?"ok":"warn");}} color="#059669">Kết luận QC</Btn>}
        </div>
      </Modal>);})()}

    {/* P2.2: 3 Scenario mỗi SKU */}
    {scenModal&&(()=>{const s=scenModal;const ag=aggregatePlan(s.sku,salesPlans,campaigns);
      const tiers=[
        {k:"BASE",fds:ag.anyApproved&&ag.base>0?ag.base/30:(s.fds-(s.bomFds||0)),note:"Run-rate / plan nền"},
        {k:"CAMPAIGN",fds:ag.anyApproved?ag.committed/30:s.fds,note:"Base + campaign đã xác nhận (Purchasing mặc định)"},
        {k:"STRETCH",fds:ag.anyApproved?ag.stretch/30:s.fds,note:"Campaign + tăng trưởng kỳ vọng (chỉ CEO chọn)"},
      ].map(t=>{const fds=Math.round(t.fds*100)/100;
        const need=Math.max(0,Math.round(fds*(s.horizon||60))-s.availableStock-s.incomingBefore);
        const qty=need>0?Math.ceil(Math.max(need,s.moq||0)/(s.packSize||1))*(s.packSize||1):0;
        const cap=qty*s.landedCost;
        const cover=fds>0?Math.round((s.availableStock+s.incomingBefore+qty)/fds):9999;
        const daysLeft=fds>0?Math.floor(s.availableStock/fds):9999;
        return {...t,fds,demand:Math.round(fds*30),qty,cap,cover,
          soRisk:daysLeft<(s.leadTime||30),exRisk:cover>(s.horizon||60)*1.4};});
      return (<Modal title={`Scenario — ${s.sku}`} onClose={()=>setScenModal(null)} wide>
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>Scenario</TH><TH r>Demand/30d</TH><TH r>Bán/ngày</TH><TH r>Qty mua</TH><TH r>Vốn</TH><TH r>Cover sau mua</TH><TH>Stockout risk</TH><TH>Excess risk</TH></tr></thead><tbody>
          {tiers.map(t=>(<tr key={t.k} style={{background:t.k==="CAMPAIGN"?"#F0FDF4":buyTier[s.sku]==="STRETCH"&&t.k==="STRETCH"?"#FFF7ED":"transparent"}}>
            <TD b>{t.k}{t.k==="CAMPAIGN"&&" ★"}<div style={{fontSize:8.5,color:"#9CA3AF",fontWeight:400}}>{t.note}</div></TD>
            <TD r b>{t.demand.toLocaleString()}</TD><TD r>{t.fds}</TD>
            <TD r b c="#1D4ED8">{t.qty.toLocaleString()}</TD><TD r b>{fmtFull(t.cap)}</TD>
            <TD r b c={t.exRisk?"#DC2626":"#374151"}>{t.cover>9000?"∞":t.cover+"d"}</TD>
            <TD>{t.soRisk?<Badge c="#fff" bg="#DC2626">Cao</Badge>:<Badge c="#065F46" bg="#D1FAE5">Thấp</Badge>}</TD>
            <TD>{t.exRisk?<Badge c="#9A3412" bg="#FFEDD5">Overstock</Badge>:<Badge c="#065F46" bg="#D1FAE5">OK</Badge>}</TD>
          </tr>))}
        </tbody></table>
        {ag.anyApproved&&ag.stretch>ag.committed&&can("proposal.approveCEO")&&(
          <label style={{fontSize:11,display:"flex",gap:6,alignItems:"center",marginTop:10,color:"#B45309"}}>
            <input type="checkbox" checked={buyTier[s.sku]==="STRETCH"} onChange={e=>setBuyTier(t=>({...t,[s.sku]:e.target.checked?"STRETCH":undefined}))}/>
            Buy for Stretch — engine sẽ tính mua theo scenario STRETCH cho SKU này
          </label>)}
        {!ag.anyApproved&&<Note tone="info"><span>SKU chưa có Sales Plan/Campaign đã duyệt — 3 scenario trùng nhau theo run-rate thực tế.</span></Note>}
      </Modal>);})()}

    {/* P2.6: Suggestion giải thích được */}
    {whyModal&&(()=>{const s=whyModal;const evs=poEventsBySku.m[s.sku]||[];
      const pr=activePRof(s.sku);const covered=pr||s.incomingBefore>=Math.max(1,s.target-s.availableStock);
      return (<Modal title={`Vì sao ${vn(s.buyClass)}? — ${s.sku}`} onClose={()=>setWhyModal(null)} wide>
        <div style={{fontSize:12,lineHeight:2,background:"#F8FAFC",padding:14,borderRadius:8}}>
          <div><strong>1 · Vì sao cần mua:</strong> {s.reason||"—"}. Còn bán <strong>{s.daysLeft>9000?"∞":s.daysLeft+" ngày"}</strong>, lead time <strong>{s.leadTime||"?"}d</strong> → deadline đặt hàng <strong>{s.deadline<=0?`TRỄ ${-s.deadline}d`:s.deadline+"d nữa"}</strong>.</div>
          <div><strong>2 · Qty đề xuất:</strong> target {s.target.toLocaleString()} (cover {s.horizon}d) − tồn ATP {s.availableStock.toLocaleString()} − hàng về kịp {s.incomingBefore.toLocaleString()} = cần {s.sysBuy.toLocaleString()} → làm tròn MOQ {s.moq}/pack {s.packSize} = <strong>{s.sysOQ.toLocaleString()}</strong>{s.actOQ!==s.sysOQ?` (đã chỉnh: ${s.actOQ.toLocaleString()})`:""}.</div>
          <div><strong>3 · Capital:</strong> {s.actOQ.toLocaleString()} × {fmtFull(s.landedCost)} = <strong>{fmtFull(s.capital)}</strong>.</div>
          <div><strong>4 · PO đã được tính:</strong> {evs.length===0?"không có PO đang về":evs.map(e=>`${e.id} (+${e.qty.toLocaleString()}, ngày +${e.day}${e.riskAdj?` — đã cộng trễ dự kiến, gốc +${e.rawDay}`:""})`).join(" · ")}{s.incomingUnknown>0?` · ⚠ ${s.incomingUnknown.toLocaleString()} SP ETA UNKNOWN không được tính`:""}.</div>
          <div><strong>5 · Risk nếu không mua:</strong> {s.fds>0&&s.daysLeft<(s.leadTime||30)?`đứt hàng ~${Math.max(0,(s.leadTime||30)-s.daysLeft)} ngày, mất ~${fmtFull(Math.round(s.fds*Math.max(0,(s.leadTime||30)-s.daysLeft)*(s.sellPrice||0)))} doanh thu`:"thấp trong chu kỳ này"}.</div>
          <div><strong>6 · Chống trùng:</strong> {pr?`⛔ Đã có ${pr.id} (${vn(pr.status)}) — không tạo PR mới cho nhu cầu này.`:covered?"Nhu cầu đã được cover bởi PO đang về kịp.":"Chưa có PR/PO nào cover — được phép tạo PR."}</div>
        </div>
        <Note tone="info"><span>Hệ thống chỉ ĐỀ XUẤT — không tự tạo PO. Mọi bước mua đều qua PR → Leader → CEO.</span></Note>
      </Modal>);})()}

    {/* Lịch sử mua theo SKU (spec XIII): mọi PR + PO, không giới hạn số vòng */}
    {histModal&&(()=>{const sku=histModal;const prs=prHistory(sku);const pos2=poList.filter(p=>(p.items||[]).some(i=>i.sku===sku));
      return (<Modal title={`Lịch sử mua — ${sku}`} onClose={()=>setHistModal(null)} wide>
        <Panel title={`Purchase Requests — ${prs.length}`}>
          <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>PR</TH><TH>Tạo</TH><TH r>SL yêu cầu</TH><TH r>SL chỉnh</TH><TH>NS</TH><TH>Snapshot</TH><TH>PO</TH><TH>Trạng thái</TH></tr></thead><tbody>
            {prs.length===0&&<tr><TD>Chưa có PR nào.</TD></tr>}
            {prs.map(p=>(<tr key={p.id}><TD m b>{p.id}</TD><TD>{p.createdAt}</TD><TD r>{p.requestedQty??"—"}</TD><TD r>{p.adjustedQty??"—"}</TD><TD>{p.budgetMonth}</TD><TD m>{p.snapshotId||"—"}</TD><TD m>{p.poId||"—"}</TD><TD><SB v={p.status} m={PR_C}/></TD></tr>))}
          </tbody></table>
        </Panel>
        <div style={{height:10}}/>
        <Panel title={`Purchase Orders — ${pos2.length}`}>
          <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>PO</TH><TH>Nguồn PR</TH><TH r>SL</TH><TH r>Nhận</TH><TH>ETA</TH><TH>NS</TH><TH>Trạng thái</TH></tr></thead><tbody>
            {pos2.length===0&&<tr><TD>Chưa có PO nào.</TD></tr>}
            {pos2.map(p=>{const it=(p.items||[]).find(i=>i.sku===sku);return (<tr key={p.id}><TD m b>{p.id}</TD><TD m>{p.sourcePR||"—"}</TD><TD r>{it?.qty}</TD><TD r>{it?.posRcv||"—"}</TD><TD>{p.revisedEta||p.originalEta||p.eta}</TD><TD>{p.budgetMonth}</TD><TD><SB v={p.status} m={PO_C}/></TD></tr>);})}
          </tbody></table>
        </Panel>
      </Modal>);})()}

    {/* Xử lý mismatch đầy đủ (spec §16) */}
    {mmModal&&(()=>{const p=mmModal.po;const items=p.items||[];
      const f=mmForm;
      return (<Modal title={`Xử lý lệch nhận hàng — ${p.id}`} onClose={()=>setMmModal(null)} wide>
        <table style={{width:"100%",borderCollapse:"collapse",marginBottom:12}}><thead><tr><TH>SKU</TH><TH r>Đặt</TH><TH r>Nhận</TH><TH r>Thiếu/Thừa</TH><TH>Chấp nhận</TH><TH>Từ chối (lỗi)</TH></tr></thead><tbody>
          {items.map(i=>{const d=num(i.posRcv)-num(i.qty);return (<tr key={i.sku}>
            <TD m b c="#1D4ED8">{i.sku}</TD><TD r>{i.qty}</TD><TD r b c={d!==0?"#DC2626":"#059669"}>{i.posRcv}</TD>
            <TD r b c={d<0?"#DC2626":d>0?"#D97706":"#059669"}>{d===0?"✓":(d>0?"+":"")+d}</TD>
            <TD><input value={f.accepted?.[i.sku]??""} onChange={e=>setMmForm(x=>({...x,accepted:{...x.accepted,[i.sku]:e.target.value}}))} type="number" style={{width:90,padding:"4px 6px",borderRadius:6,border:"1px solid #D1D5DB",fontSize:11}}/></TD>
            <TD><input value={f.rejected?.[i.sku]??""} onChange={e=>setMmForm(x=>({...x,rejected:{...x.rejected,[i.sku]:e.target.value}}))} type="number" style={{width:90,padding:"4px 6px",borderRadius:6,border:"1px solid #D1D5DB",fontSize:11}}/></TD>
          </tr>);})}
        </tbody></table>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Phương án xử lý *"><Sel value={f.option} onChange={v=>setMmForm(x=>({...x,option:v}))}><option value="">Chọn...</option>{MM_OPTIONS.map(o=><option key={o}>{o}</option>)}</Sel></Field>
          <Field label="Người chịu trách nhiệm"><Inp value={f.owner} onChange={v=>setMmForm(x=>({...x,owner:v}))}/></Field>
          <Field label="Lý do lệch *"><Inp value={f.reason} onChange={v=>setMmForm(x=>({...x,reason:v}))} placeholder="VD: NCC giao thiếu 60 do hết nguyên liệu"/></Field>
          <Field label="Hạn xử lý"><Inp value={f.deadline} onChange={v=>setMmForm(x=>({...x,deadline:v}))} type="date"/></Field>
          <Field label="Số tiền claim NCC (₫)"><Inp value={f.claim} onChange={v=>setMmForm(x=>({...x,claim:v}))} type="number"/></Field>
          <Field label="ETA hàng bù (nếu có)"><Inp value={f.replEta} onChange={v=>setMmForm(x=>({...x,replEta:v}))} type="date"/></Field>
        </div>
        <Field label="Ghi chú"><Inp value={f.note} onChange={v=>setMmForm(x=>({...x,note:v}))}/></Field>
        <div style={{display:"flex",gap:8,justifyContent:"space-between",alignItems:"center",marginTop:8}}>
          <label style={{fontSize:12,display:"flex",gap:6,alignItems:"center"}}><input type="checkbox" checked={!!f.resolved} onChange={e=>setMmForm(x=>({...x,resolved:e.target.checked}))}/> Đánh dấu <strong>Đã xử lý xong</strong> (cho phép đóng PO)</label>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={()=>setMmModal(null)} color="#6B7280">Hủy</Btn>
            <Btn disabled={!f.option||!f.reason} onClick={()=>{
              setPo(mmModal.idx,po=>({...po,mismatch:{...f,claim:num(f.claim),resolvedAt:f.resolved?todayStr():null}}));
              addLog("PO",p.id,"Xử lý mismatch",`${f.option}${f.resolved?" · ĐÃ XONG":" · đang xử lý"}`,"",f.option,f.reason);
              setMmModal(null);showToast(f.resolved?"Mismatch đã xử lý — có thể đóng PO":"Đã lưu phương án xử lý");}} color="#059669">Lưu</Btn>
          </div>
        </div>
      </Modal>);})()}

    {/* Chuyển trạng thái PO */}
    {poStModal&&(()=>{const p=poStModal.po;
      const closeBlocked=st=>st==="Closed"&&!poMatched(p)&&!(p.mismatch&&p.mismatch.resolved);
      const posNeed=st=>st==="POS Synced"&&!poReceived(p)&&p.status!=="PO Mismatch";
      return (<Modal title={`Cập nhật PO — ${p.id}`} onClose={()=>setPoStModal(null)}>
      <div style={{fontSize:12,marginBottom:14}}><strong>Hiện tại:</strong> <SB v={p.status} m={PO_C}/>{p.mismatch&&<span style={{marginLeft:8,fontSize:10,color:p.mismatch.resolved?"#059669":"#DC2626"}}>Mismatch: {p.mismatch.option}{p.mismatch.resolved?" ✓":" (chưa xong)"}</span>}</div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {(PO_NEXT[p.status]||[]).map(st=>{const qcGate=["QC Passed"].includes(st)&&!can("po.qc");
          const dis=closeBlocked(st)||posNeed(st)||qcGate;
          return (<button key={st} disabled={dis} onClick={()=>{
            const doIt=()=>{setPo(poStModal.idx,po=>({...po,status:st,actual:st==="Arrived Warehouse"?todayStr():po.actual}));addLog("PO",p.id,"Chuyển trạng thái","",p.status,st);setPoStModal(null);showToast(`${p.id} → ${vn(st)}`);};
            if(st==="Cancelled")askConfirm({title:"Huỷ PO",msg:`Huỷ ${p.id}? Incoming của các SKU liên quan sẽ mất.`,danger:true,requireReason:true,onOk:reason=>{setPo(poStModal.idx,po=>({...po,status:"Cancelled"}));addLog("PO",p.id,"HUỶ PO","",p.status,"Cancelled",reason);setPoStModal(null);showToast(`${p.id} đã huỷ`,"warn");}});
            else doIt();}}
            style={{padding:"9px 12px",borderRadius:8,border:"1px solid #E5E7EB",background:dis?"#F3F4F6":"#fff",cursor:dis?"not-allowed":"pointer",textAlign:"left",fontSize:12,display:"flex",gap:8,alignItems:"center",opacity:dis?0.5:1}}>
            <SB v={st} m={PO_C}/>{closeBlocked(st)&&<span style={{fontSize:10,color:"#DC2626"}}>Chưa nhận đủ / mismatch chưa xử lý ({poRcv(p)}/{poQty(p)})</span>}{["QC Passed"].includes(st)&&!can("po.qc")&&<span style={{fontSize:10,color:"#DC2626"}}>Chỉ QC được xác nhận QC Passed</span>}{posNeed(st)&&<span style={{fontSize:10,color:"#DC2626"}}>Chưa nhập số nhận</span>}
          </button>);})}
        {p.status==="Ordered Supplier"&&<div style={{fontSize:10.5,color:"#6B7280",padding:"4px 2px"}}>→ Sang <strong>Đã cọc</strong>: Kế toán xác nhận trả cọc ở tab PO (không chuyển tay được).</div>}
        {can("po.finalOverride")&&(<div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #E5E7EB"}}>
          <div style={{fontSize:10,color:"#6B7280",marginBottom:6}}>CEO/Leader override trạng thái (bắt buộc lý do):</div>
          <Inp value={poStReason} onChange={setPoStReason} placeholder="Lý do..."/>
          <div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>
            {Object.keys(PO_C).filter(st=>st!==p.status&&!(PO_NEXT[p.status]||[]).includes(st)).map(st=>(
              <Btn key={st} disabled={!poStReason||closeBlocked(st)} onClick={()=>{setPo(poStModal.idx,po=>({...po,status:st}));addLog("PO",p.id,"OVERRIDE trạng thái","",p.status,st,poStReason);setPoStModal(null);showToast(`Override → ${vn(st)}`,"warn");}} color="#6B7280" small>{vn(st)}</Btn>))}
          </div></div>)}
      </div>
    </Modal>);})()}

    {/* Cấu hình — ngân sách theo brand (spec §5,23) */}
    {cfgModal&&(<Modal title="Cấu hình — ngân sách, tài chính, ngưỡng" onClose={()=>setCfgModal(false)} wide>
      <div style={{fontSize:11,fontWeight:700,color:"#6B7280",marginBottom:8,textTransform:"uppercase"}}>Ngân sách mua hàng — THÁNG {budgetMonth} (mỗi tháng nhập riêng, unique tháng × brand)</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        {BRANDS.map(b=>(<Field key={b} label={`${b} · ${budgetMonth} (₫)`}><Inp value={cfgForm._monthBudgets?.[b]??budgetOf(budgetMonth,b)??""} onChange={v=>setCfgForm(p=>({...p,_monthBudgets:{...(p._monthBudgets||{}),[b]:v}}))} type="number"/></Field>))}
      </div>
      <div style={{fontSize:10,color:"#9CA3AF",marginBottom:8}}>Đổi tháng ở month picker (tab CEO Duyệt / Cashflow) rồi mở lại Cấu hình để nhập ngân sách tháng khác.</div>
      <div style={{fontSize:11,fontWeight:700,color:"#6B7280",margin:"8px 0",textTransform:"uppercase"}}>Tài chính</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Số dư tiền mặt (₫)" hint="Tham chiếu ở tab Cashflow"><Inp value={cfgForm.cashBalance} onChange={v=>setCfgForm(p=>({...p,cashBalance:v}))} type="number"/></Field>
        <Field label="DSO — ngày thu tiền"><Inp value={cfgForm.dso} onChange={v=>setCfgForm(p=>({...p,dso:v}))} type="number"/></Field>
        <Field label="Phí sàn — NEVOR" hint="0.32 = 32%"><Inp value={cfgForm.feeRate?.NEVOR} onChange={v=>setCfgForm(p=>({...p,feeRate:{...p.feeRate,NEVOR:v}}))} type="number"/></Field>
        <Field label="Phí sàn — UHERO"><Inp value={cfgForm.feeRate?.UHERO} onChange={v=>setCfgForm(p=>({...p,feeRate:{...p.feeRate,UHERO:v}}))} type="number"/></Field>
        <Field label="Phí sàn — MONA MASK"><Inp value={cfgForm.feeRate?.["MONA MASK"]} onChange={v=>setCfgForm(p=>({...p,feeRate:{...p.feeRate,"MONA MASK":v}}))} type="number"/></Field>
      </div>
      <div style={{fontSize:11,fontWeight:700,color:"#6B7280",margin:"8px 0",textTransform:"uppercase"}}>Ngưỡng</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Ngưỡng Thừa hàng (ngày cover)"><Inp value={cfgForm.excessDays} onChange={v=>setCfgForm(p=>({...p,excessDays:v}))} type="number"/></Field>
        <Field label="Ngưỡng Xả tồn (ngày cover)"><Inp value={cfgForm.liqDays} onChange={v=>setCfgForm(p=>({...p,liqDays:v}))} type="number"/></Field>
        <Field label="Target cover mặc định"><Inp value={cfgForm.targetCoverDefault} onChange={v=>setCfgForm(p=>({...p,targetCoverDefault:v}))} type="number"/></Field>
        <Field label="Safety stock tối thiểu"><Inp value={cfgForm.minSafetyDays} onChange={v=>setCfgForm(p=>({...p,minSafetyDays:v}))} type="number"/></Field>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
        <Btn onClick={()=>setCfgModal(false)} color="#6B7280">Hủy</Btn>
        <Btn onClick={()=>{const n={...cfg,cashBalance:num(cfgForm.cashBalance),dso:num(cfgForm.dso),excessDays:num(cfgForm.excessDays)||90,liqDays:num(cfgForm.liqDays)||120,targetCoverDefault:num(cfgForm.targetCoverDefault)||45,minSafetyDays:num(cfgForm.minSafetyDays)||5,
          feeRate:Object.fromEntries(BRANDS.map(b=>[b,Number(cfgForm.feeRate?.[b])||0.32])),
          brandBudgets:cfg.brandBudgets};
          setCfg(n);
          if(cfgForm._monthBudgets){setBudgets(prev=>{let nb=[...prev];
            BRANDS.forEach(b=>{const v=cfgForm._monthBudgets[b];if(v===undefined)return;
              const idx2=nb.findIndex(x=>x.month===budgetMonth&&x.brand===b);
              const row={month:budgetMonth,brand:b,amount:num(v),updatedAt:todayStr(),updatedBy:role};
              if(idx2>=0)nb[idx2]={...nb[idx2],...row};else nb.push({...row,createdAt:todayStr(),createdBy:role});});
            return nb;});
            addLog("PurchaseBudget",budgetMonth,"Budget Change",BRANDS.map(b=>`${b}: ${fmt(num(cfgForm._monthBudgets[b]??budgetOf(budgetMonth,b)))}₫`).join(" · "));}
          setCfgModal(false);showToast("Đã lưu cấu hình");}} color="#059669">Lưu</Btn>
      </div>
    </Modal>)}

    {/* Preview import (spec §14) */}
    {importPreview&&importPreview.pancake&&(()=>{const r=importPreview;
      const nDirect=Object.keys(r.direct).length,nParent=Object.keys(r.parent).length;
      const banParent=Object.values(r.parent).reduce((a,x)=>a+x.ban,0);
      return (<Modal title={r.duplicate?"⛔ FILE TRÙNG — đã import trước đó":"Preview file Pancake (XNK theo sản phẩm) — chưa áp dụng"} onClose={()=>setImportPreview(null)} wide>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8,marginBottom:12}}>
          <Card icon={FileText} label="Tổng mã trong file" value={r.total} accent="#2563EB"/>
          <Card icon={CheckCircle} label="Khớp trực tiếp" value={nDirect} accent="#059669"/>
          <Card icon={Layers} label="Mã cha → chia biến thể" value={nParent} sub={`${Math.round(banParent)} SP bán`} accent="#7C3AED"/>
          <Card icon={XCircle} label="Không khớp" value={r.unmatched.length} accent="#DC2626" alert={r.unmatched.length>0}/>
        </div>
        <Field label="Kỳ báo cáo của file này *" hint="Tool không tự biết file xuất theo khoảng thời gian nào — chọn đúng kỳ đã chọn trên Pancake">
          <Sel value={r.period} onChange={v=>setImportPreview(p=>({...p,period:v}))}>
            <option value="7">7 ngày → ghi vào Bán 7 ngày (forecast ngắn hạn)</option>
            <option value="30">30 ngày → ghi vào Bán / Hoàn / Nhập 30 ngày (dữ liệu nền)</option>
            <option value="60">60 ngày → ghi vào Bán 60 ngày (forecast dài hạn)</option>
          </Sel>
        </Field>
        <div style={{display:"flex",flexDirection:"column",gap:6,margin:"10px 0"}}>
          <label style={{fontSize:12,display:"flex",gap:6,alignItems:"center"}}>
            <input type="checkbox" checked={!!r.distribute} onChange={e=>setImportPreview(p=>({...p,distribute:e.target.checked}))}/>
            Chia số bán của <strong>{nParent} mã cha</strong> xuống biến thể theo tỷ trọng bán 30 ngày <span style={{color:"#9CA3AF"}}>(ước tính — muốn số chính xác, xuất báo cáo theo MẪU MÃ)</span>
          </label>
          <label style={{fontSize:12,display:"flex",gap:6,alignItems:"center"}}>
            <input type="checkbox" checked={!!r.updStock} onChange={e=>setImportPreview(p=>({...p,updStock:e.target.checked}))}/>
            Cập nhật <strong>Tồn cuối kỳ → tồn kho</strong> cho mã khớp trực tiếp <span style={{color:"#B45309"}}>(lưu ý: tồn XNK là tồn tổng, chưa trừ hàng giữ chỗ)</span>
          </label>
        </div>
        {nParent>0&&<Panel title={`Mã cha sẽ chia xuống biến thể — ${nParent}`}>
          <div style={{overflowX:"auto",maxHeight:180}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>Mã cha</TH><TH>Tên</TH><TH r>Bán trong kỳ</TH><TH r>Số biến thể</TH></tr></thead><tbody>
            {Object.entries(r.parent).map(([ma,a])=>(<tr key={ma}><TD m b c="#1D4ED8">{ma}</TD><TD><span style={{fontSize:10}}>{a.name}</span></TD><TD r b>{Math.round(a.ban)}</TD><TD r>{a.nVars}</TD></tr>))}
          </tbody></table></div>
        </Panel>}
        {r.unmatched.length>0&&<Note tone="warn"><span><strong>Không khớp ({r.unmatched.length}):</strong> {r.unmatched.slice(0,10).join(", ")}{r.unmatched.length>10?"…":""} — sản phẩm chưa có trong dữ liệu nền của tool (SP mới?). Bán của các mã này KHÔNG được ghi nhận.</span>
          <Btn onClick={()=>{const csv="ma_khong_khop\n"+r.unmatched.join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="pancake-khong-khop.csv";a.click();}} color="#6B7280" small>Tải danh sách</Btn></Note>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
          <Btn onClick={()=>setImportPreview(null)} color="#6B7280">Huỷ — không áp dụng</Btn>
          <Btn disabled={r.duplicate} onClick={applyPancake} color="#059669">{r.duplicate?`Bị chặn — trùng ${r.dupOf}`:`Áp dụng (${nDirect+(r.distribute?Object.values(r.parent).reduce((a,x)=>a+x.nVars,0):0)} SKU)`}</Btn>
        </div>
      </Modal>);})()}

    {importPreview&&!importPreview.pancake&&(()=>{const r=importPreview;
      return (<Modal title="Preview import — chưa áp dụng" onClose={()=>setImportPreview(null)} wide>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginBottom:12}}>
          <Card icon={FileText} label="Tổng dòng" value={r.total} accent="#2563EB"/>
          <Card icon={CheckCircle} label="Khớp trực tiếp" value={r.direct} accent="#059669"/>
          <Card icon={Layers} label="Combo phân rã" value={r.combo} accent="#7C3AED"/>
          <Card icon={ChevronRight} label="Alias" value={r.alias} accent="#2563EB"/>
          <Card icon={Package} label="Gift" value={r.gift} accent="#BE185D"/>
          <Card icon={XCircle} label="Không khớp" value={r.unmatched.length} accent="#DC2626" alert={r.unmatched.length>0}/>
        </div>
        {r.dups.length>0&&<Note tone="warn"><span>Mã trùng lặp trong file: {r.dups.slice(0,10).join(", ")}{r.dups.length>10?"…":""}</span></Note>}
        {r.errors.length>0&&<Note tone="bad"><span>{r.errors.slice(0,5).join(" · ")}</span></Note>}
        {r.unmatched.length>0&&<Note tone="warn"><span>Không khớp ({r.unmatched.length}): {r.unmatched.slice(0,12).join(", ")}{r.unmatched.length>12?"…":""}</span>
          <Btn onClick={()=>{const csv="ma_khong_khop\n"+r.unmatched.join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="khong-khop.csv";a.click();}} color="#6B7280" small>Tải danh sách</Btn></Note>}
        <div style={{fontSize:12,margin:"10px 0"}}>Sẽ cập nhật <strong>{Object.keys(r.updates).length} SKU</strong>. Dòng combo cộng bán vào SKU con; gift trừ tồn không cộng doanh thu.</div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn onClick={()=>setImportPreview(null)} color="#6B7280">Huỷ — không áp dụng</Btn>
          <Btn onClick={applyImport} color="#059669">Áp dụng {Object.keys(r.updates).length} SKU</Btn>
        </div>
      </Modal>);})()}
  </>);

  /* ═══════════ LAYOUT ═══════════ */
  return (<div style={{display:"flex",height:"100vh",fontFamily:"'Inter',-apple-system,sans-serif",background:"#F8FAFC",overflow:"hidden"}}>
    {modals}
    <Toasts list={toasts}/>
    <aside style={{width:200,background:"#fff",borderRight:"1px solid #E5E7EB",display:"flex",flexDirection:"column",flexShrink:0,overflow:"auto"}}>
      <div style={{padding:"12px 10px",borderBottom:"1px solid #E5E7EB"}}><div style={{display:"flex",alignItems:"center",gap:6}}>
        <div style={{width:26,height:26,borderRadius:7,background:"linear-gradient(135deg,#2563EB,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center"}}><Box size={13} color="#fff"/></div>
        <div><div style={{fontSize:11,fontWeight:800}}>NOVIX</div><div style={{fontSize:7.5,color:"#9CA3AF",fontWeight:600}}>PURCHASE · INVENTORY</div></div></div></div>
      <div style={{padding:"6px 8px",borderBottom:"1px solid #E5E7EB"}}>
        <div style={{fontSize:8,color:"#9CA3AF",fontWeight:700,letterSpacing:0.5,marginBottom:3,textTransform:"uppercase"}}>Demo Role Switch</div>
        <select value={role} onChange={e=>changeRole(e.target.value)} style={{width:"100%",padding:"4px 6px",borderRadius:6,border:"1px solid #E5E7EB",fontSize:10,background:"#F8FAFC"}}>{ROLES.map(r=><option key={r}>{r}</option>)}</select>
      </div>
      <nav style={{padding:"6px 5px",flex:1,display:"flex",flexDirection:"column",gap:1}}>
        {visibleTabs.map(t=>(<button key={t.id} onClick={()=>{setTab(t.id);}} style={navS(t.id)}><t.icon size={12}/><span style={{flex:1}}>{t.label}</span>{t.badge>0&&<span style={{background:"#DC2626",color:"#fff",fontSize:8,fontWeight:700,borderRadius:6,padding:"1px 5px"}}>{t.badge}</span>}</button>))}
      </nav>
      <div style={{padding:"8px 10px",borderTop:"1px solid #E5E7EB"}}>
        {can("config.edit")&&<Btn onClick={()=>{setCfgForm(cfg);setCfgModal(true);}} color="#4338CA" small><Settings size={9} style={{verticalAlign:-1}}/> Cấu hình</Btn>}
        <div style={{fontSize:8.5,color:"#9CA3AF",marginTop:6}}>
          <div>Tồn {fmt(totalVal)}₫ · DIO {dio}d</div>
          <div>Lưu: {saveInfo.st==="saving"?"đang lưu…":saveInfo.st==="error"?"LỖI":"✓"} {saveInfo.via&&`(${saveInfo.via})`}</div>
          <div style={{fontWeight:600,color:"#374151"}}>{role}</div>
        </div>
      </div>
    </aside>
    <main style={{flex:1,overflow:"auto"}}>
      <header style={{padding:"10px 18px",background:"#fff",borderBottom:"1px solid #E5E7EB",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10,gap:8,flexWrap:"wrap"}}>
        <h1 style={{margin:0,fontSize:15,fontWeight:800}}>{TABS.find(t=>t.id===tab)?.label}</h1>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {saveInfo.st==="error"&&<Badge c="#fff" bg="#DC2626">⚠ Lưu thất bại — đừng đóng tab</Badge>}
          <Badge c="#5B21B6" bg="#EDE9FE">Sẵn sàng mua {pct(readiness.buy)}</Badge>
          <Badge c={budget.total===0?"#991B1B":budget.available<0?"#fff":"#065F46"} bg={budget.total===0?"#FEE2E2":budget.available<0?"#DC2626":"#D1FAE5"}>{budget.total===0?"Chưa có ngân sách":`NS ${budgetMonth} còn ${fmt(budget.available)}₫`}</Badge>
          <Badge c="#4338CA" bg="#E0E7FF">{role}</Badge>
        </div>
      </header>
      <div style={{padding:"14px 18px",maxWidth:1680}}>
        {tab==="data"&&renderData()}{tab==="ceo"&&renderCEO()}{tab==="cap"&&renderCap()}{tab==="wb"&&renderWB()}
        {tab==="cal"&&renderCal()}{tab==="var"&&renderVar()}{tab==="plan"&&renderPlan()}
        {tab==="leader"&&renderLeader()}{tab==="approve"&&renderApprove()}
        {tab==="po"&&renderPO()}{tab==="supplier"&&renderSup()}{tab==="cash"&&renderCash()}
        {tab==="audit"&&renderAudit()}{tab==="sync"&&renderSync()}{tab==="inv"&&renderInv()}
      </div>
    </main>
  </div>);
}
