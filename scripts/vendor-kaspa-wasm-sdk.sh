#!/usr/bin/env bash

set -euo pipefail

VERSION="${1:-v2.0.0}"
VERSION_NO_V="${VERSION#v}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
DEST_DIR="$ROOT_DIR/public/vendor/kaspa-wasm/$VERSION_NO_V"
ARCHIVE_NAME="kaspa-wasm32-sdk-${VERSION}.zip"
ARCHIVE_URL="https://github.com/kaspanet/rusty-kaspa/releases/download/${VERSION}/${ARCHIVE_NAME}"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

curl -L -s "$ARCHIVE_URL" -o "$TMP_DIR/$ARCHIVE_NAME"
unzip -q "$TMP_DIR/$ARCHIVE_NAME" -d "$TMP_DIR"

SRC_DIR="$TMP_DIR/kaspa-wasm32-sdk"

rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR/web" "$DEST_DIR/examples/web/resources"

cp "$SRC_DIR/LICENSE" "$DEST_DIR/LICENSE"
cp "$SRC_DIR/README.md" "$DEST_DIR/README.md"
cp "$SRC_DIR/CHANGELOG.md" "$DEST_DIR/CHANGELOG.md"

cp -R "$SRC_DIR/web/kaspa-rpc" "$DEST_DIR/web/"
cp -R "$SRC_DIR/web/kaspa-core" "$DEST_DIR/web/"

# The upstream SDK bundles nested .gitignore files inside the generated web
# packages. Remove them here so the vendored runtime assets are tracked and
# actually make it into deployments.
find "$DEST_DIR/web" -name .gitignore -delete
find "$DEST_DIR/web" -name "*.d.ts" -exec perl -pi -e 's/[ \t]+$//' {} +

cp -R "$SRC_DIR/examples/web/resources/." "$DEST_DIR/examples/web/resources/"
perl -pi -e 's%<a href="index\.html"><- Back</a> \| Network: <span id="menu"></span><span id="actions"></span><br>&nbsp;<br>%<a id="back-link" href="/build#try-live"><- Back</a> | Network: <span id="menu"></span><span id="actions"></span><br>%' \
  "$DEST_DIR/examples/web/resources/utils.js"
perl -0pi -e 's%\ndocument\.addEventListener\('\''DOMContentLoaded'\'', \(\) => \{\n    createMenu\(\);\n\}\);%\nfunction setupBackLink() {\n    let backLink = document.getElementById('\''back-link'\'');\n    if (!backLink) {\n        return;\n    }\n\n    const fallback = '\''/build#try-live'\'';\n    backLink.setAttribute('\''href'\'', fallback);\n\n    if (window.top !== window.self) {\n        backLink.setAttribute('\''target'\'', '\''_top'\'');\n        return;\n    }\n\n    let referrer;\n    try {\n        referrer = document.referrer ? new URL(document.referrer) : null;\n    } catch {\n        referrer = null;\n    }\n\n    const cameFromBuild =\n        referrer &&\n        referrer.origin === window.location.origin &&\n        referrer.pathname === '\''/build'\'';\n\n    if (cameFromBuild) {\n        backLink.setAttribute(\n            '\''href'\'',\n            referrer.hash ? referrer.toString() : `${referrer.origin}/build#try-live`\n        );\n\n        backLink.addEventListener('\''click'\'', (event) => {\n            if (window.history.length > 1) {\n                event.preventDefault();\n                window.history.back();\n            }\n        });\n    }\n}\n\ndocument.addEventListener('\''DOMContentLoaded'\'', () => {\n    setupBackLink();\n    createMenu();\n});%' \
  "$DEST_DIR/examples/web/resources/utils.js"

for example in \
  get-server-info.html \
  get-block-dag-info.html \
  subscribe-block-added.html \
  subscribe-daa-changed.html \
  utxo-context.html
do
  cp "$SRC_DIR/examples/web/$example" "$DEST_DIR/examples/web/$example"
done

echo "Vendored Kaspa WASM SDK assets to $DEST_DIR"
