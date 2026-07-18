import { describe, it, expect, beforeEach } from "vitest";
import { __internals } from "../App.jsx";

const { buildSeed, perms, canManage, canViewRequest, isSenderAuthorized, getEligibleApprovers, APPROVER_RULES } = __internals;

let db;
beforeEach(() => { db = buildSeed(); });

// ── Helpers ──────────────────────────────────────────────────────────────────
const user = (id) => db.users.find((u) => u.id === id);
const task = (name) => db.tasks.find((t) => t.name.includes(name));
const req = (title) => db.requests.find((r) => r.title.includes(title));

// ── 1. perms.view ─────────────────────────────────────────────────────────────
describe("perms.view", () => {
  it("owner always sees their own task", () => {
    const mai = user("mai");
    const t = db.tasks.find((x) => x.ownerId === "mai");
    expect(perms.view(db, mai, t)).toBe(true);
  });

  it("unrelated employee cannot see personal task of another user", () => {
    const personalTask = db.tasks.find((t) => t.type === "personal");
    if (!personalTask) return; // seed might not have one for this user
    const strangerDept = db.depts.find((d) => d.id !== personalTask.deptId);
    const stranger = db.users.find((u) => u.deptId === strangerDept?.id && u.role === "employee");
    if (!stranger) return;
    expect(perms.view(db, stranger, personalTask)).toBe(false);
  });

  it("admin can see any non-deleted task", () => {
    const admin = user("admin");
    const t = db.tasks.find((x) => !x.deleted && !x.isConfidential);
    expect(perms.view(db, admin, t)).toBe(true);
  });

  it("deleted task is hidden from regular employees", () => {
    const deletedTask = { ...db.tasks[0], deleted: true };
    const emp = db.users.find((u) => u.role === "employee");
    expect(perms.view(db, emp, deletedTask)).toBe(false);
  });

  it("deleted task is visible to admin", () => {
    const admin = user("admin");
    const deletedTask = { ...db.tasks[0], deleted: true };
    expect(perms.view(db, admin, deletedTask)).toBe(true);
  });

  it("HR confidential task: visible to HR leader, admin, ceo — hidden from other leaders", () => {
    const hrTask = db.tasks.find((t) => t.isConfidential && t.deptId === "hr");
    if (!hrTask) return;
    const vy = user("vy");       // HR leader
    const admin = user("admin"); // confidentialAccess
    const ceo = user("ceo");     // confidentialAccess
    const linh = user("linh");   // Content leader — not involved
    expect(perms.view(db, vy, hrTask)).toBe(true);
    expect(perms.view(db, admin, hrTask)).toBe(true);
    expect(perms.view(db, ceo, hrTask)).toBe(true);
    if (!hrTask.collaboratorIds.includes("linh") && hrTask.ownerId !== "linh") {
      expect(perms.view(db, linh, hrTask)).toBe(false);
    }
  });

  it("deleting a confidential task does not widen visibility", () => {
    const linh = user("linh"); // Content dept leader
    const confidentialContentTask = {
      ...db.tasks[0], deptId: "content", isConfidential: true, deleted: true,
      ownerId: "mai", creatorId: "mai", assignerId: null, approverId: null,
      collaboratorIds: [], allowedViewerIds: [],
    };
    // linh manages content dept, but was never allowed to see this confidential task
    expect(perms.view(db, linh, confidentialContentTask)).toBe(false);
    // admin with confidentialAccess still sees it
    expect(perms.view(db, user("admin"), confidentialContentTask)).toBe(true);
  });
});

// ── 2. perms.canToggleChecklistItem ───────────────────────────────────────────
describe("perms.canToggleChecklistItem", () => {
  let t;
  let ownerUser;
  let collab;
  let stranger;
  let item;

  beforeEach(() => {
    t = db.tasks.find((x) => x.type === "dept" && x.checklist?.length > 0);
    if (!t) return;
    ownerUser = db.users.find((u) => u.id === t.ownerId);
    collab = db.users.find((u) => t.collaboratorIds.includes(u.id));
    stranger = db.users.find((u) => u.id !== t.ownerId && !t.collaboratorIds.includes(u.id) && u.role === "employee" && u.deptId !== t.deptId);
    item = t.checklist[0];
  });

  it("task owner can toggle any checklist item", () => {
    if (!t || !ownerUser || !item) return;
    expect(perms.canToggleChecklistItem(db, ownerUser, t, item)).toBe(true);
  });

  it("collaborator can only toggle item assigned to them", () => {
    if (!t || !collab || !item) return;
    const myItem = { ...item, ownerId: collab.id };
    const otherItem = { ...item, ownerId: t.ownerId };
    expect(perms.canToggleChecklistItem(db, collab, t, myItem)).toBe(true);
    expect(perms.canToggleChecklistItem(db, collab, t, otherItem)).toBe(false);
  });

  it("unrelated employee cannot toggle any checklist item", () => {
    if (!t || !stranger || !item) return;
    expect(perms.canToggleChecklistItem(db, stranger, t, item)).toBe(false);
  });

  it("locked task blocks all toggles", () => {
    if (!t || !ownerUser || !item) return;
    const locked = { ...t, locked: true };
    expect(perms.canToggleChecklistItem(db, ownerUser, locked, item)).toBe(false);
  });
});

// ── 3. perms.changeDeadline ───────────────────────────────────────────────────
describe("perms.changeDeadline", () => {
  it("employee cannot change confirmed deadline", () => {
    const emp = db.users.find((u) => u.role === "employee");
    const t = { ...db.tasks[0], deadlineConfirmed: true, ownerId: emp.id, deptId: emp.deptId };
    expect(perms.changeDeadline(db, emp, t)).toBe(false);
  });

  it("leader can change confirmed deadline", () => {
    const dept = db.depts[0];
    const leader = db.users.find((u) => u.id === dept.leaderId);
    if (!leader) return;
    const t = { ...db.tasks[0], deadlineConfirmed: true, deptId: dept.id };
    expect(perms.changeDeadline(db, leader, t)).toBe(true);
  });
});

// ── 4. canViewRequest ─────────────────────────────────────────────────────────
describe("canViewRequest", () => {
  it("sender always sees their own request", () => {
    const r = db.requests[0];
    if (!r) return;
    const sender = db.users.find((u) => u.id === r.fromUserId);
    if (!sender) return;
    expect(canViewRequest(db, sender, r)).toBe(true);
  });

  it("PRIVATE request: unrelated employee cannot see it", () => {
    const r = db.requests[0];
    if (!r) return;
    const privateReq = { ...r, visibility: "PRIVATE" };
    const stranger = db.users.find(
      (u) => u.id !== r.fromUserId && u.id !== r.receiverId && u.id !== r.handlerId
        && u.deptId !== r.fromDeptId && u.deptId !== r.toDeptId && u.role === "employee"
    );
    if (!stranger) return;
    expect(canViewRequest(db, stranger, privateReq)).toBe(false);
  });

  it("COMPANY visibility: any active user sees it", () => {
    const r = { ...db.requests[0], visibility: "COMPANY", deleted: false };
    const randomUser = db.users.find((u) => u.role === "employee");
    expect(canViewRequest(db, randomUser, r)).toBe(true);
  });

  it("admin always sees non-deleted requests", () => {
    const admin = user("admin");
    const r = { ...db.requests[0], deleted: false };
    expect(canViewRequest(db, admin, r)).toBe(true);
  });

  it("deleted request: only admin sees it", () => {
    const r = { ...db.requests[0], deleted: true };
    const sender = db.users.find((u) => u.id === r.fromUserId && u.role === "employee");
    const admin = user("admin");
    if (sender) expect(canViewRequest(db, sender, r)).toBe(false);
    expect(canViewRequest(db, admin, r)).toBe(true);
  });
});

// ── 5. isSenderAuthorized ─────────────────────────────────────────────────────
describe("isSenderAuthorized", () => {
  it("from_user can always authorize", () => {
    const r = db.requests[0];
    if (!r) return;
    const sender = db.users.find((u) => u.id === r.fromUserId);
    if (!sender) return;
    expect(isSenderAuthorized(db, sender, r)).toBe(true);
  });

  it("unrelated employee cannot authorize", () => {
    const r = db.requests[0];
    if (!r) return;
    const stranger = db.users.find(
      (u) => u.id !== r.fromUserId && u.deptId !== r.fromDeptId && u.role === "employee"
    );
    if (!stranger) return;
    expect(isSenderAuthorized(db, stranger, r)).toBe(false);
  });
});

// ── 6. getEligibleApprovers ───────────────────────────────────────────────────
describe("getEligibleApprovers", () => {
  it("result never includes the task owner", () => {
    const t = db.tasks.find((x) => x.ownerId);
    if (!t) return;
    const owner = db.users.find((u) => u.id === t.ownerId);
    if (!owner) return;
    const approvers = getEligibleApprovers(db, owner, t);
    expect(approvers.every((a) => a.id !== t.ownerId)).toBe(true);
  });

  it("employee gets only leader/project-owner as approver candidates", () => {
    const emp = db.users.find((u) => u.role === "employee");
    if (!emp) return;
    const dept = db.depts.find((d) => d.id === emp.deptId);
    if (!dept) return;
    const t = { ...db.tasks.find((x) => x.ownerId === emp.id && !x.projectId) ?? db.tasks[0], ownerId: emp.id, deptId: emp.deptId, projectId: null, category: "GENERAL" };
    const approvers = getEligibleApprovers(db, emp, t);
    approvers.forEach((a) => {
      expect(["leader", "admin", "ceo"].includes(a.role)).toBe(true);
    });
  });
});

// ── 7. perms.approve ─────────────────────────────────────────────────────────
describe("perms.approve", () => {
  it("designated approver can approve", () => {
    const t = db.tasks.find((x) => x.approverId && x.status === "review");
    if (!t) return;
    const approver = db.users.find((u) => u.id === t.approverId);
    if (!approver) return;
    expect(perms.approve(db, approver, t)).toBe(true);
  });

  it("random employee cannot approve someone else's task", () => {
    const t = db.tasks.find((x) => x.approverId && x.status === "review");
    if (!t) return;
    const rando = db.users.find(
      (u) => u.id !== t.approverId && u.id !== t.ownerId && u.role === "employee"
    );
    if (!rando) return;
    expect(perms.approve(db, rando, t)).toBe(false);
  });
});

// ── 8. runScheduler — recurring task generation ───────────────────────────────
describe("runScheduler", () => {
  const { runScheduler } = __internals;

  it("does not duplicate occurrences for same period", () => {
    const db1 = buildSeed();
    const db2 = runScheduler(db1);
    const db3 = runScheduler(db2);
    const recurringTasks = db3.tasks.filter((t) => t.type === "recurring");
    // No two tasks with same templateId + same period
    const seen = new Set();
    for (const t of recurringTasks) {
      if (!t.recurrenceTemplateId || !t.recurrencePeriod) continue;
      const key = `${t.recurrenceTemplateId}:${t.recurrencePeriod}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});

// ── 9. canCreateTaskFor ───────────────────────────────────────────────────────
describe("canCreateTaskFor", () => {
  const { canCreateTaskFor } = __internals;

  it("employee can create task for themselves in own dept", () => {
    const emp = db.users.find((u) => u.role === "employee");
    if (!emp) return;
    const f = { ownerId: emp.id, deptId: emp.deptId, type: "dept", projectId: null };
    expect(canCreateTaskFor(db, emp, f).ok).toBe(true);
  });

  it("employee cannot create task in another dept", () => {
    const emp = db.users.find((u) => u.role === "employee");
    if (!emp) return;
    const otherDept = db.depts.find((d) => d.id !== emp.deptId);
    if (!otherDept) return;
    const f = { ownerId: emp.id, deptId: otherDept.id, type: "dept", projectId: null };
    expect(canCreateTaskFor(db, emp, f).ok).toBe(false);
  });
});
