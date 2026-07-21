import { describe, it, expect } from "vitest";
import { __internals } from "../App.jsx";

const { weightedTaskProgress, milestoneProgress, computeProjectHealth, msOverdue, msDueSoon, projBrand } = __internals;

/* Dựng ngày YYYY-MM-DD theo giờ local — khớp hàm iso()/daysLeft() trong App */
const DAY = 86400000;
const pad = (n) => String(n).padStart(2, "0");
const isoDay = (n) => { const x = new Date(Date.now() + n * DAY); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };

describe("weightedTaskProgress — trọng số S=1/M=2/L=4", () => {
  it("cộng theo effort của task đã xong", () => {
    const tasks = [
      { effort: "S", status: "done" }, // 1
      { effort: "L", status: "done" }, // 4
      { effort: "M", status: "doing" }, // 2 (chưa xong)
    ];
    const r = weightedTaskProgress(tasks);
    expect(r.total).toBe(3);
    expect(r.done).toBe(2);
    expect(r.pct).toBe(Math.round((5 / 7) * 100)); // 71%
  });
  it("bỏ qua task đã xóa; rỗng → 0%", () => {
    expect(weightedTaskProgress([]).pct).toBe(0);
    expect(weightedTaskProgress([{ effort: "M", status: "done", deleted: true }]).total).toBe(0);
  });
});

describe("milestoneProgress — theo trọng số, bỏ CANCELLED", () => {
  it("tính hoàn thành theo weight", () => {
    const p = { milestones: [
      { status: "COMPLETED", weight: 1 },
      { status: "COMPLETED", weight: 4 },
      { status: "IN_PROGRESS", weight: 5 },
      { status: "CANCELLED", weight: 10 },
    ] };
    const r = milestoneProgress(p);
    expect(r.total).toBe(3); // loại milestone đã hủy
    expect(r.done).toBe(2);
    expect(r.pct).toBe(50); // (1+4)/(1+4+5)
  });
  it("không có milestone → 0%", () => {
    expect(milestoneProgress({ milestones: [] }).pct).toBe(0);
  });
});

describe("msOverdue / msDueSoon", () => {
  it("quá hạn chỉ khi milestone còn mở và đã qua hạn", () => {
    expect(msOverdue({ status: "IN_PROGRESS", plannedDeadline: isoDay(-1) })).toBe(true);
    expect(msOverdue({ status: "COMPLETED", plannedDeadline: isoDay(-1) })).toBeFalsy();
    expect(msOverdue({ status: "CANCELLED", plannedDeadline: isoDay(-1) })).toBeFalsy();
  });
  it("sắp hạn trong 0..3 ngày", () => {
    expect(msDueSoon({ status: "IN_PROGRESS", plannedDeadline: isoDay(2) })).toBe(true);
    expect(msDueSoon({ status: "IN_PROGRESS", plannedDeadline: isoDay(30) })).toBe(false);
  });
});

describe("computeProjectHealth — tự động, có lý do", () => {
  const emptyDb = { tasks: [], requests: [] };
  const base = (over = {}) => ({ id: "p", status: "active", deadline: isoDay(20), issues: [], milestones: [], ...over });

  it("ON_TRACK khi không có vấn đề", () => {
    const h = computeProjectHealth(emptyDb, base());
    expect(h.level).toBe("ON_TRACK");
    expect(h.reasons).toHaveLength(0);
  });
  it("OFF_TRACK khi có blocker CRITICAL", () => {
    const h = computeProjectHealth(emptyDb, base({ issues: [{ status: "OPEN", severity: "critical" }] }));
    expect(h.level).toBe("OFF_TRACK");
    expect(h.reasons.join(" ")).toMatch(/CRITICAL/);
  });
  it("OFF_TRACK khi dự án quá deadline tổng", () => {
    expect(computeProjectHealth(emptyDb, base({ deadline: isoDay(-1) })).level).toBe("OFF_TRACK");
  });
  it("OFF_TRACK khi có milestone quá hạn", () => {
    const p = base({ milestones: [{ status: "IN_PROGRESS", plannedDeadline: isoDay(-2) }] });
    expect(computeProjectHealth(emptyDb, p).level).toBe("OFF_TRACK");
  });
  it("AT_RISK khi chỉ có blocker mức cao", () => {
    const h = computeProjectHealth(emptyDb, base({ issues: [{ status: "OPEN", severity: "high" }] }));
    expect(h.level).toBe("AT_RISK");
    expect(h.reasons.length).toBeGreaterThan(0);
  });
  it("AT_RISK khi có yêu cầu liên phòng ban bị tắc", () => {
    const db = { tasks: [], requests: [{ id: "r", projectId: "p", status: "pending" }] };
    expect(computeProjectHealth(db, base()).level).toBe("AT_RISK");
  });
  it("AT_RISK khi forecast trễ hơn deadline kế hoạch", () => {
    const p = base({ forecastDeadline: isoDay(40) });
    expect(computeProjectHealth(emptyDb, p).level).toBe("AT_RISK");
  });
  it("dự án done/cancelled luôn ON_TRACK", () => {
    const p = base({ status: "done", deadline: isoDay(-10), issues: [{ status: "OPEN", severity: "critical" }] });
    expect(computeProjectHealth(emptyDb, p).level).toBe("ON_TRACK");
  });
});

describe("projBrand — null/thiếu = shared", () => {
  it("map đúng", () => {
    expect(projBrand({ brandId: "nevor" })).toBe("nevor");
    expect(projBrand({ brandId: null })).toBe("shared");
    expect(projBrand({})).toBe("shared");
  });
});
