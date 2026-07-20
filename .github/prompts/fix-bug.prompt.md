---
mode: ask
description: Fix a bug with strict scope routing and minimal risk
---
You are fixing a bug in this repository.

Requirements:
1. Determine correct scope first: root/supabase, template-app, or he-inspection.
2. Read AGENTS.md, .clinerules, and docs/cline-workflow.md before editing.
3. Prefer smallest patch that resolves root cause.
4. Preserve existing frontend conventions (stores, services, debug/toast usage).
5. Avoid exposing secrets and avoid destructive operations.
6. Run relevant validation:
   - frontend: npm run lint && npm run build in changed app
   - infra/scripts: targeted safe checks only
7. Provide final output with:
   - root cause
   - changed files
   - validation run
   - residual risk
