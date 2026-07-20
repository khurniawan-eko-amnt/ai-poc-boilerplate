#!/usr/bin/env bash
set -euo pipefail

# Validate only affected frontend scopes.
# Usage:
#   scripts/copilot/validate-changed.sh [git-ref]
# Example:
#   scripts/copilot/validate-changed.sh origin/main

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

BASE_REF="${1:-}"
if [[ -n "$BASE_REF" ]]; then
  CHANGED_FILES="$(git diff --name-only "$BASE_REF"...HEAD || true)"
else
  CHANGED_FILES="$(git diff --name-only HEAD || true)"
fi

needs_template=0
needs_inspection=0

while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  [[ "$f" == template-app/* ]] && needs_template=1
  [[ "$f" == he-inspection/* ]] && needs_inspection=1
done <<< "$CHANGED_FILES"

if (( needs_template == 0 && needs_inspection == 0 )); then
  echo "No frontend app changes detected. Skipping lint/build."
  exit 0
fi

run_checks() {
  local app_dir="$1"
  echo ""
  echo "==> Validating $app_dir"
  cd "$ROOT_DIR/$app_dir"
  npm run lint
  npm run build
  cd "$ROOT_DIR"
}

(( needs_template == 1 )) && run_checks "template-app"
(( needs_inspection == 1 )) && run_checks "he-inspection"

echo ""
echo "Validation complete."
