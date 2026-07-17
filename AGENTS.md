# AGENTS.md — Hermes Agent context for this project

## Project
AI POC Boilerplate — self-hosted Supabase on this VM (104.215.187.68) serving as the shared backend for all POC web apps.

## Architecture
- **Supabase** (self-hosted, Docker) — Postgres, Auth (GoTrue), PostgREST (auto REST API), Storage, Realtime, Studio
- **Kong** — API Gateway on port 8000 routes requests to sub-services
- **Studio** — Admin UI on port 3001 for DB management
- Each POC app gets its own Postgres schema (poc_*) within the shared Supabase instance
- AI features use a separate FastAPI proxy (optional, not yet deployed)

## Directory
- `supabase/` — Docker Compose + .env + volumes + templates
- `supabase/.env` — secrets (ANON_KEY, SERVICE_ROLE_KEY, JWT_SECRET, etc.)
- `supabase/docker-compose.yml` — official Supabase stack
- `supabase/templates/poc-schema-template.sql` — schema template for new apps
- `supabase/setup-poc-app.sh` — one-command script to create new POC app schema
- `start.sh` — one-command start

## API
- Auth: http://104.215.187.68:8000/auth/v1
- REST: http://104.215.187.68:8000/rest/v1
- Storage: http://104.215.187.68:8000/storage/v1
- Studio: http://104.215.187.68:3001
- Admin login: admin / poc_admin_2026

## Key Commands
- `cd supabase && sudo docker compose up -d` — start
- `cd supabase && sudo docker compose down` — stop
- `./supabase/setup-poc-app.sh <name>` — create new POC app

## Notes
- Email auto-confirm is ON (no need for real SMTP)
- Port 5432 used by Supabase Postgres internally (exposed as 5433 via Supavisor but actually uses 5432 internally via Docker network)
- Edge Functions not configured (ignore restart errors)
- Realtime may show unhealthy briefly — it works fine after warmup