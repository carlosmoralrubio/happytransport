# Setup Guide

## Prerequisites

- Python 3.11+
- Docker and Docker Compose (for containerized setup)
- Node.js 18+ (for frontend)
- Git

## Local Development Setup

### Step 1: Clone and Navigate

```bash
cd /Users/carlos/Desktop/happytransport
```

### Step 2: Backend Setup

#### Option A: Docker Compose (Recommended)

```bash
docker-compose up
```

This starts both backend and frontend in development mode.

#### Option B: Manual Setup

1. **Create virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Set environment variables:**
   ```bash
   export API_KEYS="dev-key-change-me"
   export DATASET_PATH="backend/data/loads.csv"
   export METRICS_PATH="backend/data/metrics.csv"
   ```

4. **Start backend server:**
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```

Backend will be available at `http://localhost:8000`

Interactive API docs: `http://localhost:8000/docs`

### Step 3: Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set API configuration:**
   Create `.env` file:
   ```
   VITE_API_URL=http://localhost:8000/api/v1
   VITE_API_KEY=dev-key-change-me
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

Frontend will be available at `http://localhost:5173`

## Data Setup

### Sample Dataset

1. Place your `loads.csv` in `backend/data/`:
   ```bash
   cp your-loads.csv backend/data/loads.csv
   ```

2. Required columns:
   - `load_id`: Unique identifier (integer)
   - `origin`: Pickup location (string)
   - `destination`: Delivery location (string)
   - `pickup_datetime`: Pickup date/time
   - `delivery_datetime`: Delivery date/time
   - `equipment_type`: Type of equipment needed
   - `weight`: Load weight (optional)
   - Additional columns are supported

### Initialize Metrics

The metrics CSV is created automatically on first metric submission.

## Testing

### Backend Tests

```bash
cd backend
pytest
```

### With Coverage

```bash
pytest --cov=app tests/
```

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `API_KEYS` | `dev-key-change-me` | Comma-separated API keys |
| `DATASET_PATH` | `backend/data/loads.csv` | Path to loads dataset |
| `METRICS_PATH` | `backend/data/metrics.csv` | Path to metrics file |
| `DEBUG` | `false` | Enable debug mode |
| `ENVIRONMENT` | `development` | Environment type |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | Backend API URL |
| `VITE_API_KEY` | `dev-key-change-me` | API key |

## Troubleshooting

### Port 8000 Already in Use

```bash
lsof -i :8000  # Find what's using port
kill -9 <PID>  # Kill the process
```

### Module Not Found Errors

```bash
# Reinstall dependencies
pip install --upgrade --force-reinstall -r backend/requirements.txt
```

### Dataset Not Found

Ensure `backend/data/loads.csv` exists and is readable:
```bash
ls -la backend/data/
```

### Frontend Can't Connect to Backend

Check that:
1. Backend is running on `http://localhost:8000`
2. `VITE_API_URL` is configured correctly in frontend `.env`
3. API key matches between frontend and backend

## Next Steps

- Review [API documentation](API.md)
- Check [architecture guide](ARCHITECTURE.md)
- See [deployment guide](DEPLOYMENT.md)
