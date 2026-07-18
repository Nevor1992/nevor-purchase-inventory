/* ============================================================================
   Supabase data layer (active only when SUPABASE_ENABLED).

   Design: the app keeps its existing in-memory reducer (`setDb`) for instant,
   optimistic UI — this module (1) loads the initial state from Postgres and
   (2) persists changes back with a reference-diff sync engine, (3) streams
   other users' changes in via Realtime. Permission checks run twice: in the
   client (UX) and in RLS (authority) — a hand-crafted request that skips the
   client cannot skip RLS.
   ============================================================================ */
import { supabase } from "./supabase.js";
import {
  userFromRow, deptFromRow, projectFromRow, projectToRow,
  taskFromRow, taskToRow, requestFromRow, requestToRow,
  notifFromRow, notifToRow, docFromRow, docToRow,
  hrProcessFromRow, hrProcessToRow, savedFilterFromRow, savedFilterToRow,
} from "./mappers.js";

const all = async (q) => { const { data, error } = await q; if (error) throw error; return data || []; };
const groupBy = (rows, key) => rows.reduce((m, r) => ((m[r[key]] = m[r[key]] || []).push(r), m), {});

/* ---------------- initial load: DB → UI state shape ---------------- */
export async function loadDb() {
  const [users, depts, projects, tasks, collabs, checklist, dlHist, attach, requests, proposals, comments, notifs, docs, hrProcs, filters] = await Promise.all([
    all(supabase.from("users").select("*")),
    all(supabase.from("departments").select("*")),
    all(supabase.from("projects").select("*")),
    all(supabase.from("tasks").select("*")),
    all(supabase.from("task_collaborators").select("*")),
    all(supabase.from("task_checklist").select("*").order("position")),
    all(supabase.from("task_deadline_history").select("*").order("changed_at")),
    all(supabase.from("task_attachments").select("*")),
    all(supabase.from("requests").select("*")),
    all(supabase.from("request_deadline_proposals").select("*").order("created_at")),
    all(supabase.from("comments").select("*").order("created_at")),
    all(supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(300)),
    all(supabase.from("documents").select("*")),
    all(supabase.from("hr_processes").select("*")),
    all(supabase.from("saved_filters").select("*")),
  ]);

  const collabsBy = groupBy(collabs, "task_id");
  const checklistBy = groupBy(checklist, "task_id");
  const dlHistBy = groupBy(dlHist, "task_id");
  const attachBy = groupBy(attach, "task_id");
  const taskComments = groupBy(comments.filter((c) => c.entity_type === "task"), "entity_id");
  const reqComments = groupBy(comments.filter((c) => c.entity_type === "request"), "entity_id");
  const proposalsBy = groupBy(proposals, "request_id");

  return {
    schema: 2, supabase: true,
    users: users.map(userFromRow),
    depts: depts.map(deptFromRow),
    projects: projects.map(projectFromRow),
    tasks: tasks.map((r) => taskFromRow(r, {
      checklist: checklistBy[r.id] || [],
      collaboratorIds: (collabsBy[r.id] || []).map((c) => c.user_id),
      attachments: attachBy[r.id] || [],
      deadlineHistory: dlHistBy[r.id] || [],
      comments: taskComments[r.id] || [],
    })),
    requests: requests.map((r) => requestFromRow(r, { proposals: proposalsBy[r.id] || [], comments: reqComments[r.id] || [] })),
    notifs: notifs.map(notifFromRow),
    docs: docs.map(docFromRow),
    hrProcesses: hrProcs.map(hrProcessFromRow),
    savedFilters: filters.map(savedFilterFromRow),
    recurrings: [], roleLogs: [], sentAlerts: {},
  };
}

/* ---------------- sync engine: diff prev/next state, persist changes -------
   The reducers always create NEW objects for changed rows (immutable spread),
   so reference inequality — same id, different object — means "dirty".      */

async function upsert(table, rows) {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows);
  if (error) console.error(`[sync] upsert ${table}:`, error.message);
}

async function syncTaskSubTables(prevT, nextT) {
  /* checklist: replace-all on change (small lists) */
  if (prevT?.checklist !== nextT.checklist) {
    await supabase.from("task_checklist").delete().eq("task_id", nextT.id);
    if (nextT.checklist.length) {
      await upsert("task_checklist", nextT.checklist.map((c, i) => ({ id: c.id, task_id: nextT.id, text: c.text, done: !!c.done, owner_id: c.ownerId || null, position: i })));
    }
  }
  if (prevT?.collaboratorIds !== nextT.collaboratorIds) {
    await supabase.from("task_collaborators").delete().eq("task_id", nextT.id);
    if (nextT.collaboratorIds.length) {
      await upsert("task_collaborators", nextT.collaboratorIds.map((uid) => ({ task_id: nextT.id, user_id: uid })));
    }
  }
  /* deadline history & comments & attachments: append-only */
  const newHist = nextT.deadlineHistory.slice(prevT?.deadlineHistory.length || 0);
  if (newHist.length) await upsert("task_deadline_history", newHist.map((h) => ({ task_id: nextT.id, from_date: h.from || null, to_date: h.to || null, changed_by: h.by, reason: h.reason || null })));
  const newCmts = nextT.comments.slice(prevT?.comments.length || 0);
  if (newCmts.length) await upsert("comments", newCmts.map((c) => ({ id: c.id, entity_type: "task", entity_id: nextT.id, user_id: c.userId, body: c.text })));
  const newAtt = nextT.attachments.slice(prevT?.attachments.length || 0);
  if (newAtt.length) await upsert("task_attachments", newAtt.map((a) => ({ id: a.id, task_id: nextT.id, name: a.name, url: a.url || "", mime: a.mime || null, size_bytes: a.size || 0, uploaded_by: a.by })));
}

export async function syncChanges(prev, next) {
  if (!prev || prev === next) return;
  const prevById = (arr) => { const m = new Map(); (arr || []).forEach((x) => m.set(x.id, x)); return m; };

  if (prev.tasks !== next.tasks) {
    const pm = prevById(prev.tasks);
    for (const t of next.tasks) {
      const p = pm.get(t.id);
      if (p === t) continue;
      await upsert("tasks", [taskToRow(t)]);
      await syncTaskSubTables(p, t);
    }
  }
  if (prev.requests !== next.requests) {
    const pm = prevById(prev.requests);
    for (const r of next.requests) {
      const p = pm.get(r.id);
      if (p === r) continue;
      await upsert("requests", [requestToRow(r)]);
      const newProps = r.deadlineProposals.slice(p?.deadlineProposals.length || 0);
      if (newProps.length) await upsert("request_deadline_proposals", newProps.map((x) => ({ request_id: r.id, proposed_by: x.by, side: x.side, proposed_date: x.date })));
      const newCmts = r.comments.slice(p?.comments.length || 0);
      if (newCmts.length) await upsert("comments", newCmts.map((c) => ({ id: c.id, entity_type: "request", entity_id: r.id, user_id: c.userId, body: c.text })));
    }
  }
  if (prev.projects !== next.projects) {
    const pm = prevById(prev.projects);
    for (const x of next.projects) if (pm.get(x.id) !== x) await upsert("projects", [projectToRow(x)]);
  }
  if (prev.notifs !== next.notifs) {
    const pm = prevById(prev.notifs);
    for (const n of next.notifs) if (pm.get(n.id) !== n) await upsert("notifications", [notifToRow(n)]);
  }
  if (prev.docs !== next.docs) {
    const pm = prevById(prev.docs);
    for (const d of next.docs) if (pm.get(d.id) !== d) await upsert("documents", [docToRow(d)]);
  }
  if (prev.hrProcesses !== next.hrProcesses) {
    const pm = prevById(prev.hrProcesses);
    for (const p2 of next.hrProcesses) if (pm.get(p2.id) !== p2) await upsert("hr_processes", [hrProcessToRow(p2)]);
  }
  if (prev.savedFilters !== next.savedFilters) {
    const pm = prevById(prev.savedFilters);
    for (const f of next.savedFilters) if (pm.get(f.id) !== f) await upsert("saved_filters", [savedFilterToRow(f)]);
  }
}

/* ---------------- realtime: refresh when others change data ---------------- */
export function subscribeRealtime(onRemoteChange) {
  const channel = supabase
    .channel("novix-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, onRemoteChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, onRemoteChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, onRemoteChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "task_checklist" }, onRemoteChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/* ---------------- storage: real file upload ---------------- */
export async function uploadAttachment(file, taskId) {
  const path = `${taskId}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from("attachments").upload(path, file);
  if (error) return { ok: false, msg: error.message };
  const { data } = supabase.storage.from("attachments").getPublicUrl(path);
  return { ok: true, url: data.publicUrl, path };
}

/* ---------------- admin: tạo tài khoản nhân sự qua Edge Function ----------------
   service_role nằm ở server (Edge Function admin-create-user). Client chỉ gửi
   thông tin + JWT admin; function tự xác thực người gọi là admin/ceo. */
export async function adminCreateUser(payload) {
  const { data, error } = await supabase.functions.invoke("admin-create-user", { body: payload });
  if (error) {
    let msg = error.message || "Không gọi được máy chủ";
    try { const ctx = await error.context?.json?.(); if (ctx?.msg) msg = ctx.msg; } catch { /* ignore */ }
    return { ok: false, msg };
  }
  if (!data?.ok) return { ok: false, msg: data?.msg || "Tạo tài khoản thất bại" };
  return { ok: true, userId: data.userId, user: data.user || null };
}
