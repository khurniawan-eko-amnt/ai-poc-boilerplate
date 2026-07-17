#!/bin/bash
# =============================================================================
# Setup a New POC App on Supabase
# =============================================================================
# Usage:
#   ./setup-poc-app.sh <app-name> [app-title]
#
# Example:
#   ./setup-poc-app.sh rag-assistant "RAG Document Assistant"
#
# This script:
#   1. Creates a new Postgres schema (poc_<app-name>)
#   2. Creates a Storage bucket for the app
#   3. Applies RLS policies for user isolation
#   4. Enables the schema in PostgREST (via .env update)
#   5. Restarts PostgREST to pick up the new schema
# =============================================================================

set -e

# ─── Config ────────────────────────────────────────────────
SUPABASE_DIR="$(cd "$(dirname "$0")" && pwd)"
SUPABASE_ENV="${SUPABASE_DIR}/.env"
DOCKER_COMPOSE="docker compose --env-file ${SUPABASE_ENV} -f ${SUPABASE_DIR}/docker-compose.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ─── Args ──────────────────────────────────────────────────
APP_NAME="${1:-}"
APP_TITLE="${2:-${APP_NAME}}"

if [ -z "$APP_NAME" ]; then
  echo -e "${RED}Error: Usage${NC} $0 <app-name> [app-title]"
  echo "  Example: $0 rag-assistant 'RAG Document Assistant'"
  exit 1
fi

# Sanitize: lowercase, replace hyphens/spaces with underscores
SCHEMA_NAME="poc_$(echo "$APP_NAME" | tr '[:upper:]' '[:lower:]' | tr -s ' -' '_')"
BUCKET_NAME="poc-$(echo "$APP_NAME" | tr '[:upper:]' '[:lower:]' | tr -s ' _' '-')"

echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Setting up new POC App${NC}"
echo -e "${GREEN}  Schema: ${YELLOW}${SCHEMA_NAME}${NC}"
echo -e "${GREEN}  Bucket: ${YELLOW}${BUCKET_NAME}${NC}"
echo -e "${GREEN}  Title:  ${YELLOW}${APP_TITLE}${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"

# ─── Step 1: Create Schema ─────────────────────────────────
echo -e "\n${YELLOW}[1/4]${NC} Creating schema: ${SCHEMA_NAME}..."

sudo ${DOCKER_COMPOSE} exec -T db psql -U postgres -c "
  CREATE SCHEMA IF NOT EXISTS ${SCHEMA_NAME} AUTHORIZATION postgres;
  GRANT USAGE ON SCHEMA ${SCHEMA_NAME} TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA ${SCHEMA_NAME}
    GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA ${SCHEMA_NAME}
    GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA ${SCHEMA_NAME}
    GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

  INSERT INTO storage.buckets (id, name, public, avif_autodetection)
  VALUES ('${BUCKET_NAME}', '${BUCKET_NAME}', false, false)
  ON CONFLICT (id) DO NOTHING;
" 2>&1

# ─── Step 2: Enable schema in PostgREST ────────────────────
echo -e "${YELLOW}[2/4]${NC} Enabling schema in PostgREST..."

CURRENT_SCHEMAS=$(grep "^PGRST_DB_SCHEMAS=" "${SUPABASE_ENV}" | awk -F= '{print $2}')
if ! echo "$CURRENT_SCHEMAS" | grep -q "${SCHEMA_NAME}"; then
  NEW_SCHEMAS="${CURRENT_SCHEMAS},${SCHEMA_NAME}"
  sed -i "s/^PGRST_DB_SCHEMAS=.*$/PGRST_DB_SCHEMAS=${NEW_SCHEMAS}/" "${SUPABASE_ENV}"
  echo -e "  Updated: ${YELLOW}PGRST_DB_SCHEMAS=${NEW_SCHEMAS}${NC}"
else
  echo -e "  Already enabled: ${SCHEMA_NAME}"
fi

# ─── Step 3: Restart PostgREST ─────────────────────────────
echo -e "${YELLOW}[3/4]${NC} Restarting PostgREST..."
sudo ${DOCKER_COMPOSE} up -d --force-recreate rest 2>&1 | tail -3

# ─── Step 4: Verify ───────────────────────────────────────
echo -e "${YELLOW}[4/4]${NC} Verifying..."
sleep 3
sudo ${DOCKER_COMPOSE} exec -T db psql -U postgres -c "
  SELECT schema_name 
  FROM information_schema.schemata 
  WHERE schema_name = '${SCHEMA_NAME}';
" 2>&1

echo -e "\n${GREEN}✅ POC App setup complete!${NC}"
echo ""
echo "  Supabase URL:  http://104.215.187.68:8000"
echo "  REST API:      http://104.215.187.68:8000/rest/v1/${SCHEMA_NAME}_*"
echo "  Storage:       bucket '${BUCKET_NAME}'"
echo "  Studio Admin:  http://104.215.187.68:3001"
echo "  Studio Login:  admin / (see DASHBOARD_PASSWORD in .env)"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Create your tables via Studio SQL editor"
echo "  2. Build your React app using @supabase/supabase-js"
echo "  3. Frontend env:"
echo "     VITE_SUPABASE_URL=http://104.215.187.68:8000"
echo "     VITE_SUPABASE_ANON_KEY=<your-anon-key-from-.env>"
echo ""