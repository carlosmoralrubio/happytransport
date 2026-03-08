"""
API endpoints.
"""
from fastapi import APIRouter, Query, HTTPException, Depends, status
from typing import Optional
from datetime import datetime
import pandas as pd
from app.models import (
    Load, LoadsResponse, HealthResponse,
    MetricRequest, MetricResponse, MetricsListResponse
)
from app.security import verify_api_key
from app.services import (
    load_dataset, append_metric, get_metrics,
    METRICS_PATH
)

router = APIRouter(prefix="/v1")
legacy_router = APIRouter()


# ──────────────────────────────────────────────────────────────────────
# Health Endpoint
# ──────────────────────────────────────────────────────────────────────

@router.get("/health", response_model=HealthResponse, tags=["System"])
def health_check(api_key: str = Depends(verify_api_key)):
    """Check API health and dataset availability."""
    try:
        df = load_dataset()
        return {"status": "ok", "total_loads_in_dataset": len(df)}
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


# ──────────────────────────────────────────────────────────────────────
# Loads Endpoints
# ──────────────────────────────────────────────────────────────────────

@legacy_router.get("/loads", response_model=LoadsResponse, tags=["Loads"], include_in_schema=False)
@router.get("/loads", response_model=LoadsResponse, tags=["Loads"])
def get_loads(
    origin: Optional[str] = Query(None, description="Filter by origin location."),
    destination: Optional[str] = Query(None, description="Filter by destination location"),
    equipment_type: Optional[str] = Query(None, description="Filter by equipment type."),
    min_weight: Optional[str] = Query(None, description="Minimum load weight."),
    max_weight: Optional[str] = Query(None, description="Maximum load weight."),
    pickup_from: Optional[str] = Query(None, description="Pickup datetime — earliest acceptable. Format: YYYY-MM-DD"),
    pickup_to: Optional[str] = Query(None, description="Pickup datetime — latest acceptable. Format: YYYY-MM-DD"),
    delivery_from: Optional[str] = Query(None, description="Delivery datetime — earliest acceptable. Format: YYYY-MM-DD"),
    delivery_to: Optional[str] = Query(None, description="Delivery datetime — latest acceptable. Format: YYYY-MM-DD"),
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

    # Apply filters
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

    # Convert datetime columns to ISO format strings before serializing
    for col in ["pickup_datetime", "delivery_datetime"]:
        if col in df.columns and pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = df[col].astype(str).str.replace(r' ', 'T', regex=False)

    df = df.where(pd.notna(df), None)
    loads = df.to_dict(orient="records")

    return {
        "total_matches": total_matches,
        "filters_applied": filters_applied,
        "loads": loads,
    }


# ──────────────────────────────────────────────────────────────────────
# Metrics Endpoints
# ──────────────────────────────────────────────────────────────────────

@router.post("/metrics", response_model=MetricResponse, status_code=status.HTTP_201_CREATED, tags=["Metrics"])
def submit_metric(
    payload: MetricRequest,
    api_key: str = Depends(verify_api_key)):
    """
    Submit outcome metrics once a load process is closed.

    Called by the agent after a load booking attempt is completed (regardless
    of outcome). Each submission is appended as a new row to the metrics CSV file.

    **Sentiment values:** `positive` | `neutral` | `negative`

    **Outcome values:** `Booked with negotiations` | `Booked without negotiations` | `Not booked with negotiations` | `Not booked without negotiations` | `Not match` | `Unknown`
    """
    recorded_at = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")

    try:
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
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid numeric value: {e}")

    try:
        append_metric(row)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Failed to write metrics: {e}")

    return {
        "status": "ok",
        "recorded_at": recorded_at,
        "message": "Metric recorded successfully.",
    }


@router.get("/metrics", response_model=MetricsListResponse, tags=["Metrics"])
def get_metrics_endpoint(
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
    try:
        total_records, metrics = get_metrics(
            outcome=outcome,
            sentiment=sentiment,
            carrier_mc_number=carrier_mc_number,
            limit=limit,
            offset=offset
        )
        return {"total_records": total_records, "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read metrics file: {e}")
