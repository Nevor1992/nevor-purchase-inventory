import { createClient } from "@supabase/supabase-js";

/* ============================================================================
   Supabase client — DUAL MODE.
   - No env vars  → SUPABASE_ENABLED = false → app runs the in-memory prototype
     (demo/UAT and the published artifact keep working, data resets on refresh).
   - Env vars set → real backend: Auth + Postgres + RLS + Storage.
   Set these in a .env file (see .env.example). Vite only exposes VITE_* vars.
   ============================================================================ */
const url = import.meta.env?.VITE_SUPABASE_URL;
const anon = import.meta.env?.VITE_SUPABASE_ANON_KEY;

/* A real anon key is a JWT (eyJx.y.z) or a new-style sb_publishable_… key.
   Placeholder text (e.g. "eyJ...(anon key của bạn)") would otherwise reach the
   fetch layer and die with a cryptic non-ISO-8859-1 header error — catch it
   here and fall back to prototype mode with a visible config warning. */
const urlValid = typeof url === "string" &&
  (/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.trim()) ||
   /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(url.trim())); /* supabase CLI local dev */
const anonValid = typeof anon === "string" && /^(eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_[\w-]+)$/.test(anon.trim());

/* Demo mode override: `?demo=1` (or `?demo`) in the URL forces the in-memory
   prototype with seed data even on a Supabase-configured build. Lets one
   deployment serve both the real app (login) and a no-login demo for training
   — link: https://<host>/?demo=1 . Query string survives hash routing. */
export const DEMO_FORCED = typeof window !== "undefined"
  && new URLSearchParams(window.location.search).has("demo");

export const SUPABASE_ENABLED = urlValid && anonValid && !DEMO_FORCED;

/* Chỉ báo lỗi khi CẤU HÌNH thật sự sai — KHÔNG phụ thuộc cờ demo (nếu không,
   link ?demo=1 trên bản production hợp lệ sẽ hiện cảnh báo placeholder sai). */
export const SUPABASE_CONFIG_ERROR = (url || anon) && !(urlValid && anonValid)
  ? (!urlValid
      ? "VITE_SUPABASE_URL không hợp lệ (cần dạng https://<project>.supabase.co)."
      : "VITE_SUPABASE_ANON_KEY không đúng định dạng — có vẻ vẫn là placeholder. Dán anon key thật từ Supabase → Project Settings → API.")
  : null;

if (SUPABASE_CONFIG_ERROR) console.warn(`[supabase] ${SUPABASE_CONFIG_ERROR} App đang chạy chế độ prototype in-memory.`);

export const supabase = SUPABASE_ENABLED
  ? createClient(url.trim().replace(/\/$/, ""), anon.trim(), { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
