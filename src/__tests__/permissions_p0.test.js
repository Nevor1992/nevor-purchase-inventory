import { describe, it, expect, beforeEach } from "vitest";
import { __internals } from "../App.jsx";

const { buildSeed, perms, canViewProject, canManageProject, canCreateTaskFor, memberCan, linkedAgreedRequest, taskActualReady, isCeo, isMgr, isProjectMemberOf } = __internals;

let db;
beforeEach(() => { db = buildSeed(); });
const U = (id) => db.users.find((u) => u.id === id);
const prj1 = () => db.projects.find((p) => p.id === "prj1");

/* ---------- P0.1 Cross-department deadline khóa từ Task ---------- */
describe("P0.1 deadline task liên kết Request đã chốt", () => {
  const mkDb = (reqStatus) => ({
    requests: [{ id: "r", code: "REQ-9", taskId: "t1", fromDeptId: "content", agreedDeadline: "2026-05-01", status: reqStatus }],
    tasks: [], projects: [], users: [],
  });
  const task = { id: "t1", projectId: null, locked: false, deleted: false, ownerId: "u1", deadlineConfirmed: false, deptId: "x" };
  const owner = { id: "u1", role: "employee", deptId: "x" };
  it("Request đang mở + đã agreedDeadline → CẤM đổi deadline từ task", () => {
    const d = mkDb("processing");
    expect(linkedAgreedRequest(d, task)).toBeTruthy();
    expect(perms.changeDeadline(d, owner, task)).toBe(false);
  });
  it("Request đã đóng (confirmed) → được đổi lại theo quyền thường", () => {
    const d = mkDb("confirmed");
    expect(linkedAgreedRequest(d, task)).toBe(null);
    expect(perms.changeDeadline(d, owner, task)).toBe(true);
  });
});

/* ---------- P0.2 Project visibility member-based ---------- */
describe("P0.2 xem dự án theo thành viên (không theo deptId)", () => {
  it("thành viên dự án (Mai) xem được", () => {
    expect(canViewProject(db, U("mai"), prj1())).toBe(true);
  });
  it("CEO/Admin xem được", () => {
    expect(canViewProject(db, U("ceo"), prj1())).toBe(true);
    expect(canViewProject(db, U("admin"), prj1())).toBe(true);
  });
  it("nhân viên CÙNG PHÒNG dự án nhưng KHÔNG phải thành viên → KHÔNG xem", () => {
    const phuc = U("phuc"); // ecom — ecom nằm trong deptIds của prj1
    expect(prj1().deptIds).toContain(phuc.deptId);          // đúng là cùng phòng dự án
    expect(!!__internals.projectMember(prj1(), "phuc")).toBe(false); // nhưng không phải member
    expect(canViewProject(db, phuc, prj1())).toBe(false);   // → không xem (khác hành vi cũ)
  });
});

/* ---------- P0.3 Tạo Task dự án cần quyền vai trò dự án ---------- */
describe("P0.3 tạo task dự án enforce project role", () => {
  it("người ngoài dự án (Phúc) KHÔNG tạo được task trong dự án", () => {
    const r = canCreateTaskFor(db, U("phuc"), { projectId: "prj1", deptId: "ecom", ownerId: "phuc" });
    expect(r.ok).toBe(false);
  });
  it("thành viên MEMBER không có canCreateTask (Thảo) → bị chặn", () => {
    expect(memberCan(prj1(), "thao", "canCreateTask")).toBe(false);
    const r = canCreateTaskFor(db, U("thao"), { projectId: "prj1", deptId: "koc", ownerId: "thao" });
    expect(r.ok).toBe(false);
  });
  it("PM (Mai) tạo task dự án trong phạm vi → được", () => {
    const r = canCreateTaskFor(db, U("mai"), { projectId: "prj1", deptId: "content", ownerId: "mai" });
    expect(r.ok).toBe(true);
  });
});

/* ---------- P0.4 Project Manager quản lý được ---------- */
describe("P0.4 canManageProject cho PM (không hardcode owner/admin)", () => {
  it("PM (Mai) quản lý được dự án", () => {
    expect(canManageProject(db, U("mai"), prj1())).toBe(true);
  });
  it("thành viên chỉ-xem/không quyền (Thảo) KHÔNG quản lý", () => {
    expect(canManageProject(db, U("thao"), prj1())).toBe(false);
  });
});

/* ---------- P0.5 System Admin ≠ CEO ---------- */
describe("P0.5 tách quyền CEO khỏi System Admin", () => {
  it("isCeo chỉ đúng với CEO; admin KHÔNG phải CEO", () => {
    expect(isCeo(U("ceo"))).toBe(true);
    expect(isCeo(U("admin"))).toBe(false);
  });
  it("admin vẫn là manager hệ thống (isMgr) nhưng không phải CEO", () => {
    expect(isMgr(U("admin"))).toBe(true);
    expect(isCeo(U("admin"))).toBe(false);
  });
});

/* ---------- P1 helper dùng chung ---------- */
describe("taskActualReady (validation dùng chung)", () => {
  it("có tóm tắt + link → đủ", () => {
    expect(taskActualReady({ actual: { summary: "xong", links: ["http://x"] }, attachments: [] })).toBe(true);
  });
  it("chỉ tóm tắt, thiếu link/file → chưa đủ", () => {
    expect(taskActualReady({ actual: { summary: "xong", links: [] }, attachments: [] })).toBe(false);
  });
  it("chỉ link, thiếu tóm tắt → chưa đủ", () => {
    expect(taskActualReady({ actual: { summary: "", links: ["http://x"] }, attachments: [] })).toBe(false);
  });
});
