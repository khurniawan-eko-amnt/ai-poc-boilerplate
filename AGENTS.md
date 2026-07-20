# AGENTS.md — agent context for `it-dt-poc`

## Project
AI POC Boilerplate — a shared self-hosted Supabase backend plus frontend scaffolds for AI-powered POC applications.

## Repository role
This repository has three main responsibilities:
- `supabase/` — shared backend stack and provisioning scripts
- `template-app/` — canonical frontend scaffold for new POC apps
- `he-inspection/` — the current concrete inspection application built from the scaffold

When routing work:
- use repo root or `supabase/` for infrastructure, Docker, Kong, schema, storage, and bootstrap workflow tasks
- use `template-app/` for reusable scaffold improvements
- use `he-inspection/` for app-specific inspection features and fixes

## Architecture
- **Supabase** (self-hosted via Docker) provides Postgres, Auth, PostgREST, Storage, Realtime, and Studio
- **Kong** exposes the local API gateway on port `8000`
- **Studio** is available on port `3001`
- Each POC app gets:
  - a Postgres schema named `poc_<app_name>`
  - a storage bucket named `poc-<app-name>`
- AI features may use a separate proxy service, but the current repository focus is the shared Supabase-backed workflow

## Source-of-truth files
Prefer these before creating new workflow or documentation:
- `README.md`
- `start.sh`
- `poc-init.sh`
- `supabase/setup-poc-app.sh`
- `.clinerules`
- `docs/cline-workflow.md`

## Key commands

### Start shared backend
```bash
./start.sh
```

### Create a new POC app
```bash
./poc-init.sh <app-name> "App Title"
```

### Manual schema and bucket provisioning
```bash
supabase/setup-poc-app.sh <app-name> "App Title"
```

### Common Supabase management
```bash
cd supabase && sudo docker compose up -d
cd supabase && sudo docker compose down
sudo docker compose up -d --force-recreate rest
cat migration.sql | sudo docker compose exec -T db psql -U postgres
```

## Important URLs
- Auth: `http://localhost:8000/auth/v1`
- REST: `http://localhost:8000/rest/v1`
- Storage: `http://localhost:8000/storage/v1`
- Studio: `http://localhost:3001`

## Frontend conventions
For both frontend apps:
- pages live in `src/pages/`
- reusable UI lives in `src/components/`
- Zustand stores live in `src/stores/`
- shared helpers and types live in `src/lib/`
- Supabase client lives in `src/services/supabase.ts`
- AI proxy calls live in `src/services/ai-proxy.ts`

Preserve these patterns:
- useful store and request events should be logged to `useDebugStore`
- user-facing outcomes should go through `useToastStore`
- request code should stay aligned with `VITE_SUPABASE_URL`
- scaffold behavior in `template-app/` should remain reusable and not drift into app-specific logic

## Built-in scaffold capabilities
`template-app/` already includes these baseline capabilities:
- authentication
- session persistence
- AI chat
- file upload
- voice input
- toast notifications
- debug panel
- responsive layout
- settings page

Prefer extending existing patterns over building parallel systems.

## Safety rules
- Treat `supabase/.env` and all app `.env` files as sensitive
- Never print or overwrite secret values casually
- Do not casually edit `package-lock.json` unless dependency changes are required
- Do not change Docker service names, Kong routes, or PostgREST schema wiring unless the task explicitly requires it
- Avoid destructive reset or schema-drop behavior unless explicitly requested

## Validation expectations
There is no meaningful automated test suite today.

For frontend changes, validate with:
```bash
npm run lint
npm run build
```

Run validation in the app you changed:
- `template-app/` for scaffold work
- `he-inspection/` for live app work

For infrastructure changes, prefer targeted and safe verification rather than destructive restarts.

## Notes
- Email auto-confirm is enabled for local development
- Realtime may appear unhealthy briefly during startup and often recovers after warmup
- Edge functions are not part of the current working path
- Keep documentation aligned with scripts rather than introducing parallel manual steps