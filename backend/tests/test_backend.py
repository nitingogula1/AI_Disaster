import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

init_db()
client = TestClient(app)

def test_health_and_status():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"

    status_resp = client.get("/api/v1/system/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["success"] is True
    assert status_data["data"]["database"] == "ONLINE"
    assert status_data["data"]["ai_engine"] == "UNAVAILABLE"

def test_auth_login_success():
    resp = client.post("/api/v1/auth/login", json={
        "email": "admin@sentinelaid.gov",
        "password": "password"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@sentinelaid.gov"
    assert data["user"]["role"] == "ADMIN"

def test_auth_login_invalid():
    resp = client.post("/api/v1/auth/login", json={
        "email": "admin@sentinelaid.gov",
        "password": "wrongpassword"
    })
    assert resp.status_code == 401

def test_auth_me_and_rbac():
    # Login as admin
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "admin@sentinelaid.gov",
        "password": "password"
    }).json()
    admin_token = login_resp["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # /auth/me
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["data"]["role"] == "ADMIN"

    # Protected user management list
    users_resp = client.get("/api/v1/users", headers=headers)
    assert users_resp.status_code == 200
    assert len(users_resp.json()["data"]) >= 1

    # Unauthenticated request to /auth/me must fail
    fail_resp = client.get("/api/v1/auth/me")
    assert fail_resp.status_code == 401

    # Login as Rescue Lead (role RESCUE_TEAM)
    rescue_login = client.post("/api/v1/auth/login", json={
        "email": "rt02.lead@sar.ops",
        "password": "password"
    }).json()
    rescue_headers = {"Authorization": f"Bearer {rescue_login['access_token']}"}

    # RESCUE_TEAM attempting to create user should get 403 Forbidden
    forbidden_resp = client.post("/api/v1/users", json={
        "name": "Hacker",
        "email": "hacker@test.com",
        "password": "password123",
        "role": "ADMIN"
    }, headers=rescue_headers)
    assert forbidden_resp.status_code == 403

def test_dashboard_endpoints():
    summary_resp = client.get("/api/v1/dashboard/summary")
    assert summary_resp.status_code == 200
    s_data = summary_resp.json()["data"]
    assert "active_disasters" in s_data
    assert "affected_population" in s_data
    assert "rescue_teams" in s_data

    metrics_resp = client.get("/api/v1/dashboard/metrics")
    assert metrics_resp.status_code == 200
    assert "activeDisasters" in metrics_resp.json()["data"]

    inc_resp = client.get("/api/v1/dashboard/recent-incidents")
    assert inc_resp.status_code == 200

    det_resp = client.get("/api/v1/dashboard/recent-detections")
    assert det_resp.status_code == 200

    rescue_resp = client.get("/api/v1/dashboard/rescue-status")
    assert rescue_resp.status_code == 200

    alerts_resp = client.get("/api/v1/dashboard/alerts")
    assert alerts_resp.status_code == 200

def test_disaster_crud():
    # 1. Create disaster
    create_resp = client.post("/api/v1/disasters", json={
        "name": "Test Flood Event Delta",
        "disaster_type": "FLOOD",
        "severity": "CRITICAL",
        "status": "ACTIVE",
        "location_name": "Test Location Zone 9",
        "latitude": 22.100,
        "longitude": 89.650,
        "affected_area": 350.5,
        "affected_population": 12500
    })
    assert create_resp.status_code == 201
    created = create_resp.json()["data"]
    disaster_id = created["id"]

    # 2. List disasters
    list_resp = client.get("/api/v1/disasters?status=ACTIVE")
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) >= 1

    # 3. Patch status
    patch_resp = client.patch(f"/api/v1/disasters/{disaster_id}/status?status=MONITORING")
    assert patch_resp.status_code == 200

    # 4. Get disaster
    get_resp = client.get(f"/api/v1/disasters/{disaster_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["status"] == "MONITORING"

    # 5. Delete disaster
    del_resp = client.delete(f"/api/v1/disasters/{disaster_id}")
    assert del_resp.status_code == 200

def test_incident_crud():
    # Create incident
    create_resp = client.post("/api/v1/incidents", json={
        "disaster_id": "evt-remal-001",
        "title": "Substation Failure Test",
        "incident_type": "POWER",
        "latitude": 21.845,
        "longitude": 89.540,
        "severity": "HIGH",
        "status": "ACTIVE",
        "population_affected": 800
    })
    assert create_resp.status_code == 201
    inc_id = create_resp.json()["data"]["id"]

    # List
    list_resp = client.get("/api/v1/incidents?disaster_id=evt-remal-001")
    assert list_resp.status_code == 200

    # Update status
    patch_resp = client.patch(f"/api/v1/incidents/{inc_id}/status?status=RESOLVED")
    assert patch_resp.status_code == 200

    # Clean up
    del_resp = client.delete(f"/api/v1/incidents/{inc_id}")
    assert del_resp.status_code == 200

def test_gis_geojson():
    # Disaster GIS
    disaster_gis = client.get("/api/v1/gis/disasters/evt-remal-001")
    assert disaster_gis.status_code == 200
    geojson = disaster_gis.json()
    assert geojson["type"] == "FeatureCollection"
    assert len(geojson["features"]) >= 1

    # Rescue teams GIS
    teams_gis = client.get("/api/v1/gis/rescue-teams")
    assert teams_gis.status_code == 200
    assert teams_gis.json()["type"] == "FeatureCollection"

    # Shelters GIS
    shelters_gis = client.get("/api/v1/gis/shelters")
    assert shelters_gis.status_code == 200
    assert shelters_gis.json()["type"] == "FeatureCollection"


def test_satellite_and_preprocessing():
    response = client.post("/api/v1/satellite/preprocess", json={"scene_id": "unregistered"})
    assert response.status_code == 501

def test_ai_damage_detection_is_unavailable():
    response = client.post("/api/v1/ai/damage-detection", json={"disaster_id": "evt-remal-001"})
    assert response.status_code == 501

def test_rescue_priority_and_teams():
    # Priorities
    prio_resp = client.get("/api/v1/rescue/priorities/evt-remal-001")
    assert prio_resp.status_code == 200
    zones = prio_resp.json()["data"]
    assert len(zones) >= 1
    assert "priority" in zones[0]

    # Teams list
    teams_resp = client.get("/api/v1/rescue/teams")
    assert teams_resp.status_code == 200
    teams = teams_resp.json()["data"]
    assert len(teams) >= 1

def test_route_optimization():
    route_resp = client.post("/api/v1/routes/optimize", json={
        "start_location": [21.870, 89.600],
        "destination": [21.840, 89.540],
        "avoid_inundation": True
    })
    assert route_resp.status_code == 200
    data = route_resp.json()["data"]
    assert "selected_route" in data
    assert "alternative_routes" in data
    assert len(data["selected_route"]["geometry"]) >= 2

def test_alerts():
    # Create alert
    create_resp = client.post("/api/v1/alerts", json={
        "severity": "CRITICAL",
        "title": "Tidal Wave Surge Warning",
        "message": "Water levels exceeding safety levee by 1.2m.",
        "coordinates_str": "21.8412Â° N, 89.5422Â° E"
    })
    assert create_resp.status_code == 200
    alert_id = create_resp.json()["data"]["id"]

    # Read
    read_resp = client.patch(f"/api/v1/alerts/{alert_id}/read")
    assert read_resp.status_code == 200

    # Delete
    del_resp = client.delete(f"/api/v1/alerts/{alert_id}")
    assert del_resp.status_code == 200

def test_reports_generate_and_download():
    # List reports
    list_resp = client.get("/api/v1/reports")
    assert list_resp.status_code == 200

    # Generate PDF report
    gen_resp = client.post("/api/v1/reports/generate", json={
        "disaster_id": "evt-remal-001",
        "report_type": "Executive Brief"
    })
    assert gen_resp.status_code == 200
    rep_code = gen_resp.json()["data"]["id"]

    # Download PDF report
    dl_resp = client.get(f"/api/v1/reports/{rep_code}/download")
    assert dl_resp.status_code == 200
    assert dl_resp.headers["content-type"] == "application/pdf"
    assert len(dl_resp.content) > 100

def test_drone_pipeline_and_dispatch():
    # 1. List drone missions
    missions_resp = client.get("/api/v1/drone/missions")
    assert missions_resp.status_code == 200
    missions = missions_resp.json()["data"]
    assert len(missions) >= 1
    mission_id = missions[0]["id"]

    # 2. Mission detail with elevation subtraction profile
    detail_resp = client.get(f"/api/v1/drone/missions/{mission_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()["data"]
    assert detail["mission"]["avg_water_depth_m"] > 0
    assert len(detail["elevation_profile"]["transect_points"]) >= 5
    assert len(detail["evacuation_routes"]) >= 2
    assert len(detail["detections"]) >= 2

    # 3. GeoJSON export
    geojson_resp = client.get(f"/api/v1/drone/missions/{mission_id}/geojson")
    assert geojson_resp.status_code == 200
    assert geojson_resp.json()["type"] == "FeatureCollection"
    assert len(geojson_resp.json()["features"]) >= 3

    # 4. Trigger analysis
    analyze_resp = client.post("/api/v1/drone/missions/analyze", json={
        "target_sector": "Trishuli Secondary School Shelter",
        "flight_altitude_m": 65.0,
        "baseline_ground_elevation_m": 2.6,
        "simulated_flood_surge_m": 3.8
    })
    assert analyze_resp.status_code == 200
    assert analyze_resp.json()["data"]["water_depth_avg_m"] == 1.2
    assert analyze_resp.json()["data"]["total_survivors_detected"] == 48

    # 5. Live UAV Telemetry
    telem_resp = client.get("/api/v1/drone/live-telemetry")
    assert telem_resp.status_code == 200
    assert telem_resp.json()["data"]["battery_percent"] == 84

