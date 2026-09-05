#!/usr/bin/env bash
# Applique la migration subscription_plan (pro_plus, pme) sur Supabase prod.
# Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx ./scripts/apply-subscription-plan-migration.sh

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-uvgjcozdqxnrnfmkmlwa}"
SQL="$(cat <<'SQL'
alter table public.profiles drop constraint if exists profiles_subscription_plan_check;
alter table public.profiles
  add constraint profiles_subscription_plan_check
  check (subscription_plan in ('free', 'pro', 'pro_plus', 'pme'));
SQL
)"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "❌ Définis SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens)"
  echo "   Ou exécute le SQL dans le SQL Editor :"
  echo "$SQL"
  exit 1
fi

payload=$(python3 - <<PY
import json, sys
print(json.dumps({"query": sys.stdin.read()}))
PY
<<<"$SQL")

curl -sf "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$payload" | python3 -m json.tool

echo "✓ Migration subscription_plan appliquée"
