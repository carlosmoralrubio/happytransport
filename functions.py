import os
from fastapi.security import APIKeyHeader
import pandas as pd
from fastapi import HTTPException, Security
import csv
import threading

# ENVs
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)
DATASET_PATH = os.getenv("DATASET_PATH", "loads.csv")  # supports .csv or .xlsx
METRICS_PATH = os.getenv("METRICS_PATH", "metrics.csv")

# Thread lock — prevents race conditions when multiple agents write simultaneously
_metrics_lock = threading.Lock()

METRICS_COLUMNS = [
    "recorded_at",
    "load_info",
    "carrier_legal_name",
    "carrier_mc_number",
    "carrier_mc_number_validity",
    "price_diff",
    "duration",
    "sentiment",
    "outcome",
    "origin",
    "destination",
    "equipment_type"
]

# Functions
def append_metric(row: dict) -> None:
    """Append a single metrics row to the CSV file, creating it with headers if needed."""
    with _metrics_lock:
        file_exists = os.path.isfile(METRICS_PATH)
        with open(METRICS_PATH, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=METRICS_COLUMNS)
            if not file_exists:
                writer.writeheader()
            writer.writerow(row)


def load_dataset() -> pd.DataFrame:
    """Load the dataset from CSV or Excel, normalise column names."""
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Dataset not found at '{DATASET_PATH}'. "
                                "Set the DATASET_PATH env variable to point to your file.")
    if DATASET_PATH.endswith(".xlsx") or DATASET_PATH.endswith(".xls"):
        df = pd.read_excel(DATASET_PATH)
    else:
        df = pd.read_csv(DATASET_PATH)

    # Parse datetime columns
    for col in ["pickup_datetime", "delivery_datetime"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    return df


def _load_valid_keys() -> set[str]:
    """
    Load valid API keys from environment variables.
    Supports:
      - API_KEYS = "key1,key2,key3"   (multiple keys, comma-separated)
      - API_KEY  = "key1"             (single key, legacy)
    """
    keys: set[str] = set()

    multi = os.getenv("API_KEYS", "")
    if multi:
        keys.update(k.strip() for k in multi.split(",") if k.strip())

    single = os.getenv("API_KEY", "")
    if single.strip():
        keys.add(single.strip())

    # Fallback for local development only — remove in production!
    if not keys:
        keys.add("dev-key-change-me")

    return keys


async def verify_api_key(api_key: str = Security(API_KEY_HEADER)) -> str:
    """
    Reusable dependency injected into every endpoint.
    Raises HTTP 401 if the key is missing or HTTP 403 if it is invalid.
    """
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="Missing API key. Provide it in the 'X-API-Key' header.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    valid_keys = _load_valid_keys()
    if api_key not in valid_keys:
        raise HTTPException(
            status_code=403,
            detail="Invalid API key.",
        )
    return api_key