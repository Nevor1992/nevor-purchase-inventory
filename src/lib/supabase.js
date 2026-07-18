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

export const SUPABASE_ENABLED = Boolean(url && anon);

export const supabase = SUPABASE_ENABLED
  ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
