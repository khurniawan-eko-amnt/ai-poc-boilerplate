#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/copilot/scope-check.sh [git-ref]
# Examples:
#   scripts/copilot/scope-check.sh
#   scripts/copilot/scope-check.sh origin/main

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

BASE_REF="${1:-}"

if [[ -n "$BASE_REF" ]]; then
  CHANGED_FILES="$(git diff --name-only "$BASE_REF"...HEAD || true)"
else
  CHANGED_FILES="$(git diff --name-only HEAD || true)"
fi

if [[ -z "$CHANGED_FILES" ]]; then
  echo "No changed files detected."
  exit 0
fi

infra_count=0
template_count=0
inspection_count=0
other_count=0

while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  if [[ "$f" == supabase/* || "$f" == start.sh || "$f" == poc-init.sh || "$f" == README.md || "$f" == docs/* || "$f" == AGENTS.md || "$f" == .clinerules ]]; then
    infra_count=$((infra_count + 1))
  elif [[ "$f" == template-app/* ]]; then
    template_count=$((template_count + 1))
  elif [[ "$f" == he-inspection/* ]]; then
    inspection_count=$((inspection_count + 1))
  else
    other_count=$((other_count + 1))
  fi
done <<< "$CHANGED_FILES"

echo "Changed file scope summary"
echo "- root/supabase/docs: $infra_count"
echo "- template-app:      $template_count"
echo "- he-inspection:     $inspection_count"
echo "- other:             $other_count"

echo ""
echo "Scope recommendation"
if (( template_count > 0 && inspection_count == 0 && infra_count == 0 )); then
  echo "- Primary scope: template-app"
elif (( inspection_count > 0 && template_count == 0 && infra_count == 0 )); then
  echo "- Primary scope: he-inspection"
elif (( infra_count > 0 && template_count == 0 && inspection_count == 0 )); then
  echo "- Primary scope: root/supabase/docs"
else
  echo "- Multi-scope change detected"
  echo "- Confirm intentional cross-scope edits and document rationale"
fi
