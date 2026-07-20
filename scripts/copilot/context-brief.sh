#!/usr/bin/env bash
set -euo pipefail

# Print compact project context for agent startup.
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

echo "Project: it-dt-poc"
echo "Date: $(date +%Y-%m-%d)"
echo ""

echo "Top-level folders:"
ls -1 | sed 's/^/- /'

echo ""
echo "Authoritative workflow files:"
for f in AGENTS.md .clinerules docs/cline-workflow.md start.sh poc-init.sh supabase/setup-poc-app.sh; do
  if [[ -f "$f" ]]; then
    echo "- $f"
  fi
done

echo ""
echo "Recent changes (last 15 commits):"
git --no-pager log --oneline -n 15 | sed 's/^/- /'

echo ""
echo "Uncommitted files:"
git status --short || true
