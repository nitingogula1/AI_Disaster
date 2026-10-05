from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@patch("app.services.worldpop_service.requests.post")
@patch("app.services.worldpop_service.requests.get")
def test_population_exposure_success(mock_get, mock_post):
    mock_post.return_value.json.return_value = {"taskid": "12345"}
    mock_post.return_value.raise_for_status = lambda: None

    mock_get.return_value.json.return_value = {
        "status": "finished",
        "data": {
            "total_population": 5000,
            "area": 12.5
        }
    }
    mock_get.return_value.raise_for_status = lambda: None

    payload = {
        "flood_geojson": {
            "type": "Polygon",
            "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]
        },
        "year": 2020
    }

    response = client.post("/api/v1/impact/population-exposure", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["population"] == 5000
    assert data["year"] == 2020
    assert data["source"] == "WorldPop"

@patch("app.services.worldpop_service.requests.post")
def test_population_exposure_invalid_geometry(mock_post):
    payload = {
        "flood_geojson": {
            "type": "Point",
            "coordinates": [0, 0]
        },
        "year": 2020
    }
    response = client.post("/api/v1/impact/population-exposure", json=payload)
    assert response.status_code == 400

@patch("app.services.worldpop_service.requests.post")
@patch("app.services.worldpop_service.requests.get")
def test_population_exposure_failure(mock_get, mock_post):
    mock_post.return_value.json.return_value = {"taskid": "12345"}
    mock_post.return_value.raise_for_status = lambda: None

    mock_get.return_value.json.return_value = {
        "status": "error",
        "error": "Some worldpop error"
    }
    mock_get.return_value.raise_for_status = lambda: None

    payload = {
        "flood_geojson": {
            "type": "Polygon",
            "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]
        }
    }
    response = client.post("/api/v1/impact/population-exposure", json=payload)
    assert response.status_code == 500
