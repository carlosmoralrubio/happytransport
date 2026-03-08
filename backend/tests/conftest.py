"""
Test configuration and fixtures.
"""
import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Headers with valid API key."""
    return {"X-API-Key": "dev-key-change-me"}
