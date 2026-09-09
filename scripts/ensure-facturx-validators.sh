#!/usr/bin/env bash
# Télécharge Mustang-CLI, veraPDF (PDF/A-3) et France_RFE (Schematron Super PDP).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/tools/validators"
FRANCE_RFE_REF="${FRANCE_RFE_REF:-v1.4.0.04}"
mkdir -p "$DIR"
cd "$DIR"

if [[ -x /opt/homebrew/opt/openjdk@17/bin/java ]]; then
  export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

MUSTANG_URL="https://repo1.maven.org/maven2/org/mustangproject/Mustang-CLI/2.23.0/Mustang-CLI-2.23.0.jar"
if [[ ! -f Mustang-CLI.jar ]]; then
  echo "Téléchargement Mustang-CLI 2.23.0…"
  curl -fsSL -o Mustang-CLI.jar "$MUSTANG_URL"
fi

vera_ok() {
  if command -v verapdf >/dev/null 2>&1; then
    return 0
  fi
  if [[ -x "$DIR/verapdf/verapdf" ]]; then
    return 0
  fi
  return 1
}

if ! vera_ok; then
  echo "Téléchargement veraPDF installer…"
  curl -fsSL -o verapdf-installer.zip "https://software.verapdf.org/rel/verapdf-installer.zip"
  unzip -qo verapdf-installer.zip -d verapdf-unpack
  INSTALLER_JAR="$(find verapdf-unpack -name 'verapdf-izpack-installer-*.jar' | head -n 1)"
  if [[ -z "${INSTALLER_JAR}" ]]; then
    echo "Installer veraPDF introuvable dans le zip."
    exit 1
  fi
  cat > auto-install.xml <<EOF
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<AutomatedInstallation langpack="eng">
  <com.izforge.izpack.panels.htmlhello.HTMLHelloPanel id="welcome"/>
  <com.izforge.izpack.panels.target.TargetPanel id="install_dir">
    $DIR/verapdf
  </com.izforge.izpack.panels.target.TargetPanel>
  <com.izforge.izpack.panels.packs.PacksPanel id="sdk_pack_select">
    <pack index="0" name="veraPDF GUI" selected="false"/>
    <pack index="1" name="veraPDF CLI" selected="true"/>
    <pack index="2" name="veraPDF Documentation" selected="false"/>
    <pack index="3" name="veraPDF Sample Files" selected="false"/>
  </com.izforge.izpack.panels.packs.PacksPanel>
  <com.izforge.izpack.panels.install.InstallPanel id="install"/>
  <com.izforge.izpack.panels.finish.FinishPanel id="finish"/>
</AutomatedInstallation>
EOF
  java -jar "$INSTALLER_JAR" "$DIR/auto-install.xml"
  chmod +x "$DIR/verapdf/verapdf" || true
  rm -f verapdf-installer.zip
fi

FRANCE_RFE_XSLT="$DIR/france-rfe/FNFE_RFE_INVOICE/Factur-X/EN16931/2xslt/BR-FR-Flux2-Schematron-CII.xslt"
need_france_rfe=0
if [[ ! -f "$FRANCE_RFE_XSLT" ]]; then
  need_france_rfe=1
elif [[ -d "$DIR/france-rfe/.git" ]]; then
  current="$(git -C "$DIR/france-rfe" describe --tags --always 2>/dev/null || true)"
  if [[ "$current" != "$FRANCE_RFE_REF" ]]; then
    need_france_rfe=1
  fi
fi
if [[ "$need_france_rfe" -eq 1 ]]; then
  echo "Téléchargement France_RFE ${FRANCE_RFE_REF}…"
  rm -rf "$DIR/france-rfe"
  git clone --depth 1 --branch "$FRANCE_RFE_REF" https://github.com/fnfempe/France_RFE.git "$DIR/france-rfe"
fi

echo "Mustang : $DIR/Mustang-CLI.jar"
if command -v verapdf >/dev/null 2>&1; then
  echo "veraPDF : $(command -v verapdf)"
elif [[ -x "$DIR/verapdf/verapdf" ]]; then
  echo "veraPDF : $DIR/verapdf/verapdf"
else
  echo "veraPDF : non installé"
  exit 1
fi
echo "France_RFE : $DIR/france-rfe (${FRANCE_RFE_REF})"
