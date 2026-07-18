# NovixWork — UAT Delivery Report

**Version**: 0.2.0-uat  
**Branch**: `claude/novix-work-uat-prep-jklsfl`  
**Date**: 2026-07-17  
**Prepared for**: UAT — Content / Media / Booking KOC teams

---

## 1. Bug Fix List

| # | Area | Bug | Fix |
|---|------|-----|-----|
| 1 | Checklist perms | Any collaborator could tick any checklist item | Added `perms.canToggleChecklistItem` — collab can only tick items where `ownerId === collab.id` |
| 2 | Checklist perms | `act.toggleCheck` had no per-item guard | Action now calls `canToggleChecklistItem` and blocks + toasts if denied |
| 3 | Approver selector (Drawer) | All users shown as approver candidates | `getEligibleApprovers` scopes by role, dept, project, and APPROVER_RULES |
| 4 | Approver selector (TaskForm) | All users shown in create-task form | Same `getEligibleApprovers` now used in TaskForm |
| 5 | Request visibility | `canViewRequest` had no visibility enum enforcement | Rewritten to respect PRIVATE / SENDER_DEPARTMENT / BOTH_DEPARTMENTS / PROJECT / COMPANY |
| 6 | Request cancel | Any dept member could cancel a request | `isSenderAuthorized` guard added to `reqAction.cancel` action layer |
| 7 | Handover / deliver | Delivery had no actual-output validation | `reqAction.deliver` checks `actual.summary` on the linked task; UI toasts if missing |
| 8 | Deadline guard | `changeDeadline` had an empty `if` block — reason was never enforced | Now returns `{ok:false, code:"REASON_REQUIRED"}` when confirmed deadline has no reason |
| 9 | CollabPicker scope | All users shown when picking collaborators | Scoped by task type: personal→dept, project→project depts, confidential→dept only |
| 10 | TaskDrawer access | TaskDrawer rendered content before permission check | Early return with `UnauthorizedState` if `perms.view` fails |
| 11 | RequestDrawer access | No permission guard before rendering | Early return with `UnauthorizedState` if `canViewRequest` fails |

---

## 2. Changed Files

| File | Change type | Summary |
|------|-------------|---------|
| `src/App.jsx` | Modified | Patches 1–11 above; `__internals` export extended |
| `supabase/migrations/20260101000000_init.sql` | New | Full PostgreSQL schema (all tables, indexes, triggers) |
| `supabase/migrations/20260101000001_rls.sql` | New | RLS policies mirroring in-memory permission layer |
| `supabase/functions/scheduler/index.ts` | New | Edge Function: generates recurring task occurrences daily |
| `src/__tests__/setup.js` | New | Vitest + jest-dom setup |
| `src/__tests__/permissions.test.js` | New | 9 permission-layer test suites |

---

## 3. Database Schema Summary

### Core tables
- `brands`, `departments`, `projects`, `users`
- `tasks`, `task_collaborators`, `task_checklist`, `task_deadline_history`, `task_attachments`
- `requests`, `request_deadline_proposals`
- `comments`, `notifications`
- `audit_log` (immutable — update/delete rules deny all changes)
- `recurring_templates`

### Key design decisions
- `audit_log` has DDL rules (`create rule`) that silently discard `UPDATE` and `DELETE` — rows are append-only.
- Soft-delete: `deleted boolean` column on `tasks` and `requests`; RLS hides deleted rows from non-managers.
- `task_checklist.owner_id` is nullable: null means any task participant may tick; non-null means only that user or a manager.
- `deadline_confirmed` is stored on `tasks`; changing a confirmed deadline requires a `task_deadline_history` insert with a non-empty `reason`.

---

## 4. Permission Matrix

| Action | Employee | Leader (own dept) | Admin | CEO |
|--------|----------|-------------------|-------|-----|
| View own task | ✓ | ✓ | ✓ | ✓ |
| View dept task | ✓ | ✓ | ✓ | ✓ |
| View cross-dept task | if collab/owner | ✓ | ✓ | ✓ |
| View confidential task | ✗ | ✓ (own dept) | ✓ | ✓ |
| Create personal task | ✓ | ✓ | ✓ | ✓ |
| Create dept task (own dept) | ✓ | ✓ | ✓ | ✓ |
| Create cross-dept task | ✗ | ✓ | ✓ | ✓ |
| Approve task | if designated | ✓ (own dept) | ✓ | ✓ |
| Change confirmed deadline | ✗ | ✓ (with reason) | ✓ (with reason) | ✓ (with reason) |
| Tick own checklist item | ✓ | ✓ | ✓ | ✓ |
| Tick others' checklist item | ✗ | ✓ | ✓ | ✓ |
| View HR confidential tasks | ✗ | HR dept leader only | ✓ | ✓ |
| Cancel request | sender only | sender dept leader | ✓ | ✓ |
| Deliver request result | handler/receiver lead | ✓ (same) | ✓ | ✓ |

---

## 5. UAT Scenarios

### 5.1 Checklist ownership
1. Login as **Content employee** (e.g. `mai`) → open a task with checklist items assigned to another user.
2. **Expected**: checkbox is disabled; tooltip says "Checklist này được giao cho người khác".
3. Open a task where you are a collaborator with checklist item assigned to yourself.
4. **Expected**: you can tick that item; others remain disabled.

### 5.2 Approver selection scope
1. Login as `mai` (employee, Content dept) → create a task.
2. Open the "Người duyệt" dropdown.
3. **Expected**: only leaders/admin/CEO visible — not other employees.

### 5.3 Request visibility
1. Login as employee in Warehouse dept → open Requests page.
2. **Expected**: cannot see requests marked PRIVATE or SENDER_DEPARTMENT belonging to Content dept.

### 5.4 Request cancel authorization
1. Login as employee who is NOT the sender of a request.
2. Try to cancel the request via developer tools / direct action.
3. **Expected**: action layer rejects with no state change.

### 5.5 Deadline change requires reason
1. Login as Leader → open a task with `deadlineConfirmed = true`.
2. Change deadline without typing a reason.
3. **Expected**: action returns `REASON_REQUIRED`; UI modal blocks the "Xác nhận đổi" button until reason entered.

### 5.6 Handover requires actual output
1. Login as handler of a cross-dept request.
2. Click "Bàn giao kết quả" without filling in the linked task's Actual Output.
3. **Expected**: toast "Cần điền kết quả thực tế (Actual Output) trong task trước khi bàn giao".

### 5.7 Unauthorized task drawer
1. Open a confidential HR task URL directly (deep-link by task ID).
2. Login as a non-HR employee.
3. **Expected**: `UnauthorizedState` screen shown inside the drawer.

---

## 6. Automated Test Report

Run with: `npm test`

| Suite | Tests | Status |
|-------|-------|--------|
| `perms.view` | 5 | ✅ pass |
| `perms.canToggleChecklistItem` | 4 | ✅ pass |
| `perms.changeDeadline` | 2 | ✅ pass |
| `canViewRequest` | 5 | ✅ pass |
| `isSenderAuthorized` | 2 | ✅ pass |
| `getEligibleApprovers` | 2 | ✅ pass |
| `perms.approve` | 2 | ✅ pass |
| `runScheduler` | 1 | ✅ pass |
| `canCreateTaskFor` | 2 | ✅ pass |

**Total: 25/25 pass** (vitest run, local verification 2026-07-17)

---

## 7. Performance Notes

- All seed data is in-memory; no network calls in prototype mode.
- Vitest runs unit tests against pure JS logic extracted via `__internals`.
- For production Supabase: enable `pg_cron` extension; schedule Edge Function daily at `18:00 UTC` (01:00 Bangkok).
- RLS policies use `security definer` helper functions to avoid N+1 policy evaluation.

---

## 8. Deployment Guide (Production)

1. `supabase db push` — applies migrations in order.
2. `supabase functions deploy scheduler` — deploys recurring-task Edge Function.
3. In Supabase dashboard → Database → Extensions: enable `pg_cron`.
4. Add cron job: `select cron.schedule('recurring-scheduler', '0 18 * * *', $$select net.http_post(...)$$)`.
5. Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.
6. `npm run build` — Vite production build.
7. Deploy `dist/` to Vercel / Netlify / Cloudflare Pages.

---

## 9. Acceptance Criteria Status

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Direct URL to task blocked for non-permitted user | ✓ UnauthorizedState guard |
| 2 | Checklist item toggle scoped to item owner | ✓ `canToggleChecklistItem` |
| 3 | Approver list scoped by role + dept | ✓ `getEligibleApprovers` |
| 4 | Cross-dept request visibility enforced | ✓ `canViewRequest` rewrite |
| 5 | Request cancel requires sender authorization | ✓ `isSenderAuthorized` guard |
| 6 | Delivery blocked until actual output filled | ✓ UI + action layer guard |
| 7 | Confirmed deadline change requires reason | ✓ `REASON_REQUIRED` guard |
| 8 | CollabPicker scoped by task context | ✓ task-type-based filter |
| 9 | Supabase schema covers all entities | ✓ migration 000000 |
| 10 | RLS mirrors JS permission layer | ✓ migration 000001 |
| 11 | Recurring scheduler runs server-side | ✓ Edge Function |
| 12 | Unit tests cover permission layer | ✓ 25 test cases |
| 13 | Audit log is immutable | ✓ DDL rules + no user RLS insert |
| 14 | Soft delete hides rows from non-managers | ✓ RLS + `perms.view` |
