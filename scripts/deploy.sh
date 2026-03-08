#!/usr/bin/env bash
# Deployment script for Google Cloud Run

set -euo pipefail

PROJECT_ID="${1:-${PROJECT_ID:-happyrobot-488916}}"
REGION="${2:-${REGION:-europe-west1}}"
DEPLOY_API_KEYS="${3:-${API_KEYS:-}}"
SECRET_NAME="${SECRET_NAME:-loads-api-keys}"
SERVICE_NAME="${SERVICE_NAME:-happytransport-api}"
ALLOW_UNAUTHENTICATED="${ALLOW_UNAUTHENTICATED:-true}"
CONTAINER_PORT="${CONTAINER_PORT:-8080}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SOURCE_DIR="${SOURCE_DIR:-${ROOT_DIR}/backend}"

fail() {
  echo "❌ $1" >&2
  exit 1
}

command -v gcloud >/dev/null 2>&1 || fail "gcloud CLI not found. Install it first: https://cloud.google.com/sdk/docs/install"

ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null || true)"
[[ -n "${ACTIVE_ACCOUNT}" ]] || fail "No active gcloud account. Run: gcloud auth login"
gcloud auth print-access-token >/dev/null 2>&1 || fail "Unable to get access token. Run: gcloud auth login"

[[ -d "${SOURCE_DIR}" ]] || fail "Deployment source directory not found: ${SOURCE_DIR}"

echo "🚀 Deploying HappyTransport API to Cloud Run..."
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo "Active account: ${ACTIVE_ACCOUNT}"
echo "Source directory: ${SOURCE_DIR}"
echo "Container port: ${CONTAINER_PORT}"

echo "▶ Verifying project access..."
gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)' >/dev/null 2>&1 || fail "No access to project '${PROJECT_ID}'. Check the project ID and your IAM permissions."

gcloud config set project "${PROJECT_ID}" >/dev/null

echo "▶ Enabling required GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project "${PROJECT_ID}" >/dev/null

DEPLOY_ARGS=(
  run deploy "${SERVICE_NAME}"
  --source "${SOURCE_DIR}"
  --platform managed
  --region "${REGION}"
  --project "${PROJECT_ID}"
  --port "${CONTAINER_PORT}"
  --set-env-vars "DATASET_PATH=/app/data/loads.csv,METRICS_PATH=/app/data/metrics.csv"
  --set-secrets "API_KEYS=${SECRET_NAME}:latest"
  --memory 512Mi
  --timeout 300
)

# If explicit API keys were passed, use env vars instead of secrets
if [[ -n "${DEPLOY_API_KEYS}" ]]; then
  echo "▶ Using explicit API_KEYS (not Secret Manager)"
  DEPLOY_ARGS=(
    run deploy "${SERVICE_NAME}"
    --source "${SOURCE_DIR}"
    --platform managed
    --region "${REGION}"
    --project "${PROJECT_ID}"
    --port "${CONTAINER_PORT}"
    --set-env-vars "API_KEYS=${DEPLOY_API_KEYS},DATASET_PATH=/app/data/loads.csv,METRICS_PATH=/app/data/metrics.csv"
    --memory 512Mi
    --timeout 300
  )
else
  echo "▶ Using API_KEYS from Secret Manager (${SECRET_NAME})"
fi

if [[ "${ALLOW_UNAUTHENTICATED}" == "true" ]]; then
  DEPLOY_ARGS+=(--allow-unauthenticated)
else
  DEPLOY_ARGS+=(--no-allow-unauthenticated)
  echo "▶ Skipping --allow-unauthenticated (ALLOW_UNAUTHENTICATED=${ALLOW_UNAUTHENTICATED})"
fi

if ! gcloud "${DEPLOY_ARGS[@]}"; then
  echo ""
  echo "❌ Deployment failed."
  echo "If the error mentions run.services.setIamPolicy or iam.serviceAccounts.actAs,"
  echo "your account is authenticated but missing required IAM permissions."
  echo "Try deploying without public access first:"
  echo "ALLOW_UNAUTHENTICATED=false ./scripts/deploy.sh ${PROJECT_ID} ${REGION}"
  exit 1
fi

echo "✅ Deployment complete!"
gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --format='value(status.url)'
