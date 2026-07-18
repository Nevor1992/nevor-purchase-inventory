// Edge Function: admin-set-user-status
// Vô hiệu hoá / kích hoạt lại / xoá tài khoản nhân sự. service_role ở server.
// action: "disable" | "enable" | "delete"
//
// Guard: người gọi phải admin/ceo; không tự thao tác lên chính mình; chỉ CEO
// mới đụng tài khoản CEO; không vô hiệu hoá/xoá admin đang hoạt động cuối cùng.
// "disable" = ban auth (không đăng nhập được) + is_active=false.
// "delete"  = chỉ khi user CHƯA sở hữu/tạo task hay request (tránh vỡ FK); nếu
//             còn dữ liệu → báo lỗi, khuyên vô hiệu hoá.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const BAN = "876000h"; // ~100 năm

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, msg: "Method not allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ ok: false, msg: "Thiếu phiên đăng nhập" }, 401);
  const { data: caller, error: cErr } = await admin.auth.getUser(jwt);
  if (cErr || !caller?.user) return json({ ok: false, msg: "Phiên không hợp lệ" }, 401);
  const { data: me } = await admin.from("users").select("role").eq("id", caller.user.id).single();
  if (!me || !["admin", "ceo"].includes(me.role)) return json({ ok: false, msg: "Chỉ Admin/CEO được thao tác" }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ ok: false, msg: "Dữ liệu không hợp lệ" }, 400); }
  const userId = String(body.userId || "");
  const action = String(body.action || "");
  if (!userId) return json({ ok: false, msg: "Thiếu userId" }, 400);
  if (!["disable", "enable", "delete"].includes(action)) return json({ ok: false, msg: "Hành động không hợp lệ" }, 400);
  if (userId === caller.user.id) return json({ ok: false, msg: "Không thể tự thao tác lên tài khoản của chính bạn" }, 400);

  const { data: target } = await admin.from("users").select("role, is_active").eq("id", userId).single();
  if (!target) return json({ ok: false, msg: "Không tìm thấy người dùng" }, 404);
  if (target.role === "ceo" && me.role !== "ceo") return json({ ok: false, msg: "Chỉ CEO mới thao tác được tài khoản CEO" }, 403);

  // Không để mất admin hoạt động cuối cùng
  if ((action === "disable" || action === "delete") && (target.role === "admin" || target.role === "ceo")) {
    const { count } = await admin.from("users").select("id", { count: "exact", head: true })
      .in("role", ["admin", "ceo"]).eq("is_active", true).neq("id", userId);
    if (!count) return json({ ok: false, msg: "Không thể vô hiệu hoá/xoá quản trị viên hoạt động cuối cùng" }, 400);
  }

  if (action === "enable") {
    await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
    await admin.from("users").update({ is_active: true }).eq("id", userId);
    return json({ ok: true, isActive: true });
  }
  if (action === "disable") {
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: BAN });
    if (error) return json({ ok: false, msg: error.message }, 400);
    await admin.from("users").update({ is_active: false }).eq("id", userId);
    return json({ ok: true, isActive: false });
  }
  // delete — chỉ khi không còn dữ liệu tham chiếu
  const [{ count: owned }, { count: created }, { count: reqs }] = await Promise.all([
    admin.from("tasks").select("id", { count: "exact", head: true }).eq("owner_id", userId),
    admin.from("tasks").select("id", { count: "exact", head: true }).eq("creator_id", userId),
    admin.from("requests").select("id", { count: "exact", head: true }).eq("from_user_id", userId),
  ]);
  if ((owned || 0) + (created || 0) + (reqs || 0) > 0)
    return json({ ok: false, msg: "Người này đã có công việc/yêu cầu — hãy 'Vô hiệu hoá' thay vì xoá để giữ lịch sử." }, 409);
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) return json({ ok: false, msg: delErr.message }, 400);
  await admin.from("users").delete().eq("id", userId);
  return json({ ok: true, deleted: true });
});
