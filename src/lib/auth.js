import { supabase } from "./supabase.js";

/* ============================================================================
   Auth helpers (Supabase mode). Used only when SUPABASE_ENABLED.
   Login = email/password. The signed-in auth.uid() maps 1:1 to a row in the
   public.users table (same id), which carries role / dept / hr access.
   ============================================================================ */

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, msg: error.message };
  return { ok: true, session: data.session };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

/* Load the app-level "me" object (UI shape) for the signed-in user id. */
export async function fetchMe(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, role, dept_id, brand_id, title, hr_confidential_access, email")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    role: data.role,
    deptId: data.dept_id,
    brandId: data.brand_id,
    title: data.title,
    hrConfidentialAccess: data.hr_confidential_access === true,
    email: data.email,
  };
}
