"""
API Tests - All endpoints
"""


class TestHealth:
    """Health check endpoint tests."""

    def test_health_check(self, client, auth_headers):
        """Test health check endpoint."""
        response = client.get("/v1/health", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "total_loads_in_dataset" in data

    def test_health_check_unauthorized(self, client):
        """Test health check without API key."""
        response = client.get("/v1/health")
        assert response.status_code == 401

    def test_health_check_invalid_key(self, client):
        """Test health check with invalid API key."""
        response = client.get("/v1/health", headers={"X-API-Key": "invalid-key"})
        assert response.status_code == 403


class TestLoads:
    """Loads endpoint tests."""

    def test_get_loads(self, client, auth_headers):
        """Test getting loads without filters."""
        response = client.get("/v1/loads", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_matches" in data
        assert "filters_applied" in data
        assert "loads" in data
        assert isinstance(data["loads"], list)

    def test_get_loads_unauthorized(self, client):
        """Test getting loads without API key."""
        response = client.get("/v1/loads")
        assert response.status_code == 401

    def test_get_loads_with_origin_filter(self, client, auth_headers):
        """Test loads with origin filter."""
        response = client.get(
            "/v1/loads",
            params={"origin": "Chicago"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "origin" in data["filters_applied"]


class TestMetrics:
    """Metrics endpoint tests."""

    def test_submit_metric(self, client, auth_headers):
        """Test metric submission."""
        payload = {
            "load_info": "Load from Dallas to Houston",
            "origin": "Dallas",
            "destination": "Houston",
            "equipment_type": "Dry Van",
            "carrier_legal_name": "Test Carrier",
            "carrier_mc_number": "123456",
            "carrier_mc_number_validity": "true",
            "price_diff": "100",
            "duration": "30",
            "sentiment": "positive",
            "outcome": "Booked with negotiations"
        }
        response = client.post(
            "/v1/metrics",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "ok"
        assert "recorded_at" in data

    def test_get_metrics(self, client, auth_headers):
        """Test retrieving metrics."""
        response = client.get("/v1/metrics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_records" in data
        assert "metrics" in data
        assert isinstance(data["metrics"], list)
