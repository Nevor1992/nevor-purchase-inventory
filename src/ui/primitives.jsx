/* ============================================================================
   NovixWork — light, reusable UI primitives (no app/business logic inside).
   ============================================================================ */
import React from "react";

/* Consistent page header: title + short description + right-aligned actions. */
export function PageHeader({ title, desc, actions, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900" style={{ textWrap: "balance" }}>{title}</h1>
        {desc && <p className="mt-0.5 text-[13px] text-zinc-500">{desc}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/* Skeleton loaders — used instead of full-screen spinners. */
export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-zinc-100 ${className}`} />;
}
export function SkeletonRows({ rows = 6 }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-zinc-100 px-3 py-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-14" />
        </div>
      ))}
    </div>
  );
}

/* Deadline chip — date + relative "còn N ngày / quá hạn", colour by proximity.
   >3d gray · ≤3d amber · today orange · overdue red. */
const DAY = 86400000;
export function deadlineMeta(date) {
  if (!date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(date + "T00:00:00");
  const days = Math.round((due.getTime() - today.getTime()) / DAY);
  const dd = String(due.getDate()).padStart(2, "0") + "/" + String(due.getMonth() + 1).padStart(2, "0");
  if (days < 0) return { dd, rel: `Quá hạn ${Math.abs(days)} ngày`, tone: "text-red-600", dotTone: "bg-red-500", days };
  if (days === 0) return { dd, rel: "Hôm nay", tone: "text-orange-600", dotTone: "bg-orange-500", days };
  if (days <= 3) return { dd, rel: `Còn ${days} ngày`, tone: "text-amber-600", dotTone: "bg-amber-500", days };
  return { dd, rel: `Còn ${days} ngày`, tone: "text-zinc-500", dotTone: "bg-zinc-300", days };
}
export function DeadlineChip({ date, done, className = "" }) {
  if (!date) return <span className={`text-[13px] text-zinc-300 ${className}`}>—</span>;
  const m = deadlineMeta(date);
  if (done) return <span className={`text-[13px] text-zinc-400 ${className}`} title={m.dd}>{m.dd}</span>;
  return (
    <span className={`inline-flex flex-col leading-tight ${className}`} title={m.rel}>
      <span className="text-[13px] tabular-nums text-zinc-700">{m.dd}</span>
      <span className={`text-[11px] ${m.tone}`}>{m.rel}</span>
    </span>
  );
}

/* Small coloured dot. */
export function Dot({ className = "bg-zinc-400" }) {
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${className}`} aria-hidden="true" />;
}

/* Lightweight tooltip — appears on hover/focus, keyboard-accessible.
   Wrap any trigger; pass `label`. Good for icon buttons & collapsed sidebar. */
export function Tooltip({ label, side = "right", children }) {
  const pos = side === "right"
    ? "left-full top-1/2 ml-2 -translate-y-1/2"
    : side === "bottom"
    ? "top-full left-1/2 mt-2 -translate-x-1/2"
    : "right-full top-1/2 mr-2 -translate-y-1/2";
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span role="tooltip" className={`pointer-events-none absolute z-50 ${pos} whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100`}>
        {label}
      </span>
    </span>
  );
}
