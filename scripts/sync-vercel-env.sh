#!/usr/bin/env bash
# Sync .env.local → Vercel Production (upsert). Usage: ./scripts/sync-vercel-env.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROD_URL="${NEXT_PUBLIC_SITE_URL_PROD:-https://crm-plomberie-henna.vercel.app}"
SCOPE="${VERCEL_SCOPE:-webweaves-projects}"
SKIP_KEYS="VERCEL_OIDC_TOKEN BACKEND_URL"

vercel_cmd() {
  npx --yes vercel@latest "$@" --scope "$SCOPE" --yes
}

add_env() {
  local key="$1"
  local value="$2"
  printf '%s' "$value" | vercel_cmd env add "$key" production --force --sensitive >/dev/null
  echo "  ✓ $key"
}

echo "→ Sync env vars to Vercel Production ($PROD_URL)"
count=0

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line// /}" ]] && continue
  [[ "$line" != *=* ]] && continue

  key="${line%%=*}"
  value="${line#*=}"

  # Strip surrounding quotes
  if [[ "$value" =~ ^\"(.*)\"$ ]]; then value="${BASH_REMATCH[1]}"; fi
  if [[ "$value" =~ ^\'(.*)\'$ ]]; then value="${BASH_REMATCH[1]}"; fi

  [[ -z "$value" ]] && continue

  for skip in $SKIP_KEYS; do
    [[ "$key" == "$skip" ]] && continue 2
  done

  if [[ "$key" == "NEXT_PUBLIC_SITE_URL" ]]; then
    value="$PROD_URL"
  fi

  add_env "$key" "$value"
  count=$((count + 1))
done < .env.local

echo "→ Done ($count variables upserted)"
