/* ============================================================================
   NovixWork — Design tokens (class-string primitives)
   Calm, minimal SaaS. One source of truth for buttons / inputs / cards / radius.
   Radius:  button/input 8px (rounded-lg) · card 12px (rounded-xl) · modal 16px (rounded-2xl)
   Border:  zinc-200 (light) · Shadow: only modal/drawer/dropdown/popover
   Text:    primary zinc-900 · secondary zinc-600 · muted zinc-400 · accent zinc-900
   ============================================================================ */

/* Buttons — focus-visible ring for keyboard a11y */
export const btnPri =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/30 focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed";
export const btnSec =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15 disabled:opacity-40 disabled:cursor-not-allowed";
export const btnGhost =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10";
export const btnDanger =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/25 disabled:opacity-40";

/* Inputs */
export const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 transition focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:border-zinc-300";
export const miniSelCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[13px] text-zinc-700 transition focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:border-zinc-300";

/* Surfaces */
export const cardCls = "rounded-xl border border-zinc-200 bg-white";
export const cardPad = "rounded-xl border border-zinc-200 bg-white p-4";
export const popoverCls = "rounded-xl border border-zinc-200 bg-white shadow-lg";

/* Status palette — dot / text / soft badge bg per work status */
export const STATUS_TONE = {
  todo:    { dot: "bg-zinc-400",    text: "text-zinc-600",    badge: "bg-zinc-100 text-zinc-600" },
  doing:   { dot: "bg-blue-500",    text: "text-blue-700",    badge: "bg-blue-50 text-blue-700" },
  waiting: { dot: "bg-amber-500",   text: "text-amber-700",   badge: "bg-amber-50 text-amber-700" },
  review:  { dot: "bg-violet-500",  text: "text-violet-700",  badge: "bg-violet-50 text-violet-700" },
  revise:  { dot: "bg-orange-500",  text: "text-orange-700",  badge: "bg-orange-50 text-orange-700" },
  done:    { dot: "bg-emerald-500", text: "text-emerald-700", badge: "bg-emerald-50 text-emerald-700" },
  paused:  { dot: "bg-zinc-300",    text: "text-zinc-400",    badge: "bg-zinc-100 text-zinc-400" },
};

/* Priority palette — dot + soft badge */
export const PRIORITY_TONE = {
  low:    { dot: "bg-zinc-300",  badge: "bg-zinc-100 text-zinc-500" },
  normal: { dot: "bg-blue-400",  badge: "bg-blue-50 text-blue-600" },
  high:   { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700" },
  urgent: { dot: "bg-red-500",   badge: "bg-red-50 text-red-600" },
};
