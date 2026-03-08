"""
Tests for health check endpoint.
"""


def test_health_check(client, auth_headers):
    """Test health check endpoint."""
    response = client.get("/api/v1/health", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "total_loads_in_dataset" in data


def test_health_check_unauthorized(client):
    """Test health check without API key."""
    response = client.get("/api/v1/health")
    assert response.status_code == 401


def test_health_check_invalid_key(client):
    """Test health check with invalid API key."""
    response = client.get("/api/v1/health", headers={"X-API-Key": "invalid-key"})
    assert response.status_code == 403
