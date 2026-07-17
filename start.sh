#!/bin/bash
# =============================================================================
# AI POC Boilerplate — Start Everything
# =============================================================================
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
echo "🚀 Starting Supabase..."
cd "${DIR}/supabase"
cp .env.example .env 2>/dev/null || true
sudo docker compose --env-file .env -f docker-compose.yml up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

echo ""
echo "✅ Supabase is running!"
echo ""
echo "  🔗 Kong Gateway:   http://104.215.187.68:8000"
echo "  📊 Studio Admin:   http://104.215.187.68:3001"
echo "  🔐 Auth:           http://104.215.187.68:8000/auth/v1"
echo "  📦 REST API:       http://104.215.187.68:8000/rest/v1"
echo "  💾 Storage:        http://104.215.187.68:8000/storage/v1"
echo ""
echo "📋 To create a new POC app:"
echo "  ./supabase/setup-poc-app.sh <app-name>"
echo ""
echo "  Example:"
echo "  ./supabase/setup-poc-app.sh rag-assistant 'RAG Assistant'"
echo ""
echo "🛑 To stop:"
echo "  cd supabase && sudo docker compose down"