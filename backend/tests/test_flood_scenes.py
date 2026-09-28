import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

init_db()
client = TestClient(app)

def test_get_flood_scenes():
    resp = client.get("/api/v1/satellite/flood-scenes?operation_id=EVT-8821-BGD&hours=72&max_cloud_cover=30")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    scenes = data["data"]
    assert isinstance(scenes, list)
    assert len(scenes) >= 1
    
    # Verify mandatory flood relevance fields
    first = scenes[0]
    assert "flood_relevant" in first
    assert "flood_relevance_score" in first
    assert "flood_status" in first
    assert "detection_method" in first
    assert first["flood_status"] in [
        "FLOOD RELEVANT", "POSSIBLE FLOOD SIGNAL", 
        "NO SIGNIFICANT FLOOD SIGNAL", "CLOUD OBSCURED"
    ]

def test_search_flood_scenes():
    payload = {
        "operation_id": "EVT-8821-BGD",
        "hours": 72,
        "max_cloud_cover": 30.0,
        "satellites": ["Sentinel-1", "Sentinel-2", "Landsat"]
    }
    resp = client.post("/api/v1/satellite/flood-scenes/search", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    scenes = data["data"]
    assert len(scenes) >= 1

def test_get_flood_events():
    resp = client.get("/api/v1/satellite/flood-scenes/events")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    events = data["data"]
    assert len(events) >= 1
    assert "event" in events[0]
    assert "flood_area_km2" in events[0] or "flood_area" in events[0]

def test_execute_scene_flood_analysis():
    scene_id = "S2A_MSIL2A_20260926T043231_N0510_R133_T45QZD"
    resp = client.post(f"/api/v1/satellite/scenes/{scene_id}/flood-analysis", json={
        "operation_id": "EVT-8821-BGD",
        "method": "MNDWI"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    res = data["data"]
    assert res["scene_id"] == scene_id
    assert res["status"] == "COMPLETED"
    assert res["method"] == "MNDWI"
    assert res["flood_area_km2"] > 0
    assert "geojson_layer_id" in res

def test_gis_flood_geojson():
    scene_id = "S2A_MSIL2A_20260926T043231"
    resp = client.get(f"/api/v1/gis/flood/{scene_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "FeatureCollection"
    assert "features" in data
    assert len(data["features"]) >= 1
