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

### Round 2 — service-layer & business-logic hardening (P0)

| # | Area | Bug | Fix |
|---|------|-----|-----|
| 12 | **`updateTask` backdoor** | Generic `updateTask(id, patch)` merged any field with **no permission check** — a direct call could reassign owner, flip `isConfidential`, change approver, etc. | New `canApplyTaskPatch` maps every field → its `perms.*` gate; system fields (`status`/`deadline`/`locked`…) are forbidden and must go through their dedicated action. `updateTask` now validates before mutating and toasts on denial. |
| 13 | Request rights too broad | UI `isSender = fromUserId===me \|\| me.deptId===fromDeptId` gave sender actions (confirm/resend/cancel) to the **whole sender department** | UI `isSender` now uses `isSenderAuthorized` (creator / sender-dept leader / authorized sender). `confirm` and `resend` actions gained the same server-side guard (`cancel` already had it). |
| 14 | Deliver bypass | `reqAction.deliver` only checked `actual.summary` and had **no authorization** | Now requires the full actual output (summary **and** link/attachment, same standard as task submit-for-review) **and** restricts delivery to the handler / receiving-dept leader. |
| 15 | Cross-dept deadline | Changing a linked task's deadline **silently overwrote** the request's agreed deadline — breaking the negotiated commitment | `changeDeadline` no longer overwrites a confirmed `agreedDeadline`; it keeps the agreed value, logs the proposed change, and notifies the sender to re-confirm. Unnegotiated requests still sync. |
| 16 | Project scope | TaskForm's project dropdown listed **all** projects; "Add task" button in ProjectDetail always shown | Dropdown filtered by `canViewProject`; `canCreateTaskFor` now rejects attaching a task to a project outside the user's scope; "Add task" button gated by the same check. |

### Round 3 — HR data protection & flexible probation

| # | Area | Bug | Fix |
|---|------|-----|-----|
| 17 | **System admin ≠ HR data** | Admin had a blanket `confidentialAccess` flag → could read every confidential task incl. HR personnel files | New `canSeeConfidential`: HR-dept confidential is limited to the HR leader / CEO / users with the dedicated `hrConfidentialAccess` flag — the system-admin role is excluded. Non-HR confidential keeps the manager-only rule. Seed no longer grants admin the flag. Mirrored in RLS via `can_see_confidential()` / `has_hr_confidential_access()`. |
| 18 | Confidential requests | Requests had visibility enum only — no way to mark an HR request (leave, records, policy) as confidential; whole sender/receiver dept could read it | Requests gained `isConfidential` + `allowedViewerIds`. `canViewRequest` gates confidential requests to CEO + both-dept leaders + HR access (not system admin) + explicit viewers. Request form auto-flags sensitive HR request types and offers a manual "confidential" toggle; drawer shows a lock badge. Mirrored in RLS. |
| 19 | Rigid probation schedule | Probation tasks were hard-coded at D+30/55/58/60/61/62 — wrong for interns, 30-day, 90-day, part-time | Probation template now uses **anchors** (`start` / `mid` / `final`). HR enters probation length (30/45/60/90) and an optional mid-review date; every task deadline is computed per person. Anchors stored on the process record. |

**Test coverage:** 44 unit tests pass (was 27). New suites cover the field-level `updateTask` guard, HR-confidential split, and confidential-request visibility. Probation date computation verified end-to-end in the browser.

### Round 4 — RLS verified against real PostgreSQL (local harness)

A new local test harness (`scripts/test-rls-local.sh` + `supabase/tests/rls_test.sql`, 48 assertions) runs every migration on a real PostgreSQL 16 instance with a Supabase-environment shim (`auth.uid()`, `authenticated` role) and exercises the policies per persona. It caught two genuine security bugs in the SQL layer that the JS unit tests could not see:

| # | Area | Bug | Fix |
|---|------|-----|-----|
| 20 | **Confidential-task NULL leak** | `task_involves_me()` compares `assigner_id`/`approver_id` (usually NULL) with `auth.uid()`; NULL propagated through the OR-chain, so in `can_view_task()` the guard branch `is_confidential and not can_see_confidential(t)` evaluated to NULL (skipped) and fell through to `when is_confidential then true` — **any user could read confidential tasks (incl. HR records) whenever the task had no approver** | Migration `20260101000004_rls_nullsafe.sql`: `coalesce(..., false)` in `is_manager` / `is_ceo` / `task_involves_me` / `can_see_confidential` |
| 21 | Checklist toggle policy dead arm | In policy `task_checklist: toggle own items`, unqualified `owner_id` inside the `tasks` subquery resolved to `tasks.owner_id`, not `task_checklist.owner_id` — collaborators could never tick their own items via the API | Policy recreated with qualified `task_checklist.owner_id` |
| 22 | **Anonymous data exposure** (reproduced on the live project) | Policies like `users: read all using(true)` and the `visibility='company' → true` branch have no `to authenticated` restriction — anyone holding the public anon key (shipped in the JS bundle) could read the full user list (emails) and all company-visibility tasks without logging in | Migration `20260101000005_lock_anon.sql`: revoke all `public`-schema privileges from `anon` (incl. default privileges for future tables); the app requires login for all data access, Edge Functions use `service_role` |
| 23 | **Self privilege escalation** (reproduced on local harness) | Policy `users: self update` (`using id = auth.uid()`) has no column restriction — any signed-in employee could PATCH their own row via PostgREST and set `role='admin'`, grant themselves `hr_confidential_access`, or switch departments | Migration `20260101000006_users_priv_guard.sql`: `before update` trigger blocks changes to `role` / `hr_confidential_access` / `dept_id` / `brand_id` / `is_active` unless the caller is admin/CEO; SQL-editor/service-role operations (no `auth.uid()`) are unaffected |

RLS suite: **58/58 pass** after the fixes (before: 44/48; +anon-lock & privilege-escalation assertions). Also verified on real Postgres: all 5 migrations apply cleanly in order; `audit_log` immutable even for direct UPDATE/DELETE; `auth.users → public.users` sync trigger creates an `employee` profile row.

### Round 5 — verified end-to-end against the LIVE Supabase project (18/07/2026)

Connected the app to the real project (`nyfcrsshruusdpuprvka`) with the production anon key and drove it in a headless browser + REST. Migrations `000004`, `000005`, `000006` confirmed applied on the server.

| Check | Method | Result |
|-------|--------|--------|
| Real login (email/password) | app UI | ✓ signs in, session persists |
| `loadDb()` reads from Postgres | app UI | ✓ created task appears in "Công việc của tôi" with correct owner/dept/status |
| `fetchMe` maps profile | app UI | ✓ display name reflects a DB write round-trip |
| Task write path | REST as user | ✓ insert persists (`status=todo`); reload shows it |
| Insert guard — forge `creator_id` | REST | ✓ blocked (`42501`) |
| Self privilege escalation (`role`/`hr_confidential_access`) | REST | ✓ blocked (`42501`, migration 000006) |
| Cross-user edit | REST | ✓ 0 rows (RLS) |
| Soft-delete by employee | REST | ✓ blocked (`42501`, managers only) |
| Hard-delete by employee | REST | ✓ 0 rows (no policy) |
| `audit_log` read by employee | REST | ✓ empty (managers only) |
| Anon (no login) reads data | REST | ✓ blocked (migration 000005) |

**Bug #24 (UX) fixed this round:** for an employee whose `dept_id` is still `null` (every user right after the auth→users trigger, before an admin assigns a department), the create-task submit button was silently disabled — `canCreateTaskFor` returned ok (null==null) but the `valid` guard requires `deptId`. Added an inline hint: *"Tài khoản của bạn chưa được gán phòng ban — liên hệ Admin/HR…"* so the dead-end is explained.

**Not testable from the sandbox — needs a real browser (works once on Vercel):** Realtime uses WebSocket, which the container's egress proxy does not tunnel. Verify by opening the app in two tabs and confirming a task created in one appears in the other without refresh.

**Left in the project:** one test task `UAT-E2E-1` (owner = UAT Tester). An admin can soft-delete it from the UI, or run `delete from tasks where code='UAT-E2E-1';` in the SQL Editor.

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
