#!/usr/bin/env bash
# Applique la migration profiles.metier / profiles.specialites en prod.
# Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx ./scripts/apply-profiles-metier-migration.sh

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-uvgjcozdqxnrnfmkmlwa}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL_FILE="${ROOT}/supabase/migrations/20260906200000_profiles_metier_specialites.sql"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "❌ Définis SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens)"
  exit 1
fi

QUERY="$(cat "$SQL_FILE")"

echo "→ Application migration profiles metier/specialites sur ${PROJECT_REF}…"

RESP="$(curl -sS -w "\n%{http_code}" -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "$QUERY" '{query: $q}')")"

HTTP_CODE="$(echo "$RESP" | tail -n1)"
BODY="$(echo "$RESP" | sed '$d')"

if [[ "$HTTP_CODE" != "200" && "$HTTP_CODE" != "201" ]]; then
  echo "❌ Échec HTTP ${HTTP_CODE}: ${BODY:0:500}"
  exit 1
fi

echo "✅ Migration appliquée: ${BODY:0:200}"
