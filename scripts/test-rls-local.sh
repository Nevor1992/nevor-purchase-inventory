#!/usr/bin/env bash
# Kiểm thử RLS trên Postgres cục bộ (không cần project Supabase thật).
# Yêu cầu: PostgreSQL 14+ (psql/createdb) đang chạy, user hiện tại tạo được DB.
#
# Cách chạy:   scripts/test-rls-local.sh [tên-db]      (mặc định: novix_rls_test)
# Tuỳ biến:    PGHOST/PGPORT/PGUSER như chuẩn psql.
#
# Quy trình: tạo DB → shim môi trường Supabase (schema auth, auth.uid(), roles)
# → áp toàn bộ supabase/migrations (bỏ pg_cron — chỉ có trên Supabase)
# → chạy supabase/tests/rls_test.sql. Thoát khác 0 nếu có FAIL.
set -euo pipefail
cd "$(dirname "$0")/.."

DB="${1:-novix_rls_test}"
PSQL=(psql -X -v ON_ERROR_STOP=1 -d "$DB")

dropdb --if-exists "$DB"
createdb "$DB"

"${PSQL[@]}" -q -f supabase/tests/00_supabase_shim.sql

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
for f in supabase/migrations/*.sql; do
  sed 's/^create extension if not exists pg_cron;/-- pg_cron: supabase-only, skipped locally/' "$f" > "$tmp/$(basename "$f")"
  "${PSQL[@]}" -q -f "$tmp/$(basename "$f")"
done

# rls_test.sql tự raise exception nếu có test fail → psql thoát khác 0
"${PSQL[@]}" -1 -f supabase/tests/rls_test.sql | grep -E "PASS|FAIL|tổng"
echo "✔ RLS OK"
