#!/bin/bash
# =============================================================================
# AI POC Boilerplate — Start Everything
# =============================================================================
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
SUPABASE_DIR="${DIR}/supabase"
SUPABASE_ENV="${SUPABASE_DIR}/.env"

require_env_var() {
  local key="$1"
  local value
  value="$(grep "^${key}=" "${SUPABASE_ENV}" | head -1 | cut -d= -f2-)"
  if [ -z "${value}" ] || [[ "${value}" == *change-me* ]] || [ "${value}" = "stub" ]; then
    echo "❌ Invalid Supabase config: ${key} is missing or still a placeholder in ${SUPABASE_ENV}"
    return 1
  fi
  return 0
}

echo "🚀 Starting Supabase..."
cd "${SUPABASE_DIR}"

if [ ! -f "${SUPABASE_ENV}" ]; then
  cp .env.example .env
  echo "❌ Created ${SUPABASE_ENV} from .env.example"
  echo "   Update the required secrets and storage settings before starting Supabase."
  exit 1
fi

require_env_var POSTGRES_PASSWORD
require_env_var JWT_SECRET
require_env_var ANON_KEY
require_env_var SERVICE_ROLE_KEY
require_env_var SECRET_KEY_BASE
require_env_var DASHBOARD_PASSWORD
require_env_var S3_PROTOCOL_ACCESS_KEY_ID
require_env_var S3_PROTOCOL_ACCESS_KEY_SECRET
require_env_var GLOBAL_S3_BUCKET
require_env_var REGION
require_env_var STORAGE_TENANT_ID

sudo docker compose --env-file .env -f docker-compose.yml up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

echo ""
echo "✅ Supabase is running!"
echo ""
echo "  🔗 Kong Gateway:   http://localhost:8000"
echo "  📊 Studio Admin:   http://localhost:3001"
echo "  🔐 Auth:           http://localhost:8000/auth/v1"
echo "  📦 REST API:       http://localhost:8000/rest/v1"
echo "  💾 Storage:        http://localhost:8000/storage/v1"
echo ""
echo "📋 To create a new POC app:"
echo "  ./supabase/setup-poc-app.sh <app-name>"
echo ""
echo "  Example:"
echo "  ./supabase/setup-poc-app.sh rag-assistant 'RAG Assistant'"
echo ""
echo "🛑 To stop:"
echo "  cd supabase && sudo docker compose down"