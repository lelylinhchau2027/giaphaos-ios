#!/usr/bin/env bash
# Patch third-party iOS sources so Expo 57 builds on Xcode 26 / Swift 6.2.
# Safe to re-run (idempotent).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DATE_SWIFT="node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Coding/JavaScriptCodable+Date.swift"

if [[ -f "$DATE_SWIFT" ]]; then
  # Swift 6.2: abs(Double) is ambiguous without annotation; use magnitude.
  if grep -q 'abs(milliseconds)' "$DATE_SWIFT"; then
    # portable in-place replace
    python3 - <<'PY'
from pathlib import Path
p = Path("node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Coding/JavaScriptCodable+Date.swift")
text = p.read_text()
old = "abs(milliseconds) <= maxJavaScriptDateMilliseconds"
new = "milliseconds.magnitude <= maxJavaScriptDateMilliseconds"
if old in text:
    p.write_text(text.replace(old, new))
    print(f"patched: {p} (abs → magnitude)")
else:
    print(f"skip: pattern not found in {p}")
PY
  else
    echo "skip: $DATE_SWIFT already patched or pattern absent"
  fi
else
  echo "skip: $DATE_SWIFT not present (install deps first)"
fi

echo "patch-ios-deps: done"
