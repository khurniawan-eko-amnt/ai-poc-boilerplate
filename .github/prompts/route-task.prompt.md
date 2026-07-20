---
mode: ask
description: Decide task routing and execution plan for it-dt-poc
---
Classify the user request into one of these scopes:
- root/supabase
- template-app
- he-inspection

Then produce:
1. Scope decision with reason.
2. Files likely impacted.
3. Minimal validation plan.
4. Notes on whether change should be mirrored between template-app and he-inspection.

Guardrails:
- Do not invent workflow that conflicts with start.sh, poc-init.sh, or supabase/setup-poc-app.sh.
- Keep scaffold reusable and avoid app-specific leakage.
- Do not expose secrets from .env files.
