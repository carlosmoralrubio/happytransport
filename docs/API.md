# API Documentation

## Base URL

- **Production:** `https://<your-cloud-run-service-url>`
- **Local:** `http://localhost:8000`
- **API Prefix:** `/v1`

## Authentication

All endpoints require the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key" http://localhost:8000/v1/health
```

## Endpoints

### System

#### Health Check
- **Endpoint:** `GET /v1/health`
- **Description:** Check API health and dataset availability
- **Response:**
  ```json
  {
    "status": "ok",
    "total_loads_in_dataset": 1500
  }
  ```

### Loads

#### Get Loads
- **Endpoint:** `GET /v1/loads`
- **Description:** Query available loads with optional filters
- **Query Parameters:**
  - `origin` (string, optional): Filter by origin location
  - `destination` (string, optional): Filter by destination
  - `equipment_type` (string, optional): Filter by equipment type
  - `min_weight` (number, optional): Minimum load weight
  - `max_weight` (number, optional): Maximum load weight
  - `pickup_from` (date, optional): Earliest pickup date (YYYY-MM-DD)
  - `pickup_to` (date, optional): Latest pickup date (YYYY-MM-DD)
  - `delivery_from` (date, optional): Earliest delivery date
  - `delivery_to` (date, optional): Latest delivery date

- **Example Request:**
  ```bash
  curl -H "X-API-Key: dev-key-change-me" \
    "http://localhost:8000/v1/loads?origin=Chicago&equipment_type=Dry%20Van"
  ```

- **Response:**
  ```json
  {
    "total_matches": 42,
    "filters_applied": {
      "origin": "Chicago",
      "equipment_type": "Dry Van"
    },
    "loads": [
      {
        "load_id": 1001,
        "origin": "Chicago, IL",
        "destination": "Dallas, TX",
        "equipment_type": "Dry Van",
        "weight": 15000,
        "pickup_datetime": "2026-03-15T14:00:00",
        "delivery_datetime": "2026-03-18T10:00:00",
        "loadboard_rate": 2500.00,
        "notes": "Fragile items"
      }
    ]
  }
  ```

### Metrics

#### Submit Metric
- **Endpoint:** `POST /v1/metrics`
- **Description:** Record booking outcome metrics
- **Request Body:**
  ```json
  {
    "load_info": "Load from Dallas to Houston, Dry Van, 10k lbs",
    "origin": "Dallas, TX",
    "destination": "Houston, TX",
    "equipment_type": "Dry Van",
    "carrier_legal_name": "Example Carriers Inc",
    "carrier_mc_number": "MC123456",
    "carrier_mc_number_validity": "true",
    "price_diff": "-100",
    "duration": "25",
    "sentiment": "positive",
    "outcome": "Booked with negotiations"
  }
  ```

- **Sentiment Values:** `positive` | `neutral` | `negative`
- **Outcome Values:**
  - `Booked with negotiations`
  - `Booked without negotiations`
  - `Not booked with negotiations`
  - `Not booked without negotiations`
  - `Not match`
  - `Unknown`

- **Response (201 Created):**
  ```json
  {
    "status": "ok",
    "recorded_at": "2026-03-08T15:30:45",
    "message": "Metric recorded successfully."
  }
  ```

#### Get Metrics
- **Endpoint:** `GET /v1/metrics`
- **Description:** Retrieve recorded metrics with optional filters
- **Query Parameters:**
  - `outcome` (string, optional): Filter by outcome
  - `sentiment` (string, optional): Filter by sentiment
  - `carrier_mc_number` (string, optional): Filter by MC number
  - `limit` (integer, default: 100): Max records to return (1-1000)
  - `offset` (integer, default: 0): Records to skip

- **Response:**
  ```json
  {
    "total_records": 245,
    "metrics": [
      {
        "recorded_at": "2026-03-08T15:30:45",
        "load_info": "Load from Dallas to Houston, Dry Van, 10k lbs",
        "origin": "Dallas, TX",
        "destination": "Houston, TX",
        "sentiment": "positive",
        "outcome": "Booked with negotiations"
      }
    ]
  }
  ```

## Error Responses

### 401 Unauthorized
Missing or invalid `X-API-Key` header.
```json
{
  "detail": "Missing API key. Provide it in the 'X-API-Key' header."
}
```

### 403 Forbidden
Invalid API key provided.
```json
{
  "detail": "Invalid API key."
}
```

### 503 Service Unavailable
Dataset not found or unavailable.
```json
{
  "detail": "Dataset not found at 'loads.csv'..."
}
```

## Rate Limiting

Currently no rate limiting is implemented. Contact support for production requirements.

## Pagination

Use `limit` and `offset` parameters to paginate through results.

```bash
# Get results 20-30
curl -H "X-API-Key: dev-key-change-me" \
  "http://localhost:8000/v1/metrics?offset=20&limit=10"
```
