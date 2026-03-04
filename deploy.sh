#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Build, push, and deploy the Loads Matching API to Cloud Run
# =============================================================================
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Prerequisites:
#   - gcloud CLI installed and authenticated  (gcloud auth login)
#   - Docker installed and running
#   - Billing enabled on the GCP project
# =============================================================================

set -euo pipefail

# ── Configuration — edit these variables ──────────────────────────────────────
PROJECT_ID="happyrobot-488916"          # gcloud projects list
REGION="europe-west1"                       # Cloud Run region
SERVICE_NAME="get-loads-api-cr"          # Cloud Run service name
IMAGE_NAME="get-loads-api-img"            # Artifact Registry image name
REPO_NAME="get-loads-api-repo"                 # Artifact Registry repository name

# ── Derived variables (no need to edit) ───────────────────────────────────────
REGISTRY="${REGION}-docker.pkg.dev"
FULL_IMAGE="${REGISTRY}/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:latest"

echo "============================================="
echo "  Loads Matching API — Cloud Run Deployment"
echo "============================================="
echo "Project : ${PROJECT_ID}"
echo "Region  : ${REGION}"
echo "Service : ${SERVICE_NAME}"
echo "Image   : ${FULL_IMAGE}"
echo ""

# ── Step 1: Set active project ─────────────────────────────────────────────────
echo "▶ Setting GCP project..."
gcloud config set project "${PROJECT_ID}"

# ── Step 2: Enable required APIs ──────────────────────────────────────────────
echo "▶ Enabling required GCP APIs (first time only, may take a minute)..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com

# ── Step 3: Create Artifact Registry repository (idempotent) ──────────────────
echo "▶ Creating Artifact Registry repository (if not exists)..."
gcloud artifacts repositories describe "${REPO_NAME}" \
  --location="${REGION}" &>/dev/null || \
gcloud artifacts repositories create "${REPO_NAME}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Loads Matching API Docker images"

# ── Step 4: Authenticate Docker with Artifact Registry ────────────────────────
echo "▶ Configuring Docker auth for Artifact Registry..."
gcloud auth configure-docker "${REGISTRY}" --quiet

# ── Step 5: Build Docker image ─────────────────────────────────────────────────
echo "▶ Building Docker image..."
docker build --platform linux/amd64 -t "${FULL_IMAGE}" .

# ── Step 6: Push image to Artifact Registry ────────────────────────────────────
echo "▶ Pushing image to Artifact Registry..."
docker push "${FULL_IMAGE}"

# ── Step 7: Store API keys in Secret Manager ──────────────────────────────────
echo ""
echo "▶ Setting up API key secret in Secret Manager..."
echo "  → Enter your API keys as a comma-separated string when prompted."
echo "    Example: key-abc123,key-xyz789"
echo "  → Press ENTER to skip (you can set it later with: gcloud secrets versions add)"
echo ""
read -rp "API keys (comma-separated, or ENTER to skip): " API_KEYS_INPUT

if [[ -n "${API_KEYS_INPUT}" ]]; then
  # Create secret if it doesn't exist
  gcloud secrets describe loads-api-keys &>/dev/null || \
    gcloud secrets create loads-api-keys --replication-policy="automatic"

  echo -n "${API_KEYS_INPUT}" | \
    gcloud secrets versions add loads-api-keys --data-file=-

  echo "  ✔ Secret 'loads-api-keys' created/updated."
  SECRET_FLAG="--set-secrets=API_KEYS=loads-api-keys:latest"
else
  echo "  ⚠ Skipping secret setup. Set API_KEYS manually before your first request."
  SECRET_FLAG=""
fi

# ── Step 8: Deploy to Cloud Run ────────────────────────────────────────────────
echo ""
echo "▶ Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image="${FULL_IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=1 \
  --set-env-vars="DATASET_PATH=/app/loads.csv,METRICS_PATH=/app/metrics.csv" \
  ${SECRET_FLAG}

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo "✅ Deployment complete!"
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${REGION}" --format="value(status.url)")
echo ""
echo "🌐 Service URL : ${SERVICE_URL}"
echo "📖 Swagger UI  : ${SERVICE_URL}/docs"
echo "❤  Health check: ${SERVICE_URL}/health"
echo ""
echo "Test it:"
echo "  curl ${SERVICE_URL}/health -H 'X-API-Key: <your-key>'"