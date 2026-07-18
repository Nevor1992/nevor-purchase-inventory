/* ============================================================================
   Row ↔ UI mappers. DB is snake_case (see supabase/migrations), the UI state
   keeps the camelCase shape the components already use — so switching between
   prototype mode and Supabase mode changes NOTHING in the components.
   ============================================================================ */

const ts = (v) => (v ? new Date(v).getTime() : null);
const iso = (ms) => (ms ? new Date(ms).toISOString() : null);

/* ---------------- users / departments / projects ---------------- */

export const userFromRow = (r) => ({
  id: r.id, name: r.name, role: r.role, deptId: r.dept_id, brandId: r.brand_id,
  title: r.title, email: r.email, hrConfidentialAccess: r.hr_confidential_access === true,
});

export const deptFromRow = (r) => ({
  id: r.id, name: r.name, leaderId: r.leader_id, brandId: r.brand_id,
  parentDeptId: r.parent_dept_id || null, defaultReceiverId: r.default_receiver_id || null,
});

export const projectFromRow = (r) => ({
  id: r.id, code: r.code, name: r.name, goal: r.goal || "", ownerId: r.owner_id,
  deptIds: r.dept_ids || [], watcherIds: r.watcher_ids || [], brandId: r.brand_id,
  start: r.start_date, deadline: r.deadline, status: r.status, priority: r.priority || "normal",
  desc: r.description || "", planLink: r.plan_link || "", issues: r.issues || [], deleted: r.deleted === true,
});

export const projectToRow = (p) => ({
  id: p.id, code: p.code, name: p.name, goal: p.goal, owner_id: p.ownerId,
  dept_ids: p.deptIds || [], watcher_ids: p.watcherIds || [], brand_id: p.brandId || null,
  start_date: p.start || null, deadline: p.deadline || null, status: p.status,
  priority: p.priority || "normal", description: p.desc || "", plan_link: p.planLink || "",
  issues: p.issues || [], deleted: !!p.deleted,
});

/* ---------------- tasks (+ sub-tables assembled in) ---------------- */

export const taskFromRow = (r, { checklist = [], collaboratorIds = [], attachments = [], deadlineHistory = [], comments = [] } = {}) => ({
  id: r.id, code: r.code, name: r.name, desc: r.description || "",
  deliverable: r.deliverable || "", acceptance: r.acceptance || "",
  creatorId: r.creator_id, assignerId: r.assigner_id, ownerId: r.owner_id,
  approverId: r.approver_id, deptId: r.dept_id, coDeptIds: r.co_dept_ids || [],
  projectId: r.project_id, brandId: r.brand_id, type: r.type, priority: r.priority,
  effort: r.effort, status: r.status, progress: r.progress ?? 0,
  start: r.start_date, deadline: r.deadline, deadlineConfirmed: r.deadline_confirmed === true,
  completedAt: ts(r.completed_at), approvedAt: ts(r.approved_at), locked: r.locked === true,
  isConfidential: r.is_confidential === true, confidentialReason: r.confidential_reason || "",
  visibility: r.visibility, allowedViewerIds: r.allowed_viewer_ids || [],
  requiresAck: r.requires_ack === true, ackedAt: ts(r.acked_at), category: r.category || "GENERAL",
  reportLink: r.report_link || "", driveLink: r.drive_link || "", tags: r.tags || [],
  pauseReason: r.pause_reason || "", overdueReason: r.overdue_reason || "",
  revisionNote: r.revision_note || "", revisionCount: r.revision_count ?? 0,
  actual: { summary: r.actual_summary || "", links: r.actual_links || [], note: r.actual_note || "", submittedAt: ts(r.actual_submitted_at) },
  confirmedById: r.confirmed_by_id, recurrence: r.recurrence,
  recurringTemplateId: r.recurrence_template_id, recurrencePeriod: r.recurrence_period,
  deleted: r.deleted === true, createdAt: ts(r.created_at), updatedAt: ts(r.updated_at),
  /* sub-tables */
  checklist: checklist.map((c) => ({ id: c.id, text: c.text, done: c.done, ownerId: c.owner_id, deadline: c.deadline || null })),
  collaboratorIds, attachments: attachments.map((a) => ({ id: a.id, name: a.name, url: a.url, size: a.size_bytes || 0, mime: a.mime || "", by: a.uploaded_by, at: ts(a.created_at) })),
  deadlineHistory: deadlineHistory.map((h) => ({ from: h.from_date, to: h.to_date, by: h.changed_by, at: ts(h.changed_at), reason: h.reason || "" })),
  comments: comments.map((c) => ({ id: c.id, userId: c.user_id, text: c.body, mentions: [], at: ts(c.created_at) })),
  /* client-only fields (not persisted): logs shown from comments/audit later; pins are a per-user preference */
  logs: [], pinnedBy: [],
});

export const taskToRow = (t) => ({
  id: t.id, code: t.code, name: t.name, description: t.desc || "",
  deliverable: t.deliverable || "", acceptance: t.acceptance || "",
  creator_id: t.creatorId, assigner_id: t.assignerId || null, owner_id: t.ownerId,
  approver_id: t.approverId || null, dept_id: t.deptId, co_dept_ids: t.coDeptIds || [],
  project_id: t.projectId || null, brand_id: t.brandId || null, type: t.type,
  priority: t.priority, effort: t.effort, status: t.status, progress: t.progress ?? 0,
  start_date: t.start || null, deadline: t.deadline || null,
  deadline_confirmed: !!t.deadlineConfirmed, completed_at: iso(t.completedAt),
  approved_at: iso(t.approvedAt), locked: !!t.locked,
  is_confidential: !!t.isConfidential, confidential_reason: t.confidentialReason || null,
  visibility: t.visibility || "department", allowed_viewer_ids: t.allowedViewerIds || [],
  requires_ack: !!t.requiresAck, acked_at: iso(t.ackedAt), category: t.category || "GENERAL",
  report_link: t.reportLink || null, drive_link: t.driveLink || null, tags: t.tags || [],
  pause_reason: t.pauseReason || null, revision_note: t.revisionNote || null,
  revision_count: t.revisionCount ?? 0,
  actual_summary: t.actual?.summary || null, actual_links: t.actual?.links || [],
  actual_note: t.actual?.note || null, actual_submitted_at: iso(t.actual?.submittedAt),
  confirmed_by_id: t.confirmedById || null, recurrence: t.recurrence || null,
  recurrence_template_id: t.recurringTemplateId || null, recurrence_period: t.recurrencePeriod || null,
  deleted: !!t.deleted,
});

/* ---------------- requests ---------------- */

export const requestFromRow = (r, { proposals = [], comments = [] } = {}) => ({
  id: r.id, code: r.code, title: r.title, content: r.description || "",
  priority: r.priority, status: r.status, visibility: r.visibility,
  fromUserId: r.from_user_id, fromDeptId: r.from_dept_id, toDeptId: r.to_dept_id,
  handlerId: r.handler_id, receiverId: r.receiver_id, brandId: r.brand_id,
  projectId: r.project_id, taskId: r.linked_task_id, reqType: r.category || null,
  proposedDeadline: r.proposed_deadline, agreedDeadline: r.agreed_deadline,
  rejectReason: r.reject_reason || "", authorized_sender_ids: r.authorized_sender_ids || [],
  isConfidential: r.is_confidential === true, allowedViewerIds: r.allowed_viewer_ids || [],
  deliverable: r.deliverable || "", deleted: r.deleted === true, createdAt: ts(r.created_at),
  pendingHandlerId: r.pending_handler_id || null,
  deadlineProposals: proposals.map((p) => ({ by: p.proposed_by, side: p.side, date: p.proposed_date, at: ts(p.created_at) })),
  comments: comments.map((c) => ({ id: c.id, userId: c.user_id, text: c.body, at: ts(c.created_at) })),
  logs: [], attachments: [],
});

export const requestToRow = (r) => ({
  id: r.id, code: r.code, title: r.title, description: r.content || "",
  priority: r.priority, status: r.status, visibility: r.visibility || "BOTH_DEPARTMENTS",
  from_user_id: r.fromUserId, from_dept_id: r.fromDeptId, to_dept_id: r.toDeptId,
  handler_id: r.handlerId || null, receiver_id: r.receiverId || null,
  brand_id: r.brandId || null, project_id: r.projectId || null,
  linked_task_id: r.taskId || null, category: r.reqType || null,
  proposed_deadline: r.proposedDeadline || null, agreed_deadline: r.agreedDeadline || null,
  reject_reason: r.rejectReason || null, authorized_sender_ids: r.authorized_sender_ids || [],
  is_confidential: !!r.isConfidential, allowed_viewer_ids: r.allowedViewerIds || [],
  deliverable: r.deliverable || null, deleted: !!r.deleted,
});

/* ---------------- notifications / documents / hr processes / filters ---------------- */

export const notifFromRow = (r) => ({
  id: r.id, userId: r.user_id, text: r.body, level: r.kind, read: r.read === true,
  at: ts(r.created_at), taskId: r.task_id, requestId: r.request_id,
});
export const notifToRow = (n) => ({
  id: n.id, user_id: n.userId, body: n.text, kind: n.level || "info",
  task_id: n.taskId || null, request_id: n.requestId || null, read: !!n.read,
});

export const docFromRow = (r) => ({
  id: r.id, title: r.title, url: r.url, deptId: r.dept_id,
  confidential: r.confidential === true, allowedIds: r.allowed_ids || [], by: r.created_by, at: ts(r.created_at),
});
export const docToRow = (d) => ({
  id: d.id, title: d.title, url: d.url, dept_id: d.deptId || null,
  confidential: !!d.confidential, allowed_ids: d.allowedIds || [], created_by: d.by || null,
});

export const hrProcessFromRow = (r) => ({
  id: r.id, type: r.type, personName: r.person_name, userId: r.user_id, deptId: r.dept_id,
  startDate: r.start_date, probationDays: r.probation_days, midReviewDate: r.mid_review_date,
  finalReviewDate: r.final_review_date, taskIds: r.task_ids || [], status: r.status,
  closeNote: r.close_note || "", createdAt: ts(r.created_at), closedAt: ts(r.closed_at),
});
export const hrProcessToRow = (p) => ({
  id: p.id, type: p.type, person_name: p.personName, user_id: p.userId || null,
  dept_id: p.deptId, start_date: p.startDate, probation_days: p.probationDays || null,
  mid_review_date: p.midReviewDate || null, final_review_date: p.finalReviewDate || null,
  task_ids: p.taskIds || [], status: p.status, close_note: p.closeNote || "",
  closed_at: iso(p.closedAt),
});

export const savedFilterFromRow = (r) => ({ id: r.id, userId: r.user_id, name: r.name, filter: r.filter || {} });
export const savedFilterToRow = (f) => ({ id: f.id, user_id: f.userId, name: f.name, filter: f.filter || {} });
