#!/usr/bin/env bash
# Régénère types/database.ts depuis le projet Supabase lié.
# Usage : SUPABASE_PROJECT_ID=... npm run types:gen
# En CI : échoue si le dump n'exporte pas `Database`.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${SUPABASE_PROJECT_ID:-}" ]]; then
  echo "SUPABASE_PROJECT_ID manquant — skip génération, vérification de l'export Database."
  grep -q "export type Database" types/database.ts
  echo "types/database.ts exporte bien Database."
  exit 0
fi

npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" --schema public > types/database.generated.ts
{
  echo "/** Généré par supabase gen types typescript — ne pas éditer à la main. */"
  cat types/database.generated.ts
  echo ""
  echo "export type DevisLigneRow = Database[\"public\"][\"Tables\"][\"devis_lignes\"][\"Row\"];"
} > types/database.ts
rm -f types/database.generated.ts
echo "types/database.ts régénéré."
