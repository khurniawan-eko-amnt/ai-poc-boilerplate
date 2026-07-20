# Copilot Support Pack

This folder and its companion scripts standardize Copilot execution for this repository.

## Files
- .github/copilot-instructions.md: primary Copilot behavior and safety rules
- .github/prompts/route-task.prompt.md: quick scope routing prompt
- .github/prompts/fix-bug.prompt.md: bug-fix workflow prompt
- docs/copilot/WORKLOAD-MATRIX.md: request type to scope mapping
- scripts/copilot/context-brief.sh: compact startup context snapshot
- scripts/copilot/scope-check.sh: changed-file scope analyzer
- scripts/copilot/validate-changed.sh: run lint/build only in affected frontend app(s)

## Quick usage
From repository root:

```bash
scripts/copilot/context-brief.sh
scripts/copilot/scope-check.sh
scripts/copilot/validate-changed.sh
```

Using a base branch reference:

```bash
scripts/copilot/scope-check.sh origin/main
scripts/copilot/validate-changed.sh origin/main
```

## Team Workflow
1. Route task to correct scope first.
2. Apply minimal edits.
3. Validate only affected scope.
4. Keep docs/scripts aligned with start.sh, poc-init.sh, and supabase/setup-poc-app.sh.
