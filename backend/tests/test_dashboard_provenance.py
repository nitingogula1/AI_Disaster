import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.dashboard import build_metric, ProvenanceType, STALENESS_THRESHOLDS

@pytest.fixture
def test_client():
    return TestClient(app)

def test_metric_envelope_structure():
    now = datetime.now(timezone.utc)
    m = build_metric(42, "units", ProvenanceType.LIVE_SENSOR.value, as_of=now)
    assert m["value"] == 42
    assert m["unit"] == "units"
    assert m["provenance"] == "LIVE_SENSOR"
    assert m["stale"] is False
    assert m["as_of"] is not None
    assert m["fetched_at"] is not None

def test_missing_provenance_defaults_to_simulated():
    # If provenance is unrecognized or missing, it must fail-safe to SIMULATED
    m = build_metric(10, "count", provenance="UNKNOWN_FEED")
    assert m["provenance"] == ProvenanceType.SIMULATED.value

def test_staleness_threshold_live_sensor():
    now = datetime.now(timezone.utc)
    # 5 hours old -> not stale (threshold is 6h)
    fresh_time = now - timedelta(hours=5)
    fresh_m = build_metric(1.5, "m", ProvenanceType.LIVE_SENSOR.value, as_of=fresh_time)
    assert fresh_m["stale"] is False

    # 7 hours old -> stale (threshold is 6h)
    stale_time = now - timedelta(hours=7)
    stale_m = build_metric(1.5, "m", ProvenanceType.LIVE_SENSOR.value, as_of=stale_time)
    assert stale_m["stale"] is True

def test_staleness_threshold_satellite():
    now = datetime.now(timezone.utc)
    # 9 days old -> not stale (threshold is 10d)
    fresh_time = now - timedelta(days=9)
    fresh_m = build_metric(25, "km²", ProvenanceType.SATELLITE_DERIVED.value, as_of=fresh_time)
    assert fresh_m["stale"] is False

    # 11 days old -> stale (threshold is 10d)
    stale_time = now - timedelta(days=11)
    stale_m = build_metric(25, "km²", ProvenanceType.SATELLITE_DERIVED.value, as_of=stale_time)
    assert stale_m["stale"] is True

def test_dashboard_api_live_summary(test_client):
    res = test_client.get("/api/v1/dashboard/summary?mode=LIVE")
    assert res.status_code == 200
    data = res.json()["data"]
    for key, metric in data.items():
        assert "value" in metric
        assert "unit" in metric
        assert "provenance" in metric
        assert "stale" in metric
        assert metric["provenance"] in [p.value for p in ProvenanceType]
        # LIVE mode should not return SIMULATED
        assert metric["provenance"] != ProvenanceType.SIMULATED.value

def test_dashboard_api_drill_summary(test_client):
    res = test_client.get("/api/v1/dashboard/summary?mode=DRILL")
    assert res.status_code == 200
    data = res.json()["data"]
    for key, metric in data.items():
        assert metric["provenance"] == ProvenanceType.SIMULATED.value

def test_dashboard_api_metrics_provenance(test_client):
    res = test_client.get("/api/v1/dashboard/metrics?mode=LIVE")
    assert res.status_code == 200
    data = res.json()["data"]
    for kpi_key, metric in data.items():
        assert "value" in metric
        assert "provenance" in metric
        assert "stale" in metric
        assert metric["provenance"] != ProvenanceType.SIMULATED.value
