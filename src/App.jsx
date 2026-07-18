import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from "react";
import {
  Home, CheckSquare, Building2, FolderKanban, ArrowLeftRight, BadgeCheck,
  CalendarDays, Link2, Settings, Search, Plus, Bell, X, Clock, AlertTriangle,
  MessageSquare, Paperclip, History, Users, Filter, LayoutList, LayoutGrid,
  Gauge, Pin, Send, Edit3, LogOut, ChevronDown, ChevronLeft,
  ChevronRight, ChevronsLeft, CheckCircle2, PauseCircle, RotateCcw,
  FileText, ExternalLink, Repeat, Trash2, PinOff, CornerDownRight, Star, Save, Lock
} from "lucide-react";
import { btnPri, btnSec, btnGhost, btnDanger, inputCls, cardCls, popoverCls, STATUS_TONE, PRIORITY_TONE } from "./ui/tokens.js";
import { PageHeader, Skeleton, SkeletonRows, DeadlineChip, Dot, Tooltip, ErrorBoundary } from "./ui/primitives.jsx";

/* ============================================================
   NOVIX WORK — Quản lý công việc nội bộ v0.2.0-uat-prep
   - In-memory prototype; production dùng Next.js + Supabase.
   - Tất cả quyền được enforce tại action layer — UI chỉ phản ánh.
   - RLS Supabase mirrors mọi hàm trong perms.* và canXxx.
   ============================================================ */

/* ---------- Date utils ---------- */
const DAY = 86400000;
const iso = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const todayISO = () => iso(new Date());
const addDaysISO = (base, n) => iso(new Date(new Date(base + "T00:00:00").getTime() + n * DAY));
const D = (n) => addDaysISO(todayISO(), n);
const fmtD = (s) => { if (!s) return "—"; const [, m, d] = s.split("-"); return `${d}/${m}`; };
const fmtDFull = (s) => { if (!s) return "—"; const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; };
const daysLeft = (s) => Math.round((new Date(s + "T00:00:00") - new Date(todayISO() + "T00:00:00")) / DAY);
const fmtDT = (t) => {
  const x = new Date(t);
  return `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")} ${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}`;
};
let _seq = 1000;
const uid = (p = "id") => `${p}_${Date.now().toString(36)}${(_seq++).toString(36)}`;

/* ---------- Domain constants ---------- */
const STATUSES = {
  todo:    { label: "Chưa bắt đầu",   dot: "bg-zinc-400",    pill: "bg-zinc-100 text-zinc-600" },
  doing:   { label: "Đang thực hiện", dot: "bg-blue-500",    pill: "bg-blue-50 text-blue-700" },
  waiting: { label: "Chờ phối hợp",   dot: "bg-amber-500",   pill: "bg-amber-50 text-amber-700" },
  review:  { label: "Chờ duyệt",      dot: "bg-violet-500",  pill: "bg-violet-50 text-violet-700" },
  revise:  { label: "Cần chỉnh sửa",  dot: "bg-orange-500",  pill: "bg-orange-50 text-orange-700" },
  done:    { label: "Hoàn thành",     dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700" },
  paused:  { label: "Tạm dừng",       dot: "bg-zinc-300",    pill: "bg-zinc-100 text-zinc-400" },
};
const STATUS_ORDER = ["todo", "doing", "waiting", "review", "revise", "done", "paused"];

const PRIORITIES = {
  low:    { label: "Thấp",        pill: "bg-zinc-100 text-zinc-500", rank: 0 },
  normal: { label: "Bình thường", pill: "bg-sky-50 text-sky-700", rank: 1 },
  high:   { label: "Cao",         pill: "bg-amber-50 text-amber-700", rank: 2 },
  urgent: { label: "Khẩn cấp",    pill: "bg-red-50 text-red-700", rank: 3 },
};
const PRIORITY_ORDER = ["low", "normal", "high", "urgent"];

const TASK_TYPES = {
  personal: "Cá nhân",
  dept: "Phòng ban",
  cross: "Liên phòng ban",
  project: "Dự án",
  recurring: "Định kỳ",
};
const EFFORTS = { S: "Nhỏ", M: "Trung bình", L: "Lớn" };
const EFFORT_W = { S: 1, M: 2, L: 3 };

const REQ_STATUSES = {
  pending:    { label: "Chờ tiếp nhận",   pill: "bg-sky-50 text-sky-700" },
  info:       { label: "Cần bổ sung",     pill: "bg-amber-50 text-amber-700" },
  deadline_proposed: { label: "Chờ chốt deadline", pill: "bg-fuchsia-50 text-fuchsia-700" },
  accepted:   { label: "Đã tiếp nhận",    pill: "bg-blue-50 text-blue-700" },
  processing: { label: "Đang xử lý",      pill: "bg-indigo-50 text-indigo-700" },
  delivered:  { label: "Đã bàn giao",     pill: "bg-violet-50 text-violet-700" },
  confirmed:  { label: "Hoàn thành",      pill: "bg-emerald-50 text-emerald-700" },
  rejected:   { label: "Từ chối",         pill: "bg-red-50 text-red-700" },
  cancelled:  { label: "Đã hủy",          pill: "bg-zinc-100 text-zinc-400" },
};

const PROJECT_STATUSES = {
  prep:      { label: "Chuẩn bị",       pill: "bg-zinc-100 text-zinc-600" },
  active:    { label: "Đang triển khai", pill: "bg-blue-50 text-blue-700" },
  paused:    { label: "Tạm dừng",        pill: "bg-amber-50 text-amber-700" },
  done:      { label: "Hoàn thành",      pill: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Hủy",             pill: "bg-red-50 text-red-500" },
};

const DOC_TYPES = ["File báo cáo phòng ban", "File KPI", "SOP", "Biểu mẫu", "File kế hoạch", "Google Drive", "Google Sheets", "Tài liệu hướng dẫn"];
const ROLE_LABELS = { employee: "Nhân viên", leader: "Leader", admin: "Manager/Admin", ceo: "CEO" };
const BRANDS = {
  nevor: { label: "Nevor", chip: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  uhero: { label: "UHero", chip: "bg-orange-50 text-orange-700 border-orange-100" },
};
const BRAND_ORDER = ["nevor", "uhero"];
const VISIBILITIES = { private: "Riêng tư", department: "Phòng ban", project: "Dự án", company: "Toàn công ty" };
const TASK_CATEGORIES = ["GENERAL", "CONTENT", "MEDIA", "ECOMMERCE", "KOC_BOOKING", "AFFILIATE", "PRODUCT", "PURCHASING", "WAREHOUSE", "CUSTOMER_EXPERIENCE", "FINANCE_SUPPORT", "HR_ONBOARDING", "HR_PROBATION", "HR_TRAINING", "HR_DOCUMENT", "HR_POLICY", "HR_OFFBOARDING", "HR_INTERNAL_SUPPORT"];
const HR_CATEGORY_LABELS = { HR_ONBOARDING: "Onboarding", HR_PROBATION: "Thử việc", HR_TRAINING: "Đào tạo", HR_DOCUMENT: "Hồ sơ", HR_POLICY: "Chính sách", HR_OFFBOARDING: "Offboarding", HR_INTERNAL_SUPPORT: "Yêu cầu nội bộ" };

/* ---------- Seed: departments & users ---------- */
const SEED_DEPTS = [
  ["brand", "Growth – Nevor", "minh", "nevor"], ["growth_uh", "Growth – UHero", "trung", "uhero"],
  ["ecom", "E-commerce – Nevor", "ha", "nevor"], ["ecom_uh", "E-commerce – UHero", "duc", "uhero"],
  ["content", "Content", "linh", null], ["media", "Media", null, null],
  ["koc", "Booking KOC", "trang", null], ["aff", "TikTok Affiliate", null, null],
  ["cx", "Customer Experience", null, null], ["rnd", "Product/R&D", null, null], ["proc", "Thu mua", null, null],
  ["wh", "Kho", null, null], ["acct", "Kế toán", null, null], ["b2b", "B2B", null, null], ["hr", "Hành chính – Nhân sự", "vy", null],
].map(([id, name, leaderId, brandId]) => ({ id, name, leaderId, brandId }));
/* Người tiếp nhận yêu cầu mặc định cho phòng chưa có Leader — không để request chết vì receiver null */
const DEFAULT_RECEIVERS = { media: "dat", aff: "huy", cx: "nhung", rnd: "lan", proc: "son", wh: "hoa", acct: "yen", b2b: "quan" };
SEED_DEPTS.forEach((d) => { d.defaultReceiverId = d.leaderId ? null : DEFAULT_RECEIVERS[d.id] || null; });

const SEED_USERS = [
  { id: "ceo",   name: "Anh Tuấn",  role: "ceo",      deptId: "brand",   title: "CEO Novix" },
  { id: "admin", name: "Ngọc Vũ",   role: "admin",    deptId: "hr",      title: "Quản trị hệ thống" },
  { id: "linh",  name: "Linh",      role: "leader",   deptId: "content", title: "Leader Content" },
  { id: "minh",  name: "Minh",      role: "leader",   deptId: "brand",   title: "Leader Growth Nevor" },
  { id: "trung", name: "Trung",     role: "leader",   deptId: "growth_uh", title: "Leader Growth UHero" },
  { id: "duc",   name: "Đức",       role: "leader",   deptId: "ecom_uh", title: "Leader E-commerce UHero" },
  { id: "ha",    name: "Hà",        role: "leader",   deptId: "ecom",    title: "Leader E-commerce Nevor" },
  { id: "trang", name: "Trang",     role: "leader",   deptId: "koc",     title: "Leader Booking KOC" },
  { id: "huy",   name: "Huy",       role: "employee", deptId: "aff",     title: "Affiliate Executive" },
  { id: "dat",   name: "Đạt",       role: "employee", deptId: "media",   title: "Livestream & Media" },
  { id: "quan",  name: "Quân",      role: "employee", deptId: "b2b",     title: "B2B Sales" },
  { id: "lan",   name: "Lan",       role: "employee", deptId: "rnd",     title: "Product Executive" },
  { id: "mai",   name: "Mai",       role: "employee", deptId: "content", title: "Content Writer" },
  { id: "tung",  name: "Tùng",      role: "employee", deptId: "media",   title: "Video Editor" },
  { id: "thao",  name: "Thảo",      role: "employee", deptId: "koc",     title: "KOC Executive" },
  { id: "phuc",  name: "Phúc",      role: "employee", deptId: "ecom",    title: "Shop Operator" },
  { id: "nhung", name: "Nhung",     role: "employee", deptId: "cx",      title: "CSKH" },
  { id: "son",   name: "Sơn",       role: "employee", deptId: "proc",    title: "Nhân viên thu mua" },
  { id: "hoa",   name: "Hoà",       role: "employee", deptId: "wh",      title: "Thủ kho" },
  { id: "yen",   name: "Yến",       role: "employee", deptId: "acct",    title: "Kế toán" },
  { id: "khai",  name: "Khải",      role: "employee", deptId: "brand",   title: "Performance Ads" },
  { id: "vy",    name: "Vy",        role: "leader",   deptId: "hr",      title: "Leader Hành chính – Nhân sự" },
  { id: "kiet",  name: "Kiệt",      role: "employee", deptId: "growth_uh", title: "Performance Ads UHero" },
  { id: "ngan",  name: "Ngân",      role: "employee", deptId: "ecom_uh", title: "Shop Operator UHero" },
];

const AV_COLORS = ["bg-rose-100 text-rose-700", "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700", "bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700", "bg-indigo-100 text-indigo-700", "bg-teal-100 text-teal-700", "bg-orange-100 text-orange-700"];
const avColor = (id) => AV_COLORS[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length];
/* ---------- Seed: projects ---------- */
const SEED_PROJECTS = [
  { id: "prj1", brandId: "nevor", code: "PRJ-01", name: "Launch sản phẩm đai lưng mới", goal: "Ra mắt đai lưng thế hệ mới trên TikTok Shop + Shopee, đạt 1.000 đơn trong 30 ngày đầu.", ownerId: "minh", watcherIds: ["ceo"], deptIds: ["brand", "content", "media", "koc", "ecom", "rnd", "proc"], start: D(-20), deadline: D(18), status: "active", priority: "urgent", desc: "Dự án trọng điểm Q3. Theo playbook launch 4 pha: hiện đang ở pha Content Seeding.", planLink: "https://drive.google.com/novix/launch-dai-lung", issues: [{ id: "i1", text: "Hàng mẫu về trễ 5 ngày, Media chưa có mẫu quay", resolved: false }, { id: "i2", text: "Chưa chốt giá bán final với Thu mua", resolved: true }] },
  { id: "prj2", brandId: "nevor", code: "PRJ-02", name: "Campaign Vu Lan", goal: "GMV 800 triệu trong 2 tuần campaign, tận dụng combo quà tặng bố mẹ.", ownerId: "ha", watcherIds: ["ceo", "minh"], deptIds: ["ecom", "content", "media", "koc"], start: D(-10), deadline: D(25), status: "active", priority: "high", desc: "Campaign theo mùa. Trọng tâm: combo quà tặng + livestream.", planLink: "https://drive.google.com/novix/vu-lan", issues: [] },
  { id: "prj3", brandId: null, code: "PRJ-03", name: "Campaign 9.9", goal: "Chuẩn bị tồn kho, deal và content cho đại campaign 9.9 trên Shopee + TikTok Shop.", ownerId: "ha", watcherIds: ["ceo"], deptIds: ["ecom", "wh", "proc", "content"], start: D(5), deadline: D(54), status: "prep", priority: "high", desc: "Đang ở giai đoạn chuẩn bị: chốt deal, kiểm kê tồn kho, đăng ký chương trình sàn.", planLink: "", issues: [] },
  { id: "prj4", brandId: "nevor", code: "PRJ-04", name: "Phát triển Nevor Care", goal: "Xây dựng dòng sản phẩm chăm sóc phục hồi mới của Nevor.", ownerId: "lan", watcherIds: ["ceo", "minh"], deptIds: ["rnd", "proc", "brand"], start: D(-45), deadline: D(40), status: "active", priority: "normal", desc: "Đang test sample vòng 2 với 3 nhà cung cấp.", planLink: "https://drive.google.com/novix/nevor-care", issues: [{ id: "i3", text: "Sample NCC B không đạt độ đàn hồi yêu cầu", resolved: false }] },
  { id: "prj5", brandId: null, code: "PRJ-05", name: "Mở kênh Zalo OA", goal: "Kích hoạt kênh CSKH + remarketing qua Zalo OA, tích hợp SĐT làm khóa chính.", ownerId: "nhung", watcherIds: ["ha"], deptIds: ["cx", "ecom"], start: D(-15), deadline: D(30), status: "paused", priority: "normal", desc: "Tạm dừng chờ duyệt ngân sách ZNS.", planLink: "", issues: [{ id: "i4", text: "Chờ CEO duyệt ngân sách ZNS tháng đầu", resolved: false }] },
  { id: "prj7", brandId: "uhero", code: "PRJ-07", name: "Launch giá đỡ điện thoại UHero V2", goal: "Ra mắt giá đỡ V2 trên TikTok Shop + Shopee UHero, đạt 500 đơn trong 30 ngày đầu.", ownerId: "trung", watcherIds: ["ceo"], deptIds: ["growth_uh", "ecom_uh", "proc", "media"], start: D(-8), deadline: D(35), status: "active", priority: "high", desc: "Launch theo playbook 4 pha, đang chuyển từ Validate sang Content Seeding.", planLink: "", issues: [{ id: "i5", text: "NCC báo MOQ 500 chiếc/màu, cao hơn dự kiến — chờ Thu mua đàm phán", resolved: false }] },
  { id: "prj6", brandId: null, code: "PRJ-06", name: "Xử lý hàng tồn kho", goal: "Giảm 30% giá trị tồn kho các SKU có DIO > 120 ngày trong 60 ngày.", ownerId: "ha", watcherIds: ["ceo"], deptIds: ["ecom", "wh", "content"], start: D(-30), deadline: D(30), status: "active", priority: "high", desc: "Danh sách SKU chậm đã chốt. Đang chạy flash sale + combo thanh lý.", planLink: "https://drive.google.com/novix/ton-kho", issues: [] },
];

/* ---------- Seed: tasks ---------- */
const T = (n, over = {}) => {
  const base = {
    id: uid("t"), code: `NVX-${String(n).padStart(3, "0")}`, name: "", desc: "", deliverable: "",
    creatorId: "admin", assignerId: null, ownerId: null, collaboratorIds: [], approverId: null,
    deptId: "brand", coDeptIds: [], projectId: null, type: "dept", priority: "normal",
    start: D(-3), deadline: D(3), status: "todo", progress: 0, effort: "M",
    checklist: [], reportLink: "", driveLink: "", attachments: [], tags: [],
    comments: [], logs: [], pauseReason: "", overdueReason: "", revisionCount: 0, revisionNote: "",
    completedAt: null, confirmedById: null, approvedAt: null, recurrence: null, pinnedBy: [],
    createdAt: Date.now() - 5 * DAY, updatedAt: Date.now() - DAY, deadlineConfirmed: true, deadlineHistory: [],
  };
  return { ...base, ...over };
};

function buildTasks() {
  let n = 1;
  const t = [];
  // Dự án đai lưng
  t.push(T(n++, { name: "Hoàn thiện brief KOC cho đai lưng", desc: "Brief theo format Brief KOC chuẩn: 6P angle, mandatory shots, CTA mềm.", deliverable: "File brief PDF + 3 angle 6P đã duyệt", creatorId: "linh", assignerId: "linh", ownerId: "mai", collaboratorIds: ["thao"], approverId: "linh", deptId: "content", coDeptIds: ["koc"], projectId: "prj1", type: "project", priority: "urgent", deadline: D(1), status: "review", progress: 90, effort: "M", checklist: [{ id: uid("c"), text: "Chốt 3 angle 6P", done: true, ownerId: "mai", deadline: null }, { id: uid("c"), text: "Viết mandatory shots", done: true, ownerId: "mai", deadline: null }, { id: uid("c"), text: "Linh review lần cuối", done: false, ownerId: "linh", deadline: null }], reportLink: "https://docs.google.com/novix/brief-koc-dai-lung", tags: ["launch", "koc"], comments: [{ id: uid("cm"), userId: "mai", text: "Em đã gửi bản v2, sửa lại phần Proof theo góp ý @Linh", at: Date.now() - 2 * 3600000 }], logs: [{ id: uid("l"), userId: "mai", at: Date.now() - 3600000, text: "gửi duyệt công việc" }] }));
  t.push(T(n++, { name: "Chuẩn bị hàng mẫu đai lưng cho Media", desc: "Xuất 5 mẫu đai lưng (đủ size) + phụ kiện để Media quay brand video.", deliverable: "5 mẫu bàn giao tại studio, có biên bản", creatorId: "minh", assignerId: "minh", ownerId: "hoa", collaboratorIds: ["son"], approverId: null, deptId: "wh", coDeptIds: ["media"], projectId: "prj1", type: "cross", priority: "high", deadline: D(-2), status: "waiting", progress: 40, effort: "S", overdueReason: "Hàng mẫu từ NCC về trễ 5 ngày", tags: ["launch"], comments: [{ id: uid("cm"), userId: "dat", text: "Bên em cần mẫu trước thứ 5 để kịp lịch quay @Hoà", at: Date.now() - 20 * 3600000 }] }));
  t.push(T(n++, { name: "Quay 10 brand video đai lưng (5 hook)", desc: "Sản xuất 10 video brand theo 5 hook khác nhau, mỗi hook 2 phiên bản.", deliverable: "10 video final 9:16, có sub", creatorId: "minh", assignerId: "minh", ownerId: "dat", collaboratorIds: ["tung"], approverId: "minh", deptId: "media", projectId: "prj1", type: "project", priority: "high", deadline: D(6), status: "doing", progress: 30, effort: "L", checklist: [{ id: uid("c"), text: "Chốt kịch bản 5 hook", done: true, ownerId: "dat", deadline: null }, { id: uid("c"), text: "Quay hook 1–2", done: true, ownerId: "tung", deadline: null }, { id: uid("c"), text: "Quay hook 3–5", done: false, ownerId: "tung", deadline: D(4) }, { id: uid("c"), text: "Dựng + sub", done: false, ownerId: "tung", deadline: D(6) }], tags: ["launch", "video"] }));
  t.push(T(n++, { name: "Chốt thông tin sản phẩm đai lưng mới", desc: "Thông số, chất liệu, size chart, điểm khác biệt so với bản cũ để Content viết trang sản phẩm.", deliverable: "File thông tin sản phẩm chuẩn hoá", creatorId: "linh", assignerId: null, ownerId: "lan", approverId: null, deptId: "rnd", coDeptIds: ["content"], projectId: "prj1", type: "cross", priority: "urgent", deadline: D(0), status: "doing", progress: 70, effort: "S", tags: ["launch"] }));
  t.push(T(n++, { name: "Book 10 Nano KOC đợt seeding đai lưng", desc: "Book 10 nano KOC ngách gym/văn phòng, usage rights 90 ngày, hợp đồng written.", deliverable: "Danh sách 10 KOC đã ký + lịch post", creatorId: "trang", assignerId: "trang", ownerId: "thao", approverId: "trang", deptId: "koc", projectId: "prj1", type: "project", priority: "high", deadline: D(8), status: "doing", progress: 50, effort: "M", checklist: [{ id: uid("c"), text: "Shortlist 25 KOC", done: true, ownerId: "thao", deadline: null }, { id: uid("c"), text: "Gửi hợp đồng usage rights", done: false, ownerId: "thao", deadline: D(5) }], tags: ["launch", "koc"] }));
  // Vu Lan
  t.push(T(n++, { name: "Thiết kế banner campaign Vu Lan", desc: "Bộ banner: Shopee (3 size), TikTok Shop, Facebook cover. Theo moodboard đã duyệt.", deliverable: "File banner đủ size + file gốc", creatorId: "ha", assignerId: "ha", ownerId: "tung", collaboratorIds: [], approverId: "ha", deptId: "media", coDeptIds: ["ecom"], projectId: "prj2", type: "cross", priority: "high", deadline: D(2), status: "revise", progress: 80, effort: "M", revisionCount: 1, revisionNote: "Đổi tông màu chủ đạo sang vàng ấm, chữ headline to hơn 20%", tags: ["vu-lan", "design"], logs: [{ id: uid("l"), userId: "ha", at: Date.now() - 5 * 3600000, text: "yêu cầu chỉnh sửa: Đổi tông màu chủ đạo sang vàng ấm (Sửa nhỏ, hạn " + fmtD(D(2)) + ")" }] }));
  t.push(T(n++, { name: "Viết content combo quà tặng Vu Lan", desc: "5 bài post + 3 kịch bản video ngắn cho combo quà tặng bố mẹ.", deliverable: "5 post + 3 script đã duyệt", creatorId: "linh", assignerId: "linh", ownerId: "mai", approverId: "linh", deptId: "content", projectId: "prj2", type: "project", priority: "normal", deadline: D(4), status: "doing", progress: 40, effort: "M", tags: ["vu-lan"] }));
  t.push(T(n++, { name: "Setup deal combo Vu Lan trên Shopee", desc: "Tạo combo, set giá, đăng ký flash sale khung giờ vàng.", deliverable: "Combo live trên 3 shop Shopee", creatorId: "ha", assignerId: "ha", ownerId: "phuc", approverId: "ha", deptId: "ecom", projectId: "prj2", type: "project", priority: "high", deadline: D(5), status: "todo", progress: 0, effort: "M", tags: ["vu-lan", "shopee"] }));
  t.push(T(n++, { name: "Lịch livestream Vu Lan tuần cao điểm", desc: "Xếp lịch 5 phiên live, phân công host, checklist pin sản phẩm trước giờ live.", deliverable: "Lịch live + checklist pre-live từng phiên", creatorId: "ha", assignerId: "ha", ownerId: "dat", approverId: "ha", deptId: "media", coDeptIds: ["ecom"], projectId: "prj2", type: "cross", priority: "urgent", deadline: D(3), status: "doing", progress: 20, effort: "M", tags: ["vu-lan", "live"], comments: [{ id: uid("cm"), userId: "ha", text: "Nhớ áp dụng quy tắc 80-10-10: pin sản phẩm xong trước giờ live 30 phút @Đạt", at: Date.now() - 8 * 3600000 }] }));
  // 9.9
  t.push(T(n++, { name: "Kiểm tra tồn kho trước campaign 9.9", desc: "Đối chiếu tồn thực tế vs hệ thống cho 40 SKU chủ lực, cảnh báo SKU dưới ngưỡng an toàn.", deliverable: "File kiểm kê + danh sách SKU cần nhập gấp", creatorId: "ha", assignerId: "ha", ownerId: "hoa", collaboratorIds: ["son"], approverId: "ha", deptId: "wh", coDeptIds: ["proc"], projectId: "prj3", type: "cross", priority: "high", deadline: D(10), status: "todo", progress: 0, effort: "L", tags: ["9.9", "kho"] }));
  t.push(T(n++, { name: "Đăng ký chương trình 9.9 với sàn", desc: "Đăng ký deal sốc, voucher sàn, mega live cho cả Shopee và TikTok Shop.", deliverable: "Xác nhận đăng ký thành công từ 2 sàn", creatorId: "ha", assignerId: "ha", ownerId: "phuc", approverId: "ha", deptId: "ecom", projectId: "prj3", type: "project", priority: "high", deadline: D(14), status: "todo", progress: 0, effort: "M", tags: ["9.9"] }));
  // Tồn kho
  t.push(T(n++, { name: "Chốt danh sách SKU thanh lý đợt 2", desc: "Lọc SKU DIO > 120 ngày, đề xuất mức giảm giá theo khung thanh lý.", deliverable: "File danh sách + mức giá đề xuất", creatorId: "ha", assignerId: "ha", ownerId: "phuc", approverId: "ha", deptId: "ecom", projectId: "prj6", type: "project", priority: "high", deadline: D(-1), status: "review", progress: 100, effort: "M", tags: ["ton-kho"], logs: [{ id: uid("l"), userId: "phuc", at: Date.now() - 26 * 3600000, text: "gửi duyệt công việc" }] }));
  t.push(T(n++, { name: "Content flash sale thanh lý tồn kho", desc: "3 video + 5 post đẩy flash sale SKU chậm, angle 'deal xả kho'.", deliverable: "Content đã đăng đủ kênh", creatorId: "linh", assignerId: "linh", ownerId: "mai", approverId: "linh", deptId: "content", projectId: "prj6", type: "project", priority: "normal", deadline: D(7), status: "todo", progress: 0, effort: "M", tags: ["ton-kho"] }));
  // Nevor Care
  t.push(T(n++, { name: "Test sample Nevor Care vòng 2", desc: "Đánh giá 3 sample NCC theo bộ tiêu chí chất lượng, chấm điểm từng tiêu chí.", deliverable: "Bảng chấm điểm + đề xuất chọn NCC", creatorId: "lan", assignerId: null, ownerId: "lan", collaboratorIds: ["son"], approverId: "minh", deptId: "rnd", projectId: "prj4", type: "project", priority: "normal", deadline: D(12), status: "doing", progress: 60, effort: "L", tags: ["nevor-care"] }));
  // Chờ CEO duyệt
  t.push(T(n++, { name: "Duyệt ngân sách ZNS tháng đầu cho Zalo OA", desc: "Đề xuất ngân sách ZNS 15 triệu/tháng đầu, kèm dự kiến tỷ lệ mở và chi phí/tin.", deliverable: "Quyết định duyệt/không duyệt ngân sách", creatorId: "nhung", assignerId: null, ownerId: "nhung", approverId: "ceo", deptId: "cx", projectId: "prj5", type: "project", priority: "high", deadline: D(2), status: "review", progress: 100, effort: "S", tags: ["zalo"], logs: [{ id: uid("l"), userId: "nhung", at: Date.now() - 2 * DAY, text: "gửi duyệt công việc" }] }));
  t.push(T(n++, { name: "Duyệt video hướng dẫn sử dụng đai lưng", desc: "Video hướng dẫn 90s dùng cho trang sản phẩm + gửi kèm sau bán.", deliverable: "Video final được duyệt", creatorId: "dat", assignerId: "minh", ownerId: "tung", approverId: "ceo", deptId: "media", projectId: "prj1", type: "project", priority: "normal", deadline: D(1), status: "review", progress: 100, effort: "M", tags: ["launch", "video"], logs: [{ id: uid("l"), userId: "tung", at: Date.now() - 30 * 3600000, text: "gửi duyệt công việc" }] }));
  // Quá hạn nghiêm trọng
  t.push(T(n++, { name: "Xử lý 12 đơn khiếu nại chưa phản hồi", desc: "Khiếu nại về ship trễ và sai màu, đã quá SLA 24h.", deliverable: "100% khiếu nại được phản hồi + phương án đền bù", creatorId: "ha", assignerId: "ha", ownerId: "nhung", approverId: null, deptId: "cx", type: "dept", priority: "urgent", deadline: D(-3), status: "doing", progress: 50, effort: "M", overdueReason: "Lượng khiếu nại tăng đột biến sau flash sale", tags: ["cskh"] }));
  t.push(T(n++, { name: "Đối soát chi phí booking KOC tháng trước", desc: "Đối chiếu chứng từ thanh toán KOC với danh sách booking thực tế.", deliverable: "Bảng đối soát khớp 100%", creatorId: "yen", assignerId: null, ownerId: "yen", collaboratorIds: ["thao"], approverId: null, deptId: "acct", coDeptIds: ["koc"], type: "cross", priority: "high", deadline: D(-5), status: "waiting", progress: 30, effort: "M", overdueReason: "Chờ Booking KOC bổ sung 8 chứng từ", tags: ["doi-soat"] }));
  // Cập nhật trang SP
  t.push(T(n++, { name: "Cập nhật trang sản phẩm Shopee theo angle mới", desc: "Đổi 5 ảnh chính + rewrite mô tả theo angle thắng từ TikTok.", deliverable: "Trang sản phẩm cập nhật trên 3 shop", creatorId: "ha", assignerId: "ha", ownerId: "phuc", approverId: "ha", deptId: "ecom", type: "dept", priority: "normal", deadline: D(2), status: "doing", progress: 60, effort: "M", tags: ["shopee"] }));
  // B2B
  t.push(T(n++, { name: "Chuẩn bị báo giá B2B cho chuỗi gym", desc: "Báo giá số lượng lớn đai lưng + găng tập cho chuỗi 8 phòng gym.", deliverable: "File báo giá + điều khoản công nợ", creatorId: "quan", assignerId: null, ownerId: "quan", approverId: "ceo", deptId: "b2b", type: "dept", priority: "high", deadline: D(3), status: "doing", progress: 70, effort: "M", tags: ["b2b"] }));
  // Personal
  t.push(T(n++, { name: "Ghi chú ý tưởng angle mới cho găng tập", desc: "Ghi chú cá nhân, chưa cần deadline.", creatorId: "mai", ownerId: "mai", deptId: "content", type: "personal", priority: "low", deadline: null, status: "todo", effort: "S", deadlineConfirmed: false }));
  // Affiliate
  t.push(T(n++, { name: "Phân loại Scale/Test/Stop 286 creator tháng này", desc: "Áp dụng khung phân loại theo GMV, refund rate và tần suất post.", deliverable: "File phân loại + danh sách creator Scale", creatorId: "minh", assignerId: "minh", ownerId: "huy", approverId: "minh", deptId: "aff", type: "dept", priority: "high", deadline: D(6), status: "doing", progress: 45, effort: "L", tags: ["affiliate"] }));
  t.push(T(n++, { name: "Gửi hàng mẫu cho 15 KOC đợt mới", desc: "Đóng gói + gửi mẫu theo danh sách Booking KOC đã chốt.", deliverable: "15 đơn gửi mẫu có mã vận đơn", creatorId: "trang", assignerId: "trang", ownerId: "hoa", approverId: null, deptId: "wh", coDeptIds: ["koc"], type: "cross", priority: "normal", deadline: D(1), status: "doing", progress: 50, effort: "S", tags: ["koc"] }));
  // Recurring examples
  t.push(T(n++, { name: "Cập nhật báo cáo Booking tuần", desc: "Cập nhật file báo cáo booking KOC tuần: số deal, chi phí, GMV ước tính.", deliverable: "File báo cáo tuần cập nhật xong", creatorId: "trang", assignerId: "trang", ownerId: "thao", approverId: "trang", deptId: "koc", type: "recurring", recurrence: "weekly", priority: "normal", deadline: D(2), status: "todo", effort: "S", reportLink: "https://docs.google.com/novix/bao-cao-booking", tags: ["bao-cao"] }));
  t.push(T(n++, { name: "Cập nhật báo cáo doanh số ngày các shop", desc: "Nhập số liệu doanh số ngày từ Shopee + TikTok Shop vào file báo cáo.", deliverable: "File báo cáo ngày đầy đủ số liệu", creatorId: "ha", assignerId: "ha", ownerId: "phuc", approverId: null, deptId: "ecom", type: "recurring", recurrence: "daily", priority: "normal", deadline: D(0), status: "doing", progress: 50, effort: "S", reportLink: "https://docs.google.com/novix/doanh-so-ngay", tags: ["bao-cao"] }));
  t.push(T(n++, { name: "Kiểm tra hiệu suất campaign ads tuần", desc: "Rà soát CPA/ROAS theo Rule Engine, đề xuất Kill/Reduce/Scale.", deliverable: "Danh sách quyết định theo Rule Engine", creatorId: "minh", assignerId: "minh", ownerId: "khai", approverId: "minh", deptId: "brand", type: "recurring", recurrence: "weekly", priority: "high", deadline: D(1), status: "doing", progress: 30, effort: "M", tags: ["ads", "bao-cao"] }));
  t.push(T(n++, { name: "Đối soát COD với đơn vị vận chuyển", desc: "Đối soát tiền COD tuần với 2 đơn vị vận chuyển.", deliverable: "Biên bản đối soát khớp số", creatorId: "yen", ownerId: "yen", approverId: null, deptId: "acct", type: "recurring", recurrence: "weekly", priority: "normal", deadline: D(4), status: "todo", effort: "M", tags: ["doi-soat"] }));
  // UHero — Growth & E-commerce
  t.push(T(n++, { name: "Test 5 creative giá đỡ điện thoại trên TikTok Ads", desc: "Chạy test ma trận 5 creative × 2 audience, budget 300K/ngày/ad set. Kill ad CPA > 45K sau 3 ngày.", deliverable: "Bảng kết quả test + đề xuất creative scale", creatorId: "trung", assignerId: "trung", ownerId: "kiet", approverId: "trung", deptId: "growth_uh", projectId: "prj7", type: "project", priority: "high", deadline: D(4), status: "doing", progress: 40, effort: "M", tags: ["uhero", "ads"] }));
  t.push(T(n++, { name: "Phân tích đối thủ giá đỡ trên Kalodata", desc: "Top 10 shop giá đỡ điện thoại TikTok Shop: giá, angle, KOC đang dùng, GMV ước tính.", deliverable: "File phân tích đối thủ", creatorId: "trung", assignerId: "trung", ownerId: "kiet", approverId: null, deptId: "growth_uh", projectId: "prj7", type: "project", priority: "normal", deadline: D(7), status: "todo", progress: 0, effort: "M", tags: ["uhero"] }));
  t.push(T(n++, { name: "Setup gian hàng Shopee UHero cho giá đỡ V2", desc: "Trang sản phẩm, ảnh bộ, video 30s, đăng ký Flash Sale tuần launch.", deliverable: "Link gian hàng hoàn chỉnh", creatorId: "duc", assignerId: "duc", ownerId: "ngan", approverId: "duc", deptId: "ecom_uh", projectId: "prj7", type: "project", priority: "high", deadline: D(5), status: "doing", progress: 55, effort: "M", tags: ["uhero"] }));
  t.push(T(n++, { name: "Đối soát đơn hoàn UHero tháng 6", desc: "Đối soát đơn hoàn/hủy Shopee + TikTok Shop UHero, tách lý do hoàn theo nhóm.", deliverable: "File đối soát + phân loại lý do hoàn", creatorId: "duc", assignerId: "duc", ownerId: "ngan", approverId: "duc", deptId: "ecom_uh", type: "dept", priority: "normal", deadline: D(-1), status: "review", progress: 100, effort: "S", tags: ["uhero"], logs: [{ id: uid("l"), userId: "ngan", at: Date.now() - 8 * 3600000, text: "gửi duyệt công việc" }] }));
  t.push(T(n++, { name: "Đàm phán MOQ giá đỡ V2 với NCC", desc: "MOQ hiện tại 500 chiếc/màu quá cao cho pha test. Mục tiêu: 200/màu hoặc mix màu.", deliverable: "Báo giá mới có xác nhận NCC", creatorId: "trung", assignerId: null, ownerId: "son", collaboratorIds: ["kiet"], approverId: null, deptId: "proc", coDeptIds: ["growth_uh"], projectId: "prj7", type: "cross", priority: "urgent", deadline: D(-1), status: "waiting", progress: 30, effort: "M", overdueReason: "NCC hẹn trả lời sau kỳ nghỉ", tags: ["uhero"] }));
  t.push(T(n++, { name: "Quay 5 video demo giá đỡ UHero", desc: "5 video demo gắn trên ô tô thực tế: rung lắc, một tay thao tác, xoay 360.", deliverable: "5 video final 9:16", creatorId: "trung", assignerId: "trung", ownerId: "tung", approverId: "trung", deptId: "media", coDeptIds: ["growth_uh"], projectId: "prj7", type: "cross", priority: "normal", deadline: D(9), status: "todo", progress: 0, effort: "L", tags: ["uhero", "video"] }));

  // Misc filling to ~50 with varied states
  const fill = [
    ["Viết 10 kịch bản KOC găng tập theo angle 6P", "content", "mai", "linh", "doing", D(5), "normal", "M", null],
    ["Dựng 5 video KOC đã quay tuần trước", "media", "tung", "dat", "doing", D(2), "normal", "M", null],
    ["Chốt lịch post 20 KOC tháng này", "koc", "thao", "trang", "doing", D(4), "normal", "M", null],
    ["Trả lời đánh giá 1-2 sao trên Shopee", "cx", "nhung", null, "doing", D(0), "high", "S", null],
    ["Đặt PO bổ sung SKU găng tập size M", "proc", "son", null, "review", D(1), "high", "S", "ha"],
    ["Nhập kho lô hàng đai lưng 2.000 chiếc", "wh", "hoa", null, "todo", D(9), "normal", "L", null],
    ["Xuất hoá đơn cho 3 đơn B2B tháng này", "acct", "yen", null, "todo", D(6), "normal", "S", null],
    ["Follow-up 5 lead B2B từ hội chợ", "b2b", "quan", null, "doing", D(2), "normal", "M", null],
    ["Cập nhật hồ sơ nhân sự mới tháng này", "hr", "vy", null, "done", D(-2), "low", "S", null],
    ["Tối ưu 3 chiến dịch ads đang chạy theo Rule Engine", "brand", "khai", "minh", "doing", D(1), "high", "M", null],
    ["Viết SOP phản hồi khiếu nại chuẩn", "cx", "nhung", null, "revise", D(3), "normal", "M", "ha"],
    ["Quay 3 video test angle mới cho bình giữ nhiệt", "media", "tung", "dat", "todo", D(8), "low", "M", null],
    ["Shortlist 30 KOC ngách mẹ bỉm cho UHero", "koc", "thao", "trang", "todo", D(11), "normal", "M", null],
    ["Đăng ký voucher sàn tháng tới", "ecom", "phuc", "ha", "todo", D(13), "normal", "S", null],
    ["Kiểm kê kho định kỳ tháng", "wh", "hoa", null, "todo", D(15), "normal", "L", null],
    ["Đánh giá 2 NCC mới cho dòng bình nước", "proc", "son", null, "doing", D(7), "normal", "M", null],
    ["Làm dashboard theo dõi hoa hồng affiliate", "aff", "huy", "minh", "paused", D(20), "low", "L", null],
    ["Chuẩn bị tài liệu training CSKH mới", "hr", "vy", null, "doing", D(10), "normal", "M", null],
    ["Viết bài PR ra mắt Nevor Care", "content", "mai", "linh", "todo", D(21), "low", "M", null],
    ["Tổng hợp feedback khách về đai lưng bản cũ", "cx", "nhung", null, "done", D(-4), "normal", "M", null],
    ["Set up tracking UTM cho campaign Vu Lan", "brand", "khai", "minh", "done", D(-1), "high", "S", null],
    ["Chụp ảnh sản phẩm bình giữ nhiệt màu mới", "media", "tung", "dat", "done", D(-3), "normal", "S", null],
    ["Đối soát phí sàn Shopee tháng trước", "acct", "yen", null, "doing", D(3), "normal", "M", null],
    ["Lên danh sách quà tặng kèm campaign 9.9", "ecom", "phuc", "ha", "todo", D(16), "normal", "S", null],
    ["Rà soát hợp đồng usage rights KOC sắp hết hạn", "koc", "thao", "trang", "todo", D(5), "high", "S", null],
  ];
  fill.forEach(([name, deptId, ownerId, assignerId, status, deadline, priority, effort, approverId]) => {
    const done = status === "done";
    t.push(T(n++, {
      name, deptId, ownerId, assignerId, creatorId: assignerId || ownerId, approverId,
      status, deadline, priority, effort, type: "dept",
      progress: done ? 100 : status === "review" ? 100 : status === "doing" ? 40 : status === "revise" ? 75 : 0,
      completedAt: done ? new Date(deadline + "T17:00:00").getTime() : null,
      confirmedById: done ? (approverId || ownerId) : null,
      approvedAt: done && approverId ? Date.now() - DAY : null,
      pauseReason: status === "paused" ? "Ưu tiên nguồn lực cho launch đai lưng" : "",
      revisionNote: status === "revise" ? "Bổ sung ví dụ thực tế cho từng bước" : "",
      revisionCount: status === "revise" ? 1 : 0,
      logs: status === "review" ? [{ id: uid("l"), userId: ownerId, at: Date.now() - 10 * 3600000, text: "gửi duyệt công việc" }] : [],
    }));
  });
  // 1 task chưa có người phụ trách
  t.push(T(n++, { name: "Tìm đơn vị chụp lookbook cho UHero", desc: "Cần chốt đơn vị chụp lookbook phụ kiện ô tô trong tháng.", creatorId: "minh", ownerId: null, deptId: "brand", type: "dept", priority: "normal", deadline: D(12), status: "todo", effort: "M" }));
  return t;
}

/* ---------- Seed: requests ---------- */
function buildRequests(tasks) {
  const R = (n, over) => ({
    id: uid("r"), code: `REQ-${String(n).padStart(3, "0")}`, title: "", content: "",
    fromDeptId: "content", fromUserId: "linh", toDeptId: "rnd", receiverId: null, handlerId: null,
    priority: "normal", proposedDeadline: D(5), agreedDeadline: null, deliverable: "",
    status: "pending", rejectReason: "", attachments: [], comments: [], logs: [], taskId: null,
    createdAt: Date.now() - 3 * DAY, ...over,
  });
  return [
    R(1, { title: "Cung cấp thông tin sản phẩm đai lưng mới", content: "Content cần đủ thông số, chất liệu, size chart và USP để viết trang sản phẩm + brief KOC.", fromDeptId: "content", fromUserId: "linh", toDeptId: "rnd", receiverId: "lan", handlerId: "lan", priority: "urgent", proposedDeadline: D(0), agreedDeadline: D(0), deliverable: "File thông tin sản phẩm chuẩn hoá", status: "processing", logs: [{ id: uid("l"), userId: "lan", at: Date.now() - 2 * DAY, text: "tiếp nhận yêu cầu" }] }),
    R(2, { title: "Gửi hàng mẫu đai lưng cho studio", content: "Booking cần 5 mẫu đủ size gửi tới studio trước lịch quay thứ 5.", fromDeptId: "koc", fromUserId: "trang", toDeptId: "wh", receiverId: "hoa", handlerId: "hoa", priority: "high", proposedDeadline: D(1), agreedDeadline: D(1), deliverable: "5 mẫu + biên bản bàn giao", status: "accepted", logs: [{ id: uid("l"), userId: "hoa", at: Date.now() - DAY, text: "tiếp nhận yêu cầu" }] }),
    R(3, { title: "Bàn giao mẫu quay cho Media", content: "Media cần mẫu quay bình giữ nhiệt màu mới trong tuần này.", fromDeptId: "media", fromUserId: "dat", toDeptId: "rnd", priority: "normal", proposedDeadline: D(4), deliverable: "2 mẫu màu mới", status: "pending" }),
    R(4, { title: "Xử lý lỗi sản phẩm lô găng tập GT-102", content: "CX nhận 9 khiếu nại bung chỉ cùng lô. Đề nghị Thu mua làm việc với NCC về phương án đổi trả.", fromDeptId: "cx", fromUserId: "nhung", toDeptId: "proc", receiverId: "son", handlerId: "son", priority: "high", proposedDeadline: D(3), agreedDeadline: D(4), deliverable: "Phương án xử lý từ NCC + số lượng đổi trả", status: "processing", logs: [{ id: uid("l"), userId: "son", at: Date.now() - DAY, text: "tiếp nhận, đề xuất lùi hạn 1 ngày (đã thống nhất)" }] }),
    R(5, { title: "Thiết kế banner deal hội viên", content: "E-commerce cần banner deal hội viên cho trang shop, size theo template Shopee.", fromDeptId: "ecom", fromUserId: "ha", toDeptId: "media", receiverId: "dat", handlerId: "tung", priority: "normal", proposedDeadline: D(2), agreedDeadline: D(2), deliverable: "Banner PNG + file gốc", status: "delivered", logs: [{ id: uid("l"), userId: "tung", at: Date.now() - 6 * 3600000, text: "bàn giao kết quả" }] }),
    R(6, { title: "Bổ sung chứng từ booking tháng trước", content: "Kế toán cần 8 chứng từ thanh toán KOC còn thiếu để chốt sổ.", fromDeptId: "acct", fromUserId: "yen", toDeptId: "koc", receiverId: "trang", handlerId: "thao", priority: "high", proposedDeadline: D(1), agreedDeadline: D(1), deliverable: "8 chứng từ scan đầy đủ", status: "accepted" }),
    R(7, { title: "Cung cấp số liệu tồn kho cho kế hoạch 9.9", content: "E-commerce cần số tồn hiện tại của 40 SKU chủ lực để lên kế hoạch deal.", fromDeptId: "ecom", fromUserId: "phuc", toDeptId: "wh", priority: "normal", proposedDeadline: D(6), deliverable: "File tồn kho 40 SKU", status: "pending" }),
    R(8, { title: "Hỗ trợ nội dung email chào hàng B2B", content: "B2B cần Content viết 2 mẫu email chào hàng cho chuỗi gym và spa.", fromDeptId: "b2b", fromUserId: "quan", toDeptId: "content", receiverId: "linh", priority: "low", proposedDeadline: D(8), deliverable: "2 mẫu email", status: "info", logs: [{ id: uid("l"), userId: "linh", at: Date.now() - DAY, text: "cần bổ sung: gửi kèm bảng giá B2B và tệp khách mục tiêu" }] }),
    R(9, { title: "Làm video recap campaign tháng trước", content: "Brand cần video recap 60s cho báo cáo nội bộ.", fromDeptId: "brand", fromUserId: "minh", toDeptId: "media", receiverId: "dat", priority: "low", proposedDeadline: D(-2), agreedDeadline: D(-2), deliverable: "Video 60s", status: "confirmed", logs: [{ id: uid("l"), userId: "minh", at: Date.now() - DAY, text: "xác nhận hoàn thành" }] }),
    R(10, { title: "Mượn nhân sự hỗ trợ đóng gói campaign", content: "Kho đề nghị HCNS điều phối 2 nhân sự hỗ trợ đóng gói 3 ngày cao điểm.", fromDeptId: "wh", fromUserId: "hoa", toDeptId: "hr", receiverId: "vy", priority: "normal", proposedDeadline: D(2), deliverable: "2 nhân sự hỗ trợ theo lịch", status: "rejected", rejectReason: "Nhân sự HCNS đang phục vụ đợt tuyển dụng, đề nghị thuê thời vụ (đã gửi danh sách đơn vị)", logs: [{ id: uid("l"), userId: "vy", at: Date.now() - DAY, text: "từ chối yêu cầu" }] }),
  ];
}

/* ---------- Seed: documents ---------- */
const SEED_DOCS = [
  { name: "Báo cáo Booking KOC tuần", type: "File báo cáo phòng ban", deptId: "koc", ownerId: "trang", link: "https://docs.google.com/novix/bao-cao-booking", desc: "File báo cáo tuần của Booking KOC, cập nhật thứ 6.", tags: ["bao-cao"] },
  { name: "Báo cáo doanh số ngày các shop", type: "Google Sheets", deptId: "ecom", ownerId: "ha", link: "https://docs.google.com/novix/doanh-so-ngay", desc: "Doanh số ngày Shopee + TikTok Shop, cập nhật trước 10h sáng.", tags: ["bao-cao"] },
  { name: "SOP phản hồi khiếu nại", type: "SOP", deptId: "cx", ownerId: "nhung", link: "https://drive.google.com/novix/sop-khieu-nai", desc: "Quy trình phản hồi khiếu nại trong SLA 24h.", tags: ["sop"] },
  { name: "Kế hoạch launch đai lưng", type: "File kế hoạch", deptId: "brand", ownerId: "minh", link: "https://drive.google.com/novix/launch-dai-lung", desc: "Kế hoạch launch 4 pha theo playbook.", tags: ["launch"] },
  { name: "Brief KOC template chuẩn", type: "Biểu mẫu", deptId: "content", ownerId: "linh", link: "https://docs.google.com/novix/brief-koc-template", desc: "Template brief KOC: 6P angle + mandatory shots.", tags: ["koc", "template"] },
  { name: "File đối soát COD", type: "Google Sheets", deptId: "acct", ownerId: "yen", link: "https://docs.google.com/novix/doi-soat-cod", desc: "Đối soát COD tuần với đơn vị vận chuyển.", tags: ["doi-soat"] },
  { name: "Danh mục tồn kho 129 SKU", type: "Google Sheets", deptId: "wh", ownerId: "hoa", link: "https://docs.google.com/novix/ton-kho-129sku", desc: "Danh mục tồn kho realtime, đồng bộ từ hệ thống.", tags: ["kho"] },
  { name: "Hướng dẫn checklist pre-live", type: "Tài liệu hướng dẫn", deptId: "media", ownerId: "dat", link: "https://drive.google.com/novix/pre-live-checklist", desc: "Checklist 80-10-10 trước mỗi phiên livestream.", tags: ["live"] },
  { name: "Bảng giá B2B hiện hành", type: "Google Drive", deptId: "b2b", ownerId: "quan", link: "https://drive.google.com/novix/bang-gia-b2b", desc: "Bảng giá số lượng lớn theo tier.", tags: ["b2b"] },
  { name: "KPI khung theo phòng ban", type: "File KPI", deptId: "hr", ownerId: "vy", link: "https://docs.google.com/novix/kpi-khung", desc: "Khung KPI tham chiếu (không tính lương trong app).", tags: ["kpi"] },
].map((d, i) => ({ id: `doc${i + 1}`, access: "Toàn công ty", updatedAt: Date.now() - (i + 1) * DAY, ...d }));

/* ---------- buildSeed ---------- */
function buildSeed() {
  const tasks = buildTasks();
  const requests = buildRequests(tasks);
  /* Gắn brand: kế thừa từ phòng ban brand-specific → dự án → từ khóa; còn lại là Chung (null) */
  const brandOfDept = (id) => SEED_DEPTS.find((d) => d.id === id)?.brandId || null;
  const brandOfPrj = (id) => SEED_PROJECTS.find((p) => p.id === id)?.brandId || null;
  tasks.forEach((t) => {
    const hay = (t.name + " " + t.tags.join(" ")).toLowerCase();
    t.brandId = brandOfDept(t.deptId) || brandOfPrj(t.projectId) || (hay.includes("uhero") ? "uhero" : hay.includes("đai lưng") || hay.includes("nevor") || hay.includes("vu lan") ? "nevor" : null);
  });
  requests.forEach((r) => {
    r.brandId = brandOfDept(r.fromDeptId) || brandOfDept(r.toDeptId) || ((r.title + r.content).toLowerCase().includes("đai lưng") ? "nevor" : null);
    r.deadlineProposals = r.deadlineProposals || [];
    r.reqType = r.reqType || null;
    r.pendingHandlerId = r.pendingHandlerId || null;
  });
  /* Chuẩn hoá field mới: visibility, confidential, expected/actual output, khoá sau duyệt, category */
  tasks.forEach((t) => {
    t.visibility = t.visibility || (t.type === "personal" ? "private" : t.projectId ? "project" : "department");
    t.isConfidential = t.isConfidential || false;
    t.allowedViewerIds = t.allowedViewerIds || [];
    t.confidentialReason = t.confidentialReason || "";
    t.category = t.category || "GENERAL";
    t.acceptance = t.acceptance || "";
    t.locked = t.locked || false;
    t.requiresAck = t.requiresAck || false;
    t.ackedAt = t.ackedAt || null;
    t.actual = t.actual || (["review", "done"].includes(t.status)
      ? { summary: "Đã bàn giao kết quả theo yêu cầu trong mô tả.", links: t.reportLink ? [t.reportLink] : [], note: "", submittedAt: Date.now() - 6 * 3600000 }
      : { summary: "", links: [], note: "", submittedAt: null });
    if (t.status === "done" && t.approverId) t.locked = true;
  });
  /* 2 task HR mật mẫu để test bảo mật */
  tasks.push({
    id: uid("t"), code: `NVX-${String(tasks.length + 1).padStart(3, "0")}`, name: "Đánh giá thử việc KOC Executive (Thảo)",
    desc: "Leader hoàn thành phiếu đánh giá cuối kỳ theo biểu mẫu. Không trao đổi kết quả với nhân sự trước khi CEO duyệt.",
    deliverable: "Phiếu đánh giá cuối kỳ đã điền", acceptance: "Đủ 5 nhóm tiêu chí, có nhận xét định tính, có đề xuất",
    creatorId: "vy", assignerId: "vy", ownerId: "trang", collaboratorIds: ["vy"], approverId: "ceo",
    deptId: "hr", coDeptIds: ["koc"], projectId: null, type: "cross", priority: "high", brandId: null,
    start: D(-3), deadline: D(2), status: "doing", progress: 30, effort: "S", checklist: [],
    reportLink: "", driveLink: "", attachments: [], tags: ["hr"], comments: [], category: "HR_PROBATION",
    logs: [{ id: uid("l"), userId: "vy", at: Date.now() - DAY, text: "tạo công việc", action: "create" }],
    pauseReason: "", overdueReason: "", revisionCount: 0, revisionNote: "", completedAt: null, confirmedById: null, approvedAt: null,
    recurrence: null, pinnedBy: [], createdAt: Date.now() - DAY, updatedAt: Date.now() - DAY, deadlineConfirmed: true, deadlineHistory: [],
    visibility: "private", isConfidential: true, allowedViewerIds: [], confidentialReason: "Chứa đánh giá cá nhân nhân sự",
    locked: false, requiresAck: false, ackedAt: null, actual: { summary: "", links: [], note: "", submittedAt: null },
  });
  tasks.push({
    id: uid("t"), code: `NVX-${String(tasks.length + 1).padStart(3, "0")}`, name: "Nhắc nhân sự Media bổ sung CCCD",
    desc: "Hồ sơ còn thiếu bản sao CCCD. Nhắc bổ sung vào thư mục Drive hồ sơ cá nhân (đã phân quyền).",
    deliverable: "Hồ sơ ghi nhận Đã nhận", acceptance: "File nằm đúng thư mục, đặt tên đúng chuẩn",
    creatorId: "vy", assignerId: "vy", ownerId: "vy", collaboratorIds: [], approverId: null,
    deptId: "hr", coDeptIds: [], projectId: null, type: "dept", priority: "normal", brandId: null,
    start: D(-1), deadline: D(4), status: "todo", progress: 0, effort: "S", checklist: [],
    reportLink: "", driveLink: "", attachments: [], tags: ["hr"], comments: [], category: "HR_DOCUMENT",
    logs: [{ id: uid("l"), userId: "vy", at: Date.now() - DAY, text: "tạo công việc", action: "create" }],
    pauseReason: "", overdueReason: "", revisionCount: 0, revisionNote: "", completedAt: null, confirmedById: null, approvedAt: null,
    recurrence: null, pinnedBy: [], createdAt: Date.now() - DAY, updatedAt: Date.now() - DAY, deadlineConfirmed: true, deadlineHistory: [],
    visibility: "department", isConfidential: true, allowedViewerIds: [], confidentialReason: "Liên quan giấy tờ cá nhân",
    locked: false, requiresAck: false, ackedAt: null, actual: { summary: "", links: [], note: "", submittedAt: null },
  });
  const findT = (name) => tasks.find((t) => t.name === name);
  const notifs = [];
  const N = (userId, type, level, text, extra = {}) => notifs.push({ id: uid("n"), userId, type, level, text, at: Date.now() - Math.random() * 2 * DAY, read: false, ...extra });
  N("linh", "approve", "act", "Mai đã gửi duyệt: Hoàn thiện brief KOC cho đai lưng", { taskId: findT("Hoàn thiện brief KOC cho đai lưng")?.id });
  N("ceo", "approve", "act", "Nhung đã gửi duyệt: Duyệt ngân sách ZNS tháng đầu cho Zalo OA", { taskId: findT("Duyệt ngân sách ZNS tháng đầu cho Zalo OA")?.id });
  N("ceo", "approve", "act", "Tùng đã gửi duyệt: Duyệt video hướng dẫn sử dụng đai lưng", { taskId: findT("Duyệt video hướng dẫn sử dụng đai lưng")?.id });
  N("nhung", "overdue", "urgent", "Quá hạn 3 ngày: Xử lý 12 đơn khiếu nại chưa phản hồi", { taskId: findT("Xử lý 12 đơn khiếu nại chưa phản hồi")?.id });
  N("tung", "revise", "act", "Hà yêu cầu chỉnh sửa: Thiết kế banner campaign Vu Lan", { taskId: findT("Thiết kế banner campaign Vu Lan")?.id });
  N("hoa", "request", "act", "Yêu cầu phối hợp mới từ Booking KOC: Gửi hàng mẫu đai lưng cho studio", { requestId: requests[1].id });
  N("lan", "assign", "info", "Bạn được giao: Chốt thông tin sản phẩm đai lưng mới", { taskId: findT("Chốt thông tin sản phẩm đai lưng mới")?.id });
  /* Blocker cấu trúc: chuyển issues text → object đầy đủ (owner/severity/due/next action) */
  const SEV_GUESS = { i1: "high", i2: "medium", i3: "high", i4: "medium", i5: "high" };
  SEED_PROJECTS.forEach((p) => {
    p.issues = (p.issues || []).map((i) => ({
      id: i.id, title: i.text, desc: "", severity: SEV_GUESS[i.id] || "medium",
      ownerId: p.ownerId, deptId: SEED_DEPTS.find((d) => p.deptIds.includes(d.id))?.id || null,
      dueDate: D(3), nextAction: i.resolved ? "" : "Cập nhật trạng thái trong buổi sync tuần",
      status: i.resolved ? "RESOLVED" : "OPEN", relatedTaskId: null, escalation: 0,
      createdAt: Date.now() - 4 * DAY, resolvedAt: i.resolved ? Date.now() - DAY : null,
      resolutionNote: i.resolved ? "Đã xử lý (chuyển đổi từ dữ liệu cũ)" : "",
    }));
  });
  /* Recurring: chuyển task recurrence → template + instance hôm nay; scheduler sẽ sinh kỳ mới */
  const recurrings = [];
  tasks.forEach((t) => {
    if (!t.recurrence) return;
    const tplId = uid("rc");
    recurrings.push({
      id: tplId, name: t.name, paused: false, endDate: null, startDate: iso(Date.now() - 30 * DAY),
      rule: t.recurrence === "daily" ? { freq: "daily" } : t.recurrence === "weekly" ? { freq: "weekly", weekday: new Date().getDay() } : { freq: "monthly", dayOfMonth: new Date().getDate(), monthlyMode: "clamp" },
      taskDefaults: { name: t.name, desc: t.desc, deliverable: t.deliverable, ownerId: t.ownerId, assignerId: t.assignerId, approverId: t.approverId, deptId: t.deptId, priority: t.priority, effort: t.effort, tags: t.tags, brandId: t.brandId || null, category: t.category || "GENERAL" },
      generated: { [`${tplId}:${todayISO()}`]: t.id },
    });
    t.recurringTemplateId = tplId; t.occurrenceDate = todayISO();
  });
  /* Seed quy trình HR mẫu để workspace không trống */
  const hrProcesses = [];
  {
    const mk = (over) => ({
      id: uid("t"), code: `NVX-${String(tasks.length + 1).padStart(3, "0")}`, desc: "Thuộc quy trình Onboarding của Ngân (E-commerce – UHero).",
      deliverable: "", acceptance: "", creatorId: "vy", assignerId: "vy", ownerId: "vy", collaboratorIds: [], approverId: null,
      deptId: "hr", coDeptIds: ["ecom_uh"], projectId: null, type: "cross", priority: "normal", brandId: null,
      start: D(-6), deadline: D(-2), status: "done", progress: 100, effort: "S", checklist: [],
      reportLink: "", driveLink: "", attachments: [], tags: ["hr", "onboarding"], comments: [],
      logs: [{ id: uid("l"), userId: "vy", at: Date.now() - 5 * DAY, text: "tạo từ quy trình Onboarding", action: "create" }],
      pauseReason: "", overdueReason: "", revisionCount: 0, revisionNote: "", completedAt: Date.now() - 2 * DAY, confirmedById: "vy", approvedAt: null,
      recurrence: null, pinnedBy: [], createdAt: Date.now() - 5 * DAY, updatedAt: Date.now() - DAY, deadlineConfirmed: true, deadlineHistory: [],
      visibility: "department", isConfidential: false, allowedViewerIds: [], confidentialReason: "",
      category: "HR_ONBOARDING", locked: false, requiresAck: false, ackedAt: null,
      actual: { summary: "Đã hoàn tất theo checklist onboarding.", links: [], note: "", submittedAt: Date.now() - 2 * DAY },
      ...over,
    });
    const ob = [
      mk({ name: "Xác nhận ngày bắt đầu với nhân sự — Ngân" }),
      mk({ name: "Tạo email công ty & tài khoản phần mềm — Ngân", ownerId: "admin", approverId: "vy" }),
      mk({ name: "Bàn giao JD và mục tiêu 30 ngày — Ngân", ownerId: "duc", approverId: "vy", status: "doing", progress: 60, deadline: D(0), completedAt: null, actual: { summary: "", links: [], note: "", submittedAt: null } }),
      mk({ name: "Nhân sự xác nhận đã đọc nội quy & tài liệu — Ngân", ownerId: "ngan", requiresAck: true, status: "todo", progress: 0, deadline: D(1), completedAt: null, actual: { summary: "", links: [], note: "", submittedAt: null } }),
      mk({ name: "Check-in sau 7 ngày — Ngân", ownerId: "duc", status: "todo", progress: 0, deadline: D(3), completedAt: null, actual: { summary: "", links: [], note: "", submittedAt: null } }),
    ];
    ob.forEach((t) => tasks.push(t));
    hrProcesses.push({ id: uid("hp"), type: "onboarding", personName: "Ngân", userId: "ngan", deptId: "ecom_uh", startDate: D(-6), taskIds: ob.map((t) => t.id), status: "active", createdAt: Date.now() - 6 * DAY, closedAt: null, closeNote: "" });
    const probTask = tasks.find((t) => t.name === "Đánh giá thử việc KOC Executive (Thảo)");
    if (probTask) hrProcesses.push({ id: uid("hp"), type: "probation", personName: "Thảo", userId: "thao", deptId: "koc", startDate: D(-58), taskIds: [probTask.id], status: "active", createdAt: Date.now() - 58 * DAY, closedAt: null, closeNote: "" });
  }
  return {
    schema: 2, users: SEED_USERS, depts: SEED_DEPTS, projects: SEED_PROJECTS,
    roleLogs: [], sentAlerts: {}, hrProcesses, recurrings,
    tasks, requests, docs: SEED_DOCS, notifs, savedFilters: [
      { id: "sf1", userId: "linh", name: "Việc phòng Content quá hạn", filter: { deptId: "content", quick: "overdue" } },
      { id: "sf2", userId: "ha", name: "Việc chờ tôi duyệt", filter: { quick: "myApprovals" } },
    ],
  };
}
/* ============================================================
   Context, permissions & actions
   ============================================================ */
const Ctx = createContext(null);
const useApp = () => useContext(Ctx);

const userById = (db, id) => db.users.find((u) => u.id === id) || null;
const deptById = (db, id) => db.depts.find((d) => d.id === id) || null;
const projById = (db, id) => db.projects.find((p) => p.id === id) || null;
const deptLeader = (db, deptId) => { const d = deptById(db, deptId); return d?.leaderId ? userById(db, d.leaderId) : null; };

/* ============================================================
   PERMISSION LAYER — quyền tách theo từng hành động.
   Đây là service layer duy nhất quyết định quyền; UI chỉ đọc kết quả.
   Khi lên production, mỗi hàm map sang 1 nhóm RLS policy Supabase.
   ============================================================ */
const involved = (me, t) => [t.ownerId, t.creatorId, t.assignerId, t.approverId, ...(t.collaboratorIds || []), ...(t.allowedViewerIds || [])].includes(me.id);
const isMgr = (u) => !!u && (u.role === "admin" || u.role === "ceo");
const isHrLeader = (db, u) => !!u && deptById(db, "hr")?.leaderId === u.id;
const isDeptLeader = (db, u, deptId) => !!u && u.role === "leader" && u.deptId === deptId;
const isProjOwner = (db, u, t) => !!t.projectId && projById(db, t.projectId)?.ownerId === u.id;
const inProject = (db, u, projectId) => { const p = projById(db, projectId); return !!p && (p.ownerId === u.id || (p.watcherIds || []).includes(u.id) || p.deptIds.includes(u.deptId)); };
/* quyền quản lý task = leader phòng sở hữu / project owner / admin / ceo */
const canManage = (db, u, t) => isMgr(u) || isDeptLeader(db, u, t.deptId) || isProjOwner(db, u, t);

/* ---- Quyền xem dữ liệu BẢO MẬT — tách riêng, KHÔNG cấp mặc định cho system admin ----
   Hồ sơ nhân sự (task mật thuộc phòng HR): chỉ người liên quan, Leader HR,
   CEO, hoặc người được cấp cờ hrConfidentialAccess. Quản trị hệ thống (role admin)
   KHÔNG tự động thấy hồ sơ HR — "admin kỹ thuật ≠ quyền xem hồ sơ nhân sự".
   Task mật ngoài HR (vd tài chính nhạy cảm): người liên quan + leader phòng + admin/ceo. */
const canSeeConfidential = (db, u, t) => {
  if (!u || !t) return false;
  if (involved(u, t)) return true;
  /* Hồ sơ nhân sự: HR leader / CEO / người được cấp cờ — KHÔNG có system admin */
  if (t.deptId === "hr") return isHrLeader(db, u) || u.role === "ceo" || u.hrConfidentialAccess === true;
  /* Task mật ngoài HR: giữ nguyên hành vi cũ — chỉ manager hệ thống (admin/ceo), không mở cho leader phòng */
  return isMgr(u);
};

const perms = {
  view(db, u, t) {
    if (!u || !t) return false;
    /* task mật: gate bảo mật áp dụng cả khi đã xóa — xóa không được mở rộng quyền xem */
    const confOk = !t.isConfidential || canSeeConfidential(db, u, t);
    if (t.deleted) return canManage(db, u, t) && confOk;
    if (t.isConfidential) return confOk;
    const vis = t.visibility || "department";
    if (vis === "private") return involved(u, t);
    if (isMgr(u)) return true;
    if (vis === "company") return true;
    if (vis === "project") return involved(u, t) || inProject(db, u, t.projectId) || isDeptLeader(db, u, t.deptId);
    return involved(u, t) || t.deptId === u.deptId || t.coDeptIds.includes(u.deptId) || isDeptLeader(db, u, t.deptId);
  },
  viewConfidential(db, u, t) { return t.isConfidential && this.view(db, u, t); },
  editContent(db, u, t) { return !t.locked && !t.deleted && (t.ownerId === u.id || t.assignerId === u.id || canManage(db, u, t)); },
  updateProgress(db, u, t) { return !t.locked && t.status !== "done" && (t.ownerId === u.id || canManage(db, u, t)); },
  changeStatus(db, u, t) { return !t.locked && !t.deleted && (t.ownerId === u.id || canManage(db, u, t)); },
  changeAssignee(db, u, t) { return !t.deleted && (canManage(db, u, t) || (t.type === "personal" && t.creatorId === u.id)); },
  changeApprover(db, u, t) { return !t.deleted && canManage(db, u, t); },
  changeDeadline(db, u, t) { return !t.locked && !t.deleted && (canManage(db, u, t) || (t.ownerId === u.id && !t.deadlineConfirmed)); },
  deleteTask(db, u, t) { return !t.deleted && (canManage(db, u, t) || (t.type === "personal" && t.creatorId === u.id)); },
  restoreTask(db, u, t) { return !!t.deleted && canManage(db, u, t); },
  submitForApproval(db, u, t) { return !t.locked && t.ownerId === u.id; },
  approve(db, u, t) { return t.approverId === u.id && t.ownerId !== u.id; },
  requestRevision(db, u, t) { return (t.approverId === u.id && t.ownerId !== u.id) || canManage(db, u, t); },
  manageChecklist(db, u, t) { return !t.locked && (t.ownerId === u.id || canManage(db, u, t)); },
  /* Collaborator chỉ tick checklist item được giao cho mình — canToggleItem kiểm tra cid cụ thể */
  toggleChecklist(db, u, t) { return !t.locked && (t.ownerId === u.id || canManage(db, u, t) || t.collaboratorIds.includes(u.id)); },
  canToggleChecklistItem(db, u, t, c) {
    if (t.locked) return false;
    if (t.ownerId === u.id || canManage(db, u, t)) return true;
    /* collaborator: chỉ tick item có assigneeId === mình */
    if (t.collaboratorIds.includes(u.id)) return c.ownerId === u.id;
    return false;
  },
  comment(db, u, t) { return this.view(db, u, t) && !t.deleted; },
  attach(db, u, t) { return !t.locked && this.view(db, u, t) && !t.deleted; },
  bulkTarget(db, u, t) { return !t.locked && !t.deleted && (t.ownerId === u.id || canManage(db, u, t)); },
  reopen(db, u, t) { return t.locked && canManage(db, u, t); },
  changeVisibility(db, u, t) { return t.creatorId === u.id || canManage(db, u, t); },
};

/* ---- Quyền cập nhật task theo TỪNG trường — updateTask không còn là cửa hậu ----
   Mỗi field chỉ được sửa nếu perms tương ứng cho phép. Các trường nhạy cảm
   (status/deadline/locked…) phải đi qua action riêng, cấm sửa trực tiếp. */
const TASK_FIELD_PERM = {
  name: "editContent", desc: "editContent", deliverable: "editContent", acceptance: "editContent",
  reportLink: "editContent", driveLink: "editContent", tags: "editContent",
  brandId: "editContent", start: "editContent", effort: "editContent", priority: "editContent",
  collaboratorIds: "editContent",
  ownerId: "changeAssignee",
  approverId: "changeApprover",
  visibility: "changeVisibility", isConfidential: "changeVisibility", confidentialReason: "changeVisibility",
  progress: "updateProgress",
};
/* Trường buộc phải đổi qua action chuyên biệt (changeStatus/changeDeadline/approve…) */
const TASK_FIELD_FORBIDDEN = new Set([
  "id", "code", "createdAt", "logs", "comments", "checklist", "attachments",
  "status", "deadline", "deadlineConfirmed", "deadlineHistory",
  "locked", "deleted", "approvedAt", "completedAt", "confirmedById",
  "actual", "ackedAt", "requiresAck", "revisionCount", "revisionNote", "creatorId", "assignerId",
]);
/* Trả về {ok} nếu user được phép áp toàn bộ patch lên task; nếu không, {ok:false, msg} */
const canApplyTaskPatch = (db, u, t, patch) => {
  for (const k of Object.keys(patch)) {
    if (TASK_FIELD_FORBIDDEN.has(k)) return { ok: false, msg: "Trường này phải đổi qua thao tác riêng, không sửa trực tiếp" };
    const permName = TASK_FIELD_PERM[k];
    if (!permName) return { ok: false, msg: `Trường "${k}" không được phép cập nhật` };
    if (!perms[permName](db, u, t)) return { ok: false, msg: "Bạn không có quyền sửa trường này" };
  }
  return { ok: true };
};

/* ---- quyền tạo & giao task: employee chỉ tạo cho mình; leader trong phòng; project owner trong dự án; liên phòng ban đi qua Yêu cầu phối hợp ---- */
const canCreateTaskFor = (db, u, f) => {
  if (isMgr(u)) return { ok: true };
  const p = f.projectId ? projById(db, f.projectId) : null;
  /* Gắn task vào dự án: phải thuộc phạm vi dự án (owner / phòng nằm trong dự án) — không cho gắn tùy tiện */
  if (p) {
    if (!canViewProject(db, u, p)) return { ok: false, msg: "Bạn không thuộc phạm vi dự án này" };
    if (p.ownerId === u.id) return p.deptIds.includes(f.deptId) ? { ok: true } : { ok: false, msg: "Phòng ban nằm ngoài phạm vi dự án" };
    if (!p.deptIds.includes(f.deptId)) return { ok: false, msg: "Phòng ban nằm ngoài phạm vi dự án" };
  }
  if (u.role === "leader") {
    if (f.deptId !== u.deptId) return { ok: false, msg: "Leader chỉ tạo task trong phòng mình. Việc cần phòng khác → dùng Yêu cầu phối hợp." };
    const ow = f.ownerId ? userById(db, f.ownerId) : null;
    if (ow && ow.deptId !== u.deptId && !isMgr(ow)) return { ok: false, msg: "Chỉ giao việc cho nhân sự trong phòng của bạn" };
    return { ok: true };
  }
  if (f.ownerId && f.ownerId !== u.id) return { ok: false, msg: "Nhân viên chỉ tạo task cho chính mình. Cần người khác xử lý → gửi Yêu cầu phối hợp." };
  if (f.deptId !== u.deptId) return { ok: false, msg: "Chỉ tạo task trong phòng ban của bạn" };
  return { ok: true };
};
/* ---- Approver config: task category → eligible approver roles ---- */
const APPROVER_RULES = {
  GENERAL:      ["leader", "admin", "ceo"],
  CONTENT:      ["leader", "admin"],
  MEDIA:        ["leader", "admin"],
  ECOMMERCE:    ["leader", "admin", "ceo"],
  KOC_BOOKING:  ["leader", "admin"],
  AFFILIATE:    ["leader", "admin"],
  PRODUCT:      ["leader", "admin", "ceo"],
  PURCHASING:   ["leader", "admin", "ceo"],
  WAREHOUSE:    ["leader", "admin"],
  CUSTOMER_EXPERIENCE: ["leader", "admin"],
  FINANCE_SUPPORT:     ["leader", "admin", "ceo"],
  HR_ONBOARDING:       ["leader", "admin"],
  HR_PROBATION:        ["leader", "ceo"],
  HR_TRAINING:         ["leader", "admin"],
  HR_DOCUMENT:         ["leader", "admin"],
  HR_POLICY:           ["leader", "ceo"],
  HR_OFFBOARDING:      ["leader", "admin", "ceo"],
  HR_INTERNAL_SUPPORT: ["leader", "admin"],
};

/* Hàm lấy danh sách người có thể duyệt task — không cho toàn công ty */
const getEligibleApprovers = (db, u, task) => {
  const { deptId, projectId, category, ownerId } = task;
  const allowed = APPROVER_RULES[category] || APPROVER_RULES.GENERAL;
  const p = projectId ? projById(db, projectId) : null;

  if (u.role === "ceo") return db.users.filter((x) => x.id !== ownerId && allowed.includes(x.role));

  if (u.role === "admin") return db.users.filter((x) => x.id !== ownerId && (x.deptId === deptId || x.role === "ceo" || x.role === "admin") && allowed.includes(x.role));

  if (u.role === "leader") {
    const base = db.users.filter((x) => x.id !== ownerId && (x.deptId === u.deptId || (p && p.deptIds.includes(x.deptId))) && allowed.includes(x.role));
    /* CEO approver chỉ khi category cho phép */
    if (allowed.includes("ceo")) return [...base, ...db.users.filter((x) => x.role === "ceo" && x.id !== ownerId && !base.find((y) => y.id === x.id))];
    return base;
  }

  /* Employee: chỉ chọn leader trực tiếp + project owner */
  const leaderOfDept = deptById(db, deptId)?.leaderId;
  const eligible = [];
  if (leaderOfDept && leaderOfDept !== ownerId) eligible.push(db.users.find((x) => x.id === leaderOfDept));
  if (p && p.ownerId !== ownerId) eligible.push(db.users.find((x) => x.id === p.ownerId));
  return eligible.filter(Boolean);
};

/* danh sách người có thể được giao — User selector phải lọc theo quyền, không hiển thị toàn công ty */
const assignableUsers = (db, u, { deptId, projectId } = {}) => {
  const p = projectId ? projById(db, projectId) : null;
  if (p && p.ownerId === u.id) return db.users.filter((x) => p.deptIds.includes(x.deptId));
  if (isMgr(u)) return db.users;
  if (u.role === "leader") return db.users.filter((x) => x.deptId === u.deptId);
  return db.users.filter((x) => x.id === u.id);
};

/* ---- policy xem các entity khác (dùng cho Global Search + trang danh sách) ---- */
const canViewProject = (db, u, p) => !p.deleted && (isMgr(u) || p.ownerId === u.id || (p.watcherIds || []).includes(u.id) || p.deptIds.includes(u.deptId));
/* Quyền xem request — theo visibility field */
const canViewRequest = (db, u, r) => {
  if (r.deleted) return isMgr(u);
  const directly = r.fromUserId === u.id || r.receiverId === u.id || r.handlerId === u.id
    || (r.authorized_sender_ids || []).includes(u.id) || (r.allowedViewerIds || []).includes(u.id);
  if (directly) return true;
  /* Yêu cầu BẢO MẬT (hồ sơ / nghỉ phép / chính sách HR…): chỉ CEO, leader 2 phòng,
     và HR access nếu gửi tới HR — KHÔNG cấp cho system admin (giống gate task mật). */
  if (r.isConfidential) {
    if (u.role === "ceo") return true;
    if (isDeptLeader(db, u, r.fromDeptId) || isDeptLeader(db, u, r.toDeptId)) return true;
    if (r.toDeptId === "hr" && (isHrLeader(db, u) || u.hrConfidentialAccess === true)) return true;
    return false;
  }
  if (isMgr(u)) return true;
  const vis = r.visibility || "BOTH_DEPARTMENTS";
  if (vis === "PRIVATE") return false;
  if (vis === "SENDER_DEPARTMENT") return u.deptId === r.fromDeptId || isDeptLeader(db, u, r.fromDeptId);
  if (vis === "BOTH_DEPARTMENTS") return u.deptId === r.fromDeptId || u.deptId === r.toDeptId || isDeptLeader(db, u, r.fromDeptId) || isDeptLeader(db, u, r.toDeptId);
  if (vis === "PROJECT") return r.projectId ? inProject(db, u, r.projectId) : u.deptId === r.fromDeptId || u.deptId === r.toDeptId;
  if (vis === "COMPANY") return true;
  return false;
};

/* Ai được quyền hủy/xác nhận/gửi lại request (bên gửi) */
const isSenderAuthorized = (db, u, r) => {
  if (isMgr(u)) return true;
  if (r.fromUserId === u.id) return true;
  if (isDeptLeader(db, u, r.fromDeptId)) return true;
  if ((r.authorized_sender_ids || []).includes(u.id)) return true;
  return false;
};
const canViewDoc = (db, u, d) => !d.confidential || u.deptId === "hr" || isMgr(u) || (d.allowedIds || []).includes(u.id);

/* ---- người tiếp nhận yêu cầu của một phòng ban ---- */
const deptReceiverId = (db, deptId) => { const d = deptById(db, deptId); return d?.leaderId || d?.defaultReceiverId || db.users.find((x) => x.role === "admin")?.id || null; };
const isReceiverFor = (db, u, deptId) => { const d = deptById(db, deptId); return isMgr(u) || u.id === d?.leaderId || u.id === d?.defaultReceiverId; };

/* ---- alias tương thích ngược ---- */
const canSeeTask = (db, me, t) => perms.view(db, me, t);
const canEditTask = (me, t) => false; /* deprecated — dùng perms.* */
const canAssignIn = (me, deptId) => false; /* deprecated — dùng assignableUsers/canCreateTaskFor */

const isOverdue = (t) => t.deadline && t.status !== "done" && t.status !== "paused" && daysLeft(t.deadline) < 0;
const isDueSoon = (t) => t.deadline && t.status !== "done" && t.status !== "paused" && daysLeft(t.deadline) >= 0 && daysLeft(t.deadline) <= 3;

function deadlineMeta(t) {
  if (!t.deadline) return { label: "Không có hạn", cls: "text-zinc-400" };
  if (t.status === "done") {
    const late = t.completedAt && iso(t.completedAt) > t.deadline;
    const lateDays = late ? Math.round((new Date(iso(t.completedAt)) - new Date(t.deadline)) / DAY) : 0;
    return late ? { label: `Trễ ${lateDays} ngày`, cls: "text-orange-600" } : { label: "Đúng hạn", cls: "text-emerald-600" };
  }
  const dl = daysLeft(t.deadline);
  if (dl < 0) return { label: `Quá hạn ${-dl} ngày`, cls: "text-red-600 font-medium" };
  if (dl === 0) return { label: "Hôm nay", cls: "text-amber-600 font-medium" };
  if (dl <= 3) return { label: `Còn ${dl} ngày`, cls: "text-amber-600" };
  return { label: fmtD(t.deadline), cls: "text-zinc-500" };
}

/* ---------- pure db mutators ---------- */
const withLog = (t, userId, text, meta = {}) => ({ ...t, updatedAt: Date.now(), logs: [{ id: uid("l"), userId, at: Date.now(), text, ...meta }, ...t.logs] });
const mapTask = (db, id, fn) => ({ ...db, tasks: db.tasks.map((t) => (t.id === id ? fn(t) : t)) });
const mapReq = (db, id, fn) => ({ ...db, requests: db.requests.map((r) => (r.id === id ? fn(r) : r)) });
const pushNotif = (db, n) => ({ ...db, notifs: [{ id: uid("n"), at: Date.now(), read: false, level: "info", ...n }, ...db.notifs] });

function nextTaskCode(db) {
  const max = db.tasks.reduce((m, t) => { const x = parseInt((t.code || "").split("-")[1] || 0, 10); return Math.max(m, x || 0); }, 0);
  return `NVX-${String(max + 1).padStart(3, "0")}`;
}
function nextReqCode(db) {
  const max = db.requests.reduce((m, t) => { const x = parseInt((t.code || "").split("-")[1] || 0, 10); return Math.max(m, x || 0); }, 0);
  return `REQ-${String(max + 1).padStart(3, "0")}`;
}

/* ============================================================
   UI atoms
   ============================================================ */
function Avatar({ id, size = 7 }) {
  const { db } = useApp();
  const u = userById(db, id);
  if (!u) return <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-zinc-300 bg-zinc-100 text-xs text-zinc-400">?</span>;
  const initials = u.name.split(" ").map((w) => w[0]).slice(-2).join("");
  const sz = size === 6 ? "h-6 w-6 text-[10px]" : size === 8 ? "h-8 w-8 text-xs" : "h-7 w-7 text-[11px]";
  return <span title={u.name} className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium ${sz} ${avColor(u.id)}`}>{initials}</span>;
}
function UserChip({ id, dash }) {
  const { db } = useApp();
  const u = userById(db, id);
  if (!u) return <span className="text-xs text-zinc-400 italic">{dash || "Chưa có"}</span>;
  return <span className="inline-flex items-center gap-1.5 text-[13px] text-zinc-700"><Avatar id={id} size={6} />{u.name}</span>;
}
function AvatarGroup({ ids = [], max = 3 }) {
  const show = ids.slice(0, max);
  return (
    <span className="inline-flex items-center -space-x-1.5">
      {show.map((id) => <span key={id} className="ring-2 ring-white rounded-full"><Avatar id={id} size={6} /></span>)}
      {ids.length > max && <span className="ring-2 ring-white rounded-full inline-flex h-6 w-6 items-center justify-center bg-zinc-100 text-zinc-500 text-[10px]">+{ids.length - max}</span>}
    </span>
  );
}
const StatusPill = ({ s }) => { const st = STATUSES[s]; return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${st.pill}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{st.label}</span>; };
const PriorityPill = ({ p }) => <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${PRIORITIES[p].pill}`}>{PRIORITIES[p].label}</span>;
const ReqPill = ({ s }) => <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${REQ_STATUSES[s].pill}`}>{REQ_STATUSES[s].label}</span>;
const BrandChip = ({ id }) => id ? <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${BRANDS[id]?.chip || ""}`}>{BRANDS[id]?.label}</span> : null;
const deptBrand = (db, deptId) => deptById(db, deptId)?.brandId || null;
const DeptTag = ({ id }) => { const { db } = useApp(); const d = deptById(db, id); return d ? <span className="inline-flex rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600 whitespace-nowrap">{d.name}</span> : null; };
const DeadlineBadge = ({ t }) => { const m = deadlineMeta(t); return <span className={`shrink-0 text-xs whitespace-nowrap ${m.cls}`}>{t.deadline && t.status !== "done" && daysLeft(t.deadline) > 3 ? m.label : (t.deadline ? `${fmtD(t.deadline)} · ${m.label}` : m.label)}</span>; };
const ProgressBar = ({ v, cls = "bg-zinc-800" }) => (
  <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden"><div className={`h-full rounded-full ${cls} transition-all`} style={{ width: `${v || 0}%` }} /></div>
);

function UnauthorizedState({ onClose }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6">
      <div className="rounded-full bg-red-50 p-4 mb-4"><Lock className="h-6 w-6 text-red-400" /></div>
      <p className="text-sm font-semibold text-zinc-800 mb-1">Bạn không có quyền truy cập</p>
      <p className="text-xs text-zinc-400 max-w-xs mb-4">Liên hệ Leader hoặc Admin nếu bạn cần quyền xem nội dung này.</p>
      {onClose && <button className={btnSec} onClick={onClose}>Quay lại</button>}
    </div>
  );
}

function EmptyState({ icon: Icon = CheckSquare, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-12 text-center">
      <div className="rounded-full bg-zinc-50 p-3 mb-3"><Icon className="h-5 w-5 text-zinc-400" /></div>
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      {hint && <p className="mt-1 text-xs text-zinc-400 max-w-xs">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-900/30 p-4 pt-[8vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-2xl bg-white shadow-xl border border-zinc-100 max-h-[84vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-zinc-100 text-zinc-400"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
const Field = ({ label, req, children }) => (
  <label className="block mb-3">
    <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}{req && <span className="text-red-500 ml-0.5">*</span>}</span>
    {children}
  </label>
);
/* btnPri / btnSec / btnGhost / inputCls now imported from ./ui/tokens.js */

function UserSelect({ value, onChange, deptId, users, allowEmpty = true, placeholder = "— Chọn người —" }) {
  const { db } = useApp();
  const list = users || db.users.filter((u) => !deptId || u.deptId === deptId || ["admin", "ceo"].includes(u.role));
  return (
    <select className={inputCls} value={value || ""} onChange={(e) => onChange(e.target.value || null)}>
      {allowEmpty && <option value="">{placeholder}</option>}
      {list.map((u) => <option key={u.id} value={u.id}>{u.name} · {deptById(db, u.deptId)?.name}</option>)}
    </select>
  );
}

function Toasts({ toasts }) {
  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm shadow-lg border ${t.type === "warn" ? "bg-amber-50 border-amber-200 text-amber-800" : t.type === "err" ? "bg-red-50 border-red-200 text-red-700" : "bg-zinc-900 border-zinc-800 text-white"}`}>
          {t.type === "warn" ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}
/* ============================================================
   Task drawer
   ============================================================ */
function TaskDrawer({ taskId, onClose }) {
  const { db, me, act, toast, nav } = useApp();
  const t = db.tasks.find((x) => x.id === taskId);
  const [tab, setTab] = useState("activity");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [ckText, setCkText] = useState("");
  const [modal, setModal] = useState(null); // {type:'pause'|'revise'|'deadline'|'delete', ...}
  useEffect(() => { setEditing(false); setDraft(null); setModal(null); }, [taskId]);

  /* Permission guard — phải kiểm tra TRƯỚC khi render bất kỳ nội dung nào */
  if (!t) return null;
  if (!perms.view(db, me, t)) {
    return (
      <div className="fixed inset-0 z-40 flex justify-end bg-zinc-900/20" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="h-full w-full sm:max-w-[560px] bg-white shadow-2xl border-l border-zinc-100 flex flex-col">
          <div className="border-b border-zinc-100 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-800">Chi tiết công việc</span>
            <button onClick={onClose} className="rounded-md p-1.5 hover:bg-zinc-100 text-zinc-400"><X className="h-4 w-4" /></button>
          </div>
          <UnauthorizedState onClose={onClose} />
        </div>
      </div>
    );
  }

  const editable = perms.editContent(db, me, t);
  const canStatus = perms.changeStatus(db, me, t);
  const canOwner = perms.changeAssignee(db, me, t);
  const canApproverSel = perms.changeApprover(db, me, t);
  const canDl = perms.changeDeadline(db, me, t);
  const canProgress = perms.updateProgress(db, me, t);
  const canCkManage = perms.manageChecklist(db, me, t);
  const canCkToggle = perms.toggleChecklist(db, me, t);
  const canAttach = perms.attach(db, me, t);
  const canDel = perms.deleteTask(db, me, t);
  const isOwner = t.ownerId === me.id;
  const isApprover = perms.approve(db, me, t);
  const needsApproval = !!t.approverId;
  const assignList = assignableUsers(db, me, { deptId: t.deptId, projectId: t.projectId });
  const pinned = t.pinnedBy.includes(me.id);

  const startEdit = () => { setDraft({ name: t.name, desc: t.desc, deliverable: t.deliverable, reportLink: t.reportLink, driveLink: t.driveLink, tags: t.tags.join(", ") }); setEditing(true); };
  const saveEdit = () => {
    act.updateTask(t.id, { name: draft.name, desc: draft.desc, deliverable: draft.deliverable, reportLink: draft.reportLink, driveLink: draft.driveLink, tags: draft.tags.split(",").map((s) => s.trim()).filter(Boolean) }, "cập nhật nội dung công việc");
    setEditing(false); toast("Đã lưu thay đổi");
  };
  const onStatus = (s) => {
    if (s === t.status) return;
    if (s === "paused") { setModal({ type: "pause", reason: "" }); return; }
    const r = act.changeStatus(t.id, s);
    if (!r.ok) toast(r.msg, "warn"); else if (r.msg) toast(r.msg);
  };
  const onDeadline = (v) => {
    if (v === t.deadline) return;
    if (t.deadlineConfirmed && t.deadline) setModal({ type: "deadline", value: v, reason: "" });
    else act.changeDeadline(t.id, v, "");
  };

  const Row = ({ label, children }) => (
    <div className="grid grid-cols-[110px_1fr] items-center gap-2 py-1.5">
      <span className="text-xs text-zinc-400">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
  const miniSel = "w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[13px] text-zinc-700 focus:outline-none focus:border-zinc-400";

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-zinc-900/20" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="h-full w-full sm:max-w-[560px] bg-white shadow-2xl border-l border-zinc-100 flex flex-col">
        {/* Header */}
        <div className="border-b border-zinc-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-zinc-400">{t.code}</span>
            <StatusPill s={t.status} />
            <PriorityPill p={t.priority} />
            {t.recurrence && <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-600"><Repeat className="h-3 w-3" />{{ daily: "Hằng ngày", weekly: "Hằng tuần", monthly: "Hằng tháng" }[t.recurrence]}</span>}
            <div className="ml-auto flex items-center gap-1">
              <button className={btnGhost} onClick={() => act.pinToggle(t.id)} title={pinned ? "Bỏ ghim" : "Ghim vào Ưu tiên hôm nay"}>{pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}</button>
              {editable && !editing && <button className={btnGhost} onClick={startEdit}><Edit3 className="h-3.5 w-3.5" />Sửa</button>}
              {canDel && <button className={btnGhost} onClick={() => setModal({ type: "delete" })}><Trash2 className="h-3.5 w-3.5" /></button>}
              <button onClick={onClose} className="rounded-md p-1.5 hover:bg-zinc-100 text-zinc-400"><X className="h-4 w-4" /></button>
            </div>
          </div>
          {editing ? (
            <input className={`${inputCls} mt-2 font-medium`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          ) : (
            <h2 className="mt-1.5 text-[15px] font-semibold text-zinc-900 leading-snug">{t.name}</h2>
          )}
          {t.isConfidential && <div className="mt-2 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Task bảo mật — chỉ người được chỉ định xem được. {t.confidentialReason && <span className="text-zinc-300">({t.confidentialReason})</span>}</div>}
          {t.locked && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700">
              <span><b>Kết quả đã được duyệt và khóa.</b> Mọi chỉnh sửa cần mở lại task.</span>
              {perms.reopen(db, me, t) && <button className="rounded-md bg-white border border-emerald-200 px-2 py-1 font-medium hover:bg-emerald-100" onClick={() => setModal({ type: "reopen", reason: "" })}>Mở lại</button>}
            </div>
          )}
          {t.status === "revise" && t.revisionNote && (
            <div className="mt-2 rounded-lg bg-orange-50 border border-orange-100 px-3 py-2 text-xs text-orange-700"><b>Yêu cầu chỉnh sửa (lần {t.revisionCount}):</b> {t.revisionNote}</div>
          )}
          {isOverdue(t) && <div className="mt-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700"><b>{deadlineMeta(t).label}.</b> {t.overdueReason ? `Lý do: ${t.overdueReason}` : "Chưa có lý do quá hạn — bổ sung ở phần trạng thái."}</div>}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Approval action bar */}
          {t.status === "review" && isApprover && (
            <div className="mb-4 rounded-xl bg-violet-50 border border-violet-100 p-3">
              <p className="text-xs text-violet-700 mb-1 font-medium">Công việc đang chờ bạn duyệt · gửi {t.actual?.submittedAt ? fmtDT(t.actual.submittedAt) : ""}</p>
              {t.actual?.summary && <p className="mb-1 text-[13px] text-violet-900"><b>Kết quả thực tế:</b> {t.actual.summary}</p>}
              {t.acceptance && <p className="mb-2 text-[11px] text-violet-600">Tiêu chí nghiệm thu: {t.acceptance}</p>}
              <div className="flex gap-2">
                <button className={btnPri} onClick={() => { act.approve(t.id); toast("Đã duyệt hoàn thành"); }}><BadgeCheck className="h-4 w-4" />Duyệt hoàn thành</button>
                <button className={btnSec} onClick={() => setModal({ type: "revise", note: "", deadline: t.deadline || D(2), level: "Sửa nhỏ" })}><RotateCcw className="h-4 w-4" />Yêu cầu chỉnh sửa</button>
              </div>
            </div>
          )}
          {isOwner && !t.locked && ["doing", "revise", "todo", "waiting"].includes(t.status) && needsApproval && (
            <button className={`${btnSec} mb-4 w-full justify-center`} onClick={() => { const r = act.submitReview(t.id); toast(r.ok ? "Đã gửi duyệt" : r.msg, r.ok ? "ok" : "warn"); }}>
              <Send className="h-4 w-4" />{t.status === "revise" ? "Gửi duyệt lại" : "Gửi duyệt"}
            </button>
          )}

          {/* Main info */}
          <div className="rounded-xl border border-zinc-100 px-4 py-2 mb-4">
            <Row label="Trạng thái">
              <select className={miniSel} value={t.status} disabled={!canStatus} onChange={(e) => onStatus(e.target.value)}>
                {STATUS_ORDER.filter((s) => !(needsApproval && s === "done" && !t.approvedAt)).map((s) => <option key={s} value={s}>{STATUSES[s].label}</option>)}
              </select>
            </Row>
            <Row label="Phụ trách chính">{canOwner ? <UserSelect value={t.ownerId} users={assignList} onChange={(v) => act.updateTask(t.id, { ownerId: v }, `đổi người phụ trách`)} placeholder="— Chưa có người phụ trách —" /> : <UserChip id={t.ownerId} />}</Row>
            <Row label="Phối hợp">
              <div className="flex items-center gap-2 flex-wrap">
                <AvatarGroup ids={t.collaboratorIds} max={5} />
                {(canOwner || isOwner) && !t.locked && <CollabPicker t={t} />}
              </div>
            </Row>
            <Row label="Người giao"><UserChip id={t.assignerId} dash="—" /></Row>
            <Row label="Người duyệt">{canApproverSel ? <UserSelect value={t.approverId} users={getEligibleApprovers(db, me, t)} onChange={(v) => act.updateTask(t.id, { approverId: v }, "đổi người duyệt")} placeholder="— Không cần duyệt —" /> : <UserChip id={t.approverId} dash="Không cần duyệt" />}</Row>
            <Row label="Phòng ban"><div className="flex gap-1 flex-wrap"><DeptTag id={t.deptId} />{t.coDeptIds.map((d) => <DeptTag key={d} id={d} />)}</div></Row>
            <Row label="Brand">{deptBrand(db, t.deptId) ? <BrandChip id={t.brandId} /> : editable ? (
              <select className={miniSel} value={t.brandId || ""} onChange={(e) => act.updateTask(t.id, { brandId: e.target.value || null }, `gắn brand → ${e.target.value ? BRANDS[e.target.value].label : "Chung"}`)}>
                <option value="">Chung (cả 2 brand)</option>{BRAND_ORDER.map((b) => <option key={b} value={b}>{BRANDS[b].label}</option>)}
              </select>
            ) : (t.brandId ? <BrandChip id={t.brandId} /> : <span className="text-xs text-zinc-400">Chung</span>)}</Row>
            <Row label="Hiển thị">{perms.changeVisibility(db, me, t) ? (
              <div className="flex items-center gap-2">
                <select className={miniSel} value={t.visibility} onChange={(e) => act.updateTask(t.id, { visibility: e.target.value }, `đổi phạm vi hiển thị → ${VISIBILITIES[e.target.value]}`, )}>
                  {Object.entries(VISIBILITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <label className="flex shrink-0 items-center gap-1 text-[11px] text-zinc-500"><input type="checkbox" checked={t.isConfidential} onChange={(e) => act.updateTask(t.id, { isConfidential: e.target.checked }, e.target.checked ? "đánh dấu bảo mật" : "bỏ đánh dấu bảo mật")} className="accent-zinc-800" />Mật</label>
              </div>
            ) : <span className="text-xs text-zinc-500">{VISIBILITIES[t.visibility]}{t.isConfidential ? " · Bảo mật" : ""}</span>}</Row>
            <Row label="Dự án">{t.projectId ? <button className="text-[13px] text-zinc-700 hover:underline text-left" onClick={() => { onClose(); nav("projectDetail", { id: t.projectId }); }}>{projById(db, t.projectId)?.name}</button> : <span className="text-xs text-zinc-400">—</span>}</Row>
            <Row label="Ưu tiên">
              <select className={miniSel} value={t.priority} disabled={!editable} onChange={(e) => act.updateTask(t.id, { priority: e.target.value }, `đổi ưu tiên → ${PRIORITIES[e.target.value].label}`)}>
                {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{PRIORITIES[p].label}</option>)}
              </select>
            </Row>
            <Row label="Bắt đầu"><input type="date" className={miniSel} value={t.start || ""} disabled={!editable} onChange={(e) => act.updateTask(t.id, { start: e.target.value }, "đổi ngày bắt đầu")} /></Row>
            <Row label="Deadline">
              <div className="flex items-center gap-2">
                <input type="date" className={miniSel} value={t.deadline || ""} disabled={!canDl} onChange={(e) => onDeadline(e.target.value)} />
                <span className={`text-xs whitespace-nowrap ${deadlineMeta(t).cls}`}>{deadlineMeta(t).label}</span>
              </div>
            </Row>
            <Row label="Khối lượng">
              <select className={miniSel} value={t.effort} disabled={!editable} onChange={(e) => act.updateTask(t.id, { effort: e.target.value }, "đổi khối lượng ước tính")}>
                {Object.entries(EFFORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Row>
            <Row label="Tiến độ">
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="100" step="5" value={t.progress} disabled={!canProgress} onChange={(e) => act.updateTask(t.id, { progress: +e.target.value }, null)} className="w-full accent-zinc-800" />
                <span className="text-xs text-zinc-500 w-9 text-right">{t.progress}%</span>
              </div>
            </Row>
          </div>

          {/* Content */}
          <div className="mb-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 mb-1.5">Mô tả</p>
            {editing ? <textarea className={inputCls} rows={3} value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} /> : <p className="text-[13px] text-zinc-600 leading-relaxed whitespace-pre-wrap">{t.desc || <span className="text-zinc-300">Chưa có mô tả</span>}</p>}
          </div>
          <div className="mb-4 rounded-xl border border-zinc-100 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 mb-1.5">Kết quả kỳ vọng (khi giao việc)</p>
            {editing ? <textarea className={inputCls} rows={2} value={draft.deliverable} onChange={(e) => setDraft({ ...draft, deliverable: e.target.value })} /> : <p className="text-[13px] text-zinc-600">{t.deliverable || <span className="text-zinc-300">Chưa xác định kết quả kỳ vọng</span>}</p>}
            {t.acceptance && !editing && <p className="mt-1 text-[11px] text-zinc-400"><b className="text-zinc-500">Tiêu chí nghiệm thu:</b> {t.acceptance}</p>}
          </div>
          <ActualOutputBox t={t} />

          {/* Checklist */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Checklist · {t.checklist.filter((c) => c.done).length}/{t.checklist.length}</p>
            </div>
            <div className="space-y-1">
              {t.checklist.map((c) => {
                const canToggleItem = perms.canToggleChecklistItem(db, me, t, c);
                return (
                <div key={c.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-zinc-50">
                  <input type="checkbox" checked={c.done} disabled={!canToggleItem} onChange={() => act.toggleCheck(t.id, c.id)} className="h-[18px] w-[18px] shrink-0 rounded border-zinc-300 accent-zinc-800 disabled:cursor-not-allowed disabled:opacity-50" title={!canToggleItem && c.ownerId && c.ownerId !== me.id ? "Checklist này được giao cho người khác" : ""} />
                  <p className={`flex-1 min-w-0 text-[13px] ${c.done ? "text-zinc-400 line-through" : "text-zinc-700"}`}>{c.text}{c.deadline && <span className="ml-2 text-[11px] text-zinc-400">· hạn {fmtD(c.deadline)}</span>}</p>
                  {c.ownerId && <span className="shrink-0 text-[11px] font-medium text-zinc-500">{userById(db, c.ownerId)?.name}</span>}
                  {canCkManage && <button className="shrink-0 opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500" onClick={() => act.delCheck(t.id, c.id)} aria-label="Xóa mục checklist"><X className="h-3.5 w-3.5" /></button>}
                </div>
                );
              })}
            </div>
            {canCkManage && (
              <div className="mt-1.5 flex gap-2">
                <input className={inputCls} placeholder="Thêm mục checklist…" value={ckText} onChange={(e) => setCkText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && ckText.trim()) { act.addCheck(t.id, ckText.trim()); setCkText(""); } }} />
              </div>
            )}
          </div>

          {/* Links + attachments */}
          <div className="mb-4 rounded-xl bg-zinc-50 px-4 py-3 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Liên kết & file</p>
            {editing ? (
              <>
                <Field label="Link file báo cáo"><input className={inputCls} value={draft.reportLink} onChange={(e) => setDraft({ ...draft, reportLink: e.target.value })} placeholder="https://…" /></Field>
                <Field label="Link Google Drive"><input className={inputCls} value={draft.driveLink} onChange={(e) => setDraft({ ...draft, driveLink: e.target.value })} placeholder="https://…" /></Field>
              </>
            ) : (
              <>
                {t.reportLink && <a className="flex items-center gap-2 text-[13px] text-zinc-700 hover:underline" href={t.reportLink} target="_blank" rel="noreferrer"><FileText className="h-3.5 w-3.5 text-zinc-400" />File báo cáo<ExternalLink className="h-3 w-3 text-zinc-300" /></a>}
                {t.driveLink && <a className="flex items-center gap-2 text-[13px] text-zinc-700 hover:underline" href={t.driveLink} target="_blank" rel="noreferrer"><Link2 className="h-3.5 w-3.5 text-zinc-400" />Google Drive<ExternalLink className="h-3 w-3 text-zinc-300" /></a>}
                {!t.reportLink && !t.driveLink && !t.attachments.length && <p className="text-xs text-zinc-300">Chưa có liên kết</p>}
              </>
            )}
            {t.attachments.map((a) => <p key={a.id} className="flex items-center gap-2 text-[13px] text-zinc-600"><Paperclip className="h-3.5 w-3.5 text-zinc-400" />{a.name}</p>)}
            {canAttach && <AttachAdder taskId={t.id} />}
          </div>
          {t.tags.length > 0 && !editing && <div className="mb-4 flex flex-wrap gap-1.5">{t.tags.map((tg) => <span key={tg} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500">#{tg}</span>)}</div>}
          {editing && <Field label="Tags (phẩy)"><input className={inputCls} value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} /></Field>}
          {editing && <div className="flex gap-2 mb-4"><button className={btnPri} onClick={saveEdit}><Save className="h-4 w-4" />Lưu thay đổi</button><button className={btnSec} onClick={() => setEditing(false)}>Hủy</button></div>}

          {/* Activity tabs */}
          <div className="border-t border-zinc-100 pt-3">
            <div className="flex gap-1 mb-3">
              {[["activity", "Bình luận", MessageSquare], ["history", "Lịch sử", History]].map(([k, lb, Ic]) => (
                <button key={k} onClick={() => setTab(k)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${tab === k ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}><Ic className="h-3.5 w-3.5" />{lb}</button>
              ))}
            </div>
            {tab === "activity" && (
              <div>
                <div className="space-y-3 mb-3">
                  {t.comments.length === 0 && <p className="text-xs text-zinc-300">Chưa có bình luận. Dùng @Tên để nhắc đồng nghiệp.</p>}
                  {t.comments.map((c) => (
                    <div key={c.id} className="flex gap-2.5">
                      <Avatar id={c.userId} size={7} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs"><span className="font-medium text-zinc-800">{userById(db, c.userId)?.name}</span> <span className="text-zinc-300">· {fmtDT(c.at)}</span></p>
                        <p className="text-[13px] text-zinc-600 leading-relaxed">{renderMentions(c.text)}</p>
                        {editable && <button className="text-[11px] text-zinc-400 hover:text-zinc-700 inline-flex items-center gap-1 mt-0.5" onClick={() => { act.addCheck(t.id, c.text); toast("Đã chuyển thành mục checklist"); }}><CornerDownRight className="h-3 w-3" />Chuyển thành checklist</button>}
                      </div>
                    </div>
                  ))}
                </div>
                <CommentBox taskId={t.id} confidential={t.isConfidential} />
              </div>
            )}
            {tab === "history" && (
              <div className="space-y-2.5">
                {t.logs.length === 0 && <p className="text-xs text-zinc-300">Chưa có hoạt động</p>}
                {t.logs.map((l) => (
                  <div key={l.id} className="flex gap-2.5 text-[13px]">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-300 shrink-0" />
                    <p className="text-zinc-500"><span className="font-medium text-zinc-700">{userById(db, l.userId)?.name}</span> {l.text} <span className="text-zinc-300">· {fmtDT(l.at)}</span></p>
                  </div>
                ))}
                {t.deadlineHistory.length > 0 && (
                  <div className="mt-2 rounded-lg bg-zinc-50 p-3">
                    <p className="text-[11px] font-medium uppercase text-zinc-400 mb-1.5">Nhật ký đổi deadline</p>
                    {t.deadlineHistory.map((h, i) => <p key={i} className="text-xs text-zinc-500">{fmtDFull(h.from)} → <b className="text-zinc-700">{fmtDFull(h.to)}</b> · {userById(db, h.by)?.name}{h.reason ? ` · ${h.reason}` : ""}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {modal?.type === "pause" && (
          <Modal title="Tạm dừng công việc" onClose={() => setModal(null)}>
            <Field label="Lý do tạm dừng" req><textarea className={inputCls} rows={3} value={modal.reason} onChange={(e) => setModal({ ...modal, reason: e.target.value })} placeholder="Ví dụ: chờ duyệt ngân sách, ưu tiên nguồn lực cho dự án khác…" /></Field>
            <div className="flex justify-end gap-2"><button className={btnSec} onClick={() => setModal(null)}>Hủy</button><button className={btnPri} disabled={!modal.reason.trim()} onClick={() => { act.changeStatus(t.id, "paused", { pauseReason: modal.reason.trim() }); setModal(null); }}>Tạm dừng</button></div>
          </Modal>
        )}
        {modal?.type === "deadline" && (
          <Modal title="Thay đổi deadline" onClose={() => setModal(null)}>
            <p className="text-sm text-zinc-600 mb-3">Deadline đã được xác nhận trước đó ({fmtDFull(t.deadline)} → <b>{fmtDFull(modal.value)}</b>). Cần ghi lý do thay đổi.</p>
            <Field label="Lý do đổi deadline" req><textarea className={inputCls} rows={2} value={modal.reason} onChange={(e) => setModal({ ...modal, reason: e.target.value })} /></Field>
            <div className="flex justify-end gap-2"><button className={btnSec} onClick={() => setModal(null)}>Hủy</button><button className={btnPri} disabled={!modal.reason.trim()} onClick={() => { act.changeDeadline(t.id, modal.value, modal.reason.trim()); setModal(null); }}>Xác nhận đổi</button></div>
          </Modal>
        )}
        {modal?.type === "revise" && (
          <Modal title="Yêu cầu chỉnh sửa" onClose={() => setModal(null)}>
            <Field label="Nội dung cần sửa" req><textarea className={inputCls} rows={3} value={modal.note} onChange={(e) => setModal({ ...modal, note: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Deadline chỉnh sửa" req><input type="date" className={inputCls} value={modal.deadline} onChange={(e) => setModal({ ...modal, deadline: e.target.value })} /></Field>
              <Field label="Mức độ chỉnh sửa"><select className={inputCls} value={modal.level} onChange={(e) => setModal({ ...modal, level: e.target.value })}>{["Sửa nhỏ", "Sửa nhiều", "Làm lại"].map((x) => <option key={x}>{x}</option>)}</select></Field>
            </div>
            <div className="flex justify-end gap-2"><button className={btnSec} onClick={() => setModal(null)}>Hủy</button><button className={btnPri} disabled={!modal.note.trim() || !modal.deadline} onClick={() => { act.requestRevision(t.id, modal); setModal(null); toast("Đã gửi yêu cầu chỉnh sửa"); }}>Gửi yêu cầu</button></div>
          </Modal>
        )}
        {modal?.type === "reopen" && (
          <Modal title="Mở lại task đã duyệt" onClose={() => setModal(null)}>
            <p className="mb-2 text-[13px] text-zinc-600">Task sẽ quay về <b>Đang thực hiện</b>, kết quả duyệt trước đó được ghi trong lịch sử. Bắt buộc ghi lý do.</p>
            <Field label="Lý do mở lại" req><textarea className={inputCls} rows={2} value={modal.reason} onChange={(e) => setModal({ ...modal, reason: e.target.value })} /></Field>
            <div className="flex justify-end gap-2"><button className={btnSec} onClick={() => setModal(null)}>Hủy</button><button className={btnPri} disabled={!modal.reason.trim()} onClick={() => { const r = act.reopen(t.id, modal.reason.trim()); toast(r.ok ? "Đã mở lại task" : r.msg, r.ok ? "ok" : "err"); setModal(null); }}>Mở lại</button></div>
          </Modal>
        )}
        {modal?.type === "delete" && (
          <Modal title="Xóa công việc" onClose={() => setModal(null)}>
            <p className="text-sm text-zinc-600">Xóa <b>{t.name}</b>? Công việc sẽ bị ẩn khỏi hệ thống (soft delete), nhật ký hoạt động được giữ lại.</p>
            <div className="mt-4 flex justify-end gap-2"><button className={btnSec} onClick={() => setModal(null)}>Hủy</button><button className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-500" onClick={() => { const r = act.deleteTask(t.id); if (!r.ok) { toast(r.msg, "err"); setModal(null); } else { setModal(null); onClose(); } }}>Xóa</button></div>
          </Modal>
        )}
      </div>
    </div>
  );
}

function renderMentions(text) {
  const parts = text.split(/(@[\p{L}]+)/u);
  return parts.map((p, i) => p.startsWith("@") ? <span key={i} className="text-indigo-600 font-medium">{p}</span> : p);
}

/* CollabPicker — lọc người dùng theo phạm vi task (không hiển thị toàn công ty) */
function CollabPicker({ t }) {
  const { db, me, act } = useApp();
  const [open, setOpen] = useState(false);

  /* Phạm vi cho phép: đồng nghiệp cùng phòng + phòng cộng tác + thành viên dự án */
  const scopedUsers = (() => {
    if (t.isConfidential) {
      /* Task mật: chỉ allowed viewers hoặc manager quyết định */
      return db.users.filter((u) => u.id !== t.ownerId && (u.deptId === t.deptId || isMgr(u)));
    }
    const p = t.projectId ? projById(db, t.projectId) : null;
    if (p) return db.users.filter((u) => u.id !== t.ownerId && p.deptIds.includes(u.deptId));
    if (t.type === "personal") return db.users.filter((u) => u.id !== t.ownerId && (u.deptId === t.deptId || isMgr(u)));
    const deptSet = new Set([t.deptId, ...(t.coDeptIds || [])]);
    return db.users.filter((u) => u.id !== t.ownerId && (deptSet.has(u.deptId) || isMgr(u)));
  })();

  return (
    <div className="relative">
      <button className={btnGhost} onClick={() => setOpen(!open)}><Plus className="h-3 w-3" />Thêm</button>
      {open && (
        <div className="absolute z-10 mt-1 w-60 rounded-xl border border-zinc-100 bg-white shadow-lg p-1.5 max-h-56 overflow-y-auto">
          {scopedUsers.length === 0 && <p className="px-2 py-1.5 text-[12px] text-zinc-400">Không có người dùng trong phạm vi</p>}
          {scopedUsers.map((u) => {
            const on = t.collaboratorIds.includes(u.id);
            return (
              <button key={u.id} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-zinc-700 hover:bg-zinc-50" onClick={() => act.updateTask(t.id, { collaboratorIds: on ? t.collaboratorIds.filter((x) => x !== u.id) : [...t.collaboratorIds, u.id] }, on ? `bỏ ${u.name} khỏi phối hợp` : `thêm ${u.name} vào phối hợp`)}>
                <input type="checkbox" readOnly checked={on} className="h-3.5 w-3.5 accent-zinc-800" /><Avatar id={u.id} size={6} />{u.name}
                <span className="text-[11px] text-zinc-400 ml-auto">{deptById(db, u.deptId)?.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
function AttachAdder({ taskId }) {
  const { act, toast } = useApp();
  const [v, setV] = useState("");
  const [open, setOpen] = useState(false);
  const add = () => {
    if (!v.trim()) return;
    const r = act.addAttachment(taskId, { name: v.trim(), size: Math.round(Math.random() * 5e6), mime: "" });
    if (!r.ok) { toast(r.msg, "err"); return; }
    setV(""); setOpen(false);
  };
  if (!open) return <button className={btnGhost} onClick={() => setOpen(true)}><Paperclip className="h-3 w-3" />Đính kèm file</button>;
  return (
    <div>
      <input className={inputCls} placeholder="Tên file kèm đuôi, vd: bao-cao.pdf (demo — bản Supabase upload thật + signed URL)" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
      <p className="mt-1 text-[10px] text-zinc-400">Chỉ nhận pdf, png, jpg, xlsx, docx, pptx, csv, zip, mp4, txt · tối đa 25MB · file trong task mật không có URL công khai</p>
    </div>
  );
}

/* ---- Kết quả thực tế: nhập khi bàn giao, khoá sau duyệt ---- */
function ActualOutputBox({ t }) {
  const { db, me, act, toast } = useApp();
  const canEdit = !t.locked && (t.ownerId === me.id || canManage(db, me, t));
  const [link, setLink] = useState("");
  const a = t.actual || { summary: "", links: [], note: "", submittedAt: null };
  const filled = a.summary?.trim() && (a.links.length > 0 || t.attachments.length > 0 || t.type === "personal");
  return (
    <div className={`mb-4 rounded-xl border p-3 ${filled ? "border-emerald-100 bg-emerald-50/40" : "border-zinc-200 bg-zinc-50/60"}`}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Kết quả thực tế (khi bàn giao)</p>
        {a.submittedAt && <span className="text-[10px] text-zinc-400">gửi {fmtDT(a.submittedAt)}</span>}
      </div>
      {canEdit ? (
        <>
          <textarea className={inputCls} rows={2} placeholder="Tóm tắt kết quả đã làm được — bắt buộc trước khi gửi duyệt / hoàn thành" value={a.summary} onChange={(e) => act.updateActual(t.id, { summary: e.target.value })} />
          <div className="mt-1.5 space-y-1">
            {a.links.map((l, i) => (
              <p key={i} className="flex items-center gap-1.5 text-[13px]"><Link2 className="h-3.5 w-3.5 text-zinc-400" /><a className="text-zinc-700 hover:underline truncate" href={l} target="_blank" rel="noreferrer">{l}</a><button className="text-zinc-300 hover:text-red-500" onClick={() => act.updateActual(t.id, { links: a.links.filter((_, j) => j !== i) })}><X className="h-3 w-3" /></button></p>
            ))}
          </div>
          <div className="mt-1.5 flex gap-2">
            <input className={inputCls} placeholder="Dán link kết quả (Drive, Docs…) rồi Enter" value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && link.trim()) { act.updateActual(t.id, { links: [...a.links, link.trim()] }); setLink(""); } }} />
          </div>
          {t.requiresAck && (
            <label className="mt-2 flex items-center gap-2 text-[13px] text-zinc-700">
              <input type="checkbox" checked={!!t.ackedAt} disabled={!!t.ackedAt} onChange={() => { const r = act.ackPolicy(t.id); if (r.ok) toast("Đã ghi nhận xác nhận, kèm thời gian"); }} className="accent-zinc-800" />
              Tôi xác nhận đã đọc và hiểu tài liệu{t.ackedAt ? ` · ${fmtDT(t.ackedAt)}` : ""}
            </label>
          )}
          {!filled && <p className="mt-1.5 text-[11px] text-amber-600">Chưa đủ điều kiện bàn giao: cần tóm tắt + ít nhất 1 link hoặc file. Ghi kỳ vọng không được tính là đã bàn giao.</p>}
        </>
      ) : (
        <>
          <p className="text-[13px] text-zinc-700">{a.summary || <span className="text-zinc-300">Chưa có kết quả thực tế</span>}</p>
          {a.links.map((l, i) => <a key={i} className="flex items-center gap-1.5 text-[13px] text-zinc-600 hover:underline" href={l} target="_blank" rel="noreferrer"><Link2 className="h-3.5 w-3.5 text-zinc-400" />{l}</a>)}
          {t.ackedAt && <p className="mt-1 text-[11px] text-emerald-600">Đã xác nhận đọc tài liệu · {fmtDT(t.ackedAt)}</p>}
        </>
      )}
    </div>
  );
}

/* ---- Bình luận với mention theo user_id (autocomplete @) ---- */
function CommentBox({ taskId, confidential }) {
  const { db, me, act } = useApp();
  const [text, setText] = useState("");
  const [mentions, setMentions] = useState([]); // [{id,name}]
  const [q, setQ] = useState(null); // chuỗi sau @ đang gõ
  const onChange = (v) => {
    setText(v);
    const m = v.match(/@([\p{L}\s]{0,20})$/u);
    setQ(m ? m[1].trim().toLowerCase() : null);
  };
  const candidates = q === null ? [] : db.users.filter((u) => u.id !== me.id && u.name.toLowerCase().includes(q)).slice(0, 5);
  const pick = (u) => {
    setText(text.replace(/@([\p{L}\s]{0,20})$/u, `@${u.name} `));
    if (!mentions.find((m) => m.id === u.id)) setMentions([...mentions, { id: u.id, name: u.name }]);
    setQ(null);
  };
  const send = () => {
    if (!text.trim()) return;
    const ids = mentions.filter((m) => text.includes("@" + m.name)).map((m) => m.id);
    act.addComment(taskId, text.trim(), ids);
    setText(""); setMentions([]);
  };
  return (
    <div className="flex gap-2">
      <Avatar id={me.id} size={7} />
      <div className="relative flex-1">
        <textarea className={inputCls} rows={2} placeholder="Viết bình luận… gõ @ để nhắc đúng người" value={text} onChange={(e) => onChange(e.target.value)} />
        {candidates.length > 0 && (
          <div className="absolute left-0 bottom-full mb-1 w-64 rounded-xl border border-zinc-100 bg-white shadow-lg p-1 z-10">
            {candidates.map((u) => <button key={u.id} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-zinc-50" onClick={() => pick(u)}><Avatar id={u.id} size={6} />{u.name}<span className="text-[11px] text-zinc-400">· {deptById(db, u.deptId)?.name}</span></button>)}
          </div>
        )}
        {mentions.length > 0 && <p className="mt-1 text-[11px] text-zinc-400">Sẽ thông báo: {mentions.map((m) => m.name).join(", ")}</p>}
        <button className={`${btnPri} mt-1.5`} onClick={send} disabled={!text.trim()}><Send className="h-3.5 w-3.5" />Gửi</button>
      </div>
    </div>
  );
}

/* ============================================================
   Task form (create)
   ============================================================ */
function TaskForm({ onClose, defaults = {} }) {
  const { db, me, act, toast } = useApp();
  const [more, setMore] = useState(false);
  const [f, setF] = useState({
    name: "", ownerId: me.role === "employee" ? me.id : null, deadline: D(3), deptId: defaults.deptId || me.deptId,
    status: "todo", priority: "normal", desc: "", deliverable: "", acceptance: "", approverId: null, collaboratorIds: [],
    projectId: defaults.projectId || null, type: defaults.projectId ? "project" : "dept", effort: "M",
    reportLink: "", tags: "", recurrence: "", start: todayISO(), noDeadline: false, brandId: defaults.brandId ?? null,
    visibility: "", isConfidential: false, confidentialReason: "",
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const isPersonal = f.type === "personal";
  /* Phòng ban được phép tạo: employee/leader → phòng mình (+ phạm vi dự án nếu là owner); admin/ceo → tất cả */
  const proj = f.projectId ? projById(db, f.projectId) : null;
  const allowedDepts = ["admin", "ceo"].includes(me.role) ? db.depts
    : proj && proj.ownerId === me.id ? db.depts.filter((d) => proj.deptIds.includes(d.id) || d.id === me.deptId)
    : db.depts.filter((d) => d.id === me.deptId);
  const assignList = assignableUsers(db, me, { deptId: f.deptId, projectId: f.projectId });
  const chk = canCreateTaskFor(db, me, f);
  const valid = f.name.trim() && f.deptId && chk.ok && (isPersonal || (f.ownerId && (f.noDeadline ? false : f.deadline)));
  const submit = () => {
    const r = act.createTask({ ...f, visibility: f.visibility || undefined, deadline: f.noDeadline && isPersonal ? null : f.deadline, tags: f.tags.split(",").map((s) => s.trim()).filter(Boolean), recurrence: f.recurrence || null });
    if (!r.ok) { toast(r.msg, "err"); return; }
    toast("Đã tạo công việc"); onClose(r.id);
  };
  return (
    <Modal title="Tạo công việc" onClose={() => onClose(null)} wide>
      <Field label="Tên công việc" req><input autoFocus className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Ví dụ: Hoàn thiện brief KOC cho đai lưng" /></Field>
      {/* Quick create — chỉ 3 trường cốt lõi; phần còn lại nằm trong "Thêm chi tiết" */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
        <Field label="Người chịu trách nhiệm" req={!isPersonal}><UserSelect value={f.ownerId} onChange={(v) => set("ownerId", v)} users={assignList} placeholder="— Chưa có —" />{me.role === "employee" && !proj && <p className="mt-1 text-[10px] text-zinc-400">Nhân viên tạo task cho chính mình. Cần phòng khác xử lý → dùng Yêu cầu phối hợp.</p>}</Field>
        <Field label="Deadline" req={!isPersonal}>
          <input type="date" className={inputCls} value={f.deadline || ""} disabled={f.noDeadline} onChange={(e) => set("deadline", e.target.value)} />
          {isPersonal && <label className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500"><input type="checkbox" checked={f.noDeadline} onChange={(e) => set("noDeadline", e.target.checked)} className="accent-zinc-800" />Ghi chú cá nhân, không cần deadline</label>}
        </Field>
        <Field label="Mức độ ưu tiên"><select className={inputCls} value={f.priority} onChange={(e) => set("priority", e.target.value)}>{PRIORITY_ORDER.map((p) => <option key={p} value={p}>{PRIORITIES[p].label}</option>)}</select></Field>
      </div>
      {!more ? (
        <button className="text-xs font-medium text-zinc-500 hover:text-zinc-800 inline-flex items-center gap-1 mb-2" onClick={() => setMore(true)}><ChevronDown className="h-3.5 w-3.5" />Thêm chi tiết (phòng ban, loại, mô tả, người duyệt, dự án…)</button>
      ) : (
        <div className="border-t border-zinc-100 pt-3 mt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
            <Field label="Phòng ban" req><select className={inputCls} value={f.deptId} onChange={(e) => set("deptId", e.target.value)}>{allowedDepts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
            <Field label="Brand">{deptBrand(db, f.deptId) ? (
              <p className="flex items-center gap-1.5 pt-1.5 text-xs text-zinc-500"><BrandChip id={deptBrand(db, f.deptId)} /> theo phòng ban</p>
            ) : (
              <select className={inputCls} value={f.brandId || ""} onChange={(e) => set("brandId", e.target.value || null)}><option value="">Chung (cả 2 brand)</option>{BRAND_ORDER.map((b) => <option key={b} value={b}>{BRANDS[b].label}</option>)}</select>
            )}</Field>
            <Field label="Loại công việc"><select className={inputCls} value={f.type} onChange={(e) => set("type", e.target.value)}>{Object.entries(TASK_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Trạng thái"><select className={inputCls} value={f.status} onChange={(e) => set("status", e.target.value)}>{["todo", "doing"].map((s) => <option key={s} value={s}>{STATUSES[s].label}</option>)}</select></Field>
          </div>
          <Field label="Mô tả"><textarea className={inputCls} rows={2} value={f.desc} onChange={(e) => set("desc", e.target.value)} /></Field>
          <Field label="Kết quả kỳ vọng"><input className={inputCls} value={f.deliverable} onChange={(e) => set("deliverable", e.target.value)} placeholder="VD: File brief PDF hoàn chỉnh" /></Field>
          <Field label="Tiêu chí nghiệm thu"><input className={inputCls} value={f.acceptance} onChange={(e) => set("acceptance", e.target.value)} placeholder="VD: Đủ 3 angle · đúng format 6P · được Leader duyệt" /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
            <Field label="Người duyệt"><UserSelect value={f.approverId} onChange={(v) => set("approverId", v)} users={getEligibleApprovers(db, me, { ...f, ownerId: f.ownerId || me.id })} placeholder="— Không cần duyệt —" /></Field>
            <Field label="Dự án"><select className={inputCls} value={f.projectId || ""} onChange={(e) => { set("projectId", e.target.value || null); if (e.target.value) set("type", "project"); }}><option value="">— Không thuộc dự án —</option>{db.projects.filter((p) => canViewProject(db, me, p)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Ngày bắt đầu"><input type="date" className={inputCls} value={f.start} onChange={(e) => set("start", e.target.value)} /></Field>
            <Field label="Khối lượng ước tính"><select className={inputCls} value={f.effort} onChange={(e) => set("effort", e.target.value)}>{Object.entries(EFFORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Lặp lại (task định kỳ)"><select className={inputCls} value={f.recurrence} onChange={(e) => { set("recurrence", e.target.value); if (e.target.value) set("type", "recurring"); }}><option value="">Không lặp</option><option value="daily">Hằng ngày</option><option value="weekly">Hằng tuần</option><option value="monthly">Hằng tháng</option></select></Field>
            <Field label="Link file báo cáo"><input className={inputCls} value={f.reportLink} onChange={(e) => set("reportLink", e.target.value)} placeholder="https://…" /></Field>
          </div>
          <Field label="Tags (phẩy)"><input className={inputCls} value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="launch, koc" /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
            <Field label="Phạm vi hiển thị"><select className={inputCls} value={f.visibility} onChange={(e) => set("visibility", e.target.value)}><option value="">Tự động theo loại task</option>{Object.entries(VISIBILITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Bảo mật"><label className="flex items-center gap-2 pt-2 text-[13px] text-zinc-600"><input type="checkbox" checked={f.isConfidential} onChange={(e) => set("isConfidential", e.target.checked)} className="accent-zinc-800" />Task mật (chỉ người liên quan xem)</label></Field>
          </div>
          {f.isConfidential && <Field label="Lý do bảo mật"><input className={inputCls} value={f.confidentialReason} onChange={(e) => set("confidentialReason", e.target.value)} placeholder="VD: chứa dữ liệu cá nhân nhân sự" /></Field>}
        </div>
      )}
      {!chk.ok && <p className="mb-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">{chk.msg}</p>}
      <div className="mt-3 flex justify-end gap-2 border-t border-zinc-100 pt-3">
        <button className={btnSec} onClick={() => onClose(null)}>Hủy</button>
        <button className={btnPri} disabled={!valid} onClick={submit}><Plus className="h-4 w-4" />Tạo công việc</button>
      </div>
    </Modal>
  );
}
/* ============================================================
   Filters & task views
   ============================================================ */
const QUICK_FILTERS = [
  ["today", "Hôm nay"], ["overdue", "Quá hạn"], ["dueSoon", "Sắp đến hạn"], ["review", "Chờ duyệt"],
  ["waiting", "Chờ phối hợp"], ["unassigned", "Chưa có người phụ trách"], ["assignedByMe", "Việc tôi đã giao"], ["myApprovals", "Chờ tôi duyệt"],
];
const emptyFilter = { q: "", deptId: "", ownerId: "", assignerId: "", approverId: "", projectId: "", status: "", priority: "", quick: "", tag: "", brand: "" };

function applyFilter(tasks, f, me) {
  return tasks.filter((t) => {
    if (f.q && !(t.name + " " + t.code + " " + t.desc + " " + t.tags.join(" ")).toLowerCase().includes(f.q.toLowerCase())) return false;
    if (f.deptId && t.deptId !== f.deptId && !t.coDeptIds.includes(f.deptId)) return false;
    if (f.brand && (f.brand === "none" ? t.brandId : t.brandId !== f.brand)) return false;
    if (f.ownerId && t.ownerId !== f.ownerId) return false;
    if (f.assignerId && t.assignerId !== f.assignerId) return false;
    if (f.approverId && t.approverId !== f.approverId) return false;
    if (f.projectId && t.projectId !== f.projectId) return false;
    if (f.status && t.status !== f.status) return false;
    if (f.priority && t.priority !== f.priority) return false;
    if (f.tag && !t.tags.includes(f.tag)) return false;
    if (f.quick === "today" && !(t.deadline === todayISO() && t.status !== "done")) return false;
    if (f.quick === "overdue" && !isOverdue(t)) return false;
    if (f.quick === "dueSoon" && !isDueSoon(t)) return false;
    if (f.quick === "review" && t.status !== "review") return false;
    if (f.quick === "waiting" && t.status !== "waiting") return false;
    if (f.quick === "unassigned" && t.ownerId) return false;
    if (f.quick === "assignedByMe" && t.assignerId !== me.id) return false;
    if (f.quick === "myApprovals" && !(t.approverId === me.id && t.status === "review")) return false;
    return true;
  });
}

function FilterBar({ f, setF, showDept = true }) {
  const { db, me, act } = useApp();
  const [open, setOpen] = useState(false);
  const mine = db.savedFilters.filter((s) => s.userId === me.id);
  const active = Object.entries(f).filter(([k, v]) => v && k !== "q").length;
  const sel = "rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-600 focus:outline-none";
  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-300" />
          <input className="w-52 rounded-lg border border-zinc-200 bg-white pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-zinc-400" placeholder="Tìm trong danh sách…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        </div>
        <button className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${open || active ? "border-zinc-800 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"}`} onClick={() => setOpen(!open)}>
          <Filter className="h-3.5 w-3.5" />Bộ lọc{active > 0 && ` · ${active}`}
        </button>
        {QUICK_FILTERS.map(([k, lb]) => (
          <button key={k} onClick={() => setF({ ...f, quick: f.quick === k ? "" : k })} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${f.quick === k ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"}`}>{lb}</button>
        ))}
        {mine.length > 0 && (
          <select className={sel} value="" onChange={(e) => { const s = mine.find((x) => x.id === e.target.value); if (s) setF({ ...emptyFilter, ...s.filter }); }}>
            <option value="">Bộ lọc đã lưu…</option>
            {mine.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        {active > 0 && (
          <>
            <button className={btnGhost} onClick={() => setF({ ...emptyFilter })}><X className="h-3 w-3" />Xóa lọc</button>
            <SaveFilterBtn f={f} />
          </>
        )}
      </div>
      {open && (
        <div className="mt-2 flex flex-wrap gap-2 rounded-xl border border-zinc-100 bg-zinc-50 p-2.5">
          <select className={sel} value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })}><option value="">Brand: tất cả</option><option value="nevor">Nevor</option><option value="uhero">UHero</option><option value="none">Chung</option></select>
          {showDept && <select className={sel} value={f.deptId} onChange={(e) => setF({ ...f, deptId: e.target.value })}><option value="">Phòng ban: tất cả</option>{db.depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
          <select className={sel} value={f.ownerId} onChange={(e) => setF({ ...f, ownerId: e.target.value })}><option value="">Phụ trách: tất cả</option>{db.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
          <select className={sel} value={f.assignerId} onChange={(e) => setF({ ...f, assignerId: e.target.value })}><option value="">Người giao: tất cả</option>{db.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
          <select className={sel} value={f.approverId} onChange={(e) => setF({ ...f, approverId: e.target.value })}><option value="">Người duyệt: tất cả</option>{db.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
          <select className={sel} value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })}><option value="">Dự án: tất cả</option>{db.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select className={sel} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Trạng thái: tất cả</option>{STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUSES[s].label}</option>)}</select>
          <select className={sel} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}><option value="">Ưu tiên: tất cả</option>{PRIORITY_ORDER.map((p) => <option key={p} value={p}>{PRIORITIES[p].label}</option>)}</select>
        </div>
      )}
    </div>
  );
}
function SaveFilterBtn({ f }) {
  const { act, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  if (!open) return <button className={btnGhost} onClick={() => setOpen(true)}><Save className="h-3 w-3" />Lưu bộ lọc</button>;
  return (
    <span className="inline-flex gap-1">
      <input className="rounded-lg border border-zinc-200 px-2 py-1 text-xs w-40" autoFocus placeholder="Tên bộ lọc" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { act.saveFilter(name.trim(), f); setOpen(false); setName(""); toast("Đã lưu bộ lọc"); } }} />
    </span>
  );
}

/* ---------- List view ---------- */
function TaskTable({ tasks }) {
  const { db, me, act, openTask, toast } = useApp();
  const [sort, setSort] = useState({ k: "deadline", d: 1 });
  const [sel, setSel] = useState([]);
  const [bulk, setBulk] = useState(null);
  const sorted = useMemo(() => {
    const arr = [...tasks];
    arr.sort((a, b) => {
      let va, vb;
      if (sort.k === "deadline") { va = a.deadline || "9999"; vb = b.deadline || "9999"; }
      else if (sort.k === "priority") { va = PRIORITIES[a.priority].rank; vb = PRIORITIES[b.priority].rank; }
      else if (sort.k === "status") { va = STATUS_ORDER.indexOf(a.status); vb = STATUS_ORDER.indexOf(b.status); }
      else if (sort.k === "progress") { va = a.progress; vb = b.progress; }
      else { va = a.name; vb = b.name; }
      return (va > vb ? 1 : va < vb ? -1 : 0) * sort.d;
    });
    return arr;
  }, [tasks, sort]);
  const th = (k, lb, cls = "") => (
    <th className={`px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-zinc-400 cursor-pointer select-none whitespace-nowrap ${cls}`} onClick={() => setSort((s) => ({ k, d: s.k === k ? -s.d : 1 }))}>
      {lb}{sort.k === k && (sort.d === 1 ? " ↑" : " ↓")}
    </th>
  );
  const toggleAll = () => { const ok = sorted.filter((t) => perms.bulkTarget(db, me, t)).map((t) => t.id); setSel(sel.length === ok.length ? [] : ok); };
  if (!tasks.length) return <EmptyState title="Không có công việc nào" hint="Thay đổi bộ lọc hoặc tạo công việc mới để bắt đầu." />;
  return (
    <div>
      {sel.length > 0 && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-zinc-900 px-3 py-2 text-xs text-white">
          <span className="font-medium">{sel.length} công việc</span>
          <button className="rounded-md bg-white/10 px-2 py-1 hover:bg-white/20" onClick={() => setBulk("status")}>Đổi trạng thái</button>
          <button className="rounded-md bg-white/10 px-2 py-1 hover:bg-white/20" onClick={() => setBulk("deadline")}>Đổi deadline</button>
          <button className="rounded-md bg-white/10 px-2 py-1 hover:bg-white/20" onClick={() => setBulk("owner")}>Giao việc</button>
          <button className="ml-auto text-zinc-400 hover:text-white" onClick={() => setSel([])}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-zinc-100 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50/60">
            <tr>
              <th className="w-8 px-3"><input type="checkbox" className="accent-zinc-800" checked={sel.length > 0 && sel.length === sorted.filter((t) => perms.bulkTarget(db, me, t)).length} onChange={toggleAll} /></th>
              {th("name", "Công việc")}
              {th("owner", "Phụ trách")}
              <th className="px-3 py-2 text-left text-[11px] font-medium uppercase text-zinc-400">Phòng ban</th>
              {th("status", "Trạng thái")}
              {th("priority", "Ưu tiên")}
              {th("deadline", "Deadline")}
              {th("progress", "Tiến độ")}
              <th className="px-3 py-2 text-left text-[11px] font-medium uppercase text-zinc-400">Duyệt</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => (
              <tr key={t.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/70 cursor-pointer" onClick={() => openTask(t.id)}>
                <td className="px-3" onClick={(e) => e.stopPropagation()}>{perms.bulkTarget(db, me, t) ? <input type="checkbox" className="accent-zinc-800" checked={sel.includes(t.id)} onChange={() => setSel(sel.includes(t.id) ? sel.filter((x) => x !== t.id) : [...sel, t.id])} /> : <span title="Không có quyền cập nhật hàng loạt task này" className="inline-block h-3.5 w-3.5 rounded border border-dashed border-zinc-200" />}</td>
                <td className="px-3 py-2.5">
                  <p className="font-medium text-zinc-800 text-[13px] leading-snug">{t.name}</p>
                  <p className="text-[11px] text-zinc-400 font-mono">{t.code}{t.projectId ? ` · ${projById(db, t.projectId)?.code}` : ""}{t.recurrence ? " · ↻" : ""}</p>
                </td>
                <td className="px-3 py-2.5">{t.ownerId ? <UserChip id={t.ownerId} /> : <span className="text-[11px] text-amber-600 font-medium">Chưa có</span>}</td>
                <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1 flex-wrap"><DeptTag id={t.deptId} /><BrandChip id={t.brandId} /></span></td>
                <td className="px-3 py-2.5"><StatusPill s={t.status} /></td>
                <td className="px-3 py-2.5"><PriorityPill p={t.priority} /></td>
                <td className="px-3 py-2.5"><DeadlineChip date={t.deadline} done={t.status === "done"} /></td>
                <td className="px-3 py-2.5 w-24"><div className="flex items-center gap-1.5"><ProgressBar v={t.progress} /><span className="text-[11px] text-zinc-400 w-8">{t.progress}%</span></div></td>
                <td className="px-3 py-2.5">{t.approverId ? <Avatar id={t.approverId} size={6} /> : <span className="text-zinc-200 text-xs">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {bulk && <BulkModal type={bulk} ids={sel} onClose={() => { setBulk(null); setSel([]); }} />}
    </div>
  );
}
function BulkModal({ type, ids, onClose }) {
  const { db, me, act, toast } = useApp();
  const [v, setV] = useState(type === "deadline" ? D(3) : "");
  const [reason, setReason] = useState("");
  const [report, setReport] = useState(null);
  const apply = () => {
    const skipped = [];
    let n = 0;
    ids.forEach((id) => {
      const t = db.tasks.find((x) => x.id === id);
      if (!t) return;
      if (!perms.bulkTarget(db, me, t)) { skipped.push({ name: t.name, why: "không có quyền quản lý" }); return; }
      if (type === "status") {
        if (["done", "review"].includes(v)) { skipped.push({ name: t.name, why: "hoàn thành/gửi duyệt không được làm hàng loạt" }); return; }
        if (t.status === "review") { skipped.push({ name: t.name, why: "đang chờ duyệt — xử lý riêng trong task" }); return; }
        const r = act.changeStatus(id, v);
        if (r.ok) n++; else skipped.push({ name: t.name, why: r.msg });
      } else if (type === "deadline") {
        const r = act.changeDeadline(id, v, reason || "Cập nhật hàng loạt");
        if (r.ok) n++; else skipped.push({ name: t.name, why: "không đổi được deadline (đã khóa/thiếu quyền)" });
      } else {
        const ow = userById(db, v);
        if (!perms.changeAssignee(db, me, t)) { skipped.push({ name: t.name, why: "chỉ Leader/Quản lý mới giao lại người phụ trách" }); return; }
        const scope = assignableUsers(db, me, { deptId: t.deptId, projectId: t.projectId });
        if (!scope.find((x) => x.id === v)) { skipped.push({ name: t.name, why: `${ow?.name} ngoài phạm vi giao việc của bạn` }); return; }
        const r = act.updateTask(id, { ownerId: v }, "giao việc (hàng loạt)");
        if (r?.ok) n++; else skipped.push({ name: t.name, why: r?.msg || "không giao được" });
      }
    });
    setReport({ n, skipped });
  };
  if (report) return (
    <Modal title="Kết quả cập nhật hàng loạt" onClose={onClose}>
      <p className="text-sm text-zinc-700 mb-2">Đã cập nhật <b>{report.n}</b> task · Bỏ qua <b>{report.skipped.length}</b> task.</p>
      {report.skipped.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 space-y-1 max-h-52 overflow-y-auto">
          {report.skipped.map((s, i) => <p key={i} className="text-xs text-amber-700"><b>{s.name}</b>: {s.why}</p>)}
        </div>
      )}
      <div className="mt-3 flex justify-end"><button className={btnPri} onClick={onClose}>Đóng</button></div>
    </Modal>
  );
  return (
    <Modal title={{ status: "Đổi trạng thái hàng loạt", deadline: "Đổi deadline hàng loạt", owner: "Giao việc hàng loạt" }[type]} onClose={onClose}>
      {type === "status" && <Field label="Trạng thái mới"><select className={inputCls} value={v} onChange={(e) => setV(e.target.value)}><option value="">— Chọn —</option>{STATUS_ORDER.filter((s) => !["done", "review"].includes(s)).map((s) => <option key={s} value={s}>{STATUSES[s].label}</option>)}</select><p className="mt-1 text-[10px] text-zinc-400">Hoàn thành & gửi duyệt phải làm trong từng task (cần kết quả thực tế).</p></Field>}
      {type === "deadline" && <><Field label="Deadline mới"><input type="date" className={inputCls} value={v} onChange={(e) => setV(e.target.value)} /></Field><Field label="Lý do"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field></>}
      {type === "owner" && <Field label="Người phụ trách mới"><UserSelect value={v} onChange={setV} users={assignableUsers(db, me, {})} /></Field>}
      <div className="flex justify-end gap-2"><button className={btnSec} onClick={onClose}>Hủy</button><button className={btnPri} disabled={!v} onClick={apply}>Áp dụng cho {ids.length} task</button></div>
    </Modal>
  );
}

/* ---------- Kanban ---------- */
function KanbanBoard({ tasks }) {
  const { act, openTask, toast, db } = useApp();
  const [over, setOver] = useState(null);
  const cols = STATUS_ORDER;
  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {cols.map((s) => {
        const list = tasks.filter((t) => t.status === s);
        return (
          <div key={s} className={`w-64 shrink-0 rounded-xl bg-zinc-50 p-2 ${over === s ? "ring-2 ring-zinc-300" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setOver(s); }} onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData("t"); if (!id) return; const r = act.changeStatus(id, s); if (!r.ok) toast(r.msg, "warn"); else if (r.msg) toast(r.msg); }}>
            <div className="flex items-center gap-1.5 px-1.5 pb-2">
              <span className={`h-2 w-2 rounded-full ${STATUSES[s].dot}`} />
              <span className="text-xs font-semibold text-zinc-600">{STATUSES[s].label}</span>
              <span className="text-[11px] text-zinc-400">{list.length}</span>
            </div>
            <div className="space-y-2 min-h-[40px]">
              {list.map((t) => (
                <div key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData("t", t.id)} onClick={() => openTask(t.id)}
                  className="cursor-pointer rounded-xl border border-zinc-100 bg-white p-2.5 shadow-sm hover:shadow transition-shadow">
                  <p className="text-[13px] font-medium text-zinc-800 leading-snug mb-1.5">{t.name}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5"><PriorityPill p={t.priority} /><BrandChip id={t.brandId} />{t.approverId && s !== "done" && <span className="text-[10px] text-violet-500">cần duyệt</span>}</div>
                  <div className="flex items-center justify-between">
                    {t.ownerId ? <Avatar id={t.ownerId} size={6} /> : <span className="text-[10px] text-amber-600">Chưa giao</span>}
                    <DeadlineBadge t={t} />
                  </div>
                  {t.checklist.length > 0 && <p className="mt-1.5 text-[10px] text-zinc-400 inline-flex items-center gap-1"><CheckSquare className="h-3 w-3" />{t.checklist.filter((c) => c.done).length}/{t.checklist.length}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Calendar ---------- */
function CalendarView({ tasks, canDrag = true }) {
  const { db, me, act, openTask, toast } = useApp();
  const [cur, setCur] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [mode, setMode] = useState("month");
  /* Tuần có state riêng — không dùng state tháng để điều khiển view tuần */
  const [weekAnchor, setWeekAnchor] = useState(() => { const d = new Date(); const dow = (d.getDay() + 6) % 7; return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow)); });
  const [dragModal, setDragModal] = useState(null); // {taskId, date, reason}
  const first = new Date(cur.y, cur.m, 1);
  const startDow = (first.getDay() + 6) % 7; // Mon=0
  const gridStart = new Date(cur.y, cur.m, 1 - startDow);
  const weeks = mode === "month" ? 6 : 1;
  const weekStart = mode === "week" ? new Date(weekAnchor + "T00:00:00") : gridStart;
  const days = Array.from({ length: weeks * 7 }, (_, i) => iso(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)));
  const byDay = useMemo(() => { const m = {}; tasks.forEach((t) => { if (t.deadline) (m[t.deadline] = m[t.deadline] || []).push(t); }); return m; }, [tasks]);
  const shiftWeek = (n) => setWeekAnchor((w) => iso(new Date(new Date(w + "T00:00:00").getTime() + n * 7 * DAY)));
  const goToday = () => { const d = new Date(); const dow = (d.getDay() + 6) % 7; setWeekAnchor(iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow))); setCur({ y: d.getFullYear(), m: d.getMonth() }); };
  const onDropDay = (id, d) => {
    const t = db.tasks.find((x) => x.id === id);
    if (!t || t.deadline === d) return;
    if (!perms.changeDeadline(db, me, t)) { toast("Bạn không có quyền đổi deadline task này", "warn"); return; }
    if (t.deadlineConfirmed && t.deadline) { setDragModal({ taskId: id, date: d, reason: "", name: t.name }); return; }
    act.changeDeadline(id, d, "Kéo thả trên lịch");
    toast(`Đã đổi deadline sang ${fmtDFull(d)}`);
  };
  return (
    <div className="rounded-xl border border-zinc-100 bg-white p-3">
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <button className={btnGhost} onClick={() => mode === "week" ? shiftWeek(-1) : setCur((c) => ({ y: c.m === 0 ? c.y - 1 : c.y, m: (c.m + 11) % 12 }))}><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm font-semibold text-zinc-800 min-w-[10rem] text-center">{mode === "week" ? `${fmtDFull(days[0])} – ${fmtDFull(days[6])}` : `Tháng ${cur.m + 1}/${cur.y}`}</span>
        <button className={btnGhost} onClick={() => mode === "week" ? shiftWeek(1) : setCur((c) => ({ y: c.m === 11 ? c.y + 1 : c.y, m: (c.m + 1) % 12 }))}><ChevronRight className="h-4 w-4" /></button>
        <button className={btnGhost} onClick={goToday}>Hôm nay</button>
        <div className="ml-auto flex rounded-lg bg-zinc-100 p-0.5">
          {[["month", "Tháng"], ["week", "Tuần"]].map(([k, lb]) => <button key={k} onClick={() => setMode(k)} className={`rounded-md px-2.5 py-1 text-xs font-medium ${mode === k ? "bg-white shadow-sm text-zinc-800" : "text-zinc-500"}`}>{lb}</button>)}
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-zinc-400 mb-1">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => <div key={d}>{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = mode === "week" || new Date(d).getMonth() === cur.m;
          const isToday = d === todayISO();
          return (
            <div key={d} className={`min-h-[86px] rounded-lg border p-1 ${isToday ? "border-zinc-800 bg-zinc-50" : "border-zinc-100"} ${inMonth ? "" : "opacity-40"}`}
              onDragOver={(e) => canDrag && e.preventDefault()}
              onDrop={(e) => { if (!canDrag) return; const id = e.dataTransfer.getData("t"); if (id) onDropDay(id, d); }}>
              <p className={`text-[11px] mb-1 ${isToday ? "font-bold text-zinc-900" : "text-zinc-400"}`}>{+d.split("-")[2]}</p>
              <div className="space-y-0.5">
                {(byDay[d] || []).slice(0, 3).map((t) => (
                  <div key={t.id} draggable={canDrag} onDragStart={(e) => e.dataTransfer.setData("t", t.id)} onClick={() => openTask(t.id)}
                    className={`cursor-pointer truncate rounded px-1 py-0.5 text-[10px] leading-tight ${t.status === "done" ? "bg-emerald-50 text-emerald-700" : isOverdue(t) ? "bg-red-50 text-red-700" : "bg-zinc-100 text-zinc-600"} hover:opacity-80`} title={t.name}>{t.name}</div>
                ))}
                {(byDay[d] || []).length > 3 && <p className="text-[9px] text-zinc-400 px-1">+{byDay[d].length - 3} nữa</p>}
              </div>
            </div>
          );
        })}
      </div>
      {dragModal && (
        <Modal title="Deadline đã xác nhận — cần lý do" onClose={() => setDragModal(null)}>
          <p className="mb-2 text-[13px] text-zinc-600"><b>{dragModal.name}</b> → deadline mới <b>{fmtDFull(dragModal.date)}</b>. Deadline đã xác nhận trước đó nên bắt buộc ghi lý do.</p>
          <Field label="Lý do đổi deadline" req><textarea className={inputCls} rows={2} value={dragModal.reason} onChange={(e) => setDragModal({ ...dragModal, reason: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><button className={btnSec} onClick={() => setDragModal(null)}>Hủy</button><button className={btnPri} disabled={!dragModal.reason.trim()} onClick={() => { act.changeDeadline(dragModal.taskId, dragModal.date, dragModal.reason.trim()); setDragModal(null); toast("Đã đổi deadline"); }}>Xác nhận</button></div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Workload ---------- */
function WorkloadView({ tasks, deptId }) {
  const { db, openTask } = useApp();
  const users = db.users.filter((u) => !deptId || u.deptId === deptId);
  const rows = users.map((u) => {
    const mine = tasks.filter((t) => t.ownerId === u.id && t.status !== "done");
    return {
      u, doing: mine.length,
      dueSoon: mine.filter(isDueSoon).length,
      overdue: mine.filter(isOverdue).length,
      high: mine.filter((t) => ["high", "urgent"].includes(t.priority)).length,
      load: mine.reduce((s, t) => s + EFFORT_W[t.effort], 0),
    };
  }).filter((r) => r.doing > 0 || (deptId && r.u.deptId === deptId));
  const maxLoad = Math.max(6, ...rows.map((r) => r.load));
  if (!rows.length) return <EmptyState icon={Gauge} title="Chưa có dữ liệu khối lượng" />;
  return (
    <div className="rounded-xl border border-zinc-100 bg-white overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-zinc-100 bg-zinc-50/60">
          <tr>{["Nhân sự", "Đang làm", "Sắp đến hạn", "Quá hạn", "Ưu tiên cao", "Khối lượng ước tính"].map((h) => <th key={h} className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-zinc-400">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.sort((a, b) => b.load - a.load).map((r) => (
            <tr key={r.u.id} className="border-b border-zinc-50 last:border-0">
              <td className="px-3 py-2.5"><span className="inline-flex items-center gap-2"><Avatar id={r.u.id} size={7} /><span><p className="text-[13px] font-medium text-zinc-800">{r.u.name}</p><p className="text-[11px] text-zinc-400">{r.u.title}</p></span></span></td>
              <td className="px-3 py-2.5 text-zinc-700">{r.doing}</td>
              <td className="px-3 py-2.5">{r.dueSoon ? <span className="text-amber-600 font-medium">{r.dueSoon}</span> : <span className="text-zinc-300">0</span>}</td>
              <td className="px-3 py-2.5">{r.overdue ? <span className="text-red-600 font-medium">{r.overdue}</span> : <span className="text-zinc-300">0</span>}</td>
              <td className="px-3 py-2.5">{r.high ? <span className="text-zinc-800 font-medium">{r.high}</span> : <span className="text-zinc-300">0</span>}</td>
              <td className="px-3 py-2.5 w-52">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-zinc-100 overflow-hidden"><div className={`h-full rounded-full ${r.load > maxLoad * 0.75 ? "bg-red-400" : r.load > maxLoad * 0.5 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${Math.min(100, (r.load / maxLoad) * 100)}%` }} /></div>
                  <span className="text-[11px] text-zinc-400 w-6">{r.load}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Tasks view wrapper (List/Kanban/Calendar/Workload tabs) ---------- */
function TasksView({ tasks, showWorkload, deptId, showDeptFilter = true }) {
  const { me } = useApp();
  const [view, setView] = useState("list");
  const [f, setF] = useState({ ...emptyFilter });
  const filtered = applyFilter(tasks, f, me);
  const tabs = [["list", "Danh sách", LayoutList], ["kanban", "Kanban", LayoutGrid], ["calendar", "Lịch", CalendarDays]];
  if (showWorkload) tabs.push(["workload", "Khối lượng", Gauge]);
  return (
    <div>
      <div className="mb-3 flex rounded-lg bg-zinc-100 p-0.5 w-fit">
        {tabs.map(([k, lb, Ic]) => (
          <button key={k} onClick={() => setView(k)} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${view === k ? "bg-white shadow-sm text-zinc-800" : "text-zinc-500 hover:text-zinc-700"}`}><Ic className="h-3.5 w-3.5" />{lb}</button>
        ))}
      </div>
      {view !== "workload" && <FilterBar f={f} setF={setF} showDept={showDeptFilter} />}
      {view === "list" && <TaskTable tasks={filtered} />}
      {view === "kanban" && <KanbanBoard tasks={filtered} />}
      {view === "calendar" && <CalendarView tasks={filtered} />}
      {view === "workload" && <WorkloadView tasks={tasks} deptId={deptId} />}
    </div>
  );
}
/* ============================================================
   Dashboard
   ============================================================ */
function StatCard({ label, value, tone = "text-zinc-900", onClick }) {
  return (
    <button onClick={onClick} className="rounded-xl border border-zinc-100 bg-white px-4 py-3 text-left hover:border-zinc-200 hover:shadow-sm transition-all">
      <p className={`text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-0.5 text-xs text-zinc-400">{label}</p>
    </button>
  );
}
function MiniTaskList({ title, tasks, empty, accent }) {
  const { openTask } = useApp();
  return (
    <div className="rounded-xl border border-zinc-100 bg-white p-4">
      <p className="mb-2.5 text-[13px] font-semibold text-zinc-800">{title} <span className="text-zinc-300 font-normal">· {tasks.length}</span></p>
      {tasks.length === 0 ? <p className="text-xs text-zinc-300 py-2">{empty || "Không có công việc nào"}</p> : (
        <div className="space-y-1">
          {tasks.slice(0, 6).map((t) => (
            <button key={t.id} onClick={() => openTask(t.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-zinc-50">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUSES[t.status].dot}`} />
              <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-700">{t.name}</span>
              {t.ownerId && <span className="shrink-0"><Avatar id={t.ownerId} size={6} /></span>}
              <DeadlineBadge t={t} />
            </button>
          ))}
          {tasks.length > 6 && <p className="px-2 pt-1 text-[11px] text-zinc-400">+{tasks.length - 6} công việc khác</p>}
        </div>
      )}
    </div>
  );
}

function Dashboard() {
  const { db, me, nav } = useApp();
  const visible = db.tasks.filter((t) => !t.deleted && canSeeTask(db, me, t));
  const mine = visible.filter((t) => t.ownerId === me.id && t.status !== "done");
  const pinnedIds = visible.filter((t) => t.pinnedBy.includes(me.id) && t.status !== "done");
  const hello = new Date().getHours() < 12 ? "Chào buổi sáng" : new Date().getHours() < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  const todayT = mine.filter((t) => t.deadline === todayISO());
  const soon = mine.filter((t) => isDueSoon(t) && t.deadline !== todayISO());
  const over = mine.filter(isOverdue);
  const waitingOthers = visible.filter((t) => t.status === "waiting" && (t.ownerId === me.id || t.creatorId === me.id));
  const assigned = visible.filter((t) => t.assignerId === me.id && t.status !== "done" && t.ownerId !== me.id);
  const needUpdate = mine.filter((t) => t.status === "revise");
  const myReview = visible.filter((t) => t.approverId === me.id && t.status === "review");

  return (
    <div>
      <PageHeader title={`${hello}, ${me.name}`} desc={`${fmtDFull(todayISO())} · ${ROLE_LABELS[me.role]} · ${deptById(db, me.deptId)?.name}`} />

      {/* Pinned */}
      <div className="mb-4 rounded-xl border border-zinc-100 bg-white p-4">
        <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-800"><Pin className="h-3.5 w-3.5 text-zinc-400" />Ưu tiên hôm nay <span className="text-zinc-300 font-normal">· ghim tối đa 5 task từ chi tiết công việc</span></p>
        {pinnedIds.length === 0 ? <p className="text-xs text-zinc-300">Chưa ghim task nào. Mở một task và bấm biểu tượng ghim.</p> : (
          <div className="flex flex-wrap gap-2">{pinnedIds.map((t) => <PinCard key={t.id} t={t} />)}</div>
        )}
      </div>

      {(me.role === "employee" || me.role === "leader") && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Cần làm hôm nay" value={todayT.length} />
            <StatCard label="Sắp đến hạn (3 ngày)" value={soon.length} tone={soon.length ? "text-amber-600" : "text-zinc-900"} />
            <StatCard label="Quá hạn" value={over.length} tone={over.length ? "text-red-600" : "text-zinc-900"} />
            <StatCard label="Chờ tôi duyệt" value={myReview.length} tone={myReview.length ? "text-violet-600" : "text-zinc-900"} onClick={() => nav("approvals")} />
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <MiniTaskList title="Việc cần làm hôm nay" tasks={[...todayT, ...over]} empty="Hôm nay không có deadline nào. Một ngày dễ thở." />
            <MiniTaskList title="Việc sắp đến hạn" tasks={soon} />
            <MiniTaskList title="Việc cần cập nhật (bị yêu cầu sửa)" tasks={needUpdate} />
            <MiniTaskList title="Việc đang chờ người khác" tasks={waitingOthers} />
            <MiniTaskList title="Việc tôi đã giao" tasks={assigned} />
            <div className="rounded-xl border border-zinc-100 bg-white p-4">
              <p className="mb-2.5 text-[13px] font-semibold text-zinc-800">Lịch tuần này</p>
              <WeekStrip tasks={mine} />
            </div>
          </div>
        </>
      )}
      {me.role === "leader" && <LeaderPanel visible={visible} />}
      {(me.role === "ceo" || me.role === "admin") && <CeoPanel visible={visible} />}
    </div>
  );
}
function PinCard({ t }) {
  const { openTask } = useApp();
  return (
    <button onClick={() => openTask(t.id)} className="flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 hover:border-zinc-200">
      <span className={`h-2 w-2 rounded-full ${STATUSES[t.status].dot}`} />
      <span className="text-[13px] font-medium text-zinc-700 max-w-[220px] truncate">{t.name}</span>
      <DeadlineBadge t={t} />
    </button>
  );
}
function WeekStrip({ tasks }) {
  const { openTask } = useApp();
  const days = Array.from({ length: 7 }, (_, i) => D(i));
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const list = tasks.filter((t) => t.deadline === d);
        return (
          <div key={d} className={`rounded-lg p-1.5 ${d === todayISO() ? "bg-zinc-900" : "bg-zinc-50"}`}>
            <p className={`text-center text-[10px] font-medium mb-1 ${d === todayISO() ? "text-white" : "text-zinc-400"}`}>{["CN", "T2", "T3", "T4", "T5", "T6", "T7"][new Date(d).getDay()]} {+d.split("-")[2]}</p>
            {list.slice(0, 2).map((t) => <button key={t.id} onClick={() => openTask(t.id)} className={`block w-full truncate rounded px-1 py-0.5 text-left text-[9px] mb-0.5 ${d === todayISO() ? "bg-white/15 text-white" : "bg-white text-zinc-600"}`} title={t.name}>{t.name}</button>)}
            {list.length > 2 && <p className={`text-[8px] text-center ${d === todayISO() ? "text-white/60" : "text-zinc-300"}`}>+{list.length - 2}</p>}
          </div>
        );
      })}
    </div>
  );
}
function LeaderPanel({ visible }) {
  const { db, me, nav, openTask, openRequest } = useApp();
  const dept = visible.filter((t) => t.deptId === me.deptId);
  const active = dept.filter((t) => t.status !== "done");
  const stuck = dept.filter((t) => ["waiting", "paused"].includes(t.status));
  const review = dept.filter((t) => t.status === "review" && t.approverId === me.id);
  const unassigned = dept.filter((t) => !t.ownerId && t.status !== "done");
  const reqs = db.requests.filter((r) => r.toDeptId === me.deptId && ["pending", "info"].includes(r.status));
  const week = active.filter((t) => t.deadline && daysLeft(t.deadline) >= 0 && daysLeft(t.deadline) <= 7 && ["high", "urgent"].includes(t.priority));
  /* ===== ACTION CENTER: mỗi mục có nút mở đúng item, không chỉ đếm số ===== */
  const overdueNeed = dept.filter((t) => isOverdue(t) && t.status !== "review");
  const dlPending = db.requests.filter((r) => r.status === "deadline_proposed" && (r.toDeptId === me.deptId || r.fromDeptId === me.deptId));
  const blockers = db.projects.flatMap((p) => p.issues.filter((i) => i.status !== "RESOLVED" && (i.deptId === me.deptId || i.ownerId === me.id)).map((i) => ({ ...i, projectId: p.id, projectName: p.name })));
  const rework = dept.filter((t) => t.revisionCount >= 2 && t.status !== "done");
  const byOwner = {};
  active.forEach((t) => { if (t.ownerId) byOwner[t.ownerId] = (byOwner[t.ownerId] || 0) + 1; });
  const overloaded = Object.entries(byOwner).filter(([, n]) => n >= 6).map(([id2, n]) => ({ id: id2, n }));
  const urgentSoon = active.filter((t) => t.priority === "urgent" && t.deadline && daysLeft(t.deadline) >= 0 && daysLeft(t.deadline) <= 2);
  const AC = ({ items, label, tone, render }) => items.length === 0 ? null : (
    <div className="mb-2">
      <p className={`mb-1 text-[11px] font-semibold ${tone}`}>{label} · {items.length}</p>
      <div className="space-y-0.5">{items.slice(0, 5).map(render)}</div>
    </div>
  );
  const TRow = (t) => <button key={t.id} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-zinc-50" onClick={() => openTask(t.id)}><span className="flex-1 truncate text-[12px] text-zinc-700">{t.isConfidential ? "(Công việc bảo mật)" : t.name}</span><span className="hidden sm:inline text-[10px] text-zinc-400">{userById(db, t.ownerId)?.name || "—"}</span>{t.deadline && <span className={`text-[10px] tabular-nums ${deadlineMeta(t).cls}`}>{deadlineMeta(t).label}</span>}<ChevronRight className="h-3 w-3 shrink-0 text-zinc-300" /></button>;
  const acEmpty = !review.length && !overdueNeed.length && !unassigned.length && !reqs.length && !dlPending.length && !blockers.length && !rework.length && !overloaded.length && !urgentSoon.length;
  return (
    <div className="mt-5">
      <div className="mb-3 rounded-xl border border-zinc-200 bg-white p-4">
        <p className="mb-2 text-[13px] font-semibold text-zinc-900">Hôm nay tôi cần xử lý gì?</p>
        {acEmpty && <p className="text-xs text-zinc-300 py-1">Không có việc tồn đọng cần Leader can thiệp. Tuyệt vời.</p>}
        <AC items={review} label="Chờ tôi duyệt" tone="text-violet-600" render={TRow} />
        <AC items={overdueNeed} label="Quá hạn cần can thiệp" tone="text-red-600" render={TRow} />
        <AC items={unassigned} label="Chưa có người phụ trách" tone="text-amber-600" render={TRow} />
        <AC items={reqs} label="Yêu cầu chưa tiếp nhận" tone="text-sky-600" render={(r) => <button key={r.id} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-zinc-50" onClick={() => openRequest(r.id)}><span className="flex-1 truncate text-[12px] text-zinc-700">{r.title}</span><ReqPill s={r.status} /><ChevronRight className="h-3 w-3 text-zinc-300" /></button>} />
        <AC items={dlPending} label="Deadline đang chờ chốt" tone="text-fuchsia-600" render={(r) => <button key={r.id} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-zinc-50" onClick={() => openRequest(r.id)}><span className="flex-1 truncate text-[12px] text-zinc-700">{r.title}</span><ChevronRight className="h-3 w-3 text-zinc-300" /></button>} />
        <AC items={blockers} label="Blocker chờ xử lý" tone="text-orange-600" render={(i) => <button key={i.id} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-zinc-50" onClick={() => nav("projectDetail", { id: i.projectId })}><span className="flex-1 truncate text-[12px] text-zinc-700">{i.title}</span><span className="text-[10px] text-zinc-400">{i.projectName}</span><ChevronRight className="h-3 w-3 text-zinc-300" /></button>} />
        <AC items={rework} label="Bị trả sửa ≥ 2 lần" tone="text-rose-600" render={TRow} />
        <AC items={overloaded} label="Nhân sự quá tải (≥6 việc đang mở)" tone="text-amber-700" render={(o) => <div key={o.id} className="flex items-center gap-2 px-1.5 py-1"><UserChip id={o.id} /><span className="text-[11px] text-zinc-500">{o.n} việc đang mở</span></div>} />
        <AC items={urgentSoon} label="Khẩn cấp sắp đến hạn" tone="text-red-700" render={TRow} />
      </div>
      <p className="mb-2.5 text-[13px] font-semibold text-zinc-800">Điều hành phòng {deptById(db, me.deptId)?.name}</p>
      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Đang thực hiện" value={active.length} />
        <StatCard label="Quá hạn" value={dept.filter(isOverdue).length} tone="text-red-600" />
        <StatCard label="Đang tắc (chờ / dừng)" value={stuck.length} tone={stuck.length ? "text-amber-600" : "text-zinc-900"} />
        <StatCard label="Chờ tôi duyệt" value={review.length} tone="text-violet-600" onClick={() => nav("approvals")} />
        <StatCard label="Chưa có phụ trách" value={unassigned.length} tone={unassigned.length ? "text-amber-600" : "text-zinc-900"} />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <MiniTaskList title="Deadline quan trọng 7 ngày tới" tasks={week} />
        <div className="rounded-xl border border-zinc-100 bg-white p-4">
          <p className="mb-2.5 text-[13px] font-semibold text-zinc-800">Yêu cầu phối hợp chờ xác nhận <span className="text-zinc-300 font-normal">· {reqs.length}</span></p>
          {reqs.length === 0 ? <p className="text-xs text-zinc-300 py-2">Không có yêu cầu chờ</p> : reqs.map((r) => <RequestRow key={r.id} r={r} />)}
        </div>
        <div className="rounded-xl border border-zinc-100 bg-white p-4 lg:col-span-2">
          <p className="mb-2.5 text-[13px] font-semibold text-zinc-800">Khối lượng theo nhân sự</p>
          <WorkloadView tasks={dept} deptId={me.deptId} />
        </div>
      </div>
    </div>
  );
}
function CeoPanel({ visible: allVisible }) {
  const { db, nav, openTask, openRequest } = useApp();
  const [bTab, setBTab] = useState("all");
  const [inclCommon, setInclCommon] = useState(false);
  /* Brand tách bạch: xem Nevor = CHỈ task Nevor; việc Chung là tuỳ chọn bật thêm — không cộng trùng 2 brand */
  const visible = bTab === "all" ? allVisible : allVisible.filter((t) => t.brandId === bTab || (inclCommon && !t.brandId));
  const urgent = visible.filter((t) => t.priority === "urgent" && t.status !== "done");
  const overHigh = visible.filter((t) => isOverdue(t) && ["high", "urgent"].includes(t.priority));
  const ceoReview = visible.filter((t) => t.approverId === "ceo" && t.status === "review");
  const crossStuck = db.requests.filter((r) => (["pending", "info"].includes(r.status) && daysLeft(r.proposedDeadline) <= 2) || r.status === "deadline_proposed").filter((r) => bTab === "all" || r.brandId === bTab || (inclCommon && !r.brandId));
  const keyPrj = db.projects.filter((p) => ["active", "prep", "paused"].includes(p.status) && (bTab === "all" || p.brandId === bTab || (inclCommon && !p.brandId)));
  /* ===== CEO ACTION CENTER: chỉ việc cần CEO — không đưa mọi task nhỏ ===== */
  const critBlockers = db.projects.flatMap((p) => p.issues.filter((i) => i.status !== "RESOLVED" && i.severity === "critical").map((i) => ({ ...i, projectId: p.id, projectName: p.name })));
  const noOwnerBlockers = db.projects.flatMap((p) => p.issues.filter((i) => i.status !== "RESOLVED" && !i.ownerId).map((i) => ({ ...i, projectId: p.id, projectName: p.name })));
  const urgentOver = visible.filter((t) => t.priority === "urgent" && isOverdue(t) && daysLeft(t.deadline) <= -2);
  const slowPrj = keyPrj.filter((p) => { const pts = allVisible.filter((t) => t.projectId === p.id); const done = pts.filter((t) => t.status === "done").length; const pct = pts.length ? done / pts.length : 0; return isOverdue({ deadline: p.deadline, status: "doing" }) || (p.deadline && daysLeft(p.deadline) <= 7 && pct < 0.7); });
  const escalated = db.notifs.filter((n) => n.userId === "ceo" && !n.read && n.level === "urgent").slice(0, 5);
  const AC = ({ items, label, tone, render }) => items.length === 0 ? null : (
    <div className="mb-2"><p className={`mb-1 text-[11px] font-semibold ${tone}`}>{label} · {items.length}</p><div className="space-y-0.5">{items.slice(0, 5).map(render)}</div></div>
  );
  const TRow = (t) => <button key={t.id} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-zinc-50" onClick={() => openTask(t.id)}><span className="flex-1 truncate text-[12px] text-zinc-700">{t.isConfidential ? "(Công việc bảo mật)" : t.name}</span><span className="hidden sm:inline text-[10px] text-zinc-400">{userById(db, t.ownerId)?.name}</span>{t.deadline && <span className={`text-[10px] tabular-nums ${deadlineMeta(t).cls}`}>{deadlineMeta(t).label}</span>}<ChevronRight className="h-3 w-3 shrink-0 text-zinc-300" /></button>;
  const acEmpty = !ceoReview.length && !critBlockers.length && !urgentOver.length && !slowPrj.length && !crossStuck.length && !noOwnerBlockers.length;
  return (
    <div className="mt-1">
      <div className="mb-3 flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg bg-zinc-100 p-0.5 w-fit">
          {[["all", "Toàn công ty"], ["nevor", "Nevor"], ["uhero", "UHero"]].map(([k, lb]) => (
            <button key={k} onClick={() => setBTab(k)} className={`rounded-md px-3 py-1.5 text-xs font-medium ${bTab === k ? "bg-white shadow-sm text-zinc-800" : "text-zinc-500"}`}>{lb}</button>
          ))}
        </div>
        {bTab !== "all" && <label className="flex items-center gap-1.5 text-xs text-zinc-500"><input type="checkbox" className="accent-zinc-800" checked={inclCommon} onChange={(e) => setInclCommon(e.target.checked)} />Gồm việc Chung (2 brand)</label>}
      </div>
      <div className="mb-3 rounded-xl border border-zinc-200 bg-white p-4">
        <p className="mb-2 text-[13px] font-semibold text-zinc-900">CEO cần hành động</p>
        {acEmpty && <p className="text-xs text-zinc-300 py-1">Không có việc chờ CEO quyết định.</p>}
        <AC items={ceoReview} label="Chờ CEO duyệt / quyết định" tone="text-violet-600" render={TRow} />
        <AC items={critBlockers} label="Blocker CRITICAL" tone="text-red-700" render={(i) => <button key={i.id} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-zinc-50" onClick={() => nav("projectDetail", { id: i.projectId })}><span className="flex-1 truncate text-[12px] text-zinc-700">{i.title}</span><span className="text-[10px] text-zinc-400">{i.projectName} · {userById(db, i.ownerId)?.name || "chưa có owner"}</span><ChevronRight className="h-3 w-3 text-zinc-300" /></button>} />
        <AC items={urgentOver} label="Khẩn cấp quá hạn nhiều ngày" tone="text-red-600" render={TRow} />
        <AC items={slowPrj} label="Dự án chậm tiến độ" tone="text-amber-600" render={(p) => <button key={p.id} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-zinc-50" onClick={() => nav("projectDetail", { id: p.id })}><span className="flex-1 truncate text-[12px] text-zinc-700">{p.name}</span><span className="text-[10px] text-zinc-400">hạn {fmtDFull(p.deadline)}</span><ChevronRight className="h-3 w-3 text-zinc-300" /></button>} />
        <AC items={crossStuck} label="Yêu cầu liên phòng ban bị tắc" tone="text-sky-600" render={(r) => <button key={r.id} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-zinc-50" onClick={() => openRequest(r.id)}><span className="flex-1 truncate text-[12px] text-zinc-700">{r.title}</span><ReqPill s={r.status} /><ChevronRight className="h-3 w-3 text-zinc-300" /></button>} />
        <AC items={noOwnerBlockers} label="Vấn đề chưa có người xử lý" tone="text-orange-600" render={(i) => <button key={i.id} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-zinc-50" onClick={() => nav("projectDetail", { id: i.projectId })}><span className="flex-1 truncate text-[12px] text-zinc-700">{i.title}</span><ChevronRight className="h-3 w-3 text-zinc-300" /></button>} />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Task khẩn cấp toàn công ty" value={urgent.length} tone="text-red-600" />
        <StatCard label="Quá hạn mức cao / khẩn" value={overHigh.length} tone={overHigh.length ? "text-red-600" : "text-zinc-900"} />
        <StatCard label="Chờ CEO duyệt" value={ceoReview.length} tone="text-violet-600" onClick={() => nav("approvals")} />
        <StatCard label="Yêu cầu liên phòng ban chưa thông" value={crossStuck.length} tone={crossStuck.length ? "text-amber-600" : "text-zinc-900"} onClick={() => nav("requests")} />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <MiniTaskList title="Chờ CEO duyệt / quyết định" tasks={ceoReview} empty="Không có gì chờ quyết định. Hiếm đấy." />
        <MiniTaskList title="Quá hạn nghiêm trọng" tasks={overHigh} />
        <div className="rounded-xl border border-zinc-100 bg-white p-4 lg:col-span-2">
          <p className="mb-3 text-[13px] font-semibold text-zinc-800">Tiến độ dự án trọng điểm</p>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {keyPrj.map((p) => {
              const pts = visible.filter((t) => t.projectId === p.id);
              const done = pts.filter((t) => t.status === "done").length;
              const pct = pts.length ? Math.round((done / pts.length) * 100) : 0;
              const issues = p.issues.filter((i) => i.status !== "RESOLVED").length;
              return (
                <button key={p.id} onClick={() => nav("projectDetail", { id: p.id })} className="rounded-xl border border-zinc-100 p-3 text-left hover:border-zinc-200 hover:shadow-sm">
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <p className="text-[13px] font-medium text-zinc-800 flex items-center gap-1.5">{p.name}<BrandChip id={p.brandId} /></p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${PROJECT_STATUSES[p.status].pill}`}>{PROJECT_STATUSES[p.status].label}</span>
                  </div>
                  <div className="flex items-center gap-2"><ProgressBar v={pct} /><span className="text-[11px] text-zinc-400 w-16">{done}/{pts.length} task</span></div>
                  <p className="mt-1.5 text-[11px] text-zinc-400">Hạn {fmtDFull(p.deadline)}{issues > 0 && <span className="text-amber-600"> · {issues} vấn đề đang vướng</span>}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Departments
   ============================================================ */
function DepartmentsPage() {
  const { db, me, nav } = useApp();
  const groups = [["nevor", "Nevor"], ["uhero", "UHero"], [null, "Phòng ban dùng chung"]];
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Phòng ban</h1>
      {groups.map(([b, label]) => (
      <div key={label} className="mb-5">
      <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{b ? <BrandChip id={b} /> : null}{label}</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {db.depts.filter((d) => (d.brandId || null) === b).map((d) => {
          const members = db.users.filter((u) => u.deptId === d.id);
          const tasks = db.tasks.filter((t) => !t.deleted && t.deptId === d.id && t.status !== "done");
          const over = tasks.filter(isOverdue).length;
          return (
            <button key={d.id} onClick={() => nav("deptDetail", { id: d.id })} className="rounded-xl border border-zinc-100 bg-white p-4 text-left hover:border-zinc-200 hover:shadow-sm transition-all">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-800">{d.name}</p>
                {d.leaderId && <Avatar id={d.leaderId} size={7} />}
              </div>
              <p className="text-xs text-zinc-400 mb-2.5">{members.length} nhân sự · Leader: {d.leaderId ? userById(db, d.leaderId)?.name : "Admin phụ trách"}</p>
              <div className="flex gap-3 text-xs">
                <span className="text-zinc-600"><b>{tasks.length}</b> đang chạy</span>
                {over > 0 && <span className="text-red-600 font-medium">{over} quá hạn</span>}
              </div>
            </button>
          );
        })}
      </div>
      </div>
      ))}
    </div>
  );
}
function DeptDetail({ id }) {
  const { db, me, nav, openTask } = useApp();
  const d = deptById(db, id);
  const [tab, setTab] = useState("overview");
  if (!d) return null;
  const tasks = db.tasks.filter((t) => !t.deleted && (t.deptId === id || t.coDeptIds.includes(id)) && canSeeTask(db, me, t));
  const active = tasks.filter((t) => t.status !== "done");
  const docs = db.docs.filter((x) => x.deptId === id);
  const tabs = [["overview", "Tổng quan"], ["tasks", "Công việc"], ["review", "Chờ duyệt"], ["overdue", "Quá hạn"], ["docs", "Tài liệu"]];
  return (
    <div>
      <button className={`${btnGhost} mb-2`} onClick={() => nav("departments")}><ChevronLeft className="h-3.5 w-3.5" />Phòng ban</button>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-lg font-semibold text-zinc-900">{d.name}</h1>
        {d.leaderId && <span className="text-xs text-zinc-400">Leader: {userById(db, d.leaderId)?.name}</span>}
      </div>
      <div className="mb-4 flex gap-1 border-b border-zinc-100">
        {tabs.map(([k, lb]) => <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px ${tab === k ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600"}`}>{lb}</button>)}
      </div>
      {tab === "overview" && (
        <div>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard label="Tổng task" value={tasks.length} />
            <StatCard label="Đang thực hiện" value={active.filter((t) => t.status === "doing").length} />
            <StatCard label="Quá hạn" value={tasks.filter(isOverdue).length} tone="text-red-600" />
            <StatCard label="Chờ duyệt" value={tasks.filter((t) => t.status === "review").length} tone="text-violet-600" />
            <StatCard label="Tạm dừng" value={tasks.filter((t) => t.status === "paused").length} />
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-100 bg-white p-4"><p className="mb-2.5 text-[13px] font-semibold text-zinc-800">Thành viên</p>
              {db.users.filter((u) => u.deptId === id).map((u) => <div key={u.id} className="flex items-center gap-2.5 py-1.5"><Avatar id={u.id} size={7} /><div><p className="text-[13px] font-medium text-zinc-700">{u.name} {u.id === d.leaderId && <span className="ml-1 rounded bg-zinc-900 px-1.5 py-0.5 text-[9px] text-white">LEADER</span>}</p><p className="text-[11px] text-zinc-400">{u.title}</p></div></div>)}
            </div>
            <MiniTaskList title="Việc sắp đến hạn của phòng" tasks={active.filter(isDueSoon)} />
          </div>
        </div>
      )}
      {tab === "tasks" && <TasksView tasks={tasks} showWorkload deptId={id} showDeptFilter={false} />}
      {tab === "review" && <TaskTable tasks={tasks.filter((t) => t.status === "review")} />}
      {tab === "overdue" && <TaskTable tasks={tasks.filter(isOverdue)} />}
      {tab === "docs" && <DocList docs={docs} />}
    </div>
  );
}

/* ============================================================
   Projects
   ============================================================ */
function ProjectsPage() {
  const { db, me, nav, act, toast } = useApp();
  const [creating, setCreating] = useState(false);
  const canCreate = ["admin", "ceo", "leader"].includes(me.role);
  const EFFORT_W = { S: 1, M: 2, L: 4 };
  return (
    <div>
      <PageHeader title="Dự án" desc="Mục tiêu liên phòng ban — tiến độ theo trọng số công việc." actions={canCreate && <button className={btnPri} onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Tạo dự án</button>} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {db.projects.filter((p) => !p.deleted).map((p) => {
          const pts = db.tasks.filter((t) => !t.deleted && t.projectId === p.id);
          const totalW = pts.reduce((s, t) => s + (EFFORT_W[t.effort] ?? 1), 0);
          const doneW = pts.filter((t) => t.status === "done").reduce((s, t) => s + (EFFORT_W[t.effort] ?? 1), 0);
          const pct = totalW ? Math.round((doneW / totalW) * 100) : 0;
          const blockers = (p.issues || []).filter((i) => !i.resolved && i.status !== "RESOLVED").length;
          const dl = deadlineMeta({ deadline: p.deadline, status: p.status === "done" ? "done" : "doing" });
          return (
            <button key={p.id} onClick={() => nav("projectDetail", { id: p.id })} className="rounded-xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-zinc-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-800 leading-snug">{p.name} <BrandChip id={p.brandId} /></p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${PROJECT_STATUSES[p.status].pill}`}>{PROJECT_STATUSES[p.status].label}</span>
              </div>
              <p className="mb-2.5 text-xs text-zinc-400 line-clamp-2">{p.goal}</p>
              <div className="mb-2 flex items-center gap-2"><ProgressBar v={pct} /><span className="text-[11px] tabular-nums text-zinc-500 whitespace-nowrap">{pct}%</span></div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="inline-flex items-center gap-1.5"><Avatar id={p.ownerId} size={6} />{userById(db, p.ownerId)?.name}</span>
                <span className="flex items-center gap-2">
                  <span className={dl.cls}>Hạn {fmtD(p.deadline)}</span>
                  {blockers > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 font-medium text-red-600"><AlertTriangle className="h-3 w-3" />{blockers}</span>}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {creating && <ProjectForm onClose={() => setCreating(false)} />}
    </div>
  );
}
function ProjectForm({ onClose }) {
  const { db, act, toast } = useApp();
  const [f, setF] = useState({ name: "", goal: "", ownerId: null, deptIds: [], start: todayISO(), deadline: D(30), priority: "normal", desc: "", planLink: "", brandId: null });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal title="Tạo dự án" onClose={onClose} wide>
      <Field label="Tên dự án" req><input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
      <Field label="Mục tiêu"><textarea className={inputCls} rows={2} value={f.goal} onChange={(e) => set("goal", e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="Phụ trách dự án" req><UserSelect value={f.ownerId} onChange={(v) => set("ownerId", v)} /></Field>
        <Field label="Ưu tiên"><select className={inputCls} value={f.priority} onChange={(e) => set("priority", e.target.value)}>{PRIORITY_ORDER.map((p) => <option key={p} value={p}>{PRIORITIES[p].label}</option>)}</select></Field>
        <Field label="Bắt đầu"><input type="date" className={inputCls} value={f.start} onChange={(e) => set("start", e.target.value)} /></Field>
        <Field label="Deadline" req><input type="date" className={inputCls} value={f.deadline} onChange={(e) => set("deadline", e.target.value)} /></Field>
      </div>
      <Field label="Brand"><select className={inputCls} value={f.brandId || ""} onChange={(e) => set("brandId", e.target.value || null)}><option value="">Chung (cả 2 brand)</option>{BRAND_ORDER.map((b) => <option key={b} value={b}>{BRANDS[b].label}</option>)}</select></Field>
      <Field label="Phòng ban tham gia">
        <div className="flex flex-wrap gap-1.5">
          {db.depts.map((d) => <button key={d.id} onClick={() => set("deptIds", f.deptIds.includes(d.id) ? f.deptIds.filter((x) => x !== d.id) : [...f.deptIds, d.id])} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${f.deptIds.includes(d.id) ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"}`}>{d.name}</button>)}
        </div>
      </Field>
      <Field label="Link file kế hoạch"><input className={inputCls} value={f.planLink} onChange={(e) => set("planLink", e.target.value)} placeholder="https://…" /></Field>
      <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
        <button className={btnSec} onClick={onClose}>Hủy</button>
        <button className={btnPri} disabled={!f.name.trim() || !f.ownerId} onClick={() => { act.createProject(f); toast("Đã tạo dự án"); onClose(); }}>Tạo dự án</button>
      </div>
    </Modal>
  );
}
function ProjectDetail({ id }) {
  const { db, me, nav, act, toast } = useApp();
  const p = projById(db, id);
  const [tab, setTab] = useState("overview");
  const [creating, setCreating] = useState(false);
  const [issue, setIssue] = useState("");
  if (!p) return null;
  if (!canViewProject(db, me, p)) {
    return (
      <div>
        <button className={`${btnGhost} mb-2`} onClick={() => nav("projects")}><ChevronLeft className="h-3.5 w-3.5" />Dự án</button>
        <UnauthorizedState />
      </div>
    );
  }
  const EFFORT_W = { S: 1, M: 2, L: 4 };
  const pts = db.tasks.filter((t) => !t.deleted && t.projectId === id && canSeeTask(db, me, t));
  const totalW = pts.reduce((s, t) => s + (EFFORT_W[t.effort] ?? 1), 0);
  const doneW = pts.filter((t) => t.status === "done").reduce((s, t) => s + (EFFORT_W[t.effort] ?? 1), 0);
  const done = pts.filter((t) => t.status === "done").length;
  const pct = totalW ? Math.round((doneW / totalW) * 100) : 0;
  const members = [...new Set(pts.flatMap((t) => [t.ownerId, ...(t.collaboratorIds || [])]).filter(Boolean))];
  const editable = ["admin", "ceo"].includes(me.role) || p.ownerId === me.id;
  const canAddTask = canCreateTaskFor(db, me, { deptId: me.deptId, projectId: id, ownerId: me.id }).ok;
  const tabs = [["overview", "Tổng quan"], ["tasks", "Công việc"], ["timeline", "Timeline"], ["members", "Thành viên"], ["issues", "Vấn đề"]];
  return (
    <div>
      <button className={`${btnGhost} mb-2`} onClick={() => nav("projects")}><ChevronLeft className="h-3.5 w-3.5" />Dự án</button>
      <div className="mb-1 flex items-center gap-2.5 flex-wrap">
        <span className="font-mono text-[11px] text-zinc-400">{p.code}</span>
        <h1 className="text-lg font-semibold text-zinc-900">{p.name}</h1>
        <BrandChip id={p.brandId} />
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PROJECT_STATUSES[p.status].pill}`}>{PROJECT_STATUSES[p.status].label}</span>
        <PriorityPill p={p.priority} />
        {editable && (
          <select className="ml-auto rounded-lg border border-zinc-200 px-2 py-1 text-xs" value={p.status} onChange={(e) => { act.updateProject(id, { status: e.target.value }); toast("Đã đổi trạng thái dự án"); }}>
            {Object.entries(PROJECT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        )}
      </div>
      <p className="mb-3 text-[13px] text-zinc-500 max-w-2xl">{p.goal}</p>
      <div className="mb-4 flex items-center gap-3 max-w-md"><ProgressBar v={pct} cls="bg-zinc-800" /><span className="text-xs text-zinc-500 whitespace-nowrap">{done}/{pts.length} task · {pct}%</span></div>
      <div className="mb-4 flex gap-1 border-b border-zinc-100">
        {tabs.map(([k, lb]) => <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px ${tab === k ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600"}`}>{lb}</button>)}
        {canAddTask && <button className={`${btnGhost} ml-auto mb-1`} onClick={() => setCreating(true)}><Plus className="h-3.5 w-3.5" />Thêm task</button>}
      </div>
      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-100 bg-white p-4 space-y-2 text-[13px]">
            <p><span className="text-zinc-400">Phụ trách:</span> <UserChip id={p.ownerId} /></p>
            <p><span className="text-zinc-400">Theo dõi:</span> <AvatarGroup ids={p.watcherIds} /></p>
            <p className="flex items-start gap-1"><span className="text-zinc-400 shrink-0">Phòng ban:</span> <span className="flex flex-wrap gap-1">{p.deptIds.map((d) => <DeptTag key={d} id={d} />)}</span></p>
            <p><span className="text-zinc-400">Thời gian:</span> {fmtDFull(p.start)} → {fmtDFull(p.deadline)}</p>
            <p className="text-zinc-600">{p.desc}</p>
            {p.planLink && <a className="inline-flex items-center gap-1.5 text-zinc-700 hover:underline" href={p.planLink} target="_blank" rel="noreferrer"><FileText className="h-3.5 w-3.5 text-zinc-400" />File kế hoạch<ExternalLink className="h-3 w-3 text-zinc-300" /></a>}
          </div>
          <MiniTaskList title="Task đang chạy" tasks={pts.filter((t) => !["done", "paused"].includes(t.status))} />
        </div>
      )}
      {tab === "tasks" && <TasksView tasks={pts} showDeptFilter />}
      {tab === "timeline" && <ProjectTimeline tasks={pts} p={p} />}
      {tab === "members" && (
        <div className="rounded-xl border border-zinc-100 bg-white p-4 grid gap-1 md:grid-cols-2">
          {members.map((mid) => { const u = userById(db, mid); const cnt = pts.filter((t) => t.ownerId === mid && t.status !== "done").length; return <div key={mid} className="flex items-center gap-2.5 py-1.5"><Avatar id={mid} size={7} /><div className="flex-1"><p className="text-[13px] font-medium text-zinc-700">{u?.name}</p><p className="text-[11px] text-zinc-400">{deptById(db, u?.deptId)?.name}</p></div><span className="text-xs text-zinc-400">{cnt} task đang làm</span></div>; })}
        </div>
      )}
      {tab === "issues" && <BlockersTab p={p} />}
      {creating && <TaskForm defaults={{ projectId: id }} onClose={() => setCreating(false)} />}
    </div>
  );
}
function ProjectTimeline({ tasks, p }) {
  const { openTask } = useApp();
  const sorted = [...tasks].filter((t) => t.deadline).sort((a, b) => (a.deadline > b.deadline ? 1 : -1));
  if (!sorted.length) return <EmptyState icon={CalendarDays} title="Chưa có task có deadline" />;
  return (
    <div className="rounded-xl border border-zinc-100 bg-white p-4">
      <div className="relative pl-5">
        <div className="absolute left-1.5 top-1 bottom-1 w-px bg-zinc-100" />
        {sorted.map((t) => (
          <button key={t.id} onClick={() => openTask(t.id)} className="relative mb-3 block w-full text-left group">
            <span className={`absolute -left-5 top-1 h-3 w-3 rounded-full border-2 border-white ${STATUSES[t.status].dot}`} />
            <p className="text-[11px] text-zinc-400">{fmtDFull(t.deadline)}</p>
            <p className="text-[13px] font-medium text-zinc-700 group-hover:underline">{t.name}</p>
            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">{t.ownerId && <UserChip id={t.ownerId} />}<StatusPill s={t.status} /></p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ===== Blocker dự án: có owner, phòng giữ, hạn xử lý, hành động tiếp theo — trả lời "đang vướng ở đâu, ai xử lý tiếp" ===== */
const SEVERITIES = { low: ["LOW", "bg-zinc-100 text-zinc-500"], medium: ["MEDIUM", "bg-sky-50 text-sky-700"], high: ["HIGH", "bg-amber-50 text-amber-700"], critical: ["CRITICAL", "bg-red-50 text-red-600"] };
const BLOCKER_STATUSES = { OPEN: "Đang mở", IN_PROGRESS: "Đang xử lý", WAITING: "Chờ bên khác", RESOLVED: "Đã xử lý" };
function BlockersTab({ p }) {
  const { db, me, act, toast, openTask } = useApp();
  const [adding, setAdding] = useState(false);
  const [resolving, setResolving] = useState(null);
  const [f, setF] = useState({ title: "", severity: "medium", ownerId: p.ownerId, deptId: p.deptIds[0], dueDate: D(3), nextAction: "", relatedTaskId: "" });
  const open = p.issues.filter((i) => i.status !== "RESOLVED");
  const done = p.issues.filter((i) => i.status === "RESOLVED");
  const canEdit = ["admin", "ceo"].includes(me.role) || p.ownerId === me.id || (me.role === "leader" && p.deptIds.includes(me.deptId));
  return (
    <div>
      {open.length === 0 && <EmptyState icon={AlertTriangle} title="Không có blocker đang mở" hint="Ghi nhận điểm vướng kèm người xử lý & hạn để cả nhóm và CEO nhìn thấy." />}
      <div className="space-y-2.5">
        {open.map((i) => (
          <div key={i.id} className="rounded-xl border border-zinc-100 bg-white p-3">
            <div className="flex items-start gap-2">
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${SEVERITIES[i.severity][1]}`}>{SEVERITIES[i.severity][0]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-zinc-800">{i.title}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                  <span>Xử lý: <b className="text-zinc-700">{userById(db, i.ownerId)?.name || "— chưa có owner"}</b></span>
                  {i.deptId && <span>Phòng giữ: {deptById(db, i.deptId)?.name}</span>}
                  <span className={daysLeft(i.dueDate) < 0 ? "text-red-600 font-medium" : ""}>Hạn: {fmtDFull(i.dueDate)}</span>
                  {i.relatedTaskId && <button className="text-indigo-600 hover:underline" onClick={() => openTask(i.relatedTaskId)}>Task liên quan</button>}
                </div>
                {i.nextAction && <p className="mt-1 text-[12px] text-zinc-600"><b className="text-zinc-500">Bước tiếp theo:</b> {i.nextAction}</p>}
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <select className="rounded-md border border-zinc-200 px-1.5 py-1 text-[11px] text-zinc-600" value={i.status} onChange={(e) => e.target.value === "RESOLVED" ? setResolving(i) : act.updateBlocker(p.id, i.id, { status: e.target.value })}>
                    {Object.entries(BLOCKER_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {done.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-[11px] font-medium uppercase text-zinc-400">Đã xử lý · {done.length}</p>
          {done.map((i) => <p key={i.id} className="py-1 text-[12px] text-zinc-400 line-through">{i.title} <span className="no-underline text-zinc-300">· {i.resolutionNote}</span></p>)}
        </div>
      )}
      {canEdit && !adding && <button className={`${btnSec} mt-3`} onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Ghi nhận blocker</button>}
      {adding && (
        <div className="mt-3 rounded-xl border border-zinc-100 p-3">
          <Field label="Vấn đề" req><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="VD: NCC báo MOQ cao hơn dự kiến" /></Field>
          <div className="grid grid-cols-2 gap-x-3">
            <Field label="Mức độ"><select className={inputCls} value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value })}>{Object.keys(SEVERITIES).map((k) => <option key={k} value={k}>{SEVERITIES[k][0]}</option>)}</select></Field>
            <Field label="Người xử lý" req><UserSelect value={f.ownerId} onChange={(v) => setF({ ...f, ownerId: v })} /></Field>
            <Field label="Phòng đang giữ"><select className={inputCls} value={f.deptId || ""} onChange={(e) => setF({ ...f, deptId: e.target.value })}>{db.depts.filter((d) => p.deptIds.includes(d.id)).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
            <Field label="Hạn xử lý" req><input type="date" className={inputCls} value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
          </div>
          <Field label="Hành động tiếp theo"><input className={inputCls} value={f.nextAction} onChange={(e) => setF({ ...f, nextAction: e.target.value })} placeholder="VD: Sơn gọi lại NCC trước thứ 4" /></Field>
          <Field label="Task liên quan"><select className={inputCls} value={f.relatedTaskId} onChange={(e) => setF({ ...f, relatedTaskId: e.target.value })}><option value="">— Không —</option>{db.tasks.filter((t) => t.projectId === p.id && !t.deleted).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
          <div className="flex justify-end gap-2"><button className={btnSec} onClick={() => setAdding(false)}>Hủy</button><button className={btnPri} disabled={!f.title.trim() || !f.ownerId || !f.dueDate} onClick={() => { act.addBlocker(p.id, f); setAdding(false); toast("Đã ghi nhận blocker"); }}>Ghi nhận</button></div>
        </div>
      )}
      {resolving && (
        <Modal title="Đóng blocker" onClose={() => setResolving(null)}>
          <p className="mb-2 text-[13px] text-zinc-600"><b>{resolving.title}</b></p>
          <Field label="Đã xử lý thế nào? (bắt buộc)" req><textarea className={inputCls} rows={2} value={resolving.note || ""} onChange={(e) => setResolving({ ...resolving, note: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><button className={btnSec} onClick={() => setResolving(null)}>Hủy</button><button className={btnPri} disabled={!resolving.note?.trim()} onClick={() => { act.resolveBlocker(p.id, resolving.id, resolving.note); setResolving(null); toast("Đã đóng blocker"); }}>Đóng blocker</button></div>
        </Modal>
      )}
    </div>
  );
}
/* ============================================================
   Cross-department requests
   ============================================================ */
function RequestRow({ r }) {
  const { db, openRequest } = useApp();
  return (
    <button onClick={() => openRequest(r.id)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-zinc-50">
      <div className="flex-1 min-w-0">
        <p className="truncate text-[13px] font-medium text-zinc-700">{r.title}</p>
        <p className="text-[11px] text-zinc-400">{deptById(db, r.fromDeptId)?.name} → {deptById(db, r.toDeptId)?.name} · hạn {fmtD(r.agreedDeadline || r.proposedDeadline)}</p>
      </div>
      <BrandChip id={r.brandId} />
      <ReqPill s={r.status} />
    </button>
  );
}
function RequestsPage() {
  const { db, me, openRequest } = useApp();
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState("toMe");
  const visible = db.requests.filter((r) => !r.deleted);
  const toMe = visible.filter((r) => r.toDeptId === me.deptId || ["admin", "ceo"].includes(me.role));
  const fromMe = visible.filter((r) => r.fromDeptId === me.deptId || r.fromUserId === me.id);
  const list = tab === "toMe" ? toMe : tab === "fromMe" ? fromMe : visible;
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Yêu cầu phối hợp liên phòng ban</h1>
        <button className={btnPri} onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Tạo yêu cầu</button>
      </div>
      <div className="mb-3 flex rounded-lg bg-zinc-100 p-0.5 w-fit">
        {[["toMe", "Gửi đến phòng tôi"], ["fromMe", "Phòng tôi gửi đi"], ...(["admin", "ceo"].includes(me.role) ? [["all", "Tất cả"]] : [])].map(([k, lb]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === k ? "bg-white shadow-sm text-zinc-800" : "text-zinc-500"}`}>{lb}</button>
        ))}
      </div>
      {list.length === 0 ? <EmptyState icon={ArrowLeftRight} title="Không có yêu cầu nào" hint="Tạo yêu cầu khi cần phòng ban khác hỗ trợ — thay vì nhắn Zalo rồi trôi mất." /> : (
        <div className="rounded-xl border border-zinc-100 bg-white divide-y divide-zinc-50">
          {list.sort((a, b) => b.createdAt - a.createdAt).map((r) => (
            <button key={r.id} onClick={() => openRequest(r.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50">
              <span className="font-mono text-[11px] text-zinc-300 w-16 shrink-0">{r.code}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-zinc-800 truncate">{r.title}</p>
                <p className="text-[11px] text-zinc-400">{deptById(db, r.fromDeptId)?.name} → <b className="text-zinc-500">{deptById(db, r.toDeptId)?.name}</b> · {userById(db, r.fromUserId)?.name} · hạn {fmtD(r.agreedDeadline || r.proposedDeadline)}</p>
              </div>
              <BrandChip id={r.brandId} />
              <PriorityPill p={r.priority} />
              <ReqPill s={r.status} />
            </button>
          ))}
        </div>
      )}
      {creating && <RequestForm onClose={() => setCreating(false)} />}
    </div>
  );
}
function RequestForm({ onClose }) {
  const { db, me, act, toast } = useApp();
  const [f, setF] = useState({ title: "", content: "", toDeptId: "", priority: "normal", proposedDeadline: D(5), deliverable: "", brandId: deptBrand(db, me.deptId) });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal title="Tạo yêu cầu phối hợp" onClose={onClose} wide>
      <Field label="Tiêu đề" req><input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Ví dụ: Cung cấp thông tin sản phẩm mới" /></Field>
      <Field label="Nội dung yêu cầu" req><textarea className={inputCls} rows={3} value={f.content} onChange={(e) => set("content", e.target.value)} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
        <Field label="Phòng ban nhận" req><select className={inputCls} value={f.toDeptId} onChange={(e) => set("toDeptId", e.target.value)}><option value="">— Chọn —</option>{db.depts.filter((d) => d.id !== me.deptId).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        {f.toDeptId === "hr" && <Field label="Loại yêu cầu nhân sự"><select className={inputCls} value={f.reqType || ""} onChange={(e) => { const v = e.target.value; setF((x) => ({ ...x, reqType: v, isConfidential: ["Xác nhận hồ sơ", "Nghỉ phép", "Chính sách/Phúc lợi"].includes(v) ? true : x.isConfidential })); }}><option value="">— Chọn loại —</option>{["Xác nhận hồ sơ", "Nghỉ phép", "Trang thiết bị", "Chính sách/Phúc lợi", "Khác"].map((x) => <option key={x} value={x}>{x}</option>)}</select></Field>}
        <Field label="Mức độ ưu tiên"><select className={inputCls} value={f.priority} onChange={(e) => set("priority", e.target.value)}>{PRIORITY_ORDER.map((p) => <option key={p} value={p}>{PRIORITIES[p].label}</option>)}</select></Field>
        <Field label="Deadline đề xuất" req><input type="date" className={inputCls} value={f.proposedDeadline} onChange={(e) => set("proposedDeadline", e.target.value)} /></Field>
        <Field label="Kết quả cần bàn giao"><input className={inputCls} value={f.deliverable} onChange={(e) => set("deliverable", e.target.value)} /></Field>
        <Field label="Brand liên quan"><select className={inputCls} value={f.brandId || ""} onChange={(e) => set("brandId", e.target.value || null)}><option value="">Chung (cả 2 brand)</option>{BRAND_ORDER.map((b) => <option key={b} value={b}>{BRANDS[b].label}</option>)}</select></Field>
      </div>
      <label className="mb-2 flex items-center gap-2 text-[13px] text-zinc-600"><input type="checkbox" checked={!!f.isConfidential} onChange={(e) => set("isConfidential", e.target.checked)} className="accent-zinc-800" />Yêu cầu bảo mật — chỉ leader hai phòng &amp; người liên quan xem (dùng cho hồ sơ, nghỉ phép, chính sách nhân sự)</label>
      <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
        <button className={btnSec} onClick={onClose}>Hủy</button>
        <button className={btnPri} disabled={!f.title.trim() || !f.content.trim() || !f.toDeptId} onClick={() => { act.createRequest(f); toast("Đã gửi yêu cầu"); onClose(); }}><Send className="h-4 w-4" />Gửi yêu cầu</button>
      </div>
    </Modal>
  );
}
/* Tiến trình yêu cầu — timeline dọc, dễ hiểu cho nhân viên (mục 18) */
function RequestTimeline({ r }) {
  const stages = ["Gửi yêu cầu", "Phòng nhận tiếp nhận", "Chốt deadline", "Đang xử lý", "Bàn giao kết quả", "Hoàn thành"];
  const idx = { pending: 0, info: 0, deadline_proposed: 1, accepted: 2, processing: 3, delivered: 4, confirmed: 5, rejected: 0, cancelled: 0 }[r.status] ?? 0;
  const terminal = r.status === "rejected" ? "Yêu cầu đã bị từ chối" : r.status === "cancelled" ? "Yêu cầu đã bị hủy" : null;
  return (
    <div className="mb-4 rounded-xl border border-zinc-200 p-3.5">
      <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Tiến trình yêu cầu</p>
      <ol className="relative">
        {stages.map((label, i) => {
          const reached = i <= idx && !terminal;
          const current = i === idx && !terminal && r.status !== "confirmed";
          return (
            <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
              {i < stages.length - 1 && <span className={`absolute left-[6px] top-3.5 h-full w-px ${i < idx && !terminal ? "bg-zinc-800" : "bg-zinc-200"}`} aria-hidden="true" />}
              <span className={`relative z-10 mt-0.5 h-3 w-3 shrink-0 rounded-full border-2 ${reached ? "border-zinc-800 bg-zinc-800" : "border-zinc-300 bg-white"} ${current ? "ring-2 ring-zinc-900/15" : ""}`} />
              <span className={`text-[12px] leading-tight ${reached ? "font-medium text-zinc-800" : "text-zinc-400"}`}>{label}{current && <span className="ml-1.5 text-[10px] font-normal text-zinc-400">· đang ở đây</span>}</span>
            </li>
          );
        })}
      </ol>
      {terminal && <p className="mt-1 text-[12px] font-medium text-red-600">{terminal}</p>}
    </div>
  );
}
function RequestDrawer({ reqId, onClose }) {
  const { db, me, act, toast, openTask } = useApp();
  const r = db.requests.find((x) => x.id === reqId);
  const [modal, setModal] = useState(null);
  const [cmt, setCmt] = useState("");
  if (!r) return null;
  if (!canViewRequest(db, me, r)) {
    return (
      <div className="fixed inset-0 z-40 flex justify-end bg-zinc-900/20" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="h-full w-full sm:max-w-[520px] bg-white shadow-2xl border-l border-zinc-100 flex flex-col">
          <div className="border-b border-zinc-100 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-700">Chi tiết yêu cầu</span>
            <button onClick={onClose} className="rounded-md p-1.5 hover:bg-zinc-100 text-zinc-400"><X className="h-4 w-4" /></button>
          </div>
          <UnauthorizedState onClose={onClose} />
        </div>
      </div>
    );
  }
  const isReceiverSide = me.deptId === r.toDeptId || ["admin", "ceo"].includes(me.role);
  const isReceiverLead = isReceiverFor(db, me, r.toDeptId) || r.receiverId === me.id;
  const isHandler = r.handlerId === me.id;
  /* Bên gửi có quyền thao tác = người tạo / leader phòng gửi / authorized sender — KHÔNG phải cả phòng */
  const isSender = isSenderAuthorized(db, me, r);
  const Info = ({ label, children }) => <div className="grid grid-cols-[130px_1fr] gap-2 py-1.5 text-[13px]"><span className="text-zinc-400 text-xs">{label}</span><div className="text-zinc-700">{children}</div></div>;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-zinc-900/20" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="h-full w-full sm:max-w-[520px] bg-white shadow-2xl border-l border-zinc-100 flex flex-col">
        <div className="border-b border-zinc-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-zinc-400">{r.code}</span>
            <ReqPill s={r.status} /><PriorityPill p={r.priority} /><BrandChip id={r.brandId} />{r.isConfidential && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600"><Lock className="h-3 w-3" />Mật</span>}
            <button onClick={onClose} className="ml-auto rounded-md p-1.5 hover:bg-zinc-100 text-zinc-400"><X className="h-4 w-4" /></button>
          </div>
          <h2 className="mt-1.5 text-[15px] font-semibold text-zinc-900">{r.title}</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Action bars */}
          {r.status === "pending" && isReceiverLead && (
            <div className="mb-4 rounded-xl bg-sky-50 border border-sky-100 p-3">
              <p className="text-xs text-sky-700 font-medium mb-2">Yêu cầu đang chờ phòng bạn tiếp nhận</p>
              <div className="flex flex-wrap gap-2">
                <button className={btnPri} onClick={() => setModal({ type: "accept", handlerId: null, deadline: r.proposedDeadline })}>Tiếp nhận</button>
                <button className={btnSec} onClick={() => setModal({ type: "info", note: "" })}>Cần bổ sung</button>
                <button className={btnSec} onClick={() => setModal({ type: "reject", reason: "" })}>Từ chối</button>
              </div>
            </div>
          )}
          {r.status === "deadline_proposed" && (() => {
            const last = r.deadlineProposals[r.deadlineProposals.length - 1];
            const myTurn = last && ((last.side === "receiver" && isSender) || (last.side === "sender" && isReceiverLead));
            return (
              <div className="mb-4 rounded-xl bg-fuchsia-50 border border-fuchsia-100 p-3">
                <p className="text-xs font-medium text-fuchsia-700 mb-1.5">Hai bên đang thoả thuận deadline — chưa tạo task, chưa ghi deadline thống nhất</p>
                <div className="mb-2 space-y-0.5">
                  <p className="text-[11px] text-zinc-500">Đề xuất ban đầu (bên gửi): <b>{fmtDFull(r.proposedDeadline)}</b></p>
                  {r.deadlineProposals.map((p, i) => <p key={i} className="text-[11px] text-zinc-500">{userById(db, p.by)?.name} ({p.side === "receiver" ? "bên nhận" : "bên gửi"}) đề xuất: <b>{fmtDFull(p.date)}</b></p>)}
                </div>
                {myTurn ? (
                  <div className="flex flex-wrap gap-2">
                    <button className={btnPri} onClick={() => { act.reqAction(r.id, "agreeDeadline"); toast(`Đã chốt deadline ${fmtDFull(last.date)} — tạo task phối hợp`); }}>Đồng ý {fmtDFull(last.date)}</button>
                    <button className={btnSec} onClick={() => setModal({ type: "counter", deadline: last.date })}>Đề xuất ngày khác</button>
                  </div>
                ) : <p className="text-[11px] text-zinc-400">Chờ bên kia phản hồi đề xuất mới nhất.</p>}
              </div>
            );
          })()}
          {r.status === "info" && isSender && (
            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-100 p-3">
              <p className="text-xs text-amber-700 mb-2">Phòng nhận yêu cầu bổ sung thông tin — bổ sung trong bình luận rồi gửi lại.</p>
              <button className={btnSec} onClick={() => { act.reqAction(r.id, "resend"); toast("Đã gửi lại yêu cầu"); }}>Đã bổ sung, gửi lại</button>
            </div>
          )}
          {["accepted", "processing"].includes(r.status) && (isHandler || isReceiverLead) && (
            <div className="mb-4 flex gap-2">
              {r.status === "accepted" && <button className={btnSec} onClick={() => { act.reqAction(r.id, "start"); toast("Đã chuyển sang Đang xử lý"); }}>Bắt đầu xử lý</button>}
              <button className={btnPri} onClick={() => {
                const linked = r.taskId ? db.tasks.find((t) => t.id === r.taskId) : null;
                if (linked) {
                  const hasActual = linked.actual?.summary?.trim() && (linked.actual.links?.length > 0 || linked.attachments?.length > 0);
                  if (!hasActual) { toast("Cần Kết quả thực tế đầy đủ (tóm tắt + link/file) trong task trước khi bàn giao", "warn"); return; }
                }
                act.reqAction(r.id, "deliver"); toast("Đã bàn giao — chờ bên gửi xác nhận");
              }}>Bàn giao kết quả</button>
            </div>
          )}
          {r.status === "delivered" && isSender && (
            <div className="mb-4 rounded-xl bg-violet-50 border border-violet-100 p-3">
              <p className="text-xs text-violet-700 font-medium mb-2">Phòng nhận đã bàn giao — bạn cần xác nhận để đóng yêu cầu</p>
              <button className={btnPri} onClick={() => { act.reqAction(r.id, "confirm"); toast("Đã xác nhận hoàn thành"); }}><BadgeCheck className="h-4 w-4" />Xác nhận hoàn thành</button>
            </div>
          )}
          {["pending", "info", "deadline_proposed", "accepted", "processing"].includes(r.status) && isSender && (
            <button className={`${btnGhost} mb-3`} onClick={() => setModal({ type: "cancel", reason: "" })}>Hủy yêu cầu</button>
          )}
          {r.status === "rejected" && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700"><b>Lý do từ chối:</b> {r.rejectReason}</div>}

          <RequestTimeline r={r} />
          <div className="rounded-xl border border-zinc-100 px-4 py-2 mb-4">
            <Info label="Phòng gửi"><DeptTag id={r.fromDeptId} /> · <UserChip id={r.fromUserId} /></Info>
            <Info label="Phòng nhận"><DeptTag id={r.toDeptId} /></Info>
            <Info label="Người tiếp nhận"><UserChip id={r.receiverId} dash="Chưa tiếp nhận" /></Info>
            <Info label="Người xử lý"><UserChip id={r.handlerId} dash="Chưa phân công" /></Info>
            <Info label="Deadline đề xuất">{fmtDFull(r.proposedDeadline)}</Info>
            <Info label="Deadline thống nhất">{r.agreedDeadline ? <b>{fmtDFull(r.agreedDeadline)}</b> : <span className="text-zinc-300">Chưa thống nhất</span>}</Info>
            <Info label="Kết quả bàn giao">{r.deliverable || "—"}</Info>
            {r.taskId && <Info label="Task liên kết"><button className="text-indigo-600 hover:underline" onClick={() => { onClose(); openTask(r.taskId); }}>Mở task liên phòng ban →</button></Info>}
          </div>
          <div className="mb-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 mb-1.5">Nội dung</p>
            <p className="text-[13px] text-zinc-600 leading-relaxed whitespace-pre-wrap">{r.content}</p>
          </div>
          <div className="border-t border-zinc-100 pt-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 mb-2">Trao đổi & lịch sử</p>
            <div className="space-y-2.5 mb-3">
              {r.logs.map((l) => <p key={l.id} className="text-[13px] text-zinc-500 flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-300 shrink-0" /><span><b className="text-zinc-700">{userById(db, l.userId)?.name}</b> {l.text} <span className="text-zinc-300">· {fmtDT(l.at)}</span></span></p>)}
              {r.comments.map((c) => <div key={c.id} className="flex gap-2.5"><Avatar id={c.userId} size={7} /><div><p className="text-xs"><b className="text-zinc-800">{userById(db, c.userId)?.name}</b> <span className="text-zinc-300">· {fmtDT(c.at)}</span></p><p className="text-[13px] text-zinc-600">{c.text}</p></div></div>)}
            </div>
            <div className="flex gap-2">
              <input className={inputCls} placeholder="Trao đổi về yêu cầu…" value={cmt} onChange={(e) => setCmt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && cmt.trim()) { act.reqComment(r.id, cmt.trim()); setCmt(""); } }} />
            </div>
          </div>
        </div>
        {modal?.type === "counter" && (
          <Modal title="Đề xuất deadline khác" onClose={() => setModal(null)}>
            <Field label="Deadline đề xuất" req><input type="date" className={inputCls} value={modal.deadline} onChange={(e) => setModal({ ...modal, deadline: e.target.value })} /></Field>
            <div className="flex justify-end gap-2"><button className={btnSec} onClick={() => setModal(null)}>Hủy</button><button className={btnPri} onClick={() => { act.reqAction(r.id, "counterDeadline", { deadline: modal.deadline }); setModal(null); toast("Đã gửi đề xuất — chờ bên kia phản hồi"); }}>Gửi đề xuất</button></div>
          </Modal>
        )}
        {modal?.type === "cancel" && (
          <Modal title="Hủy yêu cầu" onClose={() => setModal(null)}>
            <p className="mb-2 text-[13px] text-zinc-600">Nếu đã có task phối hợp, task sẽ được <b>tạm dừng</b> kèm lý do để hai bên không lệch trạng thái.</p>
            <Field label="Lý do hủy" req><textarea className={inputCls} rows={2} value={modal.reason} onChange={(e) => setModal({ ...modal, reason: e.target.value })} /></Field>
            <div className="flex justify-end gap-2"><button className={btnSec} onClick={() => setModal(null)}>Đóng</button><button className={btnPri} disabled={!modal.reason.trim()} onClick={() => { act.reqAction(r.id, "cancel", { reason: modal.reason.trim() }); setModal(null); toast("Đã hủy yêu cầu"); }}>Hủy yêu cầu</button></div>
          </Modal>
        )}
        {modal?.type === "accept" && (
          <Modal title="Tiếp nhận yêu cầu" onClose={() => setModal(null)}>
            <Field label="Người xử lý chính" req><UserSelect value={modal.handlerId} onChange={(v) => setModal({ ...modal, handlerId: v })} users={db.users.filter((u) => u.deptId === r.toDeptId)} /></Field>
            <Field label="Deadline" req>
              <input type="date" className={inputCls} value={modal.deadline} onChange={(e) => setModal({ ...modal, deadline: e.target.value })} />
              {modal.deadline !== r.proposedDeadline && <p className="mt-1 text-[11px] text-fuchsia-600">Khác đề xuất của bên gửi ({fmtDFull(r.proposedDeadline)}) → sẽ chuyển sang <b>Chờ chốt deadline</b>, task chỉ tạo khi hai bên đồng ý.</p>}
            </Field>
            <div className="flex justify-end gap-2"><button className={btnSec} onClick={() => setModal(null)}>Hủy</button><button className={btnPri} disabled={!modal.handlerId || !modal.deadline} onClick={() => { act.reqAction(r.id, "accept", { handlerId: modal.handlerId, deadline: modal.deadline }); setModal(null); toast(modal.deadline === r.proposedDeadline ? "Đã tiếp nhận — task phối hợp được tạo" : "Đã gửi đề xuất deadline mới cho bên gửi"); }}>Xác nhận</button></div>
          </Modal>
        )}
        {modal?.type === "reject" && (
          <Modal title="Từ chối yêu cầu" onClose={() => setModal(null)}>
            <Field label="Lý do từ chối (bắt buộc)" req><textarea className={inputCls} rows={3} value={modal.reason} onChange={(e) => setModal({ ...modal, reason: e.target.value })} /></Field>
            <div className="flex justify-end gap-2"><button className={btnSec} onClick={() => setModal(null)}>Hủy</button><button className={btnPri} disabled={!modal.reason.trim()} onClick={() => { act.reqAction(r.id, "reject", { reason: modal.reason.trim() }); setModal(null); }}>Từ chối</button></div>
          </Modal>
        )}
        {modal?.type === "info" && (
          <Modal title="Yêu cầu bổ sung thông tin" onClose={() => setModal(null)}>
            <Field label="Cần bổ sung gì?" req><textarea className={inputCls} rows={3} value={modal.note} onChange={(e) => setModal({ ...modal, note: e.target.value })} /></Field>
            <div className="flex justify-end gap-2"><button className={btnSec} onClick={() => setModal(null)}>Hủy</button><button className={btnPri} disabled={!modal.note.trim()} onClick={() => { act.reqAction(r.id, "info", { note: modal.note.trim() }); setModal(null); }}>Gửi</button></div>
          </Modal>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Approvals page
   ============================================================ */
function ApprovalsPage() {
  const { db, me, openTask } = useApp();
  const list = db.tasks.filter((t) => !t.deleted && t.status === "review" && (t.approverId === me.id || (["admin", "ceo"].includes(me.role) && canSeeTask(db, me, t) && t.approverId === me.id)));
  const all = db.tasks.filter((t) => !t.deleted && t.status === "review" && t.approverId === me.id);
  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">Chờ duyệt</h1>
      <p className="mb-4 text-[13px] text-zinc-400">Các công việc đang chờ bạn duyệt. Duyệt hoặc yêu cầu chỉnh sửa ngay trong chi tiết task.</p>
      {all.length === 0 ? <EmptyState icon={BadgeCheck} title="Không có gì chờ bạn duyệt" hint="Khi có người gửi duyệt, công việc sẽ xuất hiện ở đây và trong thông báo." /> : (
        <div className="rounded-xl border border-zinc-100 bg-white divide-y divide-zinc-50">
          {all.map((t) => {
            const sender = t.logs.find((l) => l.text.includes("gửi duyệt"));
            return (
              <button key={t.id} onClick={() => openTask(t.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50">
                <Avatar id={t.ownerId} size={8} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-zinc-800 truncate">{t.name}</p>
                  <p className="text-[11px] text-zinc-400">
                    {userById(db, t.ownerId)?.name} gửi{sender ? ` · ${fmtDT(sender.at)}` : ""} · <DeptTag id={t.deptId} />{t.projectId ? ` · ${projById(db, t.projectId)?.code}` : ""}{t.revisionCount > 0 ? ` · đã sửa ${t.revisionCount} lần` : ""}
                  </p>
                </div>
                {t.reportLink && <FileText className="h-4 w-4 text-zinc-300" />}
                <DeadlineBadge t={t} />
                <span className="rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[11px] font-medium text-white">Xem & duyệt</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Calendar page / Documents / Admin
   ============================================================ */
function CalendarPage() {
  const { db, me } = useApp();
  const [f, setF] = useState({ ...emptyFilter });
  const tasks = applyFilter(db.tasks.filter((t) => !t.deleted && canSeeTask(db, me, t)), f, me);
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Lịch</h1>
      <FilterBar f={f} setF={setF} />
      <CalendarView tasks={tasks} />
    </div>
  );
}
function DocList({ docs }) {
  const { db } = useApp();
  if (!docs.length) return <EmptyState icon={Link2} title="Chưa có tài liệu nào" />;
  return (
    <div className="rounded-xl border border-zinc-100 bg-white divide-y divide-zinc-50">
      {docs.map((d) => (
        <a key={d.id} href={d.link} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50">
          <span className="rounded-lg bg-zinc-100 p-2"><FileText className="h-4 w-4 text-zinc-500" /></span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-zinc-800">{d.name}</p>
            <p className="text-[11px] text-zinc-400 truncate">{d.type} · {deptById(db, d.deptId)?.name} · {userById(db, d.ownerId)?.name} · cập nhật {fmtDT(d.updatedAt)}</p>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-zinc-300" />
        </a>
      ))}
    </div>
  );
}
function DocumentsPage() {
  const { db, act, me, toast } = useApp();
  const [type, setType] = useState("");
  const [dept, setDept] = useState("");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", type: DOC_TYPES[0], deptId: me.deptId, link: "", desc: "" });
  const docs = db.docs.filter((d) => (!type || d.type === type) && (!dept || d.deptId === dept));
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div><h1 className="text-lg font-semibold text-zinc-900">Tài liệu liên kết</h1><p className="text-[13px] text-zinc-400">Nơi tập trung link các file báo cáo, SOP, biểu mẫu — app không thay thế các file này.</p></div>
        <button className={btnPri} onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Thêm tài liệu</button>
      </div>
      <div className="mb-3 flex gap-2">
        <select className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs" value={type} onChange={(e) => setType(e.target.value)}><option value="">Loại: tất cả</option>{DOC_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        <select className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs" value={dept} onChange={(e) => setDept(e.target.value)}><option value="">Phòng ban: tất cả</option>{db.depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
      </div>
      <DocList docs={docs} />
      {adding && (
        <Modal title="Thêm tài liệu liên kết" onClose={() => setAdding(false)}>
          <Field label="Tên tài liệu" req><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
            <Field label="Loại"><select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{DOC_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Phòng ban"><select className={inputCls} value={f.deptId} onChange={(e) => setF({ ...f, deptId: e.target.value })}>{db.depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
          </div>
          <Field label="Link" req><input className={inputCls} value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://…" /></Field>
          <Field label="Mô tả"><input className={inputCls} value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><button className={btnSec} onClick={() => setAdding(false)}>Hủy</button><button className={btnPri} disabled={!f.name.trim() || !f.link.trim()} onClick={() => { act.addDoc(f); toast("Đã thêm tài liệu"); setAdding(false); }}>Thêm</button></div>
        </Modal>
      )}
    </div>
  );
}
function AdminPage() {
  const { db, me, act, toast } = useApp();
  const [tab, setTab] = useState("users");
  const [roleModal, setRoleModal] = useState(null); // {userId, role, reason}
  if (!["admin", "ceo"].includes(me.role)) return <EmptyState icon={Settings} title="Chỉ Manager/Admin hoặc CEO truy cập được khu vực này" />;
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Quản trị</h1>
      <div className="mb-4 flex gap-1 border-b border-zinc-100">
        {[["users", "Thành viên"], ["depts", "Phòng ban"], ["recurring", "Task định kỳ"], ["trash", "Thùng rác"], ["rolelog", "Nhật ký phân quyền"], ["config", "Cấu hình"]].map(([k, lb]) => <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px ${tab === k ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400"}`}>{lb}</button>)}
      </div>
      {tab === "users" && (
        <div className="rounded-xl border border-zinc-100 bg-white overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50/60"><tr>{["Nhân sự", "Chức danh", "Phòng ban", "Vai trò"].map((h) => <th key={h} className="px-3 py-2 text-left text-[11px] font-medium uppercase text-zinc-400">{h}</th>)}</tr></thead>
            <tbody>
              {db.users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-50 last:border-0">
                  <td className="px-3 py-2"><span className="inline-flex items-center gap-2"><Avatar id={u.id} size={7} /><span className="text-[13px] font-medium text-zinc-800">{u.name}</span></span></td>
                  <td className="px-3 py-2 text-[13px] text-zinc-500">{u.title}</td>
                  <td className="px-3 py-2"><select className="rounded-lg border border-zinc-200 px-2 py-1 text-xs" value={u.deptId} onChange={(e) => { act.adminUpdateUser(u.id, { deptId: e.target.value }); toast("Đã chuyển phòng ban"); }}>{db.depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></td>
                  <td className="px-3 py-2"><select className="rounded-lg border border-zinc-200 px-2 py-1 text-xs" value={u.role} disabled={u.role === "ceo" && me.role !== "ceo"} onChange={(e) => setRoleModal({ userId: u.id, role: e.target.value, reason: "" })}>{Object.entries(ROLE_LABELS).filter(([k]) => k !== "ceo" || me.role === "ceo" || u.role === "ceo").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === "depts" && (
        <div className="rounded-xl border border-zinc-100 bg-white overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50/60"><tr>{["Phòng ban", "Leader", "Nhân sự", "Task đang chạy"].map((h) => <th key={h} className="px-3 py-2 text-left text-[11px] font-medium uppercase text-zinc-400">{h}</th>)}</tr></thead>
            <tbody>
              {db.depts.map((d) => (
                <tr key={d.id} className="border-b border-zinc-50 last:border-0">
                  <td className="px-3 py-2 text-[13px] font-medium text-zinc-800">{d.name}</td>
                  <td className="px-3 py-2"><select className="rounded-lg border border-zinc-200 px-2 py-1 text-xs" value={d.leaderId || ""} onChange={(e) => { act.adminUpdateDept(d.id, { leaderId: e.target.value || null }); toast("Đã đổi leader"); }}><option value="">— Admin phụ trách —</option>{db.users.filter((u) => u.deptId === d.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></td>
                  <td className="px-3 py-2 text-[13px] text-zinc-500">{db.users.filter((u) => u.deptId === d.id).length}</td>
                  <td className="px-3 py-2 text-[13px] text-zinc-500">{db.tasks.filter((t) => !t.deleted && t.deptId === d.id && t.status !== "done").length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === "recurring" && (
        <div className="rounded-xl border border-zinc-100 bg-white overflow-hidden">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-zinc-50 text-[11px] uppercase text-zinc-400"><tr><th className="px-3 py-2">Mẫu định kỳ</th><th className="px-3 py-2">Lịch</th><th className="px-3 py-2">Người phụ trách</th><th className="px-3 py-2">Đã sinh</th><th className="px-3 py-2">Trạng thái</th><th className="px-3 py-2"></th></tr></thead>
            <tbody className="divide-y divide-zinc-50">
              {(db.recurrings || []).map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-zinc-700">{r.name}</td>
                  <td className="px-3 py-2 text-zinc-500 text-xs">{r.rule.freq === "daily" ? "Hằng ngày" : r.rule.freq === "weekly" ? `Thứ ${r.rule.weekday === 0 ? "CN" : r.rule.weekday + 1} hằng tuần` : `Ngày ${r.rule.dayOfMonth} hằng tháng (${r.rule.monthlyMode === "clamp" ? "31 → cuối tháng" : "bỏ qua tháng thiếu ngày"})`}{r.endDate ? ` · dừng ${fmtDFull(r.endDate)}` : ""}</td>
                  <td className="px-3 py-2"><UserChip id={r.taskDefaults.ownerId} /></td>
                  <td className="px-3 py-2 text-zinc-500 text-xs">{Object.keys(r.generated).length} kỳ</td>
                  <td className="px-3 py-2">{r.endDate && todayISO() > r.endDate ? <span className="text-xs text-zinc-400">Đã kết thúc</span> : r.paused ? <span className="text-xs text-amber-600">Tạm dừng</span> : <span className="text-xs text-emerald-600">Đang chạy</span>}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button className={btnGhost} onClick={() => act.recurringToggle(r.id, !r.paused)}>{r.paused ? "Chạy lại" : "Tạm dừng"}</button>
                    {!r.endDate && <button className={btnGhost} onClick={() => { act.recurringEnd(r.id); toast("Mẫu sẽ không sinh kỳ mới"); }}>Kết thúc</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-zinc-50 px-3 py-2 text-[11px] text-zinc-400">Scheduler chạy khi mở app mỗi ngày (bản production: cron n8n/pg_cron, timezone Asia/Bangkok). Kỳ trước chưa xong vẫn giữ quá hạn — kỳ mới vẫn được sinh, chống trùng theo (mẫu, ngày).</p>
        </div>
      )}
      {tab === "trash" && (() => {
        const deleted = db.tasks.filter((t) => t.deleted);
        return (
          <div className="rounded-xl border border-zinc-100 bg-white divide-y divide-zinc-50">
            {deleted.length === 0 && <p className="p-4 text-xs text-zinc-300">Thùng rác trống. Task xóa mềm sẽ nằm ở đây — audit log luôn được giữ.</p>}
            {deleted.map((t) => (
              <div key={t.id} className="flex items-center gap-2 px-4 py-2.5">
                <span className="font-mono text-[10px] text-zinc-300">{t.code}</span>
                <span className="flex-1 truncate text-[13px] text-zinc-600">{t.isConfidential && !perms.view(db, me, t) ? "(Công việc bảo mật)" : t.name}</span>
                <span className="text-[11px] text-zinc-400">{userById(db, t.ownerId)?.name}</span>
                <button className={btnGhost} onClick={() => setRoleModal({ trashRestore: t.id, name: t.name, reason: "" })}>Khôi phục</button>
              </div>
            ))}
          </div>
        );
      })()}
      {roleModal?.trashRestore && (
        <Modal title="Khôi phục task" onClose={() => setRoleModal(null)}>
          <p className="mb-2 text-[13px] text-zinc-600">Khôi phục <b>{roleModal.name}</b>? Hành động được ghi vào audit log.</p>
          <Field label="Lý do khôi phục" req><textarea className={inputCls} rows={2} value={roleModal.reason} onChange={(e) => setRoleModal({ ...roleModal, reason: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><button className={btnSec} onClick={() => setRoleModal(null)}>Hủy</button><button className={btnPri} disabled={!roleModal.reason.trim()} onClick={() => { const r = act.restoreTask(roleModal.trashRestore, roleModal.reason.trim()); toast(r.ok ? "Đã khôi phục" : r.msg, r.ok ? "ok" : "err"); setRoleModal(null); }}>Khôi phục</button></div>
        </Modal>
      )}
      {tab === "rolelog" && (
        <div className="rounded-xl border border-zinc-100 bg-white divide-y divide-zinc-50">
          {(db.roleLogs || []).length === 0 && <p className="p-4 text-xs text-zinc-300">Chưa có thay đổi vai trò nào. Mọi thay đổi sẽ được ghi lại vĩnh viễn tại đây.</p>}
          {(db.roleLogs || []).map((l) => (
            <div key={l.id} className="px-4 py-2.5 text-[13px] text-zinc-600">
              <b className="text-zinc-800">{userById(db, l.by)?.name}</b> đổi vai trò <b className="text-zinc-800">{userById(db, l.targetId)?.name}</b>: {ROLE_LABELS[l.from]} → <b>{ROLE_LABELS[l.to]}</b>
              <span className="text-zinc-400"> · lý do: {l.reason} · {fmtDT(l.at)}</span>
            </div>
          ))}
        </div>
      )}
      {roleModal && (
        <Modal title="Đổi vai trò — bắt buộc ghi lý do" onClose={() => setRoleModal(null)}>
          <p className="mb-2 text-[13px] text-zinc-600">Đổi <b>{userById(db, roleModal.userId)?.name}</b> thành <b>{ROLE_LABELS[roleModal.role]}</b>. Thay đổi được ghi vào nhật ký phân quyền (không xóa được).</p>
          <Field label="Lý do" req><textarea className={inputCls} rows={2} value={roleModal.reason} onChange={(e) => setRoleModal({ ...roleModal, reason: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><button className={btnSec} onClick={() => setRoleModal(null)}>Hủy</button>
            <button className={btnPri} disabled={!roleModal.reason.trim()} onClick={() => { const r = act.adminUpdateUser(roleModal.userId, { role: roleModal.role }, roleModal.reason.trim()); toast(r.ok ? "Đã đổi vai trò" : r.msg, r.ok ? "ok" : "err"); setRoleModal(null); }}>Xác nhận</button></div>
        </Modal>
      )}
      {tab === "config" && (
        <div className="max-w-lg rounded-xl border border-zinc-100 bg-white p-4 text-[13px] text-zinc-600 space-y-2">
          <p><b className="text-zinc-800">Trạng thái công việc:</b> cố định 7 trạng thái theo quy trình Novix — không cho tự tạo thêm ở phiên bản đầu.</p>
          <p><b className="text-zinc-800">Loại công việc:</b> {Object.values(TASK_TYPES).join(", ")}.</p>
          <p><b className="text-zinc-800">Phân quyền dữ liệu:</b> Employee thấy task liên quan + task công khai trong phòng; Leader thấy toàn bộ phòng mình; Admin đa phòng ban; CEO toàn hệ thống. Bản production sẽ enforce bằng Supabase Row Level Security.</p>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Notifications & Search
   ============================================================ */
function NotifPanel({ onClose }) {
  const { db, me, act, openTask, openRequest } = useApp();
  const mine = db.notifs.filter((n) => n.userId === me.id).sort((a, b) => b.at - a.at);
  const lvl = { info: "bg-zinc-300", act: "bg-amber-400", urgent: "bg-red-500" };
  return (
    <div className="absolute right-0 top-11 z-50 w-96 rounded-2xl border border-zinc-100 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
        <p className="text-[13px] font-semibold text-zinc-800">Thông báo</p>
        <button className="text-[11px] font-medium text-zinc-400 hover:text-zinc-700" onClick={() => act.notifReadAll()}>Đọc tất cả</button>
      </div>
      <div className="max-h-96 overflow-y-auto p-1.5">
        {mine.length === 0 && <p className="p-4 text-center text-xs text-zinc-300">Chưa có thông báo nào</p>}
        {mine.map((n) => (
          <button key={n.id} onClick={() => { act.notifRead(n.id); if (n.taskId) { openTask(n.taskId); onClose(); } else if (n.requestId) { openRequest(n.requestId); onClose(); } }}
            className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left hover:bg-zinc-50 ${n.read ? "opacity-50" : ""}`}>
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${lvl[n.level] || lvl.info}`} />
            <div><p className="text-[13px] text-zinc-700 leading-snug">{n.text}</p><p className="text-[11px] text-zinc-300 mt-0.5">{fmtDT(n.at)}</p></div>
          </button>
        ))}
      </div>
    </div>
  );
}
function SearchOverlay({ q, onClose }) {
  const { db, me, openTask, openRequest, nav } = useApp();
  const s = q.toLowerCase();
  /* Search chỉ trả kết quả người dùng có quyền xem; task mật KHÔNG index (kể cả với người xem được — tránh lộ qua preview);
     bình luận của task mật không được index; production: lọc ở query RLS, không tải toàn bộ về client */
  const tasks = db.tasks.filter((t) => !t.deleted && !t.isConfidential && perms.view(db, me, t) && (t.name + t.code + t.desc + (t.isConfidential ? "" : t.comments.map((c) => c.text).join(" "))).toLowerCase().includes(s)).slice(0, 6);
  const prjs = db.projects.filter((p) => canViewProject(db, me, p) && (p.name + p.goal).toLowerCase().includes(s)).slice(0, 4);
  const reqs = db.requests.filter((r) => canViewRequest(db, me, r) && (r.title + r.content + r.code).toLowerCase().includes(s)).slice(0, 4);
  const docs = db.docs.filter((d) => canViewDoc(db, me, d) && (d.name + d.desc).toLowerCase().includes(s)).slice(0, 4);
  const people = db.users.filter((u) => (u.name + u.title).toLowerCase().includes(s)).slice(0, 4);
  const Sec = ({ title, children }) => <div className="mb-2"><p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">{title}</p>{children}</div>;
  const none = !tasks.length && !prjs.length && !reqs.length && !docs.length && !people.length;
  return (
    <div className="absolute left-0 top-11 z-50 w-[480px] max-w-[90vw] rounded-2xl border border-zinc-100 bg-white shadow-xl p-2 max-h-[70vh] overflow-y-auto">
      {none && <p className="p-4 text-center text-xs text-zinc-300">Không tìm thấy kết quả cho “{q}”</p>}
      {tasks.length > 0 && <Sec title="Công việc">{tasks.map((t) => <button key={t.id} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-zinc-50" onClick={() => { openTask(t.id); onClose(); }}><span className={`h-1.5 w-1.5 rounded-full ${STATUSES[t.status].dot}`} /><span className="flex-1 truncate text-[13px] text-zinc-700">{t.name}</span><span className="font-mono text-[10px] text-zinc-300">{t.code}</span></button>)}</Sec>}
      {prjs.length > 0 && <Sec title="Dự án">{prjs.map((p) => <button key={p.id} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-zinc-50" onClick={() => { nav("projectDetail", { id: p.id }); onClose(); }}><FolderKanban className="h-3.5 w-3.5 text-zinc-300" /><span className="truncate text-[13px] text-zinc-700">{p.name}</span></button>)}</Sec>}
      {reqs.length > 0 && <Sec title="Yêu cầu phối hợp">{reqs.map((r) => <button key={r.id} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-zinc-50" onClick={() => { openRequest(r.id); onClose(); }}><ArrowLeftRight className="h-3.5 w-3.5 text-zinc-300" /><span className="truncate text-[13px] text-zinc-700">{r.title}</span><ReqPill s={r.status} /></button>)}</Sec>}
      {docs.length > 0 && <Sec title="Tài liệu">{docs.map((d) => <a key={d.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-50" href={d.link} target="_blank" rel="noreferrer"><FileText className="h-3.5 w-3.5 text-zinc-300" /><span className="truncate text-[13px] text-zinc-700">{d.name}</span></a>)}</Sec>}
      {people.length > 0 && <Sec title="Nhân sự">{people.map((u) => <div key={u.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5"><Avatar id={u.id} size={6} /><span className="text-[13px] text-zinc-700">{u.name}</span><span className="text-[11px] text-zinc-400">· {u.title}</span></div>)}</Sec>}
    </div>
  );
}
/* ============================================================
   My tasks & Login
   ============================================================ */
function MyTasksPage() {
  const { db, me } = useApp();
  const [tab, setTab] = useState("own");
  const visible = db.tasks.filter((t) => !t.deleted && canSeeTask(db, me, t));
  const sets = {
    own: visible.filter((t) => t.ownerId === me.id),
    collab: visible.filter((t) => t.collaboratorIds.includes(me.id)),
    given: visible.filter((t) => t.assignerId === me.id && t.ownerId !== me.id),
    approve: visible.filter((t) => t.approverId === me.id),
  };
  return (
    <div>
      <PageHeader title="Công việc của tôi" desc="Việc bạn phụ trách, phối hợp, đã giao và cần duyệt." />
      <div className="mb-3 flex rounded-lg bg-zinc-100 p-0.5 w-fit">
        {[["own", `Tôi phụ trách · ${sets.own.filter((t) => t.status !== "done").length}`], ["collab", `Tôi phối hợp · ${sets.collab.filter((t) => t.status !== "done").length}`], ["given", `Tôi đã giao · ${sets.given.filter((t) => t.status !== "done").length}`], ["approve", `Tôi duyệt · ${sets.approve.filter((t) => t.status === "review").length}`]].map(([k, lb]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === k ? "bg-white shadow-sm text-zinc-800" : "text-zinc-500"}`}>{lb}</button>
        ))}
      </div>
      <TasksView tasks={sets[tab]} />
    </div>
  );
}

const FontLoad = () => <style>{`@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap'); *{-webkit-font-smoothing:antialiased;} ::-webkit-scrollbar{height:8px;width:8px;} ::-webkit-scrollbar-thumb{background:#e4e4e7;border-radius:8px;} .truncate{min-width:0;} html,body{overflow-x:hidden;}`}</style>;

function LoginScreen({ onLogin }) {
  const demo = [
    ["ceo", "Xem toàn công ty, duyệt quyết định lớn"],
    ["admin", "Quản lý thành viên, phòng ban, dự án"],
    ["linh", "Điều hành phòng Content, duyệt & giao việc"],
    ["ha", "Điều hành E-commerce Nevor, nhận yêu cầu phối hợp"],
    ["trung", "Điều hành Growth UHero — xem brand tách biệt"],
    ["mai", "Nhân viên Content — nhận việc, gửi duyệt"],
    ["huy", "Nhân viên Affiliate — việc cá nhân & phòng ban"],
    ["lan", "Nhân viên R&D — nhận yêu cầu phối hợp, owner dự án"],
    ["vy", "Leader HR — quy trình nhân sự & task bảo mật"],
  ];
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4" style={{ fontFamily: "'Be Vietnam Pro', -apple-system, 'Segoe UI', sans-serif" }}>
      <FontLoad />
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white font-bold text-sm tracking-tight">NW</div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">NOVIX WORK</h1>
          <p className="mt-1 text-[13px] text-zinc-400">Ai làm gì · Deadline khi nào · Đang vướng ở đâu · Ai xử lý tiếp</p>
        </div>
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Đăng nhập bằng tài khoản demo</p>
          <div className="space-y-1.5">
            {demo.map(([id, hint]) => {
              const u = SEED_USERS.find((x) => x.id === id);
              return (
                <button key={id} onClick={() => onLogin(id)} className="flex w-full items-center gap-3 rounded-xl border border-zinc-100 px-3 py-2.5 text-left hover:border-zinc-300 hover:bg-zinc-50 transition-colors">
                  <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avColor(id)}`}>{u.name.split(" ").map((w) => w[0]).slice(-2).join("")}</span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2"><span className="text-[13px] font-semibold text-zinc-800">{u.name}</span><span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">{ROLE_LABELS[u.role]}</span></span>
                    <span className="block truncate text-[11px] text-zinc-400">{hint}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-300" />
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] text-zinc-400">Bản demo in-memory · Bản production: Next.js + Supabase (auth, RLS, realtime)</p>
      </div>
    </div>
  );
}

/* ============================================================
   Shell: sidebar + topbar
   ============================================================ */
function Sidebar({ page, nav, collapsed, setCollapsed }) {
  const { db, me } = useApp();
  const approveCnt = db.tasks.filter((t) => !t.deleted && t.status === "review" && t.approverId === me.id).length;
  const reqCnt = me.role === "leader" ? db.requests.filter((r) => r.toDeptId === me.deptId && ["pending", "info"].includes(r.status)).length : 0;
  const groups = [
    ["Công việc", [
      ["dashboard", "Trang chủ", Home],
      ["myTasks", "Công việc của tôi", CheckSquare],
      ["calendar", "Lịch", CalendarDays],
    ]],
    ["Điều phối", [
      ["departments", "Phòng ban", Building2],
      ["projects", "Dự án", FolderKanban],
      ["requests", "Yêu cầu phối hợp", ArrowLeftRight, reqCnt],
      ["approvals", "Chờ duyệt", BadgeCheck, approveCnt],
    ]],
    ["Tài liệu", [
      ["documents", "Tài liệu liên kết", Link2],
    ]],
    ...(((me.deptId === "hr" || ["admin", "ceo"].includes(me.role)) || ["admin", "ceo"].includes(me.role)) ? [["Quản trị", [
      ...((me.deptId === "hr" || ["admin", "ceo"].includes(me.role)) ? [["hr", "Nhân sự", Users]] : []),
      ...(["admin", "ceo"].includes(me.role) ? [["admin", "Quản trị", Settings]] : []),
    ]]] : []),
  ];
  const on = (k) => page.name === k || (k === "departments" && page.name === "deptDetail") || (k === "projects" && page.name === "projectDetail");
  const Item = ([k, lb, Ic, badge]) => {
    const active = on(k);
    const btn = (
      <button key={k} onClick={() => nav(k)} aria-label={lb} aria-current={active ? "page" : undefined}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors ${collapsed ? "h-10 justify-center" : "h-9"} ${active ? "bg-zinc-100 font-medium text-zinc-900" : "font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"}`}>
        <Ic className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.9} />
        {!collapsed && <span className="flex-1 text-left truncate">{lb}</span>}
        {!collapsed && badge > 0 && <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 tabular-nums">{badge}</span>}
        {collapsed && badge > 0 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />}
      </button>
    );
    return collapsed ? <Tooltip key={k} label={lb}><span className="relative block w-full">{btn}</span></Tooltip> : btn;
  };
  return (
    <aside className={`${collapsed ? "w-16" : "w-60"} shrink-0 border-r border-zinc-200 bg-white flex-col transition-all duration-200 hidden md:flex`}>
      <div className={`flex h-14 items-center gap-2.5 px-3.5 ${collapsed ? "justify-center" : ""}`}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-[11px] font-bold text-white">NW</span>
        {!collapsed && <span className="text-sm font-bold tracking-tight text-zinc-900">NOVIX WORK</span>}
      </div>
      <nav className="flex-1 overflow-y-auto px-2.5 py-1">
        {groups.map(([label, items]) => (
          <div key={label} className="mb-3">
            {!collapsed && <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>}
            {collapsed && <div className="mx-2 mb-1.5 border-t border-zinc-100" />}
            <div className="space-y-0.5">{items.map(Item)}</div>
          </div>
        ))}
      </nav>
      <div className="border-t border-zinc-100 p-2">
        <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600 ${collapsed ? "justify-center" : ""}`}>
          <ChevronsLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />{!collapsed && "Thu gọn"}
        </button>
      </div>
    </aside>
  );
}

function MobileSidebar({ page, nav }) {
  const { db, me } = useApp();
  const approveCnt = db.tasks.filter((t) => !t.deleted && t.status === "review" && t.approverId === me.id).length;
  const items = [
    ["dashboard", "Trang chủ", Home], ["myTasks", "Công việc của tôi", CheckSquare], ["departments", "Phòng ban", Building2],
    ["projects", "Dự án", FolderKanban], ["requests", "Yêu cầu phối hợp", ArrowLeftRight], ["approvals", "Chờ duyệt", BadgeCheck, approveCnt],
    ["calendar", "Lịch", CalendarDays], ["documents", "Tài liệu liên kết", Link2],
    ...((me.deptId === "hr" || ["admin", "ceo"].includes(me.role)) ? [["hr", "Nhân sự", Users]] : []),
    ...(["admin", "ceo"].includes(me.role) ? [["admin", "Quản trị", Settings]] : []),
  ];
  return (
    <nav className="p-3">
      <div className="mb-3 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-[11px] font-bold text-white">NW</span><span className="text-sm font-bold">NOVIX WORK</span></div>
      {items.map(([k, lb, Ic, badge]) => (
        <button key={k} onClick={() => nav(k)} aria-current={page.name === k ? "page" : undefined} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm ${page.name === k ? "bg-zinc-100 font-medium text-zinc-900" : "text-zinc-600 hover:bg-zinc-50"}`}>
          <Ic className="h-[18px] w-[18px]" />{lb}{badge > 0 && <span className="ml-auto rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">{badge}</span>}
        </button>
      ))}
    </nav>
  );
}
function Topbar({ onCreate, onLogout, onMobileNav }) {
  const { db, me } = useApp();
  const [q, setQ] = useState("");
  const [showNotif, setShowNotif] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const unread = db.notifs.filter((n) => n.userId === me.id && !n.read).length;
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 sm:gap-3 border-b border-zinc-100 bg-white/90 px-3 sm:px-4 py-2.5 backdrop-blur">
      <button className="md:hidden shrink-0 rounded-lg p-2 hover:bg-zinc-100 text-zinc-600" onClick={onMobileNav} aria-label="Mở menu điều hướng"><LayoutList className="h-5 w-5" /></button>
      <div className="relative min-w-0 flex-1 max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-300" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm công việc, dự án, yêu cầu…" aria-label="Tìm kiếm"
          className="w-full min-w-0 rounded-xl border border-zinc-100 bg-zinc-50 pl-9 pr-8 py-2 text-[13px] focus:outline-none focus:border-zinc-300 focus:bg-white" />
        {q && <button className="absolute right-2.5 top-2.5 text-zinc-300 hover:text-zinc-600" onClick={() => setQ("")}><X className="h-4 w-4" /></button>}
        {q.trim().length >= 2 && <SearchOverlay q={q.trim()} onClose={() => setQ("")} />}
      </div>
      <button className={`${btnPri} shrink-0`} onClick={onCreate} aria-label="Tạo công việc"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Tạo công việc</span></button>
      <div className="relative shrink-0">
        <button className="relative rounded-xl p-2 hover:bg-zinc-50 text-zinc-500" onClick={() => { setShowNotif(!showNotif); setShowMenu(false); }} aria-label="Thông báo">
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{unread}</span>}
        </button>
        {showNotif && <NotifPanel onClose={() => setShowNotif(false)} />}
      </div>
      <div className="relative shrink-0">
        <button className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-zinc-50" onClick={() => { setShowMenu(!showMenu); setShowNotif(false); }} aria-label="Tài khoản">
          <Avatar id={me.id} size={8} /><ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-zinc-100 bg-white p-1.5 shadow-xl">
            <div className="px-2.5 py-2"><p className="text-[13px] font-semibold text-zinc-800">{me.name}</p><p className="text-[11px] text-zinc-400">{me.title} · {ROLE_LABELS[me.role]}</p></div>
            <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-zinc-600 hover:bg-zinc-50" onClick={onLogout}><LogOut className="h-4 w-4" />Đổi tài khoản demo</button>
          </div>
        )}
      </div>
    </header>
  );
}

/* ============================================================
   App root
   ============================================================ */
/* ===== RECURRING SCHEDULER — sinh task theo lịch, không phụ thuộc task cũ hoàn thành =====
   Chống trùng bằng key template_id:occurrence_date (map generated). Ngày 31 dùng quy tắc clamp (cuối tháng) hoặc skip. */
const lastDayOfMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const occursToday = (rule, dISO) => {
  const d = new Date(dISO + "T00:00:00");
  if (rule.freq === "daily") return true;
  if (rule.freq === "weekly") return d.getDay() === (rule.weekday ?? 1);
  if (rule.freq === "monthly") {
    const want = rule.dayOfMonth ?? 1;
    const last = lastDayOfMonth(d.getFullYear(), d.getMonth());
    if (want > last) return rule.monthlyMode === "clamp" ? d.getDate() === last : false; /* skip tháng không có ngày đó */
    return d.getDate() === want;
  }
  return false;
};
const runScheduler = (dbx, today = todayISO()) => {
  let next = dbx;
  (dbx.recurrings || []).forEach((tpl) => {
    if (tpl.paused) return;
    if (tpl.endDate && today > tpl.endDate) return;
    if (tpl.startDate && today < tpl.startDate) return;
    const key = `${tpl.id}:${today}`;
    if (tpl.generated[key]) return; /* unique(template_id, occurrence_date) */
    if (!occursToday(tpl.rule, today)) return;
    const id = uid("t");
    const d = tpl.taskDefaults;
    const nt = { id, code: nextTaskCode(next), name: d.name, desc: d.desc || "", deliverable: d.deliverable || "", acceptance: "", creatorId: d.assignerId || d.ownerId, assignerId: d.assignerId || null, ownerId: d.ownerId, collaboratorIds: [], approverId: d.approverId || null, deptId: d.deptId, coDeptIds: [], projectId: null, type: "recurring", priority: d.priority, start: today, deadline: today, status: "todo", progress: 0, effort: d.effort, checklist: [], reportLink: "", driveLink: "", attachments: [], tags: d.tags || [], comments: [], logs: [{ id: uid("l"), userId: d.ownerId, at: Date.now(), text: `sinh tự động theo lịch (${tpl.rule.freq})`, action: "create" }], pauseReason: "", overdueReason: "", revisionCount: 0, revisionNote: "", completedAt: null, confirmedById: null, approvedAt: null, recurrence: tpl.rule.freq, pinnedBy: [], createdAt: Date.now(), updatedAt: Date.now(), deadlineConfirmed: true, deadlineHistory: [], brandId: d.brandId || null, visibility: "department", isConfidential: false, allowedViewerIds: [], confidentialReason: "", category: d.category || "GENERAL", locked: false, requiresAck: false, ackedAt: null, actual: { summary: "", links: [], note: "", submittedAt: null }, recurringTemplateId: tpl.id, occurrenceDate: today };
    next = { ...next, tasks: [nt, ...next.tasks], recurrings: next.recurrings.map((x) => x.id === tpl.id ? { ...x, generated: { ...x.generated, [key]: id } } : x) };
  });
  return next;
};

/* ===== DEADLINE ALERTS — mốc D-3/D-1/D0/+1/+3/+7, dedupe theo (task, mốc, phiên bản deadline), escalation theo ưu tiên ===== */
const runAlerts = (dbx) => {
  let next = dbx;
  const sent = { ...(dbx.sentAlerts || {}) };
  const push = (userId, text, extra, level = "act") => { if (userId) next = pushNotif(next, { userId, type: "deadline", level, text, ...extra }); };
  dbx.tasks.filter((t) => !t.deleted && t.deadline && !["done", "paused"].includes(t.status)).forEach((t) => {
    const dl = daysLeft(t.deadline);
    const type = dl === 3 ? "d3" : dl === 1 ? "d1" : dl === 0 ? "d0" : dl === -1 ? "o1" : dl === -3 ? "o3" : dl === -7 ? "o7" : null;
    if (!type) return;
    const key = `${t.id}:${type}:${t.deadlineHistory.length}`;
    if (sent[key]) return;
    sent[key] = Date.now();
    const safe = t.isConfidential;
    const label = dl > 0 ? `còn ${dl} ngày` : dl === 0 ? "đến hạn hôm nay" : `quá hạn ${-dl} ngày`;
    push(t.ownerId, safe ? `Một công việc bảo mật của bạn ${label}.` : `Deadline ${label}: ${t.name}`, { taskId: t.id }, dl < 0 ? "urgent" : "act");
    const lead = deptLeader(dbx, t.deptId);
    const escalateLead = (t.priority === "high") || (t.priority === "urgent" && dl <= 0);
    if (escalateLead && lead && lead.id !== t.ownerId) push(lead.id, safe ? `Một công việc bảo mật trong phòng ${label}.` : `[Phòng ${deptById(dbx, t.deptId)?.name}] ${t.name} ${label}`, { taskId: t.id }, dl < 0 ? "urgent" : "info");
    if (t.priority === "urgent" && dl <= -3) push(dbx.users.find((u) => u.role === "ceo")?.id, safe ? `Một công việc bảo mật khẩn cấp quá hạn nhiều ngày.` : `KHẨN quá hạn ${-dl} ngày: ${t.name}`, { taskId: t.id }, "urgent");
  });
  /* Request chưa tiếp nhận quá SLA 2 ngày → nhắc người nhận + escalate leader/admin; urgent → CEO */
  dbx.requests.filter((r) => r.status === "pending" && Date.now() - r.createdAt > 2 * DAY).forEach((r) => {
    const key = `${r.id}:sla`;
    if (sent[key]) return;
    sent[key] = Date.now();
    const rcv = deptReceiverId(dbx, r.toDeptId);
    push(rcv, `Yêu cầu chưa tiếp nhận quá ${Math.floor((Date.now() - r.createdAt) / DAY)} ngày: ${r.title}`, { requestId: r.id }, "urgent");
    const lead = deptLeader(dbx, r.toDeptId);
    const admin = dbx.users.find((u) => u.role === "admin");
    push((lead || admin)?.id !== rcv ? (lead || admin)?.id : null, `[SLA] Phòng ${deptById(dbx, r.toDeptId)?.name} chưa tiếp nhận: ${r.title}`, { requestId: r.id }, "urgent");
    if (r.priority === "urgent") push(dbx.users.find((u) => u.role === "ceo")?.id, `[SLA] Yêu cầu KHẨN bị tắc: ${r.title}`, { requestId: r.id }, "urgent");
  });
  return { ...next, sentAlerts: sent };
};


export default function App() {
  const [db, setDb] = useState(buildSeed);
  const [meId, setMeId] = useState(null);
  const [page, setPage] = useState({ name: "dashboard", params: {} });
  const [taskId, setTaskId] = useState(null);
  const [reqId, setReqId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem("nvx.sidebar.collapsed") === "1"; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem("nvx.sidebar.collapsed", collapsed ? "1" : "0"); } catch {} }, [collapsed]);
  const [mobileNav, setMobileNav] = useState(false);

  /* ===== Hash routing: mỗi entity có URL, copy link được, Back hoạt động.
     (Artifact chạy in-memory nên refresh sẽ reset dữ liệu — bản Supabase giữ nguyên state theo URL) ===== */
  const applyHash = () => {
    const h = (window.location.hash || "").replace(/^#\/?/, "");
    const seg = h.split("/").filter(Boolean);
    if (seg[0] === "tasks" && seg[1]) { setTaskId(seg[1]); return; }
    if (seg[0] === "req" && seg[1]) { setReqId(seg[1]); return; }
    if (seg[0] === "p" && seg[1]) { setTaskId(null); setReqId(null); setPage({ name: seg[1], params: seg[2] ? { id: seg[2] } : {} }); }
  };
  useEffect(() => {
    window.addEventListener("hashchange", applyHash);
    if (window.location.hash) applyHash();
    return () => window.removeEventListener("hashchange", applyHash);
  }, []); // eslint-disable-line
  useEffect(() => {
    const want = taskId ? `#/tasks/${taskId}` : reqId ? `#/req/${reqId}` : `#/p/${page.name}${page.params?.id ? `/${page.params.id}` : ""}`;
    if (window.location.hash !== want) { try { window.history.replaceState(null, "", want); } catch (e) { window.location.hash = want; } }
  }, [page, taskId, reqId]);
  const [toasts, setToasts] = useState([]);
  const me = db.users.find((u) => u.id === meId) || null;

  const toast = (msg, type = "ok") => {
    if (!msg) return;
    const id = uid("toast");
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  };
  const nav = (name, params = {}) => setPage({ name, params });

  /* ----- notification helper (inside setDb pipelines) ----- */
  const notify = (dbx, userId, text, extra = {}, level = "info") =>
    userId && userId !== meId ? pushNotif(dbx, { userId, text, level, ...extra }) : dbx;

  /* ----- recurring spawn helper ----- */
  /* spawnNext cũ đã thay bằng runScheduler — kỳ mới sinh theo lịch, không phụ thuộc task cũ */
  const spawnNext = (dbx, cur) => dbx;

  /* Đồng bộ request khi task liên kết đổi trạng thái — request & task không được mâu thuẫn */
  const syncLinkedRequest = (dbx, taskId2, s) => {
    const r = dbx.requests.find((x) => x.taskId === taskId2);
    if (!r || ["confirmed", "rejected", "cancelled"].includes(r.status)) return dbx;
    const map = { doing: "processing", review: "delivered", done: "confirmed" };
    const ns = map[s];
    if (!ns || ns === r.status) return dbx;
    return { ...dbx, requests: dbx.requests.map((x) => x.id === r.id ? { ...x, status: ns, logs: [...x.logs, { id: uid("l"), userId: meId, at: Date.now(), text: `đồng bộ từ task: ${REQ_STATUSES[ns].label}` }] } : x) };
  };

  const act = {
    updateTask: (id, patch, logText) => {
      const cur = db.tasks.find((t) => t.id === id);
      if (!cur) return { ok: false };
      const chk = canApplyTaskPatch(db, me, cur, patch);
      if (!chk.ok) { toast(chk.msg, "warn"); return { ok: false, msg: chk.msg }; }
      setDb((prev) => {
      const old = prev.tasks.find((t) => t.id === id); if (!old) return prev;
      let next = mapTask(prev, id, (t) => logText ? withLog({ ...t, ...patch }, meId, logText) : { ...t, ...patch, updatedAt: Date.now() });
      if (patch.ownerId && patch.ownerId !== old.ownerId) {
        next = notify(next, patch.ownerId, old.isConfidential ? "Bạn có một công việc nhân sự cần xử lý." : `Bạn được giao: ${old.name}`, { taskId: id }, "act");
        next = { ...next, requests: next.requests.map((r) => r.taskId === id ? { ...r, handlerId: patch.ownerId, logs: [...r.logs, { id: uid("l"), userId: meId, at: Date.now(), text: `người xử lý đổi thành ${userById(next, patch.ownerId)?.name} (đồng bộ từ task)` }] } : r) };
      }
      if (patch.collaboratorIds) patch.collaboratorIds.filter((x) => !old.collaboratorIds.includes(x)).forEach((cid) => { next = notify(next, cid, `Bạn được thêm phối hợp: ${old.name}`, { taskId: id }); });
      return next;
      });
      return { ok: true };
    },
    changeStatus: (id, s, extra = {}) => {
      const t = db.tasks.find((x) => x.id === id);
      if (!t) return { ok: false, msg: "Không tìm thấy công việc" };
      if (s === t.status) return { ok: true };
      if (!perms.changeStatus(db, me, t)) return { ok: false, msg: t.locked ? "Task đã khóa sau duyệt — chỉ Leader/Admin mở lại được" : "Bạn không có quyền đổi trạng thái task này" };
      const hasActual = t.actual?.summary?.trim() && (t.actual.links.length > 0 || t.attachments.length > 0 || t.type === "personal");
      if (s === "review") {
        if (!t.approverId) return { ok: false, msg: "Task không có người duyệt — đặt người duyệt trước hoặc hoàn thành trực tiếp" };
        if (t.ownerId !== me.id) return { ok: false, msg: "Chỉ người phụ trách chính được gửi duyệt" };
        if (!hasActual) return { ok: false, msg: "Nhập Kết quả thực tế (tóm tắt + link/file) trước khi gửi duyệt" };
      }
      if (s === "done") {
        if (t.approverId && !t.approvedAt) return { ok: false, msg: "Task cần duyệt — Gửi duyệt để người duyệt xác nhận, không hoàn thành trực tiếp được" };
        if (t.type !== "personal" && !hasActual) return { ok: false, msg: "Task chỉ hoàn thành khi có Kết quả thực tế đã bàn giao (tóm tắt + link/file)" };
        if (t.requiresAck && !t.ackedAt) return { ok: false, msg: "Cần tích xác nhận đã đọc tài liệu trước khi hoàn thành" };
      }
      setDb((prev) => {
        const cur = prev.tasks.find((x) => x.id === id);
        let next = mapTask(prev, id, (x) => withLog({
          ...x, status: s, progress: s === "done" ? 100 : x.progress,
          completedAt: s === "done" ? Date.now() : x.completedAt,
          confirmedById: s === "done" ? meId : x.confirmedById,
          actual: s === "review" ? { ...x.actual, submittedAt: Date.now() } : x.actual,
          pauseReason: s === "paused" ? (extra.pauseReason || x.pauseReason) : x.pauseReason,
        }, meId, s === "paused" ? `tạm dừng công việc: ${extra.pauseReason || ""}` : `đổi trạng thái → ${STATUSES[s].label}`, { action: "status", from: cur.status, to: s, reason: extra.pauseReason }));
        next = syncLinkedRequest(next, id, s);
        if (s === "done" && cur.ownerId !== meId) next = notify(next, cur.ownerId, `Công việc đã hoàn thành: ${cur.name}`, { taskId: id });
        if (s === "review" && cur.approverId) next = notify(next, cur.approverId, cur.isConfidential ? "Bạn có một công việc nhân sự cần duyệt." : `${me.name} gửi duyệt: ${cur.name}`, { taskId: id }, "act");
        return next;
      });
      return { ok: true };
    },
    changeDeadline: (id, v, reason) => {
      const t0 = db.tasks.find((t) => t.id === id);
      if (!t0) return { ok: false };
      if (!perms.changeDeadline(db, me, t0)) { toast(t0.deadlineConfirmed ? "Deadline đã xác nhận — chỉ Leader/Quản lý đổi được" : "Không có quyền đổi deadline", "warn"); return { ok: false }; }
      if (t0.deadlineConfirmed && !reason?.trim()) {
        return { ok: false, code: "REASON_REQUIRED", msg: "Deadline đã xác nhận — cần ghi lý do đổi" };
      }
      setDb((prev) => {
      const old = prev.tasks.find((t) => t.id === id); if (!old) return prev;
      let next = mapTask(prev, id, (t) => withLog({ ...t, deadline: v, deadlineHistory: [...t.deadlineHistory, { from: t.deadline, to: v, by: meId, at: Date.now(), reason }] }, meId, `đổi deadline ${fmtDFull(old.deadline)} → ${fmtDFull(v)}${reason ? ` (${reason})` : ""}`));
      next = notify(next, old.ownerId, old.isConfidential ? "Deadline một công việc bảo mật của bạn thay đổi." : `Deadline thay đổi: ${old.name} → ${fmtDFull(v)}`, { taskId: id }, "act");
      /* Task liên phòng ban: KHÔNG ghi đè deadline đã thống nhất. Nếu request chưa chốt
         deadline thì đồng bộ được; nếu đã chốt (agreedDeadline) thì giữ nguyên cam kết,
         chỉ ghi nhận + yêu cầu bên gửi xác nhận lại (tránh phá thỏa thuận đơn phương). */
      next = { ...next, requests: next.requests.map((r) => {
        if (r.taskId !== id || !["accepted", "processing"].includes(r.status)) return r;
        if (!r.agreedDeadline) return { ...r, agreedDeadline: v, logs: [...r.logs, { id: uid("l"), userId: meId, at: Date.now(), text: `deadline thống nhất → ${fmtDFull(v)} (${reason || "đồng bộ từ task"})` }] };
        return { ...r, logs: [...r.logs, { id: uid("l"), userId: meId, at: Date.now(), text: `⚠️ deadline task đổi → ${fmtDFull(v)} (${reason}); deadline thống nhất vẫn là ${fmtDFull(r.agreedDeadline)} — cần bên gửi xác nhận lại` }] };
      }) };
      /* báo bên gửi các request đã chốt deadline để họ xác nhận lại */
      next.requests.filter((r) => r.taskId === id && ["accepted", "processing"].includes(r.status) && r.agreedDeadline && r.agreedDeadline !== v).forEach((r) => { next = notify(next, r.fromUserId, `Deadline task phối hợp "${old.name}" được đề nghị đổi → ${fmtDFull(v)} · cần bạn xác nhận lại`, { requestId: r.id }, "act"); });
      return next;
      });
      return { ok: true };
    },
    submitReview: (id) => act.changeStatus(id, "review"),
    approve: (id) => {
      const t = db.tasks.find((x) => x.id === id);
      if (!t) return { ok: false, msg: "Không tìm thấy" };
      if (!perms.approve(db, me, t)) return { ok: false, msg: t.ownerId === me.id ? "Người phụ trách không tự duyệt task của mình" : "Bạn không phải người duyệt của task này" };
      setDb((prev) => {
        const cur = prev.tasks.find((x) => x.id === id);
        let next = mapTask(prev, id, (x) => withLog({ ...x, status: "done", progress: 100, approvedAt: Date.now(), completedAt: Date.now(), confirmedById: meId, locked: true }, meId, "duyệt hoàn thành — kết quả được khóa", { action: "approve" }));
        next = spawnNext(next, cur);
        next = syncLinkedRequest(next, id, "done");
        return notify(next, cur.ownerId, cur.isConfidential ? "Một công việc nhân sự của bạn đã được duyệt." : `Đã được duyệt: ${cur.name}`, { taskId: id }, "act");
      });
      return { ok: true };
    },
    requestRevision: (id, { note, deadline, level }) => {
      const t = db.tasks.find((x) => x.id === id);
      if (!t || !perms.requestRevision(db, me, t)) return { ok: false, msg: "Bạn không có quyền yêu cầu chỉnh sửa task này" };
      setDb((prev) => {
        const cur = prev.tasks.find((x) => x.id === id);
        let next = mapTask(prev, id, (x) => withLog({
          ...x, status: "revise", revisionCount: x.revisionCount + 1, revisionNote: `[${level}] ${note}`,
          deadline, deadlineHistory: deadline !== x.deadline ? [...x.deadlineHistory, { from: x.deadline, to: deadline, by: meId, at: Date.now(), reason: "Deadline chỉnh sửa" }] : x.deadlineHistory,
        }, meId, `yêu cầu chỉnh sửa (${level}): ${note} · hạn ${fmtDFull(deadline)}`, { action: "revise", reason: note }));
        return notify(next, cur.ownerId, cur.isConfidential ? "Một công việc nhân sự cần bạn chỉnh sửa." : `Bị yêu cầu chỉnh sửa (${level}): ${cur.name}`, { taskId: id }, "act");
      });
      return { ok: true };
    },
    reopen: (id, reason) => {
      const t = db.tasks.find((x) => x.id === id);
      if (!t || !perms.reopen(db, me, t)) return { ok: false, msg: "Chỉ Leader/Admin mở lại được task đã khóa" };
      if (!reason?.trim()) return { ok: false, msg: "Mở lại task bắt buộc ghi lý do" };
      setDb((prev) => mapTask(prev, id, (x) => withLog({ ...x, locked: false, status: "doing", approvedAt: null, completedAt: null }, meId, `mở lại task sau duyệt: ${reason}`, { action: "reopen", reason })));
      return { ok: true };
    },
    updateActual: (id, patch) => {
      const t = db.tasks.find((x) => x.id === id);
      if (!t || t.locked || !(t.ownerId === me.id || canManage(db, me, t))) return { ok: false, msg: "Chỉ người phụ trách cập nhật được kết quả thực tế" };
      setDb((prev) => mapTask(prev, id, (x) => ({ ...x, actual: { ...x.actual, ...patch }, updatedAt: Date.now() })));
      return { ok: true };
    },
    ackPolicy: (id) => {
      const t = db.tasks.find((x) => x.id === id);
      if (!t || t.ownerId !== me.id) return { ok: false, msg: "Chỉ người được giao xác nhận được" };
      setDb((prev) => mapTask(prev, id, (x) => withLog({ ...x, ackedAt: Date.now() }, meId, "xác nhận đã đọc tài liệu/chính sách", { action: "ack" })));
      return { ok: true };
    },
    toggleCheck: (id, cid) => {
      const t = db.tasks.find((x) => x.id === id);
      if (!t) return;
      const c = t.checklist.find((x) => x.id === cid);
      if (!c) return;
      /* Kiểm tra quyền ở cấp item — collaborator chỉ tick item được giao cho mình */
      if (!perms.canToggleChecklistItem(db, me, t, c)) {
        toast(c.ownerId && c.ownerId !== me.id
          ? "Bạn chỉ tick được checklist được giao cho chính mình"
          : "Bạn không có quyền cập nhật checklist này", "warn");
        return;
      }
      setDb((prev) => mapTask(prev, id, (x) => {
        const checklist = x.checklist.map((ck) => ck.id === cid ? { ...ck, done: !ck.done } : ck);
        const progress = checklist.length ? Math.round((checklist.filter((ck) => ck.done).length / checklist.length) * 100) : x.progress;
        return withLog({ ...x, checklist, progress }, meId, `${c.done ? "bỏ tick" : "tick"} checklist: ${c.text}`, { action: "checklist_toggle", itemId: cid });
      }));
    },
    addCheck: (id, text) => {
      const t = db.tasks.find((x) => x.id === id);
      if (!t || !perms.manageChecklist(db, me, t)) { toast("Bạn không có quyền sửa checklist này", "warn"); return; }
      setDb((prev) => mapTask(prev, id, (x) => withLog({ ...x, checklist: [...x.checklist, { id: uid("c"), text, done: false, ownerId: null, deadline: null }] }, meId, `thêm checklist: ${text}`, { action: "checklist" })));
    },
    delCheck: (id, cid) => {
      const t = db.tasks.find((x) => x.id === id);
      if (!t || !perms.manageChecklist(db, me, t)) { toast("Bạn không có quyền sửa checklist này", "warn"); return; }
      setDb((prev) => mapTask(prev, id, (x) => withLog({ ...x, checklist: x.checklist.filter((c) => c.id !== cid) }, meId, "xóa một mục checklist", { action: "checklist" })));
    },
    addComment: (id, text, mentionIds = []) => setDb((prev) => {
      const cur = prev.tasks.find((x) => x.id === id); if (!cur || !perms.comment(prev, me, cur)) return prev;
      let next = mapTask(prev, id, (t) => ({ ...t, comments: [...t.comments, { id: uid("cm"), userId: meId, text, mentions: mentionIds, at: Date.now() }], updatedAt: Date.now() }));
      mentionIds.forEach((uid2) => { if (uid2 !== meId) next = notify(next, uid2, cur.isConfidential ? "Bạn được nhắc trong một công việc bảo mật." : `${me.name} nhắc bạn trong: ${cur.name}`, { taskId: id }, "act"); });
      const others = [cur.ownerId, cur.assignerId].filter((x) => x && x !== meId && !mentionIds.includes(x));
      others.forEach((x) => { next = notify(next, x, cur.isConfidential ? "Có bình luận mới trong một công việc bảo mật." : `Bình luận mới trong: ${cur.name}`, { taskId: id }); });
      return next;
    }),
    addAttachment: (id, file) => {
      const t = db.tasks.find((x) => x.id === id);
      if (!t || !perms.attach(db, me, t)) return { ok: false, msg: "Không có quyền đính kèm" };
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const ALLOWED = ["pdf", "png", "jpg", "jpeg", "xlsx", "docx", "pptx", "csv", "zip", "mp4", "txt"];
      if (!ALLOWED.includes(ext)) return { ok: false, msg: `Không hỗ trợ .${ext} — chỉ nhận: ${ALLOWED.join(", ")}` };
      if (file.size && file.size > 25 * 1024 * 1024) return { ok: false, msg: "File vượt 25MB" };
      setDb((prev) => mapTask(prev, id, (x) => withLog({ ...x, attachments: [...x.attachments, { id: uid("f"), name: file.name, size: file.size || 0, mime: file.mime || "", by: meId, at: Date.now(), confidential: x.isConfidential }] }, meId, `đính kèm file: ${file.name}`, { action: "attach" })));
      return { ok: true };
    },
    deleteTask: (id) => {
      const t = db.tasks.find((x) => x.id === id);
      if (!t || !perms.deleteTask(db, me, t)) return { ok: false, msg: "Bạn không có quyền xóa task này" };
      const linked = db.requests.find((r) => r.taskId === id && !["confirmed", "rejected", "cancelled"].includes(r.status));
      if (linked) return { ok: false, msg: `Task đang gắn với yêu cầu ${linked.code} chưa đóng — xử lý yêu cầu trước khi xóa` };
      setDb((prev) => mapTask(prev, id, (x) => withLog({ ...x, deleted: true }, meId, "xóa công việc (soft delete)", { action: "delete" })));
      return { ok: true };
    },
    restoreTask: (id, reason) => {
      const t = db.tasks.find((x) => x.id === id);
      if (!t || !perms.restoreTask(db, me, t)) return { ok: false, msg: "Chỉ Leader/Admin khôi phục được" };
      if (!reason?.trim()) return { ok: false, msg: "Khôi phục bắt buộc ghi lý do" };
      setDb((prev) => mapTask(prev, id, (x) => withLog({ ...x, deleted: false }, meId, `khôi phục task: ${reason}`, { action: "restore", reason })));
      return { ok: true };
    },
    pinToggle: (id) => {
      const t0 = db.tasks.find((t) => t.id === id);
      const on = t0?.pinnedBy.includes(meId);
      const pinned = db.tasks.filter((t) => t.pinnedBy.includes(meId) && !t.deleted && t.status !== "done").length;
      if (!on && pinned >= 5) { toast("Chỉ ghim tối đa 5 task trong Ưu tiên hôm nay", "warn"); return; }
      setDb((prev) => mapTask(prev, id, (t) => ({ ...t, pinnedBy: on ? t.pinnedBy.filter((x) => x !== meId) : [...t.pinnedBy, meId] })));
    },
    createTask: (f) => {
      const chk = canCreateTaskFor(db, me, f);
      if (!chk.ok) return chk;
      if (f.approverId && f.approverId === f.ownerId) return { ok: false, msg: "Người duyệt không được trùng người phụ trách (không tự duyệt)" };
      const id = uid("t");
      setDb((prev) => {
        const nt = {
          id, code: nextTaskCode(prev), name: f.name, desc: f.desc || "", deliverable: f.deliverable || "", acceptance: f.acceptance || "",
          creatorId: meId, assignerId: f.ownerId && f.ownerId !== meId ? meId : null, ownerId: f.ownerId || null,
          collaboratorIds: f.collaboratorIds || [], approverId: f.approverId || null, deptId: f.deptId, coDeptIds: f.coDeptIds || [], projectId: f.projectId || null,
          type: f.type, priority: f.priority, start: f.start, deadline: f.deadline || null, status: f.status, progress: 0,
          effort: f.effort, checklist: [], reportLink: f.reportLink || "", driveLink: "", attachments: [], tags: f.tags || [],
          comments: [], logs: [{ id: uid("l"), userId: meId, at: Date.now(), text: "tạo công việc", action: "create" }], pauseReason: "", overdueReason: "",
          revisionCount: 0, revisionNote: "", completedAt: null, confirmedById: null, approvedAt: null,
          recurrence: f.recurrence || null, pinnedBy: [], createdAt: Date.now(), updatedAt: Date.now(),
          deadlineConfirmed: true, deadlineHistory: [],
          brandId: deptBrand(prev, f.deptId) || f.brandId || null,
          visibility: f.visibility || (f.type === "personal" ? "private" : f.projectId ? "project" : "department"),
          isConfidential: !!f.isConfidential, allowedViewerIds: f.allowedViewerIds || [], confidentialReason: f.confidentialReason || "",
          category: f.category || "GENERAL", locked: false, requiresAck: !!f.requiresAck, ackedAt: null,
          actual: { summary: "", links: [], note: "", submittedAt: null },
        };
        let next = { ...prev, tasks: [nt, ...prev.tasks] };
        if (f.recurrence) {
          const tplId = uid("rc");
          nt.recurringTemplateId = tplId; nt.occurrenceDate = todayISO();
          next = { ...next, recurrings: [...next.recurrings, { id: tplId, name: nt.name, paused: false, endDate: null, startDate: todayISO(), rule: f.recurrence === "daily" ? { freq: "daily" } : f.recurrence === "weekly" ? { freq: "weekly", weekday: new Date().getDay() } : { freq: "monthly", dayOfMonth: new Date().getDate(), monthlyMode: "clamp" }, taskDefaults: { name: nt.name, desc: nt.desc, deliverable: nt.deliverable, ownerId: nt.ownerId, assignerId: nt.assignerId, approverId: nt.approverId, deptId: nt.deptId, priority: nt.priority, effort: nt.effort, tags: nt.tags, brandId: nt.brandId, category: nt.category }, generated: { [`${tplId}:${todayISO()}`]: id } }] };
        }
        if (nt.ownerId && nt.ownerId !== meId) next = notify(next, nt.ownerId, nt.isConfidential ? "Bạn có một công việc nhân sự cần xử lý." : `Bạn được giao: ${nt.name} · hạn ${nt.deadline ? fmtDFull(nt.deadline) : "chưa có"}`, { taskId: id }, "act");
        if (nt.approverId && nt.approverId !== meId) next = notify(next, nt.approverId, nt.isConfidential ? "Bạn là người duyệt của một công việc bảo mật." : `Bạn là người duyệt của: ${nt.name}`, { taskId: id });
        return next;
      });
      return { ok: true, id };
    },
    createProject: (f) => setDb((prev) => ({ ...prev, projects: [...prev.projects, { id: uid("p"), code: `PRJ-${String(prev.projects.length + 1).padStart(2, "0")}`, watcherIds: [], issues: [], status: "prep", desc: "", ...f }] })),
    updateProject: (id, patch) => setDb((prev) => ({ ...prev, projects: prev.projects.map((p) => p.id === id ? { ...p, ...patch } : p) })),
    createRequest: (f) => setDb((prev) => {
      const r = { id: uid("r"), code: nextReqCode(prev), deadlineProposals: [], pendingHandlerId: null, reqType: f.reqType || null, ...f, isConfidential: !!f.isConfidential, allowedViewerIds: f.allowedViewerIds || [], brandId: f.brandId || deptBrand(prev, me.deptId) || deptBrand(prev, f.toDeptId) || null, fromDeptId: me.deptId, fromUserId: meId, receiverId: null, handlerId: null, agreedDeadline: null, status: "pending", rejectReason: "", attachments: [], comments: [], logs: [{ id: uid("l"), userId: meId, at: Date.now(), text: "tạo yêu cầu phối hợp" }], taskId: null, createdAt: Date.now() };
      let next = { ...prev, requests: [r, ...prev.requests] };
      const rcv = deptReceiverId(prev, f.toDeptId);
      if (rcv) next = notify(next, rcv, `Yêu cầu phối hợp mới từ ${deptById(prev, me.deptId)?.name}: ${f.title}`, { requestId: r.id }, "act");
      return next;
    }),
    /* ===== Yêu cầu phối hợp: thoả thuận deadline 2 chiều + đồng bộ task =====
       accept với deadline khác đề xuất → KHÔNG ghi agreed_deadline, chuyển deadline_proposed chờ bên gửi chốt.
       Chỉ khi 2 bên đồng ý → accepted + tạo task. */
    reqAction: (id, action, payload = {}) => setDb((prev) => {
      const r = prev.requests.find((x) => x.id === id); if (!r) return prev;
      const log = (x, text) => ({ ...x, logs: [...x.logs, { id: uid("l"), userId: meId, at: Date.now(), text }] });
      let next = prev;
      const finalize = (dbx, rx, deadline, handlerId) => {
        /* 2 bên đã thống nhất — ghi agreedDeadline + tạo task liên phòng ban */
        const taskId = uid("t");
        let d2 = mapReq(dbx, id, (x) => log({ ...x, status: "accepted", receiverId: x.receiverId || meId, handlerId, agreedDeadline: deadline, taskId }, `hai bên chốt deadline ${fmtDFull(deadline)} — yêu cầu được tiếp nhận`));
        const nt = { id: taskId, code: nextTaskCode(d2), brandId: r.brandId || null, name: `[Phối hợp] ${r.title}`, desc: r.content, deliverable: r.deliverable, acceptance: "", creatorId: meId, assignerId: meId, ownerId: handlerId, collaboratorIds: [r.fromUserId], approverId: r.fromUserId, deptId: r.toDeptId, coDeptIds: [r.fromDeptId], projectId: null, type: "cross", priority: r.priority, start: todayISO(), deadline, status: "todo", progress: 0, effort: "M", checklist: [], reportLink: "", driveLink: "", attachments: [], tags: ["phoi-hop"], comments: [], logs: [{ id: uid("l"), userId: meId, at: Date.now(), text: `tạo tự động từ yêu cầu ${r.code}`, action: "create" }], pauseReason: "", overdueReason: "", revisionCount: 0, revisionNote: "", completedAt: null, confirmedById: null, approvedAt: null, recurrence: null, pinnedBy: [], createdAt: Date.now(), updatedAt: Date.now(), deadlineConfirmed: true, deadlineHistory: [], visibility: "department", isConfidential: false, allowedViewerIds: [], confidentialReason: "", category: "GENERAL", locked: false, requiresAck: false, ackedAt: null, actual: { summary: "", links: [], note: "", submittedAt: null } };
        d2 = { ...d2, tasks: [nt, ...d2.tasks] };
        if (handlerId) d2 = notify(d2, handlerId, `Bạn phụ trách xử lý yêu cầu: ${r.title} · hạn ${fmtDFull(deadline)}`, { taskId }, "act");
        return d2;
      };
      if (action === "accept") {
        if (!isReceiverFor(prev, me, r.toDeptId) && r.receiverId !== meId) { toast("Chỉ người tiếp nhận của phòng mới xử lý được", "warn"); return prev; }
        if (payload.deadline === r.proposedDeadline) {
          next = finalize(prev, r, payload.deadline, payload.handlerId);
          next = notify(next, r.fromUserId, `${deptById(prev, r.toDeptId)?.name} đã tiếp nhận: ${r.title}`, { requestId: id });
        } else {
          /* đề xuất deadline mới → chờ bên gửi xác nhận, CHƯA tạo task, CHƯA ghi agreedDeadline */
          next = mapReq(prev, id, (x) => log({ ...x, status: "deadline_proposed", receiverId: meId, pendingHandlerId: payload.handlerId, deadlineProposals: [...x.deadlineProposals, { by: meId, side: "receiver", date: payload.deadline, at: Date.now() }] }, `đề xuất deadline mới ${fmtDFull(payload.deadline)} (đề xuất ban đầu: ${fmtDFull(r.proposedDeadline)})`));
          next = notify(next, r.fromUserId, `${deptById(prev, r.toDeptId)?.name} đề xuất deadline mới cho: ${r.title} → ${fmtDFull(payload.deadline)}`, { requestId: id }, "act");
        }
      }
      if (action === "agreeDeadline") {
        /* bên KHÔNG phải người đề xuất cuối cùng mới được bấm đồng ý */
        const last = r.deadlineProposals[r.deadlineProposals.length - 1];
        if (!last) return prev;
        const senderSide = r.fromUserId === meId || isMgr(me) || isDeptLeader(prev, me, r.fromDeptId);
        const receiverSide = isReceiverFor(prev, me, r.toDeptId) || r.receiverId === meId;
        const canAgree = last.side === "receiver" ? senderSide : receiverSide;
        if (!canAgree) { toast("Chờ bên kia phản hồi — bạn là bên vừa đề xuất", "warn"); return prev; }
        next = finalize(prev, r, last.date, r.pendingHandlerId);
        const other = last.side === "receiver" ? (r.receiverId || deptReceiverId(prev, r.toDeptId)) : r.fromUserId;
        next = notify(next, other, `Deadline đã được chốt ${fmtDFull(last.date)}: ${r.title}`, { requestId: id });
      }
      if (action === "counterDeadline") {
        /* một trong hai bên đề xuất lại ngày khác */
        const side = r.fromUserId === meId || isDeptLeader(prev, me, r.fromDeptId) ? "sender" : "receiver";
        next = mapReq(prev, id, (x) => log({ ...x, status: "deadline_proposed", deadlineProposals: [...x.deadlineProposals, { by: meId, side, date: payload.deadline, at: Date.now() }] }, `đề xuất lại deadline ${fmtDFull(payload.deadline)}`));
        const other = side === "sender" ? (r.receiverId || deptReceiverId(prev, r.toDeptId)) : r.fromUserId;
        next = notify(next, other, `Đề xuất deadline mới cho: ${r.title} → ${fmtDFull(payload.deadline)}`, { requestId: id }, "act");
      }
      if (action === "info") { next = mapReq(prev, id, (x) => log({ ...x, status: "info" }, `cần bổ sung: ${payload.note}`)); next = notify(next, r.fromUserId, `Cần bổ sung thông tin: ${r.title}`, { requestId: id }, "act"); }
      if (action === "resend") {
        if (!isSenderAuthorized(prev, me, r)) return prev;
        next = mapReq(prev, id, (x) => log({ ...x, status: "pending" }, "đã bổ sung thông tin, gửi lại"));
      }
      if (action === "reject") { next = mapReq(prev, id, (x) => log({ ...x, status: "rejected", rejectReason: payload.reason }, `từ chối yêu cầu: ${payload.reason}`)); next = notify(next, r.fromUserId, `Yêu cầu bị từ chối: ${r.title}`, { requestId: id }, "act"); }
      if (action === "start") { next = mapReq(prev, id, (x) => log({ ...x, status: "processing" }, "bắt đầu xử lý")); if (r.taskId) next = { ...next, tasks: next.tasks.map((t) => t.id === r.taskId && t.status === "todo" ? { ...t, status: "doing" } : t) }; }
      if (action === "deliver") {
        /* Chỉ người xử lý / leader phòng nhận mới được bàn giao */
        if (!(r.handlerId === meId || isReceiverFor(prev, me, r.toDeptId))) { toast("Chỉ người xử lý hoặc leader phòng nhận mới bàn giao được", "warn"); return prev; }
        /* Bàn giao phải có kết quả thực tế — cùng chuẩn với gửi duyệt task: tóm tắt + (link hoặc file) */
        const linkedTask = r.taskId ? prev.tasks.find((t) => t.id === r.taskId) : null;
        if (linkedTask) {
          const hasActual = linkedTask.actual?.summary?.trim() && (linkedTask.actual.links?.length > 0 || linkedTask.attachments?.length > 0);
          if (!hasActual) { toast("Cần Kết quả thực tế đầy đủ (tóm tắt + link/file) trong task trước khi bàn giao", "warn"); return prev; }
        }
        next = mapReq(prev, id, (x) => log({ ...x, status: "delivered" }, "bàn giao kết quả"));
        if (r.taskId) next = { ...next, tasks: next.tasks.map((t) => t.id === r.taskId && !["done", "review"].includes(t.status) ? { ...t, status: "review" } : t) };
        next = notify(next, r.fromUserId, `Đã bàn giao, chờ bạn xác nhận: ${r.title}`, { requestId: id }, "act");
      }
      if (action === "confirm") {
        /* Chỉ bên gửi có thẩm quyền (người tạo/leader phòng gửi/authorized) mới xác nhận hoàn thành */
        if (!isSenderAuthorized(prev, me, r)) return prev;
        next = mapReq(prev, id, (x) => log({ ...x, status: "confirmed" }, "xác nhận hoàn thành, đóng yêu cầu"));
        if (r.taskId) next = { ...next, tasks: next.tasks.map((t) => t.id === r.taskId && t.status !== "done" ? withLog({ ...t, status: "done", progress: 100, completedAt: Date.now(), approvedAt: Date.now(), locked: !!t.approverId, confirmedById: meId }, meId, "bên gửi xác nhận hoàn thành yêu cầu — task đóng", { action: "approve" }) : t) };
        if (r.handlerId) next = notify(next, r.handlerId, `Bên gửi đã xác nhận hoàn thành: ${r.title}`, { requestId: id });
      }
      if (action === "cancel") {
        if (!isSenderAuthorized(prev, me, r)) return prev;
        next = mapReq(prev, id, (x) => log({ ...x, status: "cancelled" }, `hủy yêu cầu${payload.reason ? `: ${payload.reason}` : ""}`));
        /* request hủy → task liên kết tạm dừng kèm lý do, không để 2 bên mâu thuẫn */
        if (r.taskId) {
          next = { ...next, tasks: next.tasks.map((t) => t.id === r.taskId && !["done"].includes(t.status) ? withLog({ ...t, status: "paused", pauseReason: `Yêu cầu ${r.code} đã bị hủy${payload.reason ? `: ${payload.reason}` : ""}` }, meId, `tạm dừng do yêu cầu ${r.code} bị hủy`, { action: "status", to: "paused" }) : t) };
          const tk = prev.tasks.find((t) => t.id === r.taskId);
          if (tk?.ownerId) next = notify(next, tk.ownerId, `Yêu cầu ${r.code} bị hủy — task liên quan đã tạm dừng`, { taskId: r.taskId }, "act");
        }
      }
      return next;
    }),
    reqComment: (id, text) => setDb((prev) => mapReq(prev, id, (r) => ({ ...r, comments: [...r.comments, { id: uid("cm"), userId: meId, text, at: Date.now() }] }))),
    notifRead: (id) => setDb((prev) => ({ ...prev, notifs: prev.notifs.map((n) => n.id === id ? { ...n, read: true } : n) })),
    notifReadAll: () => setDb((prev) => ({ ...prev, notifs: prev.notifs.map((n) => n.userId === meId ? { ...n, read: true } : n) })),
    saveFilter: (name, filter) => setDb((prev) => ({ ...prev, savedFilters: [...prev.savedFilters, { id: uid("sf"), userId: meId, name, filter }] })),
    addDoc: (f) => setDb((prev) => ({ ...prev, docs: [{ id: uid("d"), ownerId: meId, access: "Toàn công ty", updatedAt: Date.now(), tags: [], ...f }, ...prev.docs] })),
    adminUpdateUser: (id, patch, reason = "") => {
      const target = db.users.find((x) => x.id === id);
      if (!target) return { ok: false, msg: "Không tìm thấy người dùng" };
      if (patch.role && patch.role !== target.role) {
        if (!["admin", "ceo"].includes(me.role)) return { ok: false, msg: "Không có quyền đổi vai trò" };
        if ((target.role === "ceo" || patch.role === "ceo") && me.role !== "ceo") return { ok: false, msg: "Chỉ CEO mới thay đổi được vai trò CEO — Admin không tự cấp hoặc hạ quyền CEO" };
        if (id === meId) return { ok: false, msg: "Không thể tự thay đổi vai trò của chính mình" };
        if (!reason.trim()) return { ok: false, msg: "Đổi vai trò bắt buộc ghi lý do" };
      }
      setDb((prev) => {
        let next = { ...prev, users: prev.users.map((u) => u.id === id ? { ...u, ...patch } : u) };
        if (patch.role && patch.role !== target.role) next = { ...next, roleLogs: [{ id: uid("rl"), by: meId, targetId: id, from: target.role, to: patch.role, reason, at: Date.now() }, ...(next.roleLogs || [])] };
        return next;
      });
      return { ok: true };
    },
    /* ===== HR: sinh task theo template với deadline offset; quy trình mật → task mật ===== */
    createHrProcess: (f) => {
      if (me.deptId !== "hr" && !["admin", "ceo"].includes(me.role)) return { ok: false, msg: "Chỉ HR/Admin tạo được quy trình nhân sự" };
      const tpl = HR_TEMPLATES[f.type];
      if (!tpl) return { ok: false, msg: "Loại quy trình không hợp lệ" };
      const procId = uid("hp");
      let count = 0;
      setDb((prev) => {
        let next = prev;
        const taskIds = [];
        const base = new Date(f.startDate + "T00:00:00").getTime();
        /* Mốc linh hoạt cho thử việc: HR nhập số ngày + ngày giữa kỳ (mặc định: 60 ngày, giữa kỳ = nửa chặng) */
        const probationDays = Number(f.probationDays) || 60;
        const finalBase = f.finalReviewDate ? new Date(f.finalReviewDate + "T00:00:00").getTime() : base + probationDays * DAY;
        const midBase = f.midReviewDate ? new Date(f.midReviewDate + "T00:00:00").getTime() : base + Math.floor(probationDays / 2) * DAY;
        const anchors = { start: base, mid: midBase, final: finalBase };
        const leaderId = deptById(prev, f.deptId)?.leaderId || deptById(prev, f.deptId)?.defaultReceiverId;
        tpl.items.forEach((it) => {
          const [title, offset, ownerRole, approverRole, ack] = it;
          const ownerId = hrResolveRole(prev, ownerRole, f);
          const approverId = approverRole ? hrResolveRole(prev, approverRole, f) : null;
          const id = uid("t");
          taskIds.push(id);
          const dl = iso(hrAnchorTime(offset, anchors));
          const nt = {
            id, code: nextTaskCode(next), name: `${title} — ${f.personName}`,
            desc: `Thuộc quy trình ${tpl.label} của ${f.personName} (${deptById(prev, f.deptId)?.name}). Ngày bắt đầu quy trình: ${fmtDFull(f.startDate)}.`,
            deliverable: title, acceptance: "", creatorId: meId, assignerId: meId, ownerId,
            collaboratorIds: [], approverId: approverId === ownerId ? null : approverId,
            deptId: "hr", coDeptIds: f.deptId !== "hr" ? [f.deptId] : [], projectId: null, type: "cross",
            priority: "normal", brandId: null, start: iso(Math.min(base, Date.now())), deadline: dl,
            status: "todo", progress: 0, effort: "S", checklist: [], reportLink: "", driveLink: "",
            attachments: [], tags: ["hr", f.type], comments: [],
            logs: [{ id: uid("l"), userId: meId, at: Date.now(), text: `tạo từ quy trình ${tpl.label}`, action: "create" }],
            pauseReason: "", overdueReason: "", revisionCount: 0, revisionNote: "", completedAt: null,
            confirmedById: null, approvedAt: null, recurrence: null, pinnedBy: [],
            createdAt: Date.now(), updatedAt: Date.now(), deadlineConfirmed: true, deadlineHistory: [],
            visibility: tpl.conf ? "private" : "department",
            isConfidential: tpl.conf, allowedViewerIds: tpl.conf && leaderId ? [leaderId] : [],
            confidentialReason: tpl.conf ? "Chứa dữ liệu cá nhân nhân sự" : "",
            category: tpl.cat, locked: false, requiresAck: !!ack, ackedAt: null,
            actual: { summary: "", links: [], note: "", submittedAt: null },
          };
          next = { ...next, tasks: [nt, ...next.tasks] };
          if (ownerId && ownerId !== meId) next = notify(next, ownerId, "Bạn có một công việc nhân sự cần xử lý.", { taskId: id }, "act");
          count++;
        });
        next = { ...next, hrProcesses: [{ id: procId, type: f.type, personName: f.personName, userId: f.userId || null, deptId: f.deptId, startDate: f.startDate, probationDays: f.type === "probation" ? probationDays : null, midReviewDate: f.type === "probation" ? iso(midBase) : null, finalReviewDate: f.type === "probation" ? iso(finalBase) : null, taskIds, status: "active", createdAt: Date.now(), closedAt: null, closeNote: "" }, ...(next.hrProcesses || [])] };
        return next;
      });
      return { ok: true, id: procId, count: tpl.items.length };
    },
    closeHrProcess: (id, { force, reason } = {}) => {
      const p = (db.hrProcesses || []).find((x) => x.id === id);
      if (!p) return { ok: false, msg: "Không tìm thấy quy trình" };
      const open = db.tasks.filter((t) => p.taskIds.includes(t.id) && !t.deleted && t.status !== "done");
      if (open.length > 0) {
        if (!force) return { ok: false, msg: `Còn ${open.length} task chưa hoàn thành — chưa đủ điều kiện đóng` };
        if (!["admin", "ceo"].includes(me.role)) return { ok: false, msg: "Chỉ Admin/CEO đóng cưỡng bức được" };
        if (!reason?.trim()) return { ok: false, msg: "Đóng cưỡng bức bắt buộc ghi lý do" };
      }
      setDb((prev) => ({ ...prev, hrProcesses: prev.hrProcesses.map((x) => x.id === id ? { ...x, status: "closed", closedAt: Date.now(), closeNote: force ? `Đóng cưỡng bức bởi ${me.name}: ${reason}` : "Đóng đủ điều kiện" } : x) }));
      return { ok: true };
    },
    addBlocker: (projectId, f) => setDb((prev) => ({ ...prev, projects: prev.projects.map((p) => p.id === projectId ? { ...p, issues: [...p.issues, { id: uid("i"), title: f.title, desc: f.desc || "", severity: f.severity, ownerId: f.ownerId, deptId: f.deptId || null, dueDate: f.dueDate, nextAction: f.nextAction || "", status: "OPEN", relatedTaskId: f.relatedTaskId || null, escalation: 0, createdAt: Date.now(), resolvedAt: null, resolutionNote: "" }] } : p) })),
    updateBlocker: (projectId, bid, patch) => setDb((prev) => ({ ...prev, projects: prev.projects.map((p) => p.id === projectId ? { ...p, issues: p.issues.map((i) => i.id === bid ? { ...i, ...patch } : i) } : p) })),
    resolveBlocker: (projectId, bid, note) => {
      if (!note?.trim()) return { ok: false, msg: "Không đóng blocker khi chưa có ghi chú cách xử lý" };
      setDb((prev) => ({ ...prev, projects: prev.projects.map((p) => p.id === projectId ? { ...p, issues: p.issues.map((i) => i.id === bid ? { ...i, status: "RESOLVED", resolvedAt: Date.now(), resolutionNote: note.trim() } : i) } : p) }));
      return { ok: true };
    },
    recurringToggle: (id, paused) => setDb((prev) => ({ ...prev, recurrings: prev.recurrings.map((r) => r.id === id ? { ...r, paused } : r) })),
    recurringEnd: (id) => setDb((prev) => ({ ...prev, recurrings: prev.recurrings.map((r) => r.id === id ? { ...r, endDate: todayISO() } : r) })),
    runSchedulerNow: (dateISO) => setDb((prev) => runAlerts(runScheduler(prev, dateISO || todayISO()))),
    adminUpdateDept: (id, patch) => setDb((prev) => ({ ...prev, depts: prev.depts.map((d) => d.id === id ? { ...d, ...patch } : d) })),
  };

  const ctx = { db, setDb, me, act, toast, nav, openTask: setTaskId, openRequest: setReqId };

  useEffect(() => { if (me) setDb((prev) => runAlerts(runScheduler(prev))); }, [meId]); // eslint-disable-line

  if (!me) return <LoginScreen onLogin={(id) => { setMeId(id); setPage({ name: "dashboard", params: {} }); }} />;

  return (
    <Ctx.Provider value={ctx}>
      <div className="flex min-h-screen bg-zinc-50 text-zinc-900" style={{ fontFamily: "'Be Vietnam Pro', -apple-system, 'Segoe UI', sans-serif" }}>
        <FontLoad />
        <Sidebar page={page} nav={nav} collapsed={collapsed} setCollapsed={setCollapsed} />
        {mobileNav && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileNav(false)}>
            <div className="absolute inset-0 bg-zinc-900/30" />
            <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <MobileSidebar page={page} nav={(n, p2) => { nav(n, p2); setMobileNav(false); }} />
            </div>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMobileNav={() => setMobileNav(true)} onCreate={() => setCreating(true)} onLogout={() => { setMeId(null); setTaskId(null); setReqId(null); }} />
          <main className="flex-1 min-w-0 px-3 sm:px-5 py-4 sm:py-5 max-w-[1200px] w-full mx-auto">
            <ErrorBoundary key={page.name + (page.params?.id || "")}>
            {page.name === "dashboard" && <Dashboard />}
            {page.name === "myTasks" && <MyTasksPage />}
            {page.name === "hr" && <HRPage />}
            {page.name === "departments" && <DepartmentsPage />}
            {page.name === "deptDetail" && <DeptDetail id={page.params.id} />}
            {page.name === "projects" && <ProjectsPage />}
            {page.name === "projectDetail" && <ProjectDetail id={page.params.id} />}
            {page.name === "requests" && <RequestsPage />}
            {page.name === "approvals" && <ApprovalsPage />}
            {page.name === "calendar" && <CalendarPage />}
            {page.name === "documents" && <DocumentsPage />}
            {page.name === "admin" && <AdminPage />}
            </ErrorBoundary>
          </main>
        </div>
      </div>
      {taskId && <TaskDrawer taskId={taskId} onClose={() => setTaskId(null)} />}
      {reqId && <RequestDrawer reqId={reqId} onClose={() => setReqId(null)} />}
      {creating && <TaskForm onClose={(id) => { setCreating(false); if (id) setTaskId(id); }} />}
      <Toasts toasts={toasts} />
    </Ctx.Provider>
  );
}

/* Export nội bộ phục vụ unit test (không dùng trong UI) */
export const __internals = { buildSeed, perms, runScheduler, runAlerts, occursToday, canManage, canCreateTaskFor, canApplyTaskPatch, assignableUsers, canViewProject, canViewRequest, canViewDoc, deptReceiverId, isReceiverFor, userById, deptById, getEligibleApprovers, isSenderAuthorized, APPROVER_RULES, TASK_FIELD_PERM, TASK_FIELD_FORBIDDEN };
/* ============================================================
   HR WORKSPACE — quy trình nhân sự dựa trên task
   Phạm vi: onboarding, thử việc, đào tạo, hồ sơ, offboarding,
   yêu cầu nội bộ, xác nhận chính sách. KHÔNG payroll/chấm công.
   ============================================================ */

/* Template: [tên task, offset ngày so với ngày bắt đầu, vai trò phụ trách, vai trò duyệt, category, mật?, requiresAck?]
   Vai trò: hr = HR leader · leader = leader phòng của nhân sự · staff = chính nhân sự (nếu có tài khoản) · admin · ceo */
const HR_TEMPLATES = {
  onboarding: {
    label: "Onboarding", cat: "HR_ONBOARDING", conf: false,
    items: [
      ["Xác nhận ngày bắt đầu với nhân sự", -3, "hr", null],
      ["Chuẩn bị chỗ ngồi & thiết bị làm việc", -2, "admin", null],
      ["Tạo email công ty & tài khoản phần mềm", -1, "admin", "hr"],
      ["Gửi nội quy + sổ tay nhân sự", 0, "hr", null, true],
      ["Bàn giao JD và mục tiêu 30 ngày", 0, "leader", "hr"],
      ["Leader lập kế hoạch đào tạo tuần đầu", 1, "leader", null],
      ["Nhân sự xác nhận đã đọc nội quy & tài liệu", 2, "staff", null, true],
      ["Check-in sau 3 ngày", 3, "leader", null],
      ["Check-in sau 7 ngày", 7, "leader", null],
      ["Đánh giá cảm nhận tháng đầu", 30, "hr", "leader"],
    ],
  },
  probation: {
    label: "Thử việc", cat: "HR_PROBATION", conf: true, flexible: true,
    /* offset là MỐC linh hoạt: {a:'start'|'mid'|'final', o:lệch ngày} — HR nhập
       số ngày thử việc + ngày đánh giá giữa kỳ, deadline tự tính theo từng nhân sự
       (intern 30 ngày, chính thức 60 ngày, part-time… đều dùng chung template). */
    items: [
      ["Xác nhận mục tiêu thử việc với nhân sự", { a: "start", o: 0 }, "leader", "hr"],
      ["Bàn giao tiêu chí đánh giá cho nhân sự", { a: "start", o: 1 }, "leader", null],
      ["Đánh giá giữa kỳ thử việc", { a: "mid", o: 0 }, "leader", "hr"],
      ["Nhân sự tự đánh giá cuối kỳ", { a: "final", o: -5 }, "staff", null],
      ["Leader đánh giá cuối kỳ", { a: "final", o: -2 }, "leader", "hr"],
      ["HR tổng hợp hồ sơ đánh giá", { a: "final", o: 0 }, "hr", null],
      ["Duyệt kết quả thử việc", { a: "final", o: 1 }, "ceo", null],
      ["Thông báo kết quả cho nhân sự", { a: "final", o: 2 }, "hr", null],
    ],
  },
  training: {
    label: "Đào tạo", cat: "HR_TRAINING", conf: false,
    items: [
      ["Xác định nhu cầu & mục tiêu đào tạo", 0, "leader", null],
      ["Chọn người đào tạo", 1, "leader", null],
      ["Chuẩn bị tài liệu đào tạo", 3, "leader", "hr"],
      ["Lên lịch & đặt phòng", 3, "hr", null],
      ["Xác nhận người tham gia", 4, "hr", null],
      ["Buổi đào tạo", 7, "leader", null],
      ["Kiểm tra kết quả sau đào tạo", 10, "leader", null],
      ["Leader xác nhận khả năng áp dụng vào công việc", 14, "leader", "hr"],
    ],
  },
  offboarding: {
    label: "Offboarding", cat: "HR_OFFBOARDING", conf: true,
    items: [
      ["Xác nhận ngày nghỉ chính thức", 0, "hr", null],
      ["Lập danh sách công việc & tài liệu bàn giao", 1, "leader", null],
      ["Chọn người nhận bàn giao", 1, "leader", null],
      ["Bàn giao task đang mở", 3, "staff", "leader"],
      ["Bàn giao file & tài liệu", 3, "staff", "leader"],
      ["Thu hồi tài khoản & email", 5, "admin", "hr"],
      ["Thu hồi tài sản, thiết bị", 5, "admin", null],
      ["Rà soát quyền truy cập còn sót", 6, "admin", "hr"],
      ["Leader xác nhận bàn giao hoàn tất", 6, "leader", null],
      ["HR đóng quy trình & lưu hồ sơ", 7, "hr", null],
    ],
  },
};

/* Nhãn mốc của item template: số = offset ngày (D±n); object = mốc linh hoạt (BĐ/GK/CK ± n) */
const hrOffsetLabel = (spec) => typeof spec === "number"
  ? `D${spec >= 0 ? "+" + spec : spec}`
  : `${({ start: "BĐ", mid: "GK", final: "CK" })[spec.a] || spec.a}${spec.o ? (spec.o > 0 ? "+" + spec.o : spec.o) : ""}`;
/* Thời điểm (ms) của một item dựa trên các mốc thật (start/mid/final) của quy trình */
const hrAnchorTime = (spec, anchors) => typeof spec === "number"
  ? anchors.start + spec * DAY
  : (anchors[spec.a] ?? anchors.start) + (spec.o || 0) * DAY;

const hrResolveRole = (db, role, p) => {
  if (role === "hr") return deptById(db, "hr")?.leaderId || "vy";
  if (role === "leader") return deptById(db, p.deptId)?.leaderId || deptById(db, p.deptId)?.defaultReceiverId || null;
  if (role === "staff") return p.userId || deptById(db, "hr")?.leaderId;
  if (role === "admin") return db.users.find((u) => u.role === "admin")?.id;
  if (role === "ceo") return db.users.find((u) => u.role === "ceo")?.id;
  return null;
};

function HRPage() {
  const { db, me, act, toast, openTask, openRequest } = useApp();
  const [tab, setTab] = useState("overview");
  const [creating, setCreating] = useState(false);
  const [closing, setClosing] = useState(null);
  const isHr = me.deptId === "hr" || ["admin", "ceo"].includes(me.role);
  if (!isHr) return <EmptyState icon={Lock} title="Khu vực dành cho HR" hint="Task nhân sự của bạn (nếu có) nằm trong Công việc của tôi." />;

  const procs = db.hrProcesses || [];
  const taskOf = (p) => db.tasks.filter((t) => p.taskIds.includes(t.id) && !t.deleted);
  const visTasks = db.tasks.filter((t) => !t.deleted && perms.view(db, me, t));
  const hrTasks = visTasks.filter((t) => (t.category || "").startsWith("HR_"));
  const byCat = (c) => hrTasks.filter((t) => t.category === c);
  const overdueHr = hrTasks.filter((t) => isOverdue(t));
  const internalReqs = db.requests.filter((r) => r.toDeptId === "hr" && !["confirmed", "rejected", "cancelled"].includes(r.status));
  const evalDue = byCat("HR_PROBATION").filter((t) => /đánh giá/i.test(t.name) && t.status !== "done" && t.deadline && daysLeft(t.deadline) <= 7);

  const ProcCard = ({ p }) => {
    const ts = taskOf(p);
    const done = ts.filter((t) => t.status === "done").length;
    const openTs = ts.filter((t) => t.status !== "done");
    const tpl = HR_TEMPLATES[p.type];
    return (
      <div className="rounded-xl border border-zinc-100 bg-white p-3.5">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="text-[13px] font-semibold text-zinc-800">{p.personName} <span className="font-normal text-zinc-400">· {deptById(db, p.deptId)?.name}</span></p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${p.status === "closed" ? "bg-zinc-100 text-zinc-500" : "bg-emerald-50 text-emerald-700"}`}>{p.status === "closed" ? "Đã đóng" : "Đang chạy"}</span>
        </div>
        <p className="text-[11px] text-zinc-400 mb-1.5">{tpl.label} · bắt đầu {fmtDFull(p.startDate)} · {done}/{ts.length} task</p>
        <ProgressBar v={ts.length ? Math.round((done / ts.length) * 100) : 0} cls="bg-emerald-500" />
        <div className="mt-2 space-y-0.5 max-h-40 overflow-y-auto">
          {ts.slice(0, 20).map((t) => (
            <button key={t.id} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-zinc-50" onClick={() => openTask(t.id)}>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.status === "done" ? "bg-emerald-500" : isOverdue(t) ? "bg-red-500" : "bg-zinc-300"}`} />
              <span className={`flex-1 truncate text-[12px] ${t.status === "done" ? "text-zinc-400 line-through" : "text-zinc-700"}`}>{t.name}</span>
              <span className="text-[10px] text-zinc-400">{userById(db, t.ownerId)?.name}</span>
            </button>
          ))}
        </div>
        {p.status !== "closed" && (
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-zinc-400">{openTs.length > 0 ? `${openTs.length} task chưa xong` : "Đủ điều kiện đóng"}</p>
            <button className={btnGhost} onClick={() => setClosing(p)}>Đóng quy trình</button>
          </div>
        )}
      </div>
    );
  };

  const tabs = [["overview", "Tổng quan"], ["onboarding", "Onboarding"], ["probation", "Thử việc"], ["training", "Đào tạo"], ["docs", "Hồ sơ"], ["offboarding", "Offboarding"], ["requests", `Yêu cầu nội bộ · ${internalReqs.length}`]];
  const listFor = (type) => procs.filter((p) => p.type === type);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-lg font-semibold text-zinc-900">Nhân sự</h1>
        <button className={btnPri} onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Tạo quy trình</button>
      </div>
      <div className="mb-4 flex gap-1 border-b border-zinc-100 overflow-x-auto">
        {tabs.map(([k, lb]) => <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap px-3 py-2 text-[13px] font-medium border-b-2 -mb-px ${tab === k ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400"}`}>{lb}</button>)}
      </div>

      {tab === "overview" && (
        <div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            {[["Đang onboarding", listFor("onboarding").filter((p) => p.status !== "closed").length, "onboarding"],
              ["Đang thử việc", listFor("probation").filter((p) => p.status !== "closed").length, "probation"],
              ["Task HR quá hạn", overdueHr.length, null],
              ["Đánh giá đến hạn 7 ngày", evalDue.length, "probation"]].map(([lb, n, to]) => (
              <button key={lb} className="rounded-xl border border-zinc-100 bg-white p-3.5 text-left hover:shadow-sm" onClick={() => to && setTab(to)}>
                <p className={`text-2xl font-bold ${lb.includes("quá hạn") && n > 0 ? "text-red-600" : "text-zinc-900"}`}>{n}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{lb}</p>
              </button>
            ))}
          </div>
          {overdueHr.length > 0 && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50/50 p-3">
              <p className="mb-1.5 text-xs font-semibold text-red-700">Task nhân sự quá hạn — xử lý ngay</p>
              {overdueHr.map((t) => <button key={t.id} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-white" onClick={() => openTask(t.id)}><span className="flex-1 truncate text-[12px] text-zinc-700">{t.name}</span><span className="text-[11px] text-red-600">{deadlineMeta(t).label}</span><span className="text-[10px] text-zinc-400">{userById(db, t.ownerId)?.name}</span></button>)}
            </div>
          )}
          <div className="rounded-xl border border-zinc-100 bg-white p-3.5">
            <p className="mb-1.5 text-xs font-semibold text-zinc-600">Task HR bảo mật đang mở</p>
            {hrTasks.filter((t) => t.isConfidential && t.status !== "done").map((t) => (
              <button key={t.id} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-zinc-50" onClick={() => openTask(t.id)}>
                <Lock className="h-3 w-3 text-zinc-400 shrink-0" /><span className="flex-1 truncate text-[12px] text-zinc-700">{t.name}</span><StatusPill s={t.status} />
              </button>
            ))}
            {hrTasks.filter((t) => t.isConfidential && t.status !== "done").length === 0 && <p className="text-xs text-zinc-300">Không có</p>}
            <p className="mt-2 text-[10px] text-zinc-400">Chỉ hiển thị trong khu vực HR theo quyền — không xuất hiện ở tìm kiếm, thông báo hay dashboard chung.</p>
          </div>
        </div>
      )}

      {["onboarding", "probation", "training", "offboarding"].includes(tab) && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {listFor(tab).length === 0 && <EmptyState icon={Users} title={`Chưa có quy trình ${HR_TEMPLATES[tab].label}`} hint="Bấm Tạo quy trình — task sẽ tự sinh theo template với deadline offset." />}
          {listFor(tab).map((p) => <ProcCard key={p.id} p={p} />)}
        </div>
      )}

      {tab === "docs" && (
        <div className="rounded-xl border border-zinc-100 bg-white divide-y divide-zinc-50">
          {byCat("HR_DOCUMENT").length === 0 && <p className="p-4 text-xs text-zinc-300">Không có hồ sơ cần bổ sung</p>}
          {byCat("HR_DOCUMENT").map((t) => (
            <button key={t.id} className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-zinc-50" onClick={() => openTask(t.id)}>
              <span className="flex-1 text-[13px] text-zinc-700">{t.name}</span><StatusPill s={t.status} /><DeadlineBadge t={t} />
            </button>
          ))}
        </div>
      )}

      {tab === "requests" && (
        <div className="rounded-xl border border-zinc-100 bg-white divide-y divide-zinc-50">
          {internalReqs.length === 0 && <p className="p-4 text-xs text-zinc-300">Không có yêu cầu nội bộ đang mở</p>}
          {internalReqs.map((r) => (
            <button key={r.id} className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-zinc-50" onClick={() => openRequest(r.id)}>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">{r.reqType || "Khác"}</span>
              <span className="flex-1 truncate text-[13px] text-zinc-700">{r.title}</span>
              <span className="text-[11px] text-zinc-400">{userById(db, r.fromUserId)?.name}</span>
              <ReqPill s={r.status} />
            </button>
          ))}
        </div>
      )}

      {creating && <HrProcessForm onClose={() => setCreating(false)} />}
      {closing && (
        <Modal title="Đóng quy trình" onClose={() => setClosing(null)}>
          {(() => {
            const openTs = taskOf(closing).filter((t) => t.status !== "done");
            const canForce = ["admin", "ceo"].includes(me.role);
            return openTs.length === 0 ? (
              <>
                <p className="text-[13px] text-zinc-600">Tất cả task đã hoàn thành. Đóng quy trình <b>{closing.personName}</b>?</p>
                <div className="mt-3 flex justify-end gap-2"><button className={btnSec} onClick={() => setClosing(null)}>Hủy</button><button className={btnPri} onClick={() => { act.closeHrProcess(closing.id, {}); setClosing(null); toast("Đã đóng quy trình"); }}>Đóng quy trình</button></div>
              </>
            ) : (
              <>
                <p className="text-[13px] text-zinc-600 mb-2">Còn <b>{openTs.length} task chưa hoàn thành</b> — quy trình chỉ đóng khi đủ điều kiện:</p>
                <div className="mb-2 max-h-40 overflow-y-auto rounded-lg bg-zinc-50 p-2">{openTs.map((t) => <p key={t.id} className="text-[12px] text-zinc-600 py-0.5">• {t.name} ({userById(db, t.ownerId)?.name})</p>)}</div>
                {canForce ? (
                  <>
                    <Field label="Admin đóng cưỡng bức — lý do (ghi log)" req><textarea className={inputCls} rows={2} value={closing.reason || ""} onChange={(e) => setClosing({ ...closing, reason: e.target.value })} /></Field>
                    <div className="flex justify-end gap-2"><button className={btnSec} onClick={() => setClosing(null)}>Hủy</button><button className={btnPri} disabled={!closing.reason?.trim()} onClick={() => { const r = act.closeHrProcess(closing.id, { force: true, reason: closing.reason }); toast(r.ok ? "Đã đóng (cưỡng bức)" : r.msg, r.ok ? "ok" : "err"); setClosing(null); }}>Đóng cưỡng bức</button></div>
                  </>
                ) : <div className="flex justify-end"><button className={btnSec} onClick={() => setClosing(null)}>Đóng</button></div>}
              </>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}

function HrProcessForm({ onClose }) {
  const { db, act, toast } = useApp();
  const [f, setF] = useState({ type: "onboarding", personName: "", userId: "", deptId: "content", startDate: todayISO(), probationDays: 60, midReviewDate: "" });
  const tpl = HR_TEMPLATES[f.type];
  /* Với thử việc: tính mốc thật để preview đúng ngày cho từng nhân sự */
  const base = f.startDate ? new Date(f.startDate + "T00:00:00").getTime() : Date.now();
  const days = Number(f.probationDays) || 60;
  const anchors = {
    start: base,
    final: f.startDate ? base + days * DAY : base,
    mid: f.midReviewDate ? new Date(f.midReviewDate + "T00:00:00").getTime() : base + Math.floor(days / 2) * DAY,
  };
  return (
    <Modal title="Tạo quy trình nhân sự" onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="Loại quy trình" req><select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{Object.entries(HR_TEMPLATES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
        <Field label="Phòng ban" req><select className={inputCls} value={f.deptId} onChange={(e) => setF({ ...f, deptId: e.target.value })}>{db.depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Tên nhân sự" req><input className={inputCls} value={f.personName} onChange={(e) => setF({ ...f, personName: e.target.value })} placeholder="VD: Nguyễn Văn A" /></Field>
        <Field label="Tài khoản (nếu đã có)"><UserSelect value={f.userId || null} onChange={(v) => setF({ ...f, userId: v || "" })} placeholder="— Chưa có tài khoản —" /></Field>
        <Field label="Ngày bắt đầu" req><input type="date" className={inputCls} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
        {f.type === "probation" && <Field label="Số ngày thử việc" req><select className={inputCls} value={f.probationDays} onChange={(e) => setF({ ...f, probationDays: e.target.value })}>{[30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} ngày</option>)}</select></Field>}
        {f.type === "probation" && <Field label="Ngày đánh giá giữa kỳ"><input type="date" className={inputCls} value={f.midReviewDate || ""} onChange={(e) => setF({ ...f, midReviewDate: e.target.value })} /><p className="mt-1 text-[10px] text-zinc-400">Để trống = tự tính giữa chặng. Kết thúc: {fmtDFull(iso(anchors.final))}</p></Field>}
      </div>
      <div className="rounded-lg bg-zinc-50 p-3 mb-3">
        <p className="mb-1 text-[11px] font-medium uppercase text-zinc-400">Sẽ tạo {tpl.items.length} task theo lịch{tpl.conf ? " · toàn bộ ở chế độ BẢO MẬT" : ""}</p>
        <div className="max-h-36 overflow-y-auto">{tpl.items.map((it, i) => <p key={i} className="text-[12px] text-zinc-500 py-0.5">{f.startDate ? fmtDFull(iso(hrAnchorTime(it[1], anchors))) : hrOffsetLabel(it[1])} · {it[0]}</p>)}</div>
      </div>
      <div className="flex justify-end gap-2"><button className={btnSec} onClick={onClose}>Hủy</button><button className={btnPri} disabled={!f.personName.trim() || !f.deptId || !f.startDate} onClick={() => { const r = act.createHrProcess(f); toast(r.ok ? `Đã tạo quy trình · ${r.count} task` : r.msg, r.ok ? "ok" : "err"); onClose(); }}>Tạo quy trình</button></div>
    </Modal>
  );
}
