# Copilot Workload Matrix

## Goal
Reduce agent overhead by routing each request to the correct scope on the first pass.

## Scope Matrix
| Request Type | Primary Scope | Typical Files | Validation |
|---|---|---|---|
| Supabase startup, Kong, schema exposure, bucket provisioning | root or supabase/ | start.sh, supabase/docker-compose.yml, supabase/setup-poc-app.sh, supabase/kong.yml | targeted script/config check |
| New reusable UI/state/service pattern for future POCs | template-app/ | template-app/src/pages, template-app/src/components, template-app/src/stores | npm run lint && npm run build |
| Inspection-only workflow, defect flow, report pages | he-inspection/ | he-inspection/src/pages, he-inspection/src/stores, he-inspection/src/lib | npm run lint && npm run build |
| Bootstrap workflow or onboarding docs | root docs/ | README.md, docs/cline-workflow.md, AGENTS.md | doc consistency pass |

## Fast Decision Heuristic
1. If task mentions Docker/Kong/schema/storage or setup scripts, use root/supabase.
2. If behavior should be inherited by future apps, use template-app.
3. If behavior references CAT793, defects, inspections, equipment, reports, use he-inspection.

## Common Anti-Patterns to Avoid
- Adding inspection-only logic to template-app.
- Editing supabase/.env values directly in docs or commits.
- Creating new manual setup steps when scripts already exist.
- Running broad destructive docker/sql commands for small fixes.

## Suggested Agent Cadence
1. Discover: search for symbols/scripts first.
2. Route: lock scope and avoid cross-scope edits unless required.
3. Change: smallest patch, preserve conventions.
4. Validate: lint/build or targeted infra checks.
5. Summarize: list scope, files, risk, and next action.
