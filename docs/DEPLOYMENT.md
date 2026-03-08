# Deployment Guide

## Prerequisites

- Google Cloud Account
- `gcloud` CLI installed
- Docker installed locally
- Project repository pushed to version control

## Local Docker Build

### Build Backend Image

```bash
docker build -f backend/Dockerfile -t happytransport-api:latest backend
```

### Run Locally

```bash
docker run -p 8000:8080 \
  -e API_KEYS="your-api-key" \
  -e DATASET_PATH=/app/data/loads.csv \
  -e METRICS_PATH=/app/data/metrics.csv \
  -v $(pwd)/backend/data:/app/data \
  happytransport-api:latest
```

### Docker Compose

```bash
docker-compose up -d
```

Logs:
```bash
docker-compose logs -f backend
```

## Google Cloud Run Deployment

### Step 1: Setup GCP Project

```bash
# Set project
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Step 2: Configure Authentication

```bash
# Create service account
gcloud iam service-accounts create happytransport-api

# Grant roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:happytransport-api@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.developer"
```

### Step 3: Deploy to Cloud Run

```bash
bash scripts/deploy.sh your-project-id us-central1
```

Or manually:

```bash
gcloud run deploy happytransport-api \
  --source backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars="API_KEYS=your-production-key,DATASET_PATH=/app/data/loads.csv,METRICS_PATH=/app/data/metrics.csv" \
  --memory 512Mi \
  --timeout 300
```

### Step 4: Get Service URL

```bash
gcloud run services describe happytransport-api \
  --region us-central1 \
  --format='value(status.url)'
```

## Environment Variables

### Production (.env)

```
API_KEYS=your-production-api-key-1,your-production-api-key-2
DATASET_PATH=/app/data/loads.csv
METRICS_PATH=/app/data/metrics.csv
ENVIRONMENT=production
DEBUG=false
```

### Secrets Management

Never commit secrets to version control. Use:
- **Google Secret Manager**: For GCP deployments
- **12factor.net**: For environment variable best practices

```bash
# Create secret in GCP
echo "your-api-key" | gcloud secrets create loads-api-keys --data-file=-

# Reference in deployment
--set-secrets API_KEYS=loads-api-keys:latest
```

## Data Persistence

### Option 1: Google Cloud Storage

```bash
# Create bucket
gsutil mb gs://happytransport-data

# Upload dataset
gsutil cp backend/data/loads.csv gs://happytransport-data/

# In deployment, mount or download before startup
```

### Option 2: Cloud SQL

For metrics (recommended for production):

```bash
# Create PostgreSQL instance
gcloud sql instances create happytransport-db \
  --database-version POSTGRES_15 \
  --tier db-f1-micro

# Update backend to use PostgreSQL
# See ARCHITECTURE.md for future improvements
```

## Continuous Deployment (CI/CD)

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}
          service_account_key: ${{ secrets.GCP_SA_KEY }}
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy happytransport-api \
            --source backend \
            --platform managed \
            --region us-central1 \
            --set-env-vars API_KEYS=${{ secrets.PROD_API_KEY }},DATASET_PATH=/app/data/loads.csv,METRICS_PATH=/app/data/metrics.csv
```

## Health Checks

### Verify Deployment

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe happytransport-api \
  --region us-central1 \
  --format='value(status.url)')

# Test health endpoint
curl -H "X-API-Key: your-api-key" $SERVICE_URL/v1/health
```

## Scaling Configuration

```bash
# Set concurrency
gcloud run services update happytransport-api \
  --concurrency 100 \
  --region us-central1

# Set min/max instances
gcloud run services update happytransport-api \
  --min-instances 1 \
  --max-instances 10 \
  --region us-central1
```

## Monitoring and Logs

### Cloud Run Dashboard

View metrics and logs:
```bash
gcloud run services describe happytransport-api \
  --region us-central1
```

### Stream Logs

```bash
gcloud run services logs read happytransport-api \
  --region us-central1 \
  --limit 50 \
  --follow
```

### Custom Metrics

Monitor with Cloud Logging:
```bash
gcloud logging read "resource.service.name=happytransport-api" \
  --limit 100 \
  --format json
```

## Rollback

```bash
# List revisions
gcloud run revisions list --service happytransport-api

# Rollback to previous
gcloud run services update-traffic happytransport-api \
  --to-revisions REVISION_NAME=100
```

## Security Hardening

### 1. API Authentication
Already implemented with API key verification.

### 2. CORS Configuration
Update CORS origins in `backend/main.py` for production:

```python
allowed_origins = [
    "https://happytransport-logistics.web.app",
]
```

### 3. Rate Limiting

Add to `main.py`:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
```

### 4. HTTPS Enforcement
Cloud Run provides automatic HTTPS.

## Cost Optimization

- Use `db-f1-micro` for development databases
- Set appropriate timeouts (default 300s)
- Configure auto-scaling (min 0, max 10)
- Use Cloud Storage for large files instead of inline

## Troubleshooting

### 503 Service Unavailable
```bash
# Check if dataset is accessible
gcloud run services update happytransport-api \
  --update-env-vars DATASET_PATH=/app/data/loads.csv,METRICS_PATH=/app/data/metrics.csv
```

### Authentication Failures
```bash
# Verify environment variables
gcloud run services describe happytransport-api \
  --format='value(spec.template.spec.containers[0].env)'
```

### Out of Memory
```bash
# Increase memory
gcloud run services update happytransport-api --memory 2Gi
```

## Support

For issues:
1. Check Cloud Run logs
2. Verify environment variables
3. Test locally with same configuration
4. Contact GCP support for infrastructure issues
