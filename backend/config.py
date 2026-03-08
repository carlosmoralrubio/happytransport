"""
Application configuration and environment variables.
"""
import os


class Settings:
    """Application settings loaded from environment variables."""

    # API
    API_TITLE = "HappyTransport Logistics API"
    API_DESCRIPTION = (
        "HappyTransport Logistics API provides access to a dataset of "
        "freight loads and allows recording of booking outcome metrics."
    )
    API_VERSION = "1.0.0"

    # Data
    DATASET_PATH = os.getenv("DATASET_PATH", "backend/data/loads.csv")
    METRICS_PATH = os.getenv("METRICS_PATH", "backend/data/metrics.csv")

    # Environment
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")


settings = Settings()
