# HappyTransport Logistics API

**Modern, scalable APIs for freight load management and booking outcome tracking.**

A full-stack application providing intelligent load queries, carrier management, and comprehensive metrics tracking for logistics operations. Built with FastAPI and React, designed for cloud deployment.

## ✨ Features

- 🚀 **RESTful API** with comprehensive load filtering
- 📊 **Real-time metrics tracking** for booking outcomes
- 🔐 **Secure API authentication** with API keys
- 🌐 **CORS-enabled** for cross-origin requests
- 📦 **Docker containerization** for consistent deployment
- ⚡ **Async processing** with FastAPI
- 🧪 **Comprehensive test suite** with pytest
- 📱 **React dashboard** for data visualization
- 🌍 **Cloud-ready** with Google Cloud Run deployment

## 🏗 Project Structure

Simplified monorepo with separate backend and frontend:

```
happytransport/
├── backend/                    # FastAPI microservice
│   ├── app/
│   │   ├── api.py             # All endpoints
│   │   ├── models.py          # All request/response models
│   │   ├── services.py        # Business logic
│   │   └── security.py        # API authentication
│   ├── tests/
│   │   ├── test_api.py        # All tests
│   │   └── conftest.py
│   ├── data/                  # CSV data files
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                   # React + Vite
│   ├── src/
│   ├── Dockerfile
│   └── package.json
│
├── docs/                      # Documentation
├── docker-compose.yml
└── scripts/
```

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
docker-compose up
```

- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Frontend: http://localhost:5173

### Option 2: Manual Setup

**Backend:**
```bash
python3 -m venv venv && source venv/bin/activate
pip install -r backend/requirements.txt
export API_KEYS="dev-key-change-me"
cd backend && uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 📚 Documentation

- [**API Reference**](docs/API.md) - Complete endpoint documentation
- [**Setup Guide**](docs/SETUP.md) - Local development setup
- [**Architecture**](docs/ARCHITECTURE.md) - System design
- [**Deployment**](docs/DEPLOYMENT.md) - Production deployment

## 🔌 API Endpoints

All endpoints require `X-API-Key` header.

### System
- `GET /api/v1/health` - Health check

### Loads
- `GET /api/v1/loads` - Query loads with filters

### Metrics
- `POST /api/v1/metrics` - Submit booking outcome metrics
- `GET /api/v1/metrics` - Retrieve metrics

**Example:**
```bash
curl -H "X-API-Key: dev-key-change-me" \
  "http://localhost:8000/api/v1/loads?origin=Chicago"
```

## 🐳 Docker

### Local Development
```bash
docker-compose up
```

### Build Backend
```bash
docker build -f backend/Dockerfile -t happytransport-api:latest .
```

### Deploy to Google Cloud Run

## ☁️ Google Cloud Run Deployment

### Prerequisites

| Tool | Install |
|---|---|
| `gcloud` CLI | https://cloud.google.com/sdk/docs/install |
| Docker Desktop | https://www.docker.com/products/docker-desktop |
| GCP project with billing enabled | https://console.cloud.google.com |

```bash
# Authenticate with GCP
gcloud auth login
gcloud auth application-default login
```

---

### Automated deployment (recommended)

```bash
# 1. Edit the config variables at the top of deploy.sh
vi deploy.sh   # Set PROJECT_ID, REGION, SERVICE_NAME

# 2. Make executable and run
chmod +x deploy.sh
./deploy.sh
```

The script will:
1. Enable all required GCP APIs
2. Create an Artifact Registry Docker repository
3. Build and push the Docker image (linux/amd64)
4. Store your API keys securely in **Secret Manager**
5. Deploy the service to Cloud Run
6. Print the live service URL

---

### Manual step-by-step deployment

> **Security note:** every endpoint—including `GET /metrics` and `POST /metrics`—requires a valid API key supplied in the `X-API-Key` header.  The same `verify_api_key` dependency is injected on these handlers as on `/health` and `/loads`, so the token is validated before any work is done.


If you prefer to run each step yourself:

#### 1. Set project and enable APIs

```bash
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"

gcloud config set project $PROJECT_ID

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com
```

#### 2. Create Artifact Registry repository

```bash
gcloud artifacts repositories create loads-api-repo \
  --repository-format=docker \
  --location=$REGION
```

#### 3. Build and push the Docker image

```bash
export IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/loads-api-repo/loads-matching-api:latest"

# Authenticate Docker
gcloud auth configure-docker "${REGION}-docker.pkg.dev"

# Build (force linux/amd64 for Cloud Run compatibility)
docker build --platform linux/amd64 -t $IMAGE .

# Push
docker push $IMAGE
```

#### 4. Store API keys in Secret Manager

```bash
# Create the secret
gcloud secrets create loads-api-keys --replication-policy="automatic"

# Add your keys (comma-separated)
echo -n "secret1,secret2" | \
  gcloud secrets versions add loads-api-keys --data-file=-
```

#### 5. Deploy to Cloud Run

```bash
gcloud run deploy loads-matching-api \
  --image=$IMAGE \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=1 \
  --set-env-vars="DATASET_PATH=/app/loads.csv" \
  --set-secrets="API_KEYS=loads-api-keys:latest"
```

#### 6. Get the service URL

```bash
gcloud run services describe loads-matching-api \
  --region=$REGION \
  --format="value(status.url)"
```

---

## 🔐 Managing API Keys in Production

API keys are stored in **GCP Secret Manager** and injected into the container at runtime as the `API_KEYS` environment variable. They are never baked into the Docker image.

**Add or rotate keys:**
```bash
# Add a new version with updated keys
echo -n "new-key-1,new-key-2" | \
  gcloud secrets versions add loads-api-keys --data-file=-

# Redeploy to pick up the new secret version
gcloud run services update loads-matching-api \
  --region=us-central1 \
  --set-secrets="API_KEYS=loads-api-keys:latest"
```

---

## 🔄 Updating Your Dataset

The dataset is bundled inside the Docker image. To update it:

1. Replace `loads_dataset.csv` (or point `DATASET_PATH` to your new file)
2. Rebuild and redeploy:

```bash
docker build --platform linux/amd64 -t $IMAGE .
docker push $IMAGE

gcloud run deploy loads-matching-api \
  --image=$IMAGE \
  --region=$REGION
```

> **Tip:** For frequently changing data, consider mounting the file from **Cloud Storage** instead of baking it into the image. Ask for the Cloud Storage integration if needed.

---

## 🌐 API Endpoints

All endpoints require the `X-API-Key` header.

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check + dataset stats |
| `/loads` | GET | Filter loads (main agent endpoint) |

**Example agent request:**
```bash
curl https://<your-service-url>/loads \
  -H "X-API-Key: your-key" \
  -G \
  --data-urlencode "origin=Chicago" 
```

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|---|---|---|
| `API_KEYS` | Yes | Comma-separated valid API keys |
| `API_KEY` | Alt. | Single API key (use `API_KEYS` for multiple) |
| `DATASET_PATH` | No | Path to CSV/Excel file (default: `/app/loads_dataset.csv`) |
| `PORT` | No | Server port — Cloud Run sets this automatically |