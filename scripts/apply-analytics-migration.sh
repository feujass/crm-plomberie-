#!/usr/bin/env bash
# Applique les migrations analytics (dashboard + funnel) sur Supabase prod.
# Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx ./scripts/apply-analytics-migration.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_REF="${SUPABASE_PROJECT_REF:-uvgjcozdqxnrnfmkmlwa}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "❌ SUPABASE_ACCESS_TOKEN manquant."
  echo "   Crée un token : https://supabase.com/dashboard/account/tokens"
  echo "   Puis : SUPABASE_ACCESS_TOKEN=sbp_xxx ./scripts/apply-analytics-migration.sh"
  exit 1
fi

SQL="$(cat "$ROOT/supabase/migrations/20260831180000_analytics_dashboard.sql" "$ROOT/supabase/migrations/20260831183000_analytics_funnel.sql")"

payload=$(python3 - <<PY
import json, sys
print(json.dumps({"query": sys.stdin.read()}))
PY
<<<"$SQL")

echo "→ Application migrations analytics sur $PROJECT_REF…"
curl -sf "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$payload" | python3 -m json.tool

echo "✓ Migrations analytics appliquées"
