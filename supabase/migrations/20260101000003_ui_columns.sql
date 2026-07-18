-- ============================================================
-- Columns the UI state uses that were missing from the initial schema,
-- plus cron scheduling for the recurring-task Edge Function.
-- ============================================================

-- projects: fields shown/edited in the UI
alter table projects add column if not exists goal text default '';
alter table projects add column if not exists deadline date;
alter table projects add column if not exists priority task_priority not null default 'normal';
alter table projects add column if not exists plan_link text default '';
alter table projects add column if not exists issues jsonb not null default '[]';
alter table projects add column if not exists deleted boolean not null default false;
-- UI has a 'prep' (Chuẩn bị) project status
alter table projects drop constraint if exists projects_status_check;
alter table projects add constraint projects_status_check
  check (status in ('prep','active','paused','done','archived'));

-- requests: receiver proposed a new deadline → remember intended handler
alter table requests add column if not exists pending_handler_id uuid references users(id);

-- tasks: reason recorded when a task goes overdue
alter table tasks add column if not exists overdue_reason text;

-- departments: fallback receiver for requests when no leader is set
alter table departments add column if not exists default_receiver_id uuid references users(id);

-- ============================================================
-- pg_cron: run the recurring-task scheduler daily at 18:00 UTC (01:00 VN).
-- Requires the pg_cron + pg_net extensions (Dashboard → Database → Extensions)
-- and two secrets stored in Vault or set here after deploy:
--   <PROJECT_REF>  — your project ref (abc123.supabase.co)
--   <SERVICE_KEY>  — service_role key (server-side only; NEVER in frontend)
-- Uncomment and fill in after `supabase functions deploy scheduler`:
-- ============================================================
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
-- select cron.schedule(
--   'novix-recurring-scheduler', '0 18 * * *',
--   $$ select net.http_post(
--        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/scheduler',
--        headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_KEY>', 'Content-Type', 'application/json'),
--        body := '{}'::jsonb) $$
-- );
