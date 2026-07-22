import { describe, it, expect } from "vitest";
import { __internals } from "../App.jsx";

const { canManageProject, auditEntry, pushAudit, PROJECT_ROLES } = __internals;

const proj = () => ({
  id: "p", ownerId: "owner", managerId: "pm", brandId: "nevor",
  members: [
    { userId: "lead", projectRole: "DEPARTMENT_LEAD", perms: { ...PROJECT_ROLES.DEPARTMENT_LEAD.perms } },
    { userId: "mem", projectRole: "MEMBER", perms: { ...PROJECT_ROLES.MEMBER.perms } },
  ],
});
const db = { users: [], tasks: [], projects: [proj()] };

describe("canManageProject — enforce ở tầng action", () => {
  it("admin/ceo luôn quản lý được", () => {
    expect(canManageProject(db, { id: "x", role: "admin" }, proj())).toBe(true);
    expect(canManageProject(db, { id: "y", role: "ceo" }, proj())).toBe(true);
  });
  it("owner & PM quản lý được", () => {
    expect(canManageProject(db, { id: "owner", role: "leader" }, proj())).toBe(true);
    expect(canManageProject(db, { id: "pm", role: "employee" }, proj())).toBe(true);
  });
  it("thành viên có quyền quản lý task (Department Lead) → được", () => {
    expect(canManageProject(db, { id: "lead", role: "employee" }, proj())).toBe(true);
  });
  it("thành viên thường & người ngoài → KHÔNG", () => {
    expect(canManageProject(db, { id: "mem", role: "employee" }, proj())).toBe(false);
    expect(canManageProject(db, { id: "stranger", role: "employee" }, proj())).toBe(false);
  });
});

describe("audit log (append-only)", () => {
  it("auditEntry chuẩn hoá dữ liệu + ép old/new về string", () => {
    const e = auditEntry("u1", { action: "Đổi trạng thái milestone", entity: "milestone", entityId: "m1", oldValue: 1, newValue: 2, projectId: "p", brandId: "nevor" });
    expect(e.actorId).toBe("u1");
    expect(e.action).toBe("Đổi trạng thái milestone");
    expect(e.entity).toBe("milestone");
    expect(e.oldValue).toBe("1");
    expect(e.newValue).toBe("2");
    expect(typeof e.at).toBe("number");
    expect(e.id).toBeTruthy();
  });
  it("null old/new giữ null (không ép 'null')", () => {
    const e = auditEntry("u1", { action: "Thêm milestone", entity: "milestone" });
    expect(e.oldValue).toBe(null);
    expect(e.newValue).toBe(null);
  });
  it("pushAudit prepend vào db.audit (mới nhất ở đầu)", () => {
    const d0 = { audit: [{ id: "old" }] };
    const d1 = pushAudit(d0, "u1", { action: "X", entity: "project" });
    expect(d1.audit).toHaveLength(2);
    expect(d1.audit[0].action).toBe("X");
    expect(d1.audit[1].id).toBe("old");
    expect(d0.audit).toHaveLength(1); // không mutate bản cũ
  });
});
