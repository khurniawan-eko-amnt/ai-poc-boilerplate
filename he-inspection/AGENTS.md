# AGENTS.md — agent context for `he-inspection`

## Directory role
`he-inspection/` is the current concrete inspection application built from the shared scaffold.
Use this directory for:
- inspection-specific workflows
- equipment, inspection, defect, report, and template screens
- app-specific state, types, and UI behavior

If a requested change should benefit future POC applications broadly, consider whether it belongs in `../template-app/` instead.

## Relationship to the scaffold
This app inherits the same structural conventions as `template-app/`, but it is allowed to contain inspection-specific domain logic and UI.

Prefer:
- keeping shared improvements in `template-app/`
- keeping CAT793 inspection terminology and workflows here
- documenting intentional divergence from the scaffold when relevant

## Development workflow
Preferred commands:
```bash
npm run dev
npm run lint
npm run build
npm run preview
```

There is no meaningful automated test suite yet, so lint and build are the main validation steps for most work.

## Conventions
Preserve the existing layout:
- `src/pages/` for route-level screens
- `src/components/` for reusable UI
- `src/stores/` for Zustand state
- `src/lib/` for shared helpers and types
- `src/services/supabase.ts` for Supabase access
- `src/services/ai-proxy.ts` for AI-related requests

Preserve these patterns:
- use `useToastStore.getState().add({ type, message })` for user-facing notifications
- log useful workflow and request events to `useDebugStore`
- keep requests aligned with `VITE_SUPABASE_URL`
- keep inspection-specific domain logic local to this app unless intentionally generalized

## Debug
- `Ctrl+\`` toggles the debug panel
- API calls and useful workflow events should be visible in the debug store

## Safety rules
- never print or overwrite `.env` secrets casually
- avoid changing `package-lock.json` unless dependency changes are required
- avoid changing shared backend assumptions without checking the root workflow docs

## Validation
Preferred commands:
```bash
npm run lint
npm run build
```

Run these in `he-inspection/` after app code changes.