-- ============================================================
-- App tables present in the UI state but missing from the initial schema:
-- documents, hr_processes, saved_filters — plus an auth→users sync trigger.
-- ============================================================

-- Linked documents (Tài liệu liên kết)
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  url text not null,
  dept_id text references departments(id),
  confidential boolean not null default false,
  allowed_ids uuid[] not null default '{}',
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- HR lifecycle processes (onboarding / probation / training / offboarding)
create table if not exists hr_processes (
  id uuid primary key default uuid_generate_v4(),
  type text not null,
  person_name text not null,
  user_id uuid references users(id),
  dept_id text references departments(id),
  start_date date not null,
  probation_days int,
  mid_review_date date,
  final_review_date date,
  task_ids uuid[] not null default '{}',
  status text not null default 'active' check (status in ('active','closed')),
  close_note text default '',
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

-- Per-user saved filters
create table if not exists saved_filters (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  filter jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
alter table documents enable row level security;
alter table hr_processes enable row level security;
alter table saved_filters enable row level security;

-- documents: mirror canViewDoc — public docs to all; confidential to HR / managers / explicit allow-list
create policy "documents: read" on documents for select using (
  not confidential
  or dept_id = 'hr'
  or is_manager()
  or auth.uid() = any(allowed_ids)
);
create policy "documents: mutate managers/hr" on documents for all using (
  is_manager() or exists(select 1 from users u where u.id = auth.uid() and u.dept_id = 'hr')
);

-- hr_processes: HR staff + managers only (personnel data)
create policy "hr_processes: hr/managers" on hr_processes for all using (
  is_manager()
  or is_hr_leader()
  or exists(select 1 from users u where u.id = auth.uid() and u.dept_id = 'hr')
);

-- saved_filters: strictly the owner
create policy "saved_filters: owner" on saved_filters for all using (user_id = auth.uid());

-- ---------- Auth → public.users sync ----------
-- Every new auth account gets a matching public.users row (default role employee).
-- An admin then sets the correct role / department. Keeps auth.uid() ↔ users 1:1.
create or replace function handle_new_auth_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 'employee')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
