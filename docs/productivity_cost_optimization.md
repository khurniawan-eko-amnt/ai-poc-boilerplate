# Productivity & Cost Optimization Guide — Phase 2+

> **Goal:** Reduce time-to-MVP from 7 days to **3 days** and API cost from ~$12.60 to **~$5 per POC**

Based on analysis of Phase 1 — where 19,048 LOC were delivered across 3 layers for ~$27.60 in 7 calendar days — this guide captures the patterns, workflows, and infrastructure that make each subsequent POC dramatically faster and cheaper.

---

## Table of Contents

1. [The Forking Workflow](#1-the-forking-workflow) — How to spin up a new POC in minutes
2. [Agent Prompt Templates](#2-agent-prompt-templates) — Reusable prompts for Hermes/Nous
3. [Cost Optimization Strategies](#3-cost-optimization-strategies) — Cut API token spend 50%+
4. [Time Optimization Strategies](#4-time-optimization-strategies) — Cut development time 50%+
5. [Project Convention Checklist](#5-project-convention-checklist) — Standards for consistency
6. [Infrastructure Best Practices](#6-infrastructure-best-practices) — VM, Docker, Supabase tuning
7. [Post-POC Process](#7-post-poc-process) — What to do after each POC
8. [Quick Reference Cards](#8-quick-reference-cards)

---

## 1. The Forking Workflow

This is the single biggest lever for POC #2 onwards. Instead of building from scratch, you fork the boilerplate.

### 1.1 One-Command Fork

```bash
# From the ai-poc-boilerplate directory:

# Step 1: Copy the template app
cp -r template-app/ ~/my-new-poc

# Step 2: Create the backend schema + storage bucket
cd /home/KSAP6748/ai-poc-boilerplate
./supabase/setup-poc-app.sh my-new-poc "My New POC Title"

# Step 3: Edit .env with the ANON_KEY
cd ~/my-new-poc
# VITE_SUPABASE_URL=http://localhost:8000
# VITE_SUPABASE_ANON_KEY=<from supabase/.env>

# Step 4: Install + dev
npm install
npm run dev
```

**⏱️ Time: ~5 minutes** — You now have a working React app with auth, chat, voice, file upload, and a Supabase schema ready for your custom tables.

### 1.2 What You Get For Free

Every forked POC starts with these working features at **zero additional development cost**:

| Feature | File | What it does |
|---------|------|-------------|
| Login/Register | `pages/Login.tsx`, `Register.tsx` | Supabase auth with session persistence |
| Auth store | `stores/authStore.ts` | User state, signUp/signIn/signOut |
| AI Chat | `pages/Chat.tsx` | Streaming markdown chat with file attachments |
| Voice Input | `components/VoiceButton.tsx` | Web Speech API (id-ID) with suffix dedup |
| File Upload | `components/FileUpload.tsx` | Drag-drop to Supabase Storage |
| Debug Panel | `components/DebugPanel.tsx` | Ctrl+` shows all API calls + errors |
| Responsive Layout | `components/Layout.tsx` | Sidebar (desktop) + bottom nav (mobile) + dark mode |
| Settings | `pages/Settings.tsx` | Theme toggle, model selection |
| Documents | `pages/Documents.tsx` | File browser for Storage bucket |

### 1.3 What You Need to Build Per POC

Only the **domain-specific** parts:

- **Schema migration** — Your app's tables (usually 3–8 tables)
- **Custom pages** — Your app-specific UI (usually 3–10 pages)
- **Custom stores** — App-specific state (usually 1–3 stores)
- **Seed data** — Initial data for demo/testing

### 1.4 Shared Resource Map

```
┌──────────────────────────────────────────────┐
│               One Supabase Instance            │
│  ┌─────────┬─────────┬─────────┬────────────┐  │
│  │ Auth    │ DB      │ Storage │ Studio     │  │
│  │ (shared)│ (shared)│ (shared)│ (shared)   │  │
│  └────┬────┴──┬──────┴───┬─────┴─────┬──────┘  │
│       │       │          │           │         │
│  ┌────┴┐ ┌────┴┐  ┌─────┴┐  ┌──────┴┐       │
│  │POC 1│ │POC 2│  │POC 3│  │POC 4  │ ...     │
│  │schema│ │schema│  │schema│  │schema │       │
│  └─────┘ └─────┘  └──────┘  └───────┘       │
└──────────────────────────────────────────────┘
```

---

## 2. Agent Prompt Templates

The most expensive part of Phase 1 was the first session where context had to be rebuilt. These templates **dramatically reduce token waste** by seeding the agent with complete context.

### 2.1 Bootstrapping a New POC

```markdown
I want to create a new POC app called "[app-name]" — a [short description].

## Architecture (already deployed)
- Supabase self-hosted on Azure VM (104.215.187.68), Kong on :8000
- Create schema: `./supabase/setup-poc-app.sh [app-name]`  
- Clone template: `cp -r template-app/ ~/my-poc && cd ~/my-poc && npm install`
- Frontend: Vite + React 19 + TypeScript + Tailwind 4 + Zustand + Supabase JS
- Debug panel: Ctrl+` (already built-in)
- Auth store pattern in `stores/authStore.ts`
- Supabase client in `services/supabase.ts` (change SCHEMA constant)

## What I need
[Describe your specific requirements — pages, tables, flows]
```

### 2.2 Adding Features to an Existing POC

```markdown
I'm adding [feature description] to my POC at /home/KSAP6748/ai-poc-boilerplate/[app-name].

## Context
- Running schema: poc_[app_name]
- Files already in src/pages/ are: [list existing pages]
- Supabase client uses schema: poc_[app_name]

## The feature
[Describe the feature]

## Constraints
- RLS stays disabled during dev
- Store pattern uses Zustand (see stores/)
- All Supabase queries use `.from('[table]')` within the schema
```

### 2.3 One-Line Bug Fix Prompt

When you know the issue but need the agent to fix it:

```markdown
Bug: [describe symptom — e.g., "login fails with 400 on signup"]
Repo: /home/KSAP6748/ai-poc-boilerplate/[app-name]
Error: [paste error from console or debug panel]
Context: [anything relevant — e.g., "I just added the users table"]
```

---

## 3. Cost Optimization Strategies

Phase 1 cost breakdown showed **~85% of tokens are input + cache** — meaning the agent spends most of its budget *reading* context, not *producing* output. Each strategy below targets a specific waste.

### 3.1 Strategy: Provide Sparse Prompts (Highest Impact)

**Cost impact: -40% tokens**

Phase 1 analysis: Long prompts with full file contents cost the most. Instead of:

```markdown
❌ Read this 700-line file and then modify it:
...
```

Use:

```markdown
✅ In /path/to/file.tsx, change the button text to "Submit" and add onClick handler
```

**Rule of thumb:** If you can describe the change in 2 sentences, the agent can find the file itself. Only paste file contents when the change is structural.

### 3.2 Strategy: Use AGENTS.md Files

**Cost impact: -15% tokens**

When you put project context in `AGENTS.md`, the agent reads it once and caches it. Without it, the agent re-discovers the project structure every session — burning cache tokens on `ls`, `find`, `read_file` calls for information it already has.

**Project root AGENTS.md** (already exists — keep updated):
```markdown
# AGENTS.md
Project: name
Supabase: http://localhost:8000, schema: poc_<name>
Start: cd /path && npm run dev
Conventions: Zustand stores in stores/, pages in pages/
Debug: Ctrl+`
```

### 3.3 Strategy: Batch Changes

**Cost impact: -20% tokens**

Instead of asking for changes one at a time:

```markdown
❌ "Change the button color to blue"
   (waits) "Now change the font size"
   (waits) "Add a tooltip too"
```

```markdown
✅ "Make 3 changes to the Submit page:
   1. Button color → blue (indigo-600)
   2. Font size → 14px (text-sm)  
   3. Add tooltip: 'This submits the inspection'"
```

Each round-trip costs ~200K+ tokens (system prompt + conversation history). Batching 3 changes in one message saves 2 round-trips = **~400K tokens saved per session**.

### 3.4 Strategy: Use `execute_code` for Bulk Work

**Cost impact: -30% for bulk operations**

The `execute_code` tool executes Python that calls Hermes tools internally — all internal tool results stay in the `execute_code` context and **don't enter your conversation context**. This avoids the most expensive cost driver: growing conversation history.

**When to use:**
- Bulk file operations (rename 20 files, change imports in 15 files)
- Data processing (format 100 seed records, generate SQL from CSV)
- Analysis tasks (count lines, find patterns, generate reports)

**When NOT to use:** Complex reasoning, debugging, design decisions — these need the main agent's full reasoning.

### 3.5 Strategy: Respect Cache Boundaries

**Cost impact: -10%**

The model caches system prompts and early conversation context. Cache hits cost **50% less** than fresh tokens. To maximize cache hits:

- **Don't restart sessions unnecessarily** — Each `/new` or session reset resets the cache
- **Group related work** — Do all changes for one feature in one session
- **Avoid uploading large files** — Use URLs or describe content instead

### 3.6 Cost Budget Table

| Phase 2 POC Type | Est. Tokens | Est. API Cost | Est. Time |
|-----------------|------------:|--------------:|----------:|
| Simple CRUD (3 pages, 2 tables) | 15M input, 150K output | ~$3.50 | 1–2 sessions |
| Medium (6 pages, 5 tables, forms) | 30M input, 300K output | ~$7.00 | 3–4 sessions |
| Complex (10+ pages, offline, media) | 50M input, 450K output | ~$11.00 | 5–6 sessions |
| **Phase 1 baseline** | **79M input** | **$19.39** | **16 sessions** |

With the strategies above, expect **50-60% reduction** on each tier.

---

## 4. Time Optimization Strategies

### 4.1 Parallel Workflows

**Time impact: -40% calendar time**

The agent can spawn **background subagents** that work independently. Use this when:

- One subagent designs schema while another starts on UI
- One fixes bugs while another writes documentation
- One researches API while another implements the integration

**Trigger pattern:**

```markdown
Delegate 2 tasks in parallel:
1. Create the SQL migration for [table definitions]  
2. Build the equipment list page with mock data
Use the project conventions from AGENTS.md
```

### 4.2 Use the Debug Panel

**Time impact: -30% debugging time**

The **Ctrl+`** debug panel logs every API call and error. When something breaks:

1. Press Ctrl+` → read the error message and failed API call
2. Copy the error into the agent with the minimal context
3. Agent fixes immediately — no need to describe what happened

### 4.3 Commit Often

**Time impact: -15% rework**

After each working feature:

```bash
git add -A && git commit -m "feat: add [feature]"
git push
```

This gives you a checkpoint to revert to if a later change breaks something, and prevents the "everything broke, lost my work" scenario.

### 4.4 Test the Production Build Before Calling Done

**Time impact: -25% missed issues**

```bash
npm run build
```

A `tsc -b && vite build` catches TypeScript errors, missing exports, and import issues that don't show in dev mode. Always run this before declaring a feature complete.

### 4.5 Keep the Dev Server Running

**Time impact: -10% overhead**

Keep `npm run dev` running in the background between sessions. The agent can test changes immediately without waiting for cold starts.

```
→ Terminal: server running on :4000 (he-inspection)  
→ Start new POC on :4001 or use Python http.server for built output
```

Use separate ports for each POC if running multiple simultaneously:

```bash
cd ~/poc-a && npm run dev -- --port 4001
cd ~/poc-b && npm run dev -- --port 4002
```

---

## 5. Project Convention Checklist

Follow these conventions so the agent (and you) can navigate any POC without re-learning:

### 5.1 File Structure

```
my-poc/
├── src/
│   ├── pages/           ← One file per page route
│   ├── stores/          ← Zustand stores (auth, inspection, etc.)
│   ├── components/      ← Shared UI components
│   ├── lib/             ← Types, constants, utilities
│   └── services/        ← supabase.ts, ai-proxy.ts
├── migrations/          ← SQL migration files (001-init.sql, 002-add-feature.sql)
├── docs/                ← Project-specific documentation
├── AGENTS.md            ← Agent context for this app
├── DEPENDENCIES.md      ← Any non-standard dependencies
└── README.md            ← Quick start + features
```

### 5.2 Supabase Client Pattern

```typescript
// services/supabase.ts
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const SCHEMA = 'poc_my_app'   // ← CHANGE THIS per POC

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  db: { schema: SCHEMA },
})
```

### 5.3 Store Pattern

```typescript
import { create } from 'zustand'
import { supabase } from '../services/supabase'

interface MyState {
  items: Item[]
  loading: boolean
  fetchItems: () => Promise<void>
}

export const useMyStore = create<MyState>((set) => ({
  items: [],
  loading: false,
  fetchItems: async () => {
    set({ loading: true })
    const { data, error } = await supabase.from('my_table').select('*')
    if (!error && data) set({ items: data })
    set({ loading: false })
  },
}))
```

### 5.4 Page Pattern

```typescript
// Pages use the Layout component automatically via router
// Just export the page component as default:
export default function MyPage() {
  return <div>...</div>
}

// Protected routes use the <ProtectedRoute> wrapper in App.tsx
// Public routes (login, register) stay outside the layout
```

### 5.5 Environment Variables

| Variable | Value | Where |
|----------|-------|-------|
| `VITE_SUPABASE_URL` | `http://localhost:8000` | `.env` (local) |
| `VITE_SUPABASE_ANON_KEY` | from `supabase/.env` | `.env` (local) |
| **Never** commit `.env` | | `.gitignore` handles this |

---

## 6. Infrastructure Best Practices

### 6.1 SSH Tunnel Setup

The VM's NSG blocks most ports. Always use SSH tunneling:

```bash
# Minimum tunnel — frontend + Supabase
ssh -L 4000:localhost:4000 -L 8000:localhost:8000 KSAP6748@104.215.187.68

# Full tunnel — add Studio access
ssh -L 4000:localhost:4000 -L 8000:localhost:8000 -L 3001:localhost:3001 KSAP6748@104.215.187.68
```

### 6.2 Supabase Management Cheatsheet

| Task | Command |
|------|---------|
| Start all services | `cd /home/KSAP6748/ai-poc-boilerplate/supabase && sudo docker compose up -d` |
| Stop all | `cd /home/KSAP6748/ai-poc-boilerplate/supabase && sudo docker compose down` |
| Restart PostgREST (after schema change) | `sudo docker compose up -d --force-recreate rest` |
| Add schema to PostgREST | Edit `PGRST_DB_SCHEMAS` in `.env`, then restart rest |
| Create new POC schema | `./setup-poc-app.sh <name>` |
| Access Postgres directly | `sudo docker compose exec -T db psql -U postgres` |
| Run SQL migration | `cat migration.sql \| sudo docker compose exec -T db psql -U postgres` |
| View logs (specific service) | `sudo docker compose logs -f rest` |
| Check all services health | `sudo docker ps --format "table {{.Names}}\t{{.Status}}"` |

### 6.3 Port Allocation

| Port | Service | POC # | Notes |
|------|---------|-------|-------|
| 8000 | **Kong** (Supabase) | All | Always running |
| 3001 | **Studio** (Supabase) | All | Admin UI |
| 4000 | he-inspection | POC 1 | Production serve |
| 4001+ | Next POC | POC 3+ | dev or production serve |

### 6.4 Development vs Production

| Mode | Command | Port | Auto-reload |
|------|---------|------|-------------|
| Development | `npm run dev` | 4001+ (any free) | ✅ Hot reload |
| Production | `npm run build && python3 -m http.server 4000 --directory dist/` | 4000 | ❌ Rebuild required |

**For development, use `npm run dev -- --port 40XX`** on a port not used by another running POC.

---

## 7. Post-POC Process

### 7.1 When a POC is Complete

1. **Commit the AGENTS.md update** — Save any new conventions discovered during this POC
2. **Push to GitHub** — `git add -A && git commit -m "feat: [poc-name] complete" && git push`
3. **Document learnings** — What went fast? What went slow? What surprised you?
4. **Save domain-specific patterns as skills** — If the POC needed a unique approach (e.g., complex Supabase query, unusual component pattern), save it as a Hermes skill so the agent knows it on future sessions
5. **Pull improvements back** — If you built a better component in the POC that the template could use, copy it back into `template-app/src/components/`

### 7.2 Cost Tracking Template

For each POC, track:

```markdown
| Metric | Value |
|--------|-------|
| POC Name | [name] |
| Sessions used | [count] |
| Est. API cost | $[cost] |
| Calendar time | [days] |
| Human active time | [hours] |
| LOC delivered | [count] |
| Pages delivered | [count] |
| Tables created | [count] |
```

### 7.3 When to Update the Boilerplate

Update `template-app/` when:

- A new Supabase feature becomes standard (e.g., Realtime subscriptions, Edge Functions)
- A dependency needs upgrading (React, Vite, Tailwind major versions)
- You discover a better pattern for auth, storage, or state management
- You build a reusable component that would benefit all future POCs (e.g., data table, chart, form builder)

**How:** Copy the improved file(s) from your POC into `template-app/`:

```bash
cp ~/my-poc/src/components/NewComponent.tsx /home/KSAP6748/ai-poc-boilerplate/template-app/src/components/
```

---

## 8. Quick Reference Cards

### Card 1: New POC Launch (5 min)

```bash
# 1. Fork template
cp -r /home/KSAP6748/ai-poc-boilerplate/template-app/ ~/my-poc
cd ~/my-poc

# 2. Create schema
/home/KSAP6748/ai-poc-boilerplate/supabase/setup-poc-app.sh my-poc "My POC"

# 3. Edit .env
echo "VITE_SUPABASE_URL=http://localhost:8000" > .env
echo "VITE_SUPABASE_ANON_KEY=$(grep ^ANON_KEY /home/KSAP6748/ai-poc-boilerplate/supabase/.env | cut -d= -f2)" >> .env

# 4. Install + dev
npm install
npm run dev -- --port 4001
```

### Card 2: Agent Session Start

```
Project: [name]
Path: /home/KSAP6748/[path]
Schema: poc_[name]
Supabase: localhost:8000
Goal: [one sentence]
```

### Card 3: Cost-Saving Behaviors

- ✅ Batch 3+ changes in one message
- ✅ Use `execute_code` for bulk file operations
- ✅ Keep sessions running — don't restart
- ✅ Put context in AGENTS.md
- ❌ Paste full file contents
- ❌ Ask for one change per message
- ❌ Upload screenshots and large files

### Card 4: Debug Flow

```
[Something broken] 
  → Press Ctrl+` (debug panel)
  → Read the failed API call + error
  → Send to agent: "Fix: [error message]"
  → Agent reads the error + fixes
  → Verify: refresh page, check debug panel clears
```

### Card 5: Token & Cost Quick Math

| Action | Tokens | Cost |
|--------|-------:|-----:|
| One round-trip (avg) | ~200K input | ~$0.03 |
| One full session (avg) | ~2.5M input | ~$0.38 |
| Production build + fix cycle | ~500K input | ~$0.08 |
| **Phase 1 total** | **79M input** | **$19.39** |
| **Current POC (optimized) est.** | **~15-30M input** | **$3-7** |

---

> **Bottom line:** The **first POC cost ~$28 and 7 days** (infrastructure + learning curve).  
> **Each subsequent POC should cost ~$5-10 and 1-3 days** — a 60-70% reduction in both time and cost.
>
> The key lever is the fork workflow — you never rebuild auth, storage, voice, debug, layout, or Supabase infrastructure again.
>
> *Last updated: July 19, 2026*