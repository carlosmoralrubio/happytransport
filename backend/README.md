## Directory Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── api.py              # All API endpoints
│   ├── models.py           # All request/response models
│   ├── services.py         # Business logic (dataset, metrics)
│   └── security.py         # API key verification
├── tests/
│   ├── __init__.py
│   ├── conftest.py         # Pytest config
│   ├── test_api.py         # Combined endpoint tests
│   ├── test_health.py
│   ├── test_loads.py
│   └── test_metrics.py
├── data/                   # CSV data files
├── main.py                 # Application entry
├── requirements.txt        # Python dependencies
└── Dockerfile
```

## Key Files

- **`app/api.py`**: All endpoints (health, loads, metrics) in one file
- **`app/models.py`**: All Pydantic models (Load, MetricRequest, etc.)
- **`app/services.py`**: Business logic (load_dataset, append_metric, get_metrics)
- **`app/security.py`**: API key authentication
- **`main.py`**: FastAPI app initialization with CORS
- **`tests/`**: API test suite (`test_api.py`, `test_health.py`, `test_loads.py`, `test_metrics.py`)

## Running Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export API_KEYS="dev-key-change-me"
export DATASET_PATH="data/loads.csv" METRICS_PATH="data/metrics.csv"

# Run server
uvicorn main:app --reload
```

## Running Tests

```bash
pytest tests/ -v
```

## Environment Variables

- `API_KEYS`: API authentication keys (comma-separated)
- `DATASET_PATH`: Path to loads CSV (code default: `backend/data/loads.csv`)
- `METRICS_PATH`: Path to metrics CSV (code default: `backend/data/metrics.csv`)

## API Endpoints

All endpoints require `X-API-Key` header:

- `GET /v1/health` - Health check
- `GET /v1/loads` - Query loads with filters
- `POST /v1/metrics` - Submit metrics
- `GET /v1/metrics` - Get metrics

See [`../docs/API.md`](../docs/API.md) for full documentation.
