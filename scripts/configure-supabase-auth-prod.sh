#!/usr/bin/env bash
# Configure Supabase Auth URLs for production (flowo.agency).
# Requires SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens
#
# Usage:
#   SUPABASE_ACCESS_TOKEN=sbp_xxx ./scripts/configure-supabase-auth-prod.sh
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-uvgjcozdqxnrnfmkmlwa}"
SITE_URL="${SITE_URL:-https://flowo.agency}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "❌ Définis SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens)"
  exit 1
fi

# Keep localhost for dev; add prod callback + password reset paths.
ALLOW_LIST="http://localhost:3000/**,https://flowo.agency/**,https://www.flowo.agency/**"

echo "→ PATCH auth config for project $PROJECT_REF"
echo "  site_url: $SITE_URL"
echo "  uri_allow_list: $ALLOW_LIST"

curl -sf -X PATCH "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --arg site_url "$SITE_URL" \
    --arg uri_allow_list "$ALLOW_LIST" \
    '{site_url: $site_url, uri_allow_list: $uri_allow_list}')" \
  | jq '{site_url, uri_allow_list, external_email_enabled}'

echo "✓ Supabase Auth configuré"
