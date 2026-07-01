#!/usr/bin/env bash
#
# Builds a Chrome Web Store-ready zip containing only the extension runtime
# files (no tests, docs, node_modules, or tooling).
#
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="$(node -p "require('./manifest.json').version")"
OUT_DIR="dist"
OUT="${OUT_DIR}/memento-${VERSION}.zip"

# Files/folders shipped to users. Keep this list minimal — everything the
# extension needs at runtime and nothing else.
INCLUDE=(
  manifest.json
  background.js
  index.html
  app.js
  shared.js
  styles.css
  icons
  fonts
)

mkdir -p "$OUT_DIR"
rm -f "$OUT"

# Strip macOS metadata that would otherwise bloat/flag the package.
find . -name '.DS_Store' -delete 2>/dev/null || true

zip -r -X "$OUT" "${INCLUDE[@]}" -x '*.DS_Store' >/dev/null

echo "Built $OUT"
unzip -l "$OUT"
