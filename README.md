# AI POC Boilerplate

A self-hosted **Supabase backend** for rapidly prototyping AI solution web apps. Deploy once, fork per POC.

## Architecture

```
Your React POC App  ──→  Supabase (self-hosted on this VM)
                              │
                    ┌─────────┼─────────┐
                    │         │         │
                    ▼         ▼         ▼
                Auth     Postgres   Storage
              (GoTrue)  (REST API)  (Files)
```

- **One Supabase instance** — shared backend for all your POC apps
- **Schema-per-app isolation** — each POC app gets its own Postgres schema
- **Built-in Auth** — email/password JWT auth
- **Auto REST API** — PostgREST turns your tables into REST endpoints
- **File Storage** — Supabase Storage for uploads
- **Studio Admin UI** — manage DB, SQL, users, buckets from a web dashboard

## Quick Start

### Prerequisites

- Docker & Docker Compose installed
- Ports 8000, 3001, 8443 free on this VM

### 1. Deploy Supabase (one-time)

```bash
cd supabase
cp .env.example .env        # Edit secrets if needed
sudo docker compose up -d    # Start all services
```

Wait 30 seconds for services to initialize.

### 2. Verify It's Running

```bash
# Test auth — signup a test user
curl -X POST http://localhost:8000/auth/v1/signup \
  -H "apikey: $(grep ^ANON_KEY supabase/.env | awk -F= '{print $2}')" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123456"}'

# Test REST API
curl -H "apikey: $(grep ^SERVICE_ROLE_KEY supabase/.env | awk -F= '{print $2}')" \
  http://localhost:8000/rest/v1/
```

### 3. Open Studio Admin

Browse to: **http://104.215.187.68:3001**

Login with:
- **Username:** `admin`
- **Password:** `poc_admin_2026` (or check `DASHBOARD_PASSWORD` in `.env`)

From Studio you can:
- Run SQL queries
- Create/manage tables
- View users
- Create Storage buckets
- Set Row Level Security policies

### 4. Create a New POC App

```bash
./supabase/setup-poc-app.sh <app-name> [app-title]

# Example:
./supabase/setup-poc-app.sh chat-assistant "AI Chat Assistant"
```

This creates:
- Schema `poc_chat_assistant` in Postgres
- Storage bucket `poc-chat-assistant`
- Enables the schema in PostgREST

### 5. Build Your React POC App

```bash
# Create a new React app
npm create vite@latest my-poc -- --template react-ts
cd my-poc
npm install @supabase/supabase-js

# Configure Supabase client
cat > src/lib/supabase.ts << 'EOF'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://104.215.187.68:8000'
const supabaseAnonKey = '<get this from supabase/.env ANON_KEY>'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
EOF
```

## Services Reference

| Service | URL | Description |
|---------|-----|-------------|
| **Kong Gateway** | `http://104.215.187.68:8000` | Single entry point for all APIs |
| **Auth API** | `http://104.215.187.68:8000/auth/v1` | Signup, login, user management |
| **REST API** | `http://104.215.187.68:8000/rest/v1` | Auto-generated CRUD from your tables |
| **Storage API** | `http://104.215.187.68:8000/storage/v1` | File uploads and downloads |
| **Realtime** | `http://104.215.187.68:8000/realtime/v1` | WebSocket subscriptions |
| **Studio** | `http://104.215.187.68:3001` | Admin dashboard |

## Environment Variables

Key variables in `supabase/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_PASSWORD` | auto-generated | Database password |
| `ANON_KEY` | auto-generated | Public API key for browser use |
| `SERVICE_ROLE_KEY` | auto-generated | Admin API key (keep secret) |
| `JWT_SECRET` | auto-generated | Token signing key |
| `DASHBOARD_USERNAME` | admin | Studio login |
| `DASHBOARD_PASSWORD` | auto-generated | Studio password |
| `ENABLE_EMAIL_AUTOCONFIRM` | true | Auto-confirm signups (no email needed) |
| `PGRST_DB_SCHEMAS` | public,storage,graphql_public | Schemas exposed via REST API |

## Managing Supabase

```bash
# Start
cd supabase && sudo docker compose up -d

# Stop
cd supabase && sudo docker compose down

# View logs
sudo docker compose logs -f supabase-rest
sudo docker compose logs -f supabase-auth

# Restart a service
sudo docker compose up -d --force-recreate <service>

# Access Postgres directly
sudo docker compose exec db psql -U postgres
```

## POC App Template (Schema)

See `supabase/templates/poc-schema-template.sql` for a complete template with:
- Schema creation with grants
- Example tables (chats, messages, uploads)
- Row Level Security policies
- Indexes and triggers

## Key Design Decisions

1. **Self-hosted** — All data stays on this VM. No external cloud dependencies
2. **No backend code needed** — Supabase replaces your API server with auto-generated REST + RLS
3. **Schema-per-app isolation** — Each POC app gets its own Postgres schema in the shared DB
4. **Auth is shared** — Users are shared across all POC apps (single login)
5. **AI API calls go through a separate proxy** if needed (FastAPI, optional)

## How Forking Works

```
new-poc-app/
├── src/
│   ├── lib/supabase.ts       # Points to VM:8000
│   ├── components/           # Your UI
│   ├── pages/                # Your routes
│   └── App.tsx
├── migrations/
│   └── 001-init.sql          # Your schema SQL
├── Dockerfile                # Deploy as container
└── .env                      # ANON_KEY from supabase/.env
```

Each POC app is just a React frontend + SQL migration. No backend server needed.

## Template App — What's Included

The `template-app/` directory is a complete React + Vite scaffold you fork for every new POC:

```
template-app/
├── src/
│   ├── services/supabase.ts    # Supabase client (URL + ANON_KEY from .env)
│   ├── services/ai-proxy.ts    # Optional AI proxy client with SSE streaming
│   ├── stores/
│   │   ├── authStore.ts        # Auth state — signup, login, logout, session
│   │   ├── chatStore.ts        # Chat state — messages, streaming, history
│   │   ├── debugStore.ts       # Debug log — all API calls & errors logged
│   │   └── settingsStore.ts    # Theme, model, prompt — persisted to localStorage
│   ├── components/
│   │   ├── Layout.tsx          # Sidebar (desktop) + bottom nav (mobile) + dark mode
│   │   ├── VoiceButton.tsx     # Web Speech API button (id-ID)
│   │   ├── FileUpload.tsx      # Drag & drop upload to Supabase Storage
│   │   └── DebugPanel.tsx      # Ctrl+` toggleable debug logger
│   ├── pages/
│   │   ├── Login.tsx           # Supabase auth login form
│   │   ├── Register.tsx        # Supabase auth registration
│   │   ├── Dashboard.tsx       # Stats cards + quick actions + getting started guide
│   │   ├── Chat.tsx            # Full chat UI with streaming markdown + voice + files
│   │   ├── Documents.tsx       # File browser for Supabase Storage
│   │   └── Settings.tsx        # AI model, system prompt, theme, connection info
│   └── App.tsx                 # Router with protected/public routes
│
├── .env.example                # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── vite.config.ts              # Vite + React + Tailwind plugins
└── Dockerfile (create per POC)
```

**Key behaviors built-in:**
- 🔐 **Auth** — Login/Register via Supabase Auth, auto-persists session
- 💬 **AI Chat** — Streaming markdown responses, file attachments, voice input (id-ID)
- 🎙️ **Voice** — Web Speech API in Bahasa Indonesia, suffix-overlap dedup
- 📁 **Files** — Drag-drop upload to Supabase Storage with public URL access
- 🐛 **Debug Panel** — Press `` Ctrl+` `` to see all API calls, errors, and events
- 🌓 **Dark Mode** — Dark by default, toggle in sidebar or Settings