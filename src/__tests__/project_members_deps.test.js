import { describe, it, expect } from "vitest";
import { __internals } from "../App.jsx";

const { memberCan, projectMember, taskDepStatus, PROJECT_ROLES, PROJECT_TEMPLATES } = __internals;

const DAY = 86400000, pad = (n) => String(n).padStart(2, "0");
const isoDay = (n) => { const x = new Date(Date.now() + n * DAY); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };

const proj = () => ({
  id: "p", ownerId: "o", managerId: "pm",
  members: [
    { userId: "a", projectRole: "MEMBER", perms: { ...PROJECT_ROLES.MEMBER.perms } },
    { userId: "b", projectRole: "DEPARTMENT_LEAD", perms: { ...PROJECT_ROLES.DEPARTMENT_LEAD.perms } },
    { userId: "c", projectRole: "MEMBER", perms: { ...PROJECT_ROLES.MEMBER.perms, canManageTask: true } }, // ghi đè
    { userId: "gone", projectRole: "MEMBER", perms: {}, leftAt: Date.now() },
  ],
});

describe("projectMember / memberCan", () => {
  it("owner & PM luôn đủ quyền", () => {
    expect(memberCan(proj(), "o", "canManageTask")).toBe(true);
    expect(memberCan(proj(), "pm", "canApproveMilestone")).toBe(true);
  });
  it("MEMBER: xem được, không quản lý task", () => {
    expect(memberCan(proj(), "a", "canViewFiles")).toBe(true);
    expect(memberCan(proj(), "a", "canManageTask")).toBe(false);
  });
  it("DEPARTMENT_LEAD: quản lý task, không duyệt milestone", () => {
    expect(memberCan(proj(), "b", "canManageTask")).toBe(true);
    expect(memberCan(proj(), "b", "canApproveMilestone")).toBe(false);
  });
  it("perms ghi đè role", () => {
    expect(memberCan(proj(), "c", "canManageTask")).toBe(true);
  });
  it("người ngoài / đã rời dự án → không quyền", () => {
    expect(memberCan(proj(), "x", "canViewFiles")).toBe(false);
    expect(projectMember(proj(), "gone")).toBe(null);
    expect(memberCan(proj(), "gone", "canViewFiles")).toBe(false);
  });
});

describe("taskDepStatus", () => {
  const db = { tasks: [
    { id: "d1", status: "done" },
    { id: "d2", status: "doing", deadline: isoDay(-1) }, // trễ
    { id: "d3", status: "todo", deadline: isoDay(5) },
  ] };
  it("không phụ thuộc → không chặn", () => {
    expect(taskDepStatus(db, { dependsOnTaskIds: [] }).blocked).toBe(false);
  });
  it("việc trước đã xong → không chặn", () => {
    expect(taskDepStatus(db, { dependsOnTaskIds: ["d1"] }).blocked).toBe(false);
  });
  it("việc trước chưa xong → chặn", () => {
    const r = taskDepStatus(db, { dependsOnTaskIds: ["d1", "d3"] });
    expect(r.blocked).toBe(true);
    expect(r.atRisk).toBe(false);
    expect(r.open).toHaveLength(1);
  });
  it("việc trước đang trễ → có rủi ro (atRisk)", () => {
    const r = taskDepStatus(db, { dependsOnTaskIds: ["d2"] });
    expect(r.blocked).toBe(true);
    expect(r.atRisk).toBe(true);
    expect(r.late).toHaveLength(1);
  });
});

describe("PROJECT_TEMPLATES hợp lệ", () => {
  it("mỗi mẫu có milestone + task", () => {
    expect(PROJECT_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    for (const t of PROJECT_TEMPLATES) {
      expect(t.milestones.length).toBeGreaterThan(0);
      expect(t.tasks.length).toBeGreaterThan(0);
    }
  });
  it("dependency chỉ trỏ tới task trước đó (không vòng lặp)", () => {
    for (const t of PROJECT_TEMPLATES) {
      t.tasks.forEach((task, i) => {
        (task.deps || []).forEach((di) => {
          expect(di).toBeGreaterThanOrEqual(0);
          expect(di).toBeLessThan(i); // chỉ phụ thuộc việc đứng trước
        });
      });
    }
  });
});
