"""
Tests for metrics endpoint.
"""


def test_submit_metric(client, auth_headers):
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
        "/api/v1/metrics",
        json=payload,
        headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "ok"
    assert "recorded_at" in data


def test_get_metrics(client, auth_headers):
    """Test retrieving metrics."""
    response = client.get("/api/v1/metrics", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_records" in data
    assert "metrics" in data
    assert isinstance(data["metrics"], list)
