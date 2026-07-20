# Cline workflow for `it-dt-poc`

## Purpose
This document is the operational playbook for AI-assisted work in this repository. It complements `.clinerules` and `AGENTS.md` by describing how to route tasks, which scripts are authoritative, and what validation to run after changes.

## Repository map
- `supabase/` — self-hosted Supabase stack, Kong config, schema setup scripts, templates
- `template-app/` — canonical React/Vite/TypeScript scaffold for new POC applications
- `he-inspection/` — current inspection-focused application derived from the scaffold
- `docs/` — project reports, workflow notes, and agent guidance
- root scripts — operational entrypoints for backend startup and app provisioning

## Task routing
Choose the working area before editing files.

### Work at repo root or under `supabase/` when the task involves
- Docker or Docker Compose
- Kong routing
- Supabase startup
- shared schema provisioning
- PostgREST schema exposure
- storage bucket creation
- new POC app bootstrap workflow
- root documentation about shared infrastructure

### Work in `template-app/` when the task involves
- reusable scaffold behavior
- shared UI patterns that should exist in future POC apps
- base auth/chat/upload/settings/debug functionality
- conventions for pages, stores, components, or services
- improvements that should be inherited by newly created apps

### Work in `he-inspection/` when the task involves
- CAT793 inspection workflows
- inspection-specific pages, stores, data types, or reports
- behavior that is intentionally app-specific
- live app fixes that should not automatically affect the scaffold

## Source-of-truth commands

### Start shared backend
Run from repo root:
```bash
./start.sh
```

Use this instead of inventing manual startup steps unless the task explicitly requires low-level Docker work.

What it does at a high level:
- ensures `supabase/.env` exists, using `.env.example` when needed
- starts the Supabase Docker stack
- exposes Kong on `http://localhost:8000`
- exposes Studio on `http://localhost:3001`

### Create a new POC app
Run from repo root:
```bash
./poc-init.sh <app-name> "App Title"
```

Use this as the preferred bootstrap path.

What it does at a high level:
- copies `template-app/` into a new app directory under the user's home directory
- provisions a Postgres schema
- provisions a storage bucket
- updates the frontend `.env`
- installs dependencies
- starts a dev server on an available port

### Provision schema and bucket manually
Run from repo root:
```bash
supabase/setup-poc-app.sh <app-name> "App Title"
```

Use this when the task is specifically about schema creation, bucket setup, or repairing the provisioning step.

## Naming conventions
Preserve these across code, docs, and scripts:
- Postgres schema: `poc_<app_name>`
- Storage bucket: `poc-<app-name>`

Use underscores in schema names and hyphens in bucket names.

## Environment and secrets
Treat the following as sensitive:
- `supabase/.env`
- app `.env` files
- anon keys, service role keys, JWT secrets, SMTP credentials, or any secret token

Rules:
- never print secret values in generated docs
- never overwrite `.env` casually
- prefer `.env.example` when documenting configuration
- if a task requires mentioning env vars, mention names only unless the user explicitly asks for values

## Editing expectations

### For infrastructure changes
Prefer minimal, targeted edits.
Do not casually change:
- Docker service names
- Kong routes
- PostgREST wiring
- default schema exposure behavior
- destructive SQL or reset flows

When infrastructure behavior changes, update relevant docs.

### For frontend changes
Preserve existing structure:
- `src/pages/`
- `src/components/`
- `src/stores/`
- `src/lib/`
- `src/services/supabase.ts`
- `src/services/ai-proxy.ts`

Preserve existing app patterns:
- useful events should be logged via `useDebugStore`
- user-visible outcomes should go through `useToastStore`
- Supabase requests should remain aligned with `VITE_SUPABASE_URL`

### Shared scaffold discipline
`template-app/` must remain reusable.
Do not put inspection-only logic into the scaffold unless the task explicitly intends to generalize that behavior.

## Validation guidance

### Frontend validation
There is no meaningful automated test suite today. For most frontend work, run:
```bash
npm run lint
npm run build
```

Run validation in the app you changed:
- `template-app/` for scaffold work
- `he-inspection/` for live app work

### Infrastructure validation
Prefer the lightest safe verification that matches the change:
- shell script review
- configuration review
- targeted syntax checks
- Docker Compose checks only if needed and safe

Avoid destructive resets or container teardown unless explicitly requested.

## Documentation update rules
Update docs when any of the following change:
- bootstrap workflow
- validation workflow
- architecture expectations
- folder conventions
- safety constraints for agents
- differences between scaffold and live app behavior

Prefer concise, operational documentation over broad narrative text.

## Recommended completion checklist
Before finishing a task, confirm:
1. edits were made in the correct scope
2. no secrets were exposed
3. naming conventions still match repository expectations
4. relevant docs were updated if workflow changed
5. the most relevant validation available was run for changed code

## Relationship between guidance files
- `.clinerules` — concise execution rules for Cline
- `AGENTS.md` — project and directory context for agents
- `docs/cline-workflow.md` — durable workflow playbook with routing and validation guidance

Keep these files consistent with each other and with the operational scripts.