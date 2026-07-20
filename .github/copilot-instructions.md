# Copilot Instructions for it-dt-poc

## Objective
Work fast with safe, minimal changes while respecting this repository split:
- supabase/: shared backend stack and provisioning
- template-app/: reusable frontend scaffold
- he-inspection/: live inspection app

## Task Routing Rules
Pick one primary scope before editing:
- Infrastructure task: repo root or supabase/
- Reusable scaffold task: template-app/
- Inspection-specific feature/fix: he-inspection/

If a change belongs in multiple scopes:
- implement in one scope first
- mirror intentionally to the other scope
- document why divergence exists when only one scope changes

## Source of Truth
Always align with:
- README.md
- AGENTS.md
- .clinerules
- docs/cline-workflow.md
- start.sh
- poc-init.sh
- supabase/setup-poc-app.sh

Do not invent parallel workflow if scripts already define one.

## Safety and Secrets
- Never print secret values from .env files.
- Never overwrite supabase/.env casually.
- Do not alter Docker service names, Kong routing, or PostgREST wiring unless explicitly required.
- Avoid destructive SQL or reset operations unless explicitly requested.

## Frontend Conventions
Preserve these locations in both frontend apps:
- src/pages/
- src/components/
- src/stores/
- src/lib/
- src/services/supabase.ts
- src/services/ai-proxy.ts

Preserve behavior patterns:
- log useful events/errors with useDebugStore
- user-facing outcomes via useToastStore
- requests aligned with VITE_SUPABASE_URL

## Validation
There is no meaningful automated test suite. For frontend edits run:
1. npm run lint
2. npm run build

Run validation in the changed app only:
- template-app/ for scaffold changes
- he-inspection/ for inspection app changes

For infra/script edits use targeted checks and avoid destructive restarts.

## Output Expectations
- Make smallest practical change.
- Keep docs and scripts consistent.
- Include short rationale and impacted scope in final summary.
- If blocked by missing infra (for example missing RPC), apply safe fallback and report exact blocker.
