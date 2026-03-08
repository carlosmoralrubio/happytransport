# Simplified Backend Structure

The backend has been streamlined for easier development and maintenance.

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
│   └── test_api.py         # All tests
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
- **`tests/test_api.py`**: All tests organized in classes

## Running Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export API_KEYS="dev-key-change-me"

# Run server
uvicorn main:app --reload
```

## Running Tests

```bash
pytest tests/ -v
```

## Environment Variables

- `API_KEYS`: API authentication keys (comma-separated)
- `DATASET_PATH`: Path to loads CSV (default: `backend/data/loads.csv`)
- `METRICS_PATH`: Path to metrics CSV (default: `backend/data/metrics.csv`)

## API Endpoints

All endpoints require `X-API-Key` header:

- `GET /api/v1/health` - Health check
- `GET /api/v1/loads` - Query loads with filters
- `POST /api/v1/metrics` - Submit metrics
- `GET /api/v1/metrics` - Get metrics

See [../../docs/API.md](../../docs/API.md) for full documentation.
