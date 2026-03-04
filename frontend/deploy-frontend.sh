#!/usr/bin/env bash
# =============================================================================
# deploy-frontend.sh — Build and deploy the React dashboard to Firebase Hosting
# =============================================================================

set -euo pipefail

# configuration (allow environment override for flexibility)
PROJECT_ID="${PROJECT_ID:-happy-robot-7c023}"
# the hosting site determines the deployed URL (https://<site>.web.app).
# default to 'happytransport-logistics' so the dashboard always lands at that
# url.  You can still override by exporting HOSTING_SITE before running the
# script.
HOSTING_SITE="${HOSTING_SITE:-happytransport-logistics}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================="
echo "  Happy Transport Dashboard — Deploy"
echo "============================================="

# ── Step 1: Check .env exists ─────────────────────────────────────────────────
if [[ ! -f ".env" ]]; then
  echo "❌ .env file not found."
  echo "   cp .env.example .env  →  fill in VITE_API_BASE_URL and VITE_API_KEY"
  exit 1
fi
echo "▶ Environment:"
grep "^VITE_API_BASE_URL" .env | sed 's/=.*/=<set>/' || true

# ── Step 2: Install dependencies ──────────────────────────────────────────────
echo ""
echo "▶ Installing Node dependencies..."
npm install

# ── Step 3: Build ─────────────────────────────────────────────────────────────
echo ""
echo "▶ Building production bundle..."
npm run build
echo "   ✔ Build complete — output in ./dist"

# ── Step 4: Write firebase.json — no targets, just site + public ──────────────
echo ""
echo "▶ Writing firebase.json..."
cat > firebase.json <<EOF
{
  "hosting": {
    "site": "${HOSTING_SITE}",
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
EOF

# ── Step 5: Write .firebaserc ─────────────────────────────────────────────────
echo "▶ Writing .firebaserc..."
cat > .firebaserc <<EOF
{
  "projects": {
    "default": "${PROJECT_ID}"
  }
}
EOF

# ── Step 6: Ensure hosting site exists ─────────────────────────────────────
echo ""
echo "▶ Verifying hosting site '${HOSTING_SITE}' exists in project '${PROJECT_ID}'..."
# use JSON output to avoid table/ASCII-art formatting
if ! firebase hosting:sites:list --project "${PROJECT_ID}" --json 2>/dev/null \
       | grep -qE "\"projects/.*/sites/${HOSTING_SITE}\""; then
  echo "  ⚠ hosting site '${HOSTING_SITE}' not found in project '${PROJECT_ID}'."
  echo "    Please create it once with:"
  echo "      firebase hosting:sites:create ${HOSTING_SITE} --project ${PROJECT_ID}"
  echo "    then re-run this script."
  exit 1
fi

# ── Step 7: Deploy ────────────────────────────────────────────────────────────
echo "▶ Deploying to Firebase Hosting (site=${HOSTING_SITE})..."
firebase deploy --only hosting:${HOSTING_SITE} --project "${PROJECT_ID}"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "✅ Dashboard deployed!"
echo "🌐 https://${HOSTING_SITE}.web.app"