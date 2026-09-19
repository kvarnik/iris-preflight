#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPEC="$ROOT/spec/sysadmin-api.json"
EXPECTED="1ab154c7c5d9b25e6b227944a44a120c670686f876c2e14abfb9ee5898596650"

if [[ "${1:-}" != "" ]]; then
  cp "$1" "$SPEC"
fi

if [[ ! -f "$SPEC" ]]; then
  echo "missing $SPEC" >&2
  exit 1
fi

ACTUAL="$(shasum -a 256 "$SPEC" | awk '{print $1}')"
if [[ "$ACTUAL" != "$EXPECTED" ]]; then
  echo "spec SHA256 mismatch" >&2
  echo "  expected $EXPECTED" >&2
  echo "  actual   $ACTUAL" >&2
  exit 1
fi

echo "verified $SPEC"
echo "sha256  $ACTUAL"
