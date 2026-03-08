"""
Security and authentication.
"""
import os
from fastapi.security import APIKeyHeader
from fastapi import HTTPException, Security

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


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

    # Fallback for local development only
    if not keys:
        keys.add("dev-key-change-me")

    return keys


async def verify_api_key(api_key: str = Security(API_KEY_HEADER)) -> str:
    """
    Verify API key from X-API-Key header.
    Raises HTTP 401 if missing, 403 if invalid.
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
