# AGENTS.md — agent context for `template-app`

## Directory role
`template-app/` is the canonical frontend scaffold for new AI POC applications.
Changes in this directory should be:
- reusable across future apps
- generic instead of inspection-specific
- aligned with the shared Supabase workflow defined at the repo root

If a change only makes sense for the current inspection product, it should usually go in `../he-inspection/` instead.

## Preferred bootstrap workflow
From the repo root, use:
```bash
./poc-init.sh <app-name> "App Title"
```

This is the preferred way to create a new app from the scaffold because it:
- copies the template
- provisions the schema
- provisions the storage bucket
- writes the app `.env`
- installs dependencies
- starts a dev server on a free port

## Manual workflow
Use the manual path only when the task specifically requires it:
1. copy `template-app/` to a new app directory
2. run `supabase/setup-poc-app.sh <app-name> "App Title"`
3. update the new app `.env`
4. run `npm run dev`

## Stack
This app uses:
- React
- TypeScript
- Vite
- Zustand
- Supabase client

## Conventions
Preserve the existing layout:
- `src/pages/` for page-level screens
- `src/components/` for reusable UI
- `src/stores/` for Zustand state
- `src/lib/` for helpers and shared types
- `src/services/supabase.ts` for Supabase access
- `src/services/ai-proxy.ts` for AI-related requests

Preserve these patterns:
- use `useToastStore.getState().add({ type, message })` for user-facing notifications
- log useful API and workflow events to `useDebugStore`
- keep requests aligned with `VITE_SUPABASE_URL`
- keep scaffold behavior reusable

## Built-in scaffold capabilities
The template already includes baseline features for new POC apps:
- authentication
- session persistence
- AI chat
- file upload
- voice input
- toast notifications
- debug panel
- responsive layout
- settings

Prefer extending these patterns over introducing parallel systems.

## Debug
- `Ctrl+\`` toggles the debug panel
- API calls and useful workflow events should be visible in the debug store

## Validation
Preferred commands:
```bash
npm run lint
npm run build
```

There is no meaningful automated test suite yet, so lint and build are the main validation steps.

## Safety rules
- never print or overwrite `.env` secrets casually
- avoid changing `package-lock.json` unless dependency changes are required
- avoid app-specific domain leakage into the scaffold