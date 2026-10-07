#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERSION="$(node -p "require('./package.json').version")"
PACKAGE_NAME="ZenOrbit-Figma-Plugin-v${VERSION}"
STAGING_DIR="release/$PACKAGE_NAME"
ARCHIVE_PATH="release/$PACKAGE_NAME.zip"

rm -rf release
mkdir -p "$STAGING_DIR/dist"

cp manifest.json README.md LICENSE "$STAGING_DIR/"
cp dist/code.js dist/ui.html "$STAGING_DIR/dist/"

(
  cd release
  zip -qr "$PACKAGE_NAME.zip" "$PACKAGE_NAME"
)

echo "Package created: $ARCHIVE_PATH"
