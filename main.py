from fastapi import FastAPI, Query, HTTPException, Security, Depends
from fastapi.responses import JSONResponse
from datamodel import Load, LoadsResponse, HealthResponse, MetricRequest, MetricResponse, MetricsListResponse
from functions import load_dataset, verify_api_key, append_metric, METRICS_PATH
from typing import Optional
import pandas as pd
from datetime import datetime
import os

# App setup
app = FastAPI(
    title="Get available loads",
    description=(
        "Filter and match available loads by origin, destination, "
        "equipment type, weight, and dimensions. Designed for agent consumption."
    ),
    version="1.0.0",
)

# ----------------------------------------------------------------------------
# CORS
# When the React dashboard runs in the browser it issues cross‑origin requests
# against the backend.  Without explicit CORS support FastAPI responds to
# OPTIONS preflight with 405, which is what the frontend saw in its console.
# The middleware below whitelists the dashboard origin (and any others you
# might need) and permits all methods/headers so the API is callable from the
# browser.
from fastapi.middleware.cors import CORSMiddleware

origins = [
    # include wherever the dashboard is hosted
    "http://localhost:5173",          # dev server
    "https://happytransport-logistics.web.app",
    "https://happytransport-logistics.firebaseapp.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------------------------

# Routes
@app.get("/health", response_model=HealthResponse, tags=["System"])
def health_check(api_key: str = Depends(verify_api_key)):
    """Check API health and dataset availability."""
    try:
        df = load_dataset()
        return {"status": "ok", "total_loads_in_dataset": len(df)}
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/loads", response_model=LoadsResponse, tags=["Loads"])
def get_loads(
    # Origin / Destination 
    origin: Optional[str] = Query(
        None,
        description="Filter by origin location."),
    destination: Optional[str] = Query(
        None,
        description="Filter by destination location"),

    # Equipment type 
    equipment_type: Optional[str] = Query(
        None,
        description="Filter by equipment type."),

    # Weight 
    min_weight: Optional[str] = Query(
        None,
        description="Minimum load weight."),
    max_weight: Optional[str] = Query(
        None,
        description="Maximum load weight."),

    # Pickup datetime window 
    pickup_from: Optional[str] = Query(
        None,
        description="Pickup datetime — earliest acceptable. Format: YYYY-MM-DD"),
    pickup_to: Optional[str] = Query(
        None,
        description="Pickup datetime — latest acceptable. Format: YYYY-MM-DD"),

    # Delivery datetime window 
    delivery_from: Optional[str] = Query(
        None,
        description="Delivery datetime — earliest acceptable. Format: YYYY-MM-DD"),
    delivery_to: Optional[str] = Query(
        None,
        description="Delivery datetime — latest acceptable. Format: YYYY-MM-DD"),

    # Auth
    api_key: str = Depends(verify_api_key),
):
    """
    Query available loads using one or more filters.

    All filters are optional and combinable. Text filters use **case-insensitive
    partial matching** so an agent can pass values like `'chicago'` or `'IL'`
    without worrying about exact casing.

    Datetime filters accept ISO 8601 format: `YYYY-MM-DDTHH:MM` or `YYYY-MM-DD`.

    Returns a JSON object with `total_matches`, the active `filters_applied`,
    and the `loads` array.
    """
    try:
        df = load_dataset()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    filters_applied = {}

    # ── Apply filters ──────────────────────────────────────────────────────────
    if origin:
        df = df[df["origin"].str.contains(origin, case=False, na=False)]
        filters_applied["origin"] = origin

    if destination:
        df = df[df["destination"].str.contains(destination, case=False, na=False)]
        filters_applied["destination"] = destination

    if equipment_type:
        df = df[df["equipment_type"].str.contains(equipment_type, case=False, na=False)]
        filters_applied["equipment_type"] = equipment_type

    if min_weight:
        df = df[df["weight"] >= float(min_weight)]
        filters_applied["min_weight"] = min_weight

    if max_weight:
        df = df[df["weight"] <= float(max_weight)]
        filters_applied["max_weight"] = max_weight

    if pickup_from:
        df = df[df["pickup_datetime"].dt.date >= pd.to_datetime(pickup_from, errors="coerce").date()]
        filters_applied["pickup_from"] = pickup_from

    if pickup_to:
        df = df[df["pickup_datetime"].dt.date <= pd.to_datetime(pickup_to, errors="coerce").date()]
        filters_applied["pickup_to"] = pickup_to

    if delivery_from:
        df = df[df["delivery_datetime"].dt.date >= pd.to_datetime(delivery_from, errors="coerce").date()]
        filters_applied["delivery_from"] = delivery_from

    if delivery_to:
        df = df[df["delivery_datetime"].dt.date <= pd.to_datetime(delivery_to, errors="coerce").date()]
        filters_applied["delivery_to"] = delivery_to

    total_matches = len(df)

    # ── Serialise (convert datetimes to ISO strings) ───────────────────────────
    df = df.copy()
    for col in ["pickup_datetime", "delivery_datetime"]:
        if col in df.columns:
            df[col] = df[col].dt.strftime("%Y-%m-%dT%H:%M")

    df = df.where(pd.notna(df), None)
    loads = df.to_dict(orient="records")

    return {
        "total_matches": total_matches,
        "filters_applied": filters_applied,
        "loads": loads,
    }


@app.post("/metrics", response_model=MetricResponse, status_code=201, tags=["Metrics"])
def submit_metric(payload: MetricRequest, api_key: str = Depends(verify_api_key)):
    """
    Submit outcome metrics once a load process is closed.

    Called by the agent after a load booking attempt is completed (regardless
    of outcome). Each submission is appended as a new row to the metrics CSV file.

    **Sentiment values:** `positive` | `neutral` | `negative`

    **Outcome values:** `booked` | `rejected` | `no_capacity` | `cancelled` | `pending`
    """
    recorded_at = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")

    row = {
        "recorded_at": recorded_at,
        "load_info": payload.load_info,
        "origin": payload.origin,
        "destination": payload.destination,
        "equipment_type": payload.equipment_type,
        "carrier_legal_name": payload.carrier_legal_name,
        "carrier_mc_number": payload.carrier_mc_number,
        "carrier_mc_number_validity": payload.carrier_mc_number_validity,
        "price_diff": float(payload.price_diff),
        "duration": float(payload.duration),
        "sentiment": payload.sentiment,
        "outcome": payload.outcome
    }

    try:
        append_metric(row)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Failed to write metrics: {e}")

    return {
        "status": "ok",
        "recorded_at": recorded_at,
        "message": f"Metric recorded successfully.",
    }


@app.get("/metrics", response_model=MetricsListResponse, tags=["Metrics"])
def get_metrics(
    outcome: Optional[str] = Query(None, description="Filter by outcome value"),
    sentiment: Optional[str] = Query(None, description="Filter by sentiment value"),
    carrier_mc_number: Optional[str] = Query(None, description="Filter by MC number"),
    limit: int = Query(100, ge=1, le=1000, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    api_key: str = Depends(verify_api_key),
):
    """
    Retrieve recorded metrics. Useful for the agent or a dashboard to review
    historical outcomes.

    Returns all rows from the metrics CSV, with optional filters on outcome,
    sentiment, and carrier MC number.
    """
    if not os.path.isfile(METRICS_PATH):
        return {"total_records": 0, "metrics": []}

    try:
        df = pd.read_csv(METRICS_PATH, dtype=str)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read metrics file: {e}")

    if outcome:
        df = df[df["outcome"].str.contains(outcome, case=False, na=False)]
    if sentiment:
        df = df[df["sentiment"].str.contains(sentiment, case=False, na=False)]
    if carrier_mc_number:
        df = df[df["carrier_mc_number"].str.contains(carrier_mc_number, case=False, na=False)]

    total_records = len(df)
    df = df.iloc[offset: offset + limit]
    df = df.where(pd.notna(df), None)

    return {"total_records": total_records, "metrics": df.to_dict(orient="records")}