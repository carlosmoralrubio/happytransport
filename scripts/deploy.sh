#!/bin/bash
# Deployment script for Google Cloud Run

set -e

PROJECT_ID=${1:-"happyrobot-488916"}
REGION=${2:-"europe-west1"}
SERVICE_NAME="happytransport-api"

echo "🚀 Deploying HappyTransport API to Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"

# Build and push to Cloud Run
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --platform managed \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --set-env-vars="API_KEYS=secret1,DATASET_PATH=/app/data/loads.csv" \
  --memory 512Mi \
  --timeout 300

echo "✅ Deployment complete!"
gcloud run services describe "$SERVICE_NAME" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)'
