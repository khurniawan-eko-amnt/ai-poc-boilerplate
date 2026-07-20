# ─── Template App ──────────────────────────────────────────
# This is the forkable frontend scaffold for any POC AI web app.
# Each POC app is a copy of this directory with its own pages.

AI_POC_REPO=/home/KSAP6748/ai-poc-boilerplate
SUPABASE_URL=http://localhost:8000

## How to fork (fast — 10 seconds)
Run from the repo root:
```
./poc-init.sh my-new-poc "My New POC Title"
```
This does everything: copies template, creates schema + bucket, writes .env, installs deps, starts dev server on a free port.

## How to fork (manual)
1. `cp -r template-app/ ~/my-new-poc`
2. `cd ~/my-new-poc`
3. Create schema: `../supabase/setup-poc-app.sh my-new-poc`
4. Edit `.env` with ANON_KEY
5. `npm run dev`

## Conventions
- Zustand stores in stores/
- Pages in pages/
- Components in components/
- Toast notifications: `useToastStore.getState().add({ type, message })`
- Supabase client in services/supabase.ts
- AI proxy calls in services/ai-proxy.ts
- All requests use VITE_SUPABASE_URL env var

## Debug
- Ctrl+` toggles debug panel
- All API calls logged to debug store