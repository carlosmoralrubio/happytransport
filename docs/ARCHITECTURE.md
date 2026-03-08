# Architecture Guide

## Project Overview

HappyTransport is a monorepo containing a FastAPI backend and React frontend for managing freight loads and booking metrics.

## Directory Structure

```
happytransport/
├── backend/                     # Python FastAPI application
│   ├── app/
│   │   ├── api.py              # All API endpoints (/v1)
│   │   ├── models.py           # Pydantic request/response models
│   │   ├── security.py         # API key verification
│   │   └── services.py         # Dataset + metrics business logic
│   ├── tests/                  # Pytest test suite
│   ├── data/                   # CSV data files
│   ├── main.py                 # FastAPI app + CORS + router include
│   ├── config.py               # Environment-backed settings helper
│   └── requirements.txt        # Python dependencies
│
├── frontend/                   # React + Vite application
│   ├── src/
│   │   ├── App.jsx             # Dashboard UI + charts + tables
│   │   ├── config.js           # API client helpers and env bindings
│   │   └── main.jsx
│   └── package.json
│
├── docker-compose.yml         # Local orchestration
├── docs/                      # Documentation
└── scripts/                   # Utility scripts
```

## Backend Architecture

### Application Layers

#### 1. **API Routes** (`backend/app/api.py`)
- Single `APIRouter` with prefix `/v1`
- Endpoints:
    - `GET /v1/health`
    - `GET /v1/loads`
    - `POST /v1/metrics`
    - `GET /v1/metrics`

#### 2. **Models** (`backend/app/models.py`)
- Request/response schemas using Pydantic
- Type validation and documentation
- OpenAPI schema generation

#### 3. **Services** (`backend/app/services.py`)
- Dataset loading from CSV/Excel via pandas
- Metrics appends and reads from CSV
- Thread lock for safe concurrent metrics writes

#### 4. **Security** (`backend/app/security.py`)
- API key validation from `X-API-Key`
- Supports both `API_KEYS` (comma-separated) and `API_KEY`
- Returns `401` for missing key and `403` for invalid key

#### 5. **App Initialization** (`backend/main.py`)
- Creates FastAPI app metadata
- Configures CORS origins
- Includes the API router
- Exposes `/` root endpoint and startup logs

#### 6. **Configuration** (`backend/config.py`)
- Lightweight settings object for environment values
- Main runtime paths are read directly in services/security modules

### Request Flow

```
HTTP Request
    ↓
FastAPI Router (`backend/app/api.py`)
    ↓
Endpoint Handler (`health`, `loads`, `metrics`)
    ↓
Security Check (verify_api_key)
    ↓
Service Layer (`backend/app/services.py`)
    ↓
Data Processing (pandas)
    ↓
Response Model (`backend/app/models.py`)
    ↓
JSON Response
```

## Frontend Architecture

### Component Structure

```
src/
├── App.jsx              # Dashboard, charts, filters, tables
├── config.js            # API_BASE_URL, API_KEY, apiFetch
└── main.jsx             # React bootstrap
```

### API Integration

- Centralized API client in `frontend/src/config.js`
- Injects `X-API-Key` and `Content-Type` headers
- Throws detailed errors for non-2xx responses
- Uses `VITE_API_BASE_URL` and `VITE_API_KEY`

## Data Flow

### Loading Data

```
Backend:  CSV File → pandas → DataFrame → JSON Response
Frontend: apiFetch('/v1/loads') → React State → UI
```

### Submitting Metrics

```
Frontend: apiFetch('/v1/metrics')
Backend:  Validation → CSV Append → Confirmation
```

## Technology Stack

### Backend
- **FastAPI**: Modern async web framework
- **Pydantic**: Data validation
- **Pandas**: Data processing
- **Uvicorn**: ASGI server
- **Pytest**: Testing framework

### Frontend
- **React 18**: UI library
- **Vite**: Build tool and dev server
- **Fetch API**: API communication
- **CSS 3**: Styling

### Deployment
- **Docker**: Containerization
- **Docker Compose**: Local orchestration
- **Google Cloud Run**: Serverless deployment (optional)

## Security Considerations

### Authentication
- API key in `X-API-Key` header
- Keys loaded from `API_KEYS` environment variable
- Async verification function

### CORS
- Configurable allowed origins
- Different origins for dev and production
- Credentials support for Firebase integration

### Data
- CSV files stored securely
- Thread-safe metrics writing with locks
- No sensitive data in logs

## Scalability Considerations

### Current Limitations
- Single-node deployment
- In-memory data processing
- File-based metrics storage

### Future Improvements
1. **Database Integration**: PostgreSQL for persistent metrics
2. **Caching**: Redis for frequent queries
3. **Message Queue**: Celery for async tasks
4. **Load Balancing**: Multiple replicas
5. **CDN**: Static asset delivery
6. **Monitoring**: Prometheus, Grafana

## API Versioning

- Current version: `v1` (`/v1`)
- Future versions can be added as `/v2`, etc.
- Maintains backwards compatibility

## Testing Strategy

### Unit Tests
- Individual endpoint tests
- Service layer tests
- Security authentication tests

### Integration Tests
- Full request/response cycle
- Error handling
- Authentication flow

### Test Coverage
Target: >80% code coverage

Run tests:
```bash
pytest --cov=app tests/
```

## Environment Configuration

### Development
- Debug mode enabled
- CORS allows localhost
- Default dev API key

### Production
- Security hardened
- Firebase origin only
- Environment-specific API keys
- Performance optimized

## Monitoring and Logging

### Current
- Standard output logging
- HTTP status codes
- Error messages in responses

### Recommended
- Structured logging (JSON)
- Error tracking (Sentry)
- Performance monitoring (DataDog)
- Request tracing
