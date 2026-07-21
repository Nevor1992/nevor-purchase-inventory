/* ============================================================================
   Xuất dữ liệu ra file cho phần mềm khác đọc.
   - CSV: RFC-4180 (escape dấu ", phẩy, xuống dòng) + BOM UTF-8 để Excel đọc
     đúng tiếng Việt. Mọi phần mềm bảng tính / BI đọc được.
   - JSON: cho tích hợp/lập trình.
   Chạy hoàn toàn ở trình duyệt — dữ liệu đã được RLS lọc sẵn khi nạp, nên chỉ
   xuất đúng phần người dùng có quyền xem.
   ============================================================================ */

const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/* rows: mảng object; columns: [{label, get(row)}] */
export function toCsv(rows, columns) {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => csvCell(c.get(r))).join(",")).join("\r\n");
  return "﻿" + header + "\r\n" + body; // BOM cho Excel
}

export function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export const stampName = (base, ext) => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${base}_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
};
