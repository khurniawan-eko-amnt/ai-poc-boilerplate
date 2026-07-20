#!/bin/bash
# =============================================================================
# poc-init.sh — One-command new POC app launcher
# =============================================================================
# Usage:
#   ./poc-init.sh <app-name> [app-title]
#
# Examples:
#   ./poc-init.sh rag-assistant "RAG Document Assistant"
#   ./poc-init.sh dashboard "Mine Ops Dashboard"
#   ./poc-init.sh voice-poc "Voice-enabled POC"
#
# This script does everything in one shot:
#   1. Copies template-app/ to ~/<app-name>
#   2. Creates Supabase schema + storage bucket via setup-poc-app.sh
#   3. Writes .env with correct VITE_SUPABASE_URL and ANON_KEY
#   4. Runs npm install in the new app
#   5. Starts the dev server on the next free port
# =============================================================================

set -e

# ─── Colors ────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ─── Paths ─────────────────────────────────────────────────
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE_DIR="${REPO_DIR}/template-app"
SETUP_SCRIPT="${REPO_DIR}/supabase/setup-poc-app.sh"
ENV_FILE="${REPO_DIR}/supabase/.env"
TARGET_DIR="${HOME}"

# ─── Args ──────────────────────────────────────────────────
APP_NAME="${1:-}"
APP_TITLE="${2:-${APP_NAME}}"

if [ -z "$APP_NAME" ]; then
  echo -e "${RED}Error:${NC} Usage: $0 <app-name> [app-title]"
  echo ""
  echo "  Examples:"
  echo "    $0 rag-assistant \"RAG Document Assistant\""
  echo "    $0 voice-poc \"Voice-enabled POC\""
  echo "    $0 dashboard"
  exit 1
fi

APP_DIR="${TARGET_DIR}/${APP_NAME}"

# Validate template exists
if [ ! -d "$TEMPLATE_DIR" ]; then
  echo -e "${RED}Error:${NC} Template not found at ${TEMPLATE_DIR}"
  exit 1
fi

# Validate setup script exists
if [ ! -f "$SETUP_SCRIPT" ]; then
  echo -e "${RED}Error:${NC} Setup script not found at ${SETUP_SCRIPT}"
  exit 1
fi

# Check if app already exists
if [ -d "$APP_DIR" ]; then
  echo -e "${RED}Error:${NC} Directory already exists: ${APP_DIR}"
  echo "  Remove it first: rm -rf ${APP_DIR}"
  exit 1
fi

echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  POC Init — ${GREEN}${APP_TITLE}${NC}"
echo -e "${BLUE}  App dir:  ${YELLOW}${APP_DIR}${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"

# ────────────────────────────────────────────────────────────
# Step 1: Copy template
# ────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[1/5]${NC} Copying template to ${APP_DIR}..."
cp -r "$TEMPLATE_DIR" "$APP_DIR"
echo -e "  ${GREEN}✓${NC} Template copied"

# ────────────────────────────────────────────────────────────
# Step 2: Create Supabase schema + bucket
# ────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[2/5]${NC} Creating Supabase schema + storage bucket..."
cd "$REPO_DIR"
bash "$SETUP_SCRIPT" "$APP_NAME" "$APP_TITLE"
echo -e "  ${GREEN}✓${NC} Schema and bucket created"

# ────────────────────────────────────────────────────────────
# Step 3: Write .env
# ────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[3/5]${NC} Writing .env..."
ANON_KEY=$(grep "^ANON_KEY=" "$ENV_FILE" | awk -F= '{print $2}')
if [ -z "$ANON_KEY" ]; then
  echo -e "  ${RED}Warning:${NC} Could not extract ANON_KEY from ${ENV_FILE}"
  echo -e "  Edit ${APP_DIR}/.env manually"
  cat > "${APP_DIR}/.env" << 'ENVEOF'
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=your-anon-key-here
ENVEOF
else
  cat > "${APP_DIR}/.env" << ENVEOF
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=${ANON_KEY}
ENVEOF
fi
echo -e "  ${GREEN}✓${NC} .env written"

# ────────────────────────────────────────────────────────────
# Step 4: npm install
# ────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[4/5]${NC} Installing dependencies..."
cd "$APP_DIR"
npm install 2>&1 | tail -5
echo -e "  ${GREEN}✓${NC} Dependencies installed"

# ────────────────────────────────────────────────────────────
# Step 5: Find free port and start dev server
# ────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[5/5]${NC} Finding free port..."
# Check ports 4001-4100 for availability
FREE_PORT=""
for PORT in {4001..4100}; do
  if ! ss -tlnp 2>/dev/null | grep -q ":$PORT "; then
    FREE_PORT=$PORT
    break
  fi
done

if [ -z "$FREE_PORT" ]; then
  echo -e "  ${RED}Warning:${NC} No free port found in 4001-4100 range"
  echo "  Start manually: cd ${APP_DIR} && npm run dev"
else
  echo -e "  ${GREEN}✓${NC} Port ${FREE_PORT} is free"
  echo ""
  echo -e "${GREEN}══════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  ✅ POC App Launched!${NC}"
  echo -e "${GREEN}══════════════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  URL:        ${BLUE}http://localhost:${FREE_PORT}${NC}"
  echo -e "  Directory:  ${YELLOW}${APP_DIR}${NC}"
  echo ""
  echo -e "  ${YELLOW}Credentials:${NC}"
  echo -e "    Register at: ${BLUE}http://localhost:${FREE_PORT}/register${NC}"
  echo -e "    Email auto-confirmed (no verification needed)"
  echo ""
  echo -e "  ${YELLOW}Next steps:${NC}"
  echo -e "    1. Create your schema via Studio: ${BLUE}http://localhost:3001${NC}"
  echo -e "    2. Update SCHEMA in ${YELLOW}${APP_DIR}/src/services/supabase.ts${NC}"
  echo -e "    3. Start building pages in ${YELLOW}${APP_DIR}/src/pages/${NC}"
  echo -e "    4. Press ${YELLOW}Ctrl+\`${NC} for debug panel"
  echo ""
  echo -e "  ${YELLOW}SSH tunnel:${NC}"
  echo -e "    ssh -L ${FREE_PORT}:localhost:${FREE_PORT} -L 8000:localhost:8000 KSAP6748@104.215.187.68"
  echo ""
  echo -e "  Press ${RED}Ctrl+C${NC} to stop the dev server"
  echo ""

  npm run dev -- --port "$FREE_PORT"
fi