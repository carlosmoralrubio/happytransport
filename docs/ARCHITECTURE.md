# Architecture Guide

## Project Overview

HappyTransport is a monorepo containing a FastAPI backend and React frontend for managing freight loads and booking metrics.

## Directory Structure

```
happytransport/
├── backend/                    # Python FastAPI application
│   ├── app/
│   │   ├── api/v1/            # API routes organized by version
│   │   │   └── endpoints/     # Individual endpoint modules
│   │   ├── core/              # Core functionality (security, CORS)
│   │   ├── models/            # Pydantic request/response models
│   │   ├── schemas/           # Data models (Load schema)
│   │   ├── services/          # Business logic (dataset, metrics)
│   │   └── utils/             # Utility functions
│   ├── tests/                 # Pytest test suite
│   ├── data/                  # CSV data files
│   ├── main.py                # Application entry point
│   ├── config.py              # Configuration management
│   └── requirements.txt        # Python dependencies
│
├── frontend/                   # React + Vite application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API client
│   │   ├── hooks/             # Custom React hooks
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── docker-compose.yml         # Local orchestration
├── docs/                      # Documentation
└── scripts/                   # Utility scripts
```

## Backend Architecture

### Application Layers

#### 1. **API Routes** (`app/api/v1/endpoints/`)
- **health.py**: Health check endpoint
- **loads.py**: Load query and filtering
- **metrics.py**: Metrics submission and retrieval

#### 2. **Models** (`app/models/`)
- Request/response schemas using Pydantic
- Type validation and documentation
- OpenAPI schema generation

#### 3. **Schemas** (`app/schemas/`)
- Core data models (Load)
- Shared between multiple endpoints

#### 4. **Services** (`app/services/`)
- **dataset.py**: Dataset loading and caching
- **metrics.py**: Metrics file operations

#### 5. **Core** (`app/core/`)
- **security.py**: API key authentication
- **cors.py**: CORS middleware configuration

#### 6. **Configuration** (`config.py`)
- Environment variable management
- Settings object for application configuration

### Request Flow

```
HTTP Request
    ↓
FastAPI Router (app.py)
    ↓
API Endpoint (endpoints/*.py)
    ↓
Security Check (verify_api_key)
    ↓
Service Layer (services/*.py)
    ↓
Data Processing (pandas)
    ↓
Response Model (models/*.py)
    ↓
JSON Response
```

## Frontend Architecture

### Component Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page-level components
├── services/           # API client (api.js)
├── hooks/              # Custom React hooks
├── styles/             # CSS files
├── config.js           # Frontend configuration
└── App.jsx             # Root component
```

### API Integration

- Centralized API client in `src/services/api.js`
- Handles authentication headers
- Error handling and retry logic

## Data Flow

### Loading Data

```
Backend:  CSV File → pandas → DataFrame → JSON Response
Frontend: API Call → JavaScript → React State → UI
```

### Submitting Metrics

```
Frontend: Form Input → API Call
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

- Current version: `v1` (`/api/v1`)
- Future versions can be added as `/api/v2`, etc.
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
