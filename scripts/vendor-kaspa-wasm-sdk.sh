#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_EXAMPLE_CONTRACT_OUTPUT="$(
  node \
    --no-warnings=MODULE_TYPELESS_PACKAGE_JSON \
    --experimental-strip-types \
    "$ROOT_DIR/scripts/i18n/print-build-example-contract.mts"
)"
BUILD_EXAMPLE_CONTRACT=()
while IFS= read -r contract_line; do
  BUILD_EXAMPLE_CONTRACT+=("$contract_line")
done <<< "$BUILD_EXAMPLE_CONTRACT_OUTPUT"

if (( ${#BUILD_EXAMPLE_CONTRACT[@]} < 2 )) || [[ -z "${BUILD_EXAMPLE_CONTRACT[0]}" ]]; then
  echo "Build example contract adapter returned incomplete output" >&2
  exit 1
fi

SUPPORTED_VERSION="${BUILD_EXAMPLE_CONTRACT[0]}"
EXAMPLE_FILES=("${BUILD_EXAMPLE_CONTRACT[@]:1}")

VERSION="${1:-v$SUPPORTED_VERSION}"
VERSION_NO_V="${VERSION#v}"

if [[ "$VERSION_NO_V" != "$SUPPORTED_VERSION" ]]; then
  echo "Unsupported SDK version $VERSION_NO_V; update the Build artifact contract first" >&2
  exit 1
fi

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

for example in "${EXAMPLE_FILES[@]}"; do
  cp "$SRC_DIR/examples/web/$example" "$DEST_DIR/examples/web/$example"
done

node \
  --no-warnings=MODULE_TYPELESS_PACKAGE_JSON \
  --experimental-strip-types \
  "$ROOT_DIR/scripts/i18n/build-example-artifacts.mts" \
  --prepare-vendor

echo "Vendored Kaspa WASM SDK assets to $DEST_DIR"
