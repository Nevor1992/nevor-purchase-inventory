// Edge Function: recurring-task-scheduler
// Triggered by pg_cron every day at 01:00 Asia/Bangkok (UTC 18:00 previous day)
// Creates task occurrences for active recurring templates where the period hasn't been generated yet.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TZ_OFFSET_HOURS = 7; // Asia/Bangkok = UTC+7

function bangkokNow(): Date {
  const now = new Date();
  now.setHours(now.getHours() + TZ_OFFSET_HOURS);
  return now;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function periodKey(recurrence: string, date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const w = isoWeek(date);
  if (recurrence === "daily") return isoDate(date);
  if (recurrence === "weekly") return `${y}-W${String(w).padStart(2, "0")}`;
  return `${y}-${m}`;
}

function deadlineForPeriod(recurrence: string, date: Date, offset: number): string {
  if (recurrence === "daily") return addDays(isoDate(date), offset);
  if (recurrence === "weekly") {
    const monday = new Date(date);
    monday.setDate(date.getDate() - date.getDay() + 1);
    return addDays(isoDate(monday), offset - 1);
  }
  // monthly: offset is day-of-month
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), offset));
  return isoDate(d);
}

function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const today = bangkokNow();
  const todayISO = isoDate(today);

  // Load active templates
  const { data: templates, error: tErr } = await supabase
    .from("recurring_templates")
    .select("*")
    .eq("is_active", true);

  if (tErr) return new Response(JSON.stringify({ error: tErr.message }), { status: 500 });

  let created = 0;
  const errors: string[] = [];

  for (const tmpl of templates ?? []) {
    try {
      const period = periodKey(tmpl.recurrence, today);
      const deadline = deadlineForPeriod(tmpl.recurrence, today, tmpl.due_offset ?? 1);

      // Check for existing occurrence this period
      const { data: existing } = await supabase
        .from("tasks")
        .select("id")
        .eq("recurrence_template_id", tmpl.id)
        .eq("recurrence_period", period)
        .maybeSingle();

      if (existing) continue;

      // Get next task code
      const { count } = await supabase.from("tasks").select("*", { count: "exact", head: true });
      const code = `NVX-${String((count ?? 0) + 1).padStart(3, "0")}`;

      const { error: insErr } = await supabase.from("tasks").insert({
        code,
        name: tmpl.name,
        description: tmpl.description,
        deliverable: tmpl.deliverable,
        creator_id: tmpl.owner_id,
        owner_id: tmpl.owner_id,
        approver_id: tmpl.approver_id,
        dept_id: tmpl.dept_id,
        project_id: tmpl.project_id,
        priority: tmpl.priority,
        effort: tmpl.effort,
        type: "recurring",
        recurrence: tmpl.recurrence,
        recurrence_template_id: tmpl.id,
        recurrence_period: period,
        start_date: todayISO,
        deadline,
        tags: tmpl.tags,
        status: "todo",
        progress: 0,
      });

      if (insErr) {
        errors.push(`${tmpl.id}: ${insErr.message}`);
      } else {
        // Audit log
        await supabase.from("audit_log").insert({
          actor_id: tmpl.owner_id,
          action: "create",
          entity_type: "task",
          entity_id: code,
          new_value: { recurrence: tmpl.recurrence, period, deadline },
          reason: "recurring scheduler",
        });
        created++;
      }
    } catch (e) {
      errors.push(`${tmpl.id}: ${String(e)}`);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, created, errors, date: todayISO }),
    { headers: { "content-type": "application/json" } },
  );
});
