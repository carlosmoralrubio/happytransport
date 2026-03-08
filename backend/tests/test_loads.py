"""
Tests for loads endpoint.
"""


def test_get_loads(client, auth_headers):
    """Test getting loads without filters."""
    response = client.get("/v1/loads", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_matches" in data
    assert "filters_applied" in data
    assert "loads" in data
    assert isinstance(data["loads"], list)


def test_get_loads_unauthorized(client):
    """Test getting loads without API key."""
    response = client.get("/v1/loads")
    assert response.status_code == 401


def test_get_loads_with_origin_filter(client, auth_headers):
    """Test loads with origin filter."""
    response = client.get(
        "/v1/loads",
        params={"origin": "Chicago"},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "origin" in data["filters_applied"]


def test_get_loads_legacy_path(client, auth_headers):
    """Test legacy unprefixed loads route for backward compatibility."""
    response = client.get(
        "/loads",
        params={"origin": "Chicago"},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "origin" in data["filters_applied"]
