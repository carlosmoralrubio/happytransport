"""
Business logic and data services.
"""
import os
import csv
import threading
import pandas as pd

# ──────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────

DATASET_PATH = os.getenv("DATASET_PATH", "backend/data/loads.csv")
METRICS_PATH = os.getenv("METRICS_PATH", "backend/data/metrics.csv")

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


# ──────────────────────────────────────────────────────────────────────
# Dataset Service
# ──────────────────────────────────────────────────────────────────────

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


# ──────────────────────────────────────────────────────────────────────
# Metrics Service
# ──────────────────────────────────────────────────────────────────────

def append_metric(row: dict) -> None:
    """Append a single metrics row to the CSV file, creating it with headers if needed."""
    with _metrics_lock:
        file_exists = os.path.isfile(METRICS_PATH)
        with open(METRICS_PATH, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=METRICS_COLUMNS)
            if not file_exists:
                writer.writeheader()
            writer.writerow(row)


def get_metrics(
    outcome: str = None,
    sentiment: str = None,
    carrier_mc_number: str = None,
    limit: int = 100,
    offset: int = 0
) -> tuple[int, list[dict]]:
    """
    Retrieve metrics from CSV file with optional filters.
    Returns tuple of (total_records, filtered_records).
    """
    if not os.path.isfile(METRICS_PATH):
        return 0, []

    df = pd.read_csv(METRICS_PATH, dtype=str)

    if outcome:
        df = df[df["outcome"].str.contains(outcome, case=False, na=False)]
    if sentiment:
        df = df[df["sentiment"].str.contains(sentiment, case=False, na=False)]
    if carrier_mc_number:
        df = df[df["carrier_mc_number"].str.contains(carrier_mc_number, case=False, na=False)]

    total_records = len(df)
    df = df.iloc[offset: offset + limit]
    df = df.where(pd.notna(df), None)

    return total_records, df.to_dict(orient="records")
