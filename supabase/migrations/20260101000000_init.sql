-- NovixWork — Initial schema
-- Run: supabase db push

create extension if not exists "uuid-ossp";
create extension if not exists pg_cron;

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('employee','leader','admin','ceo');
create type task_status as enum ('todo','doing','paused','review','revise','done');
create type task_type as enum ('personal','dept','project','cross','confidential','recurring');
create type task_priority as enum ('low','normal','high','critical');
create type task_effort as enum ('S','M','L');
create type req_status as enum ('pending','deadline_proposed','accepted','info','processing','delivered','confirmed','rejected','cancelled');
create type req_visibility as enum ('PRIVATE','SENDER_DEPARTMENT','BOTH_DEPARTMENTS','PROJECT','COMPANY');
create type audit_action as enum (
  'create','update','status','approve','reject','cancel','assign','deadline',
  'checklist_toggle','comment','deliver','confirm','attach','delete','restore'
);

-- ============================================================
-- CORE TABLES
-- ============================================================

create table brands (
  id text primary key,
  label text not null,
  color text
);

create table departments (
  id text primary key,
  name text not null,
  brand_id text references brands(id),
  leader_id uuid,  -- set after users table
  parent_dept_id text references departments(id)
);

create table projects (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  name text not null,
  brand_id text references brands(id),
  owner_id uuid not null,
  dept_ids text[] not null default '{}',
  status text not null default 'active' check (status in ('active','paused','done','archived')),
  start_date date,
  end_date date,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  avatar_url text,
  role user_role not null default 'employee',
  dept_id text references departments(id),
  brand_id text references brands(id),
  title text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Back-fill dept leader after users table exists
alter table departments add constraint fk_dept_leader foreign key (leader_id) references users(id);

-- ============================================================
-- TASKS
-- ============================================================

create table tasks (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  name text not null,
  description text,
  deliverable text,
  acceptance text,
  creator_id uuid not null references users(id),
  assigner_id uuid references users(id),
  owner_id uuid not null references users(id),
  approver_id uuid references users(id),
  dept_id text not null references departments(id),
  co_dept_ids text[] not null default '{}',
  project_id uuid references projects(id),
  brand_id text references brands(id),
  type task_type not null default 'dept',
  priority task_priority not null default 'normal',
  effort task_effort not null default 'M',
  status task_status not null default 'todo',
  progress smallint not null default 0 check (progress between 0 and 100),
  start_date date,
  deadline date,
  deadline_confirmed boolean not null default false,
  completed_at timestamptz,
  approved_at timestamptz,
  locked boolean not null default false,
  is_confidential boolean not null default false,
  confidential_reason text,
  visibility req_visibility not null default 'BOTH_DEPARTMENTS',
  report_link text,
  drive_link text,
  tags text[] not null default '{}',
  pause_reason text,
  revision_note text,
  revision_count smallint not null default 0,
  revision_deadline date,
  actual_summary text,
  actual_links text[] not null default '{}',
  actual_note text,
  actual_submitted_at timestamptz,
  confirmed_by_id uuid references users(id),
  recurrence text check (recurrence in ('daily','weekly','monthly')),
  recurrence_due_offset integer,
  recurrence_template_id uuid,
  recurrence_period text,
  deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table task_collaborators (
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (task_id, user_id)
);

create table task_checklist (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  owner_id uuid references users(id),
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create table task_deadline_history (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  from_date date,
  to_date date,
  changed_by uuid not null references users(id),
  changed_at timestamptz not null default now(),
  reason text
);

create table task_attachments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  name text not null,
  url text not null,
  mime text,
  size_bytes bigint,
  uploaded_by uuid not null references users(id),
  uploaded_at timestamptz not null default now()
);

-- ============================================================
-- REQUESTS (cross-dept collaboration)
-- ============================================================

create table requests (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  title text not null,
  description text,
  priority task_priority not null default 'normal',
  status req_status not null default 'pending',
  visibility req_visibility not null default 'BOTH_DEPARTMENTS',
  from_user_id uuid not null references users(id),
  from_dept_id text not null references departments(id),
  to_dept_id text not null references departments(id),
  handler_id uuid references users(id),
  receiver_id uuid references users(id),
  brand_id text references brands(id),
  project_id uuid references projects(id),
  linked_task_id uuid references tasks(id),
  category text,
  proposed_deadline date,
  agreed_deadline date,
  reject_reason text,
  authorized_sender_ids uuid[] not null default '{}',
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table request_deadline_proposals (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references requests(id) on delete cascade,
  proposed_by uuid not null references users(id),
  side text not null check (side in ('sender','receiver')),
  proposed_date date not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- COMMENTS & NOTIFICATIONS
-- ============================================================

create table comments (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null check (entity_type in ('task','request')),
  entity_id uuid not null,
  user_id uuid not null references users(id),
  body text not null,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  body text not null,
  kind text not null default 'info' check (kind in ('info','act','warn')),
  task_id uuid references tasks(id),
  request_id uuid references requests(id),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- AUDIT LOG (immutable — no update/delete)
-- ============================================================

create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid not null references users(id),
  action audit_action not null,
  entity_type text not null,
  entity_id uuid not null,
  field text,
  old_value jsonb,
  new_value jsonb,
  reason text,
  ip_addr inet,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Prevent any modification of audit_log rows
create rule audit_no_update as on update to audit_log do instead nothing;
create rule audit_no_delete as on delete to audit_log do instead nothing;

-- ============================================================
-- RECURRING TASK TEMPLATES
-- ============================================================

create table recurring_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  deliverable text,
  owner_id uuid not null references users(id),
  dept_id text not null references departments(id),
  project_id uuid references projects(id),
  approver_id uuid references users(id),
  priority task_priority not null default 'normal',
  effort task_effort not null default 'M',
  recurrence text not null check (recurrence in ('daily','weekly','monthly')),
  due_offset integer not null default 1,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index on tasks (owner_id);
create index on tasks (dept_id);
create index on tasks (project_id);
create index on tasks (status);
create index on tasks (deadline);
create index on tasks (deleted);
create index on tasks (recurrence_template_id);
create index on requests (from_dept_id);
create index on requests (to_dept_id);
create index on requests (status);
create index on requests (deleted);
create index on comments (entity_type, entity_id);
create index on notifications (user_id, read);
create index on audit_log (entity_type, entity_id);
create index on audit_log (actor_id);
create index on audit_log (created_at desc);

-- ============================================================
-- UPDATED_AT trigger
-- ============================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger tasks_updated_at before update on tasks for each row execute procedure set_updated_at();
create trigger requests_updated_at before update on requests for each row execute procedure set_updated_at();
create trigger users_updated_at before update on users for each row execute procedure set_updated_at();
create trigger projects_updated_at before update on projects for each row execute procedure set_updated_at();
