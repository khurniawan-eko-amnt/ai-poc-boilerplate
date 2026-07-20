# AGENTS.md — Hermes Agent context for this project

## Project
AI POC Boilerplate — self-hosted Supabase on this VM (localhost) serving as the shared backend for all POC web apps.

## Architecture
- **Supabase** (self-hosted, Docker) — Postgres, Auth (GoTrue), PostgREST (auto REST API), Storage, Realtime, Studio
- **Kong** — API Gateway on port 8000 routes requests to sub-services
- **Studio** — Admin UI on port 3001 for DB management
- Each POC app gets its own Postgres schema (poc_*) within the shared Supabase instance
- AI features use a separate FastAPI proxy (optional, not yet deployed)

## Directory
- `poc-init.sh` — **One-command launcher** for new POC apps (copy template + create schema + install + start)
- `supabase/` — Docker Compose + .env + volumes + templates
- `supabase/.env` — secrets (ANON_KEY, SERVICE_ROLE_KEY, JWT_SECRET, etc.)
- `supabase/docker-compose.yml` — official Supabase stack
- `supabase/templates/poc-schema-template.sql` — schema template for new apps
- `supabase/setup-poc-app.sh` — script to create new POC app schema (called by poc-init.sh)
- `template-app/` — forkable React + Vite + TS + Tailwind scaffold
- `he-inspection/` — first concrete POC (CAT793 inspection app)
- `start.sh` — one-command Supabase start
- `docs/` — development reports, productivity/optimization guide

## API
- Auth: http://localhost:8000/auth/v1
- REST: http://localhost:8000/rest/v1
- Storage: http://localhost:8000/storage/v1
- Studio: http://localhost:3001
- Admin login: admin / poc_admin_2026

## Key Commands
### New POC (fast — 10s)
```
./poc-init.sh <app-name> "App Title"
```
Creates ~/<app-name> with schema, auth, storage, .env, deps installed, dev server on free port.

### Manual fork
```
cp -r template-app/ ~/<app-name>
cd ~/<app-name>
./supabase/setup-poc-app.sh <app-name> "App Title"
# edit .env with ANON_KEY
npm run dev -- --port 4001
```

### Supabase Management
- `cd supabase && sudo docker compose up -d` — start
- `cd supabase && sudo docker compose down` — stop
- `sudo docker compose up -d --force-recreate rest` — restart PostgREST after schema change
- `cat migration.sql | sudo docker compose exec -T db psql -U postgres` — run migration

## Conventions
- Pages in src/pages/, stores in src/stores/, components in src/components/
- Zustand for state, @supabase/supabase-js for API, Tailwind 4 for CSS
- Every store logs to debugStore: `useDebugStore.getState().add('info', '...')`
- Toast notifications: `useToastStore.getState().add({ type: 'success'|'error'|'info'|'warning', message })`
- Ctrl+` opens debug panel showing all API calls and errors
- RLS disabled during dev (enable only for production)
- Schema naming: poc_<app_name> (underscores), bucket naming: poc-<app-name> (hyphens)

## Template-app built-in features (free in every fork)
- Auth (login/register via Supabase, session persistence)
- AI Chat (streaming markdown with files + voice)
- Voice input (Web Speech API, id-ID)
- File upload (drag-drop to Supabase Storage)
- Toast notification system
- Debug panel (Ctrl+`)
- Responsive dark-mode layout (sidebar + mobile bottom nav)
- Settings (theme toggle, model selection)

## Notes
- Email auto-confirm is ON (no need for real SMTP)
- Port 5432 used by Supabase Postgres internally (Docker network only)
- Edge Functions not configured (ignore restart errors)
- Realtime may show unhealthy briefly — it works fine after warmup