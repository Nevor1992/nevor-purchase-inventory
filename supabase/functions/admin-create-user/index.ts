// Edge Function: admin-create-user
// Tạo tài khoản nhân sự (email + mật khẩu đặt sẵn, email tự xác nhận) THEO YÊU CẦU
// của admin đang đăng nhập. service_role chỉ sống ở server này — không bao giờ ra frontend.
//
// Bảo mật: người gọi phải là admin/ceo (kiểm tra qua JWT → public.users.role).
// Chỉ CEO mới tạo được tài khoản vai trò 'ceo'.
//
// Deploy: supabase functions deploy admin-create-user --project-ref <ref>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const ROLES = ["employee", "leader", "admin", "ceo"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, msg: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // 1) Danh tính người gọi từ JWT
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ ok: false, msg: "Thiếu phiên đăng nhập" }, 401);
  const { data: caller, error: callerErr } = await admin.auth.getUser(jwt);
  if (callerErr || !caller?.user) return json({ ok: false, msg: "Phiên không hợp lệ" }, 401);

  // 2) Người gọi phải là admin/ceo
  const { data: profile } = await admin.from("users").select("role").eq("id", caller.user.id).single();
  if (!profile || !["admin", "ceo"].includes(profile.role))
    return json({ ok: false, msg: "Chỉ Admin/CEO được tạo tài khoản" }, 403);

  // 3) Kiểm tra dữ liệu vào
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ ok: false, msg: "Dữ liệu không hợp lệ" }, 400); }
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();
  const deptId = body.deptId ? String(body.deptId) : null;
  const title = body.title ? String(body.title).trim() : null;
  const role = ROLES.includes(String(body.role)) ? String(body.role) : "employee";

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, msg: "Email không hợp lệ" }, 400);
  if (password.length < 6) return json({ ok: false, msg: "Mật khẩu tối thiểu 6 ký tự" }, 400);
  if (!name) return json({ ok: false, msg: "Thiếu họ tên" }, 400);
  if (role === "ceo" && profile.role !== "ceo") return json({ ok: false, msg: "Chỉ CEO tạo được tài khoản CEO" }, 403);

  // 4) Tạo auth user (email tự xác nhận — admin chia sẻ mật khẩu trực tiếp)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name },
  });
  if (createErr) {
    const dup = /already|exist|registered|duplicate/i.test(createErr.message);
    return json({ ok: false, msg: dup ? "Email này đã có tài khoản" : createErr.message }, dup ? 409 : 400);
  }
  const newId = created.user!.id;

  // 5) Điền hồ sơ (trigger auth→users đã tạo dòng mặc định 'employee'; ghi đè bằng lựa chọn của admin)
  const { error: upErr } = await admin.from("users")
    .update({ name, role, dept_id: deptId, title }).eq("id", newId);
  if (upErr) {
    // Dự phòng: nếu trigger chưa chạy, tự chèn dòng hồ sơ
    await admin.from("users").upsert({ id: newId, email, name, role, dept_id: deptId, title });
  }

  return json({ ok: true, userId: newId });
});
