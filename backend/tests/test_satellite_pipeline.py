"""Synthetic fixtures are explicitly tagged and isolated from project records."""
import asyncio
import io
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import AsyncMock
import httpx
import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin
from fastapi.testclient import TestClient
from shapely.geometry import shape
from app.main import app
from app.core.database import SessionLocal
from app.models.satellite import SatelliteScene, SatelliteIngestionJob, ProcessingResult
from app.services.raster_engine import SatelliteRasterEngine, raster_engine
from app.services.scene_registry import register_file, inspect_raster
from app.services.satellite_providers import PlanetaryComputerProvider
from app.services.satellite_hub_service import satellite_hub_service as hub

client = TestClient(app)
NAMES = ["B02", "B03", "B04", "B08", "B11", "B12", "SCL"]

def fixture_raster(path, water=True, named=True, cloud=False, scale=False):
    array = np.full((7, 10, 10), 1000, dtype="float32")
    array[1] = 3000 if water else 500
    array[3:6] = 1000 if water else 3000
    array[6] = 4
    if cloud:
        array[6, 0, 0:7] = [0, 1, 3, 8, 9, 10, 11]
        array[1, 1, 0] = -9999
    with rasterio.open(path, "w", driver="GTiff", width=10, height=10, count=7, dtype="float32",
                       crs="EPSG:32631", transform=from_origin(500000, 1000, 20, 20), nodata=-9999) as dst:
        dst.write(array)
        if named:
            for i, name in enumerate(NAMES, 1): dst.set_band_description(i, name)
        dst.update_tags(IS_DEMO="true", SOURCE="SYNTHETIC_TEST_FIXTURE")
        if scale:
            dst.scales = (0.0001,)*6 + (1,)
            dst.offsets = (-0.15,)*6 + (0,)
    return path

def register(db, path):
    sid = "fixture-" + uuid.uuid4().hex
    scene = SatelliteScene(id=sid, scene_id=sid, platform="Synthetic fixture", acquisition_datetime=None)
    register_file(scene, path, "SYNTHETIC_TEST_FIXTURE", True)
    db.add(scene); db.commit()
    return sid

@pytest.mark.parametrize("method", ["NDWI", "MNDWI"])
def test_dry_zero_and_empty_polygons(tmp_path, db, method):
    sid = register(db, fixture_raster(tmp_path/"dry.tif", False))
    result = raster_engine.calculate_index(sid, method, 0)
    assert result["water_area_km2"] == 0
    assert result["water_pixel_count"] == 0
    assert result["feature_collection"]["features"] == []

def test_known_water_area_location_and_demo_restart(tmp_path, db):
    sid = register(db, fixture_raster(tmp_path/"wet.tif"))
    result = raster_engine.calculate_mndwi(sid, 0)
    assert result["water_pixel_count"] == 100
    # 100 x 400m2 grid cells near the UTM central meridian; ground scale ~0.9996.
    assert result["water_area_km2"] == pytest.approx(0.040032, rel=0.002)
    polygon = shape(result["feature_collection"]["features"][0]["geometry"])
    assert 2.999 < polygon.bounds[0] < 3.001
    assert 0.007 < polygon.bounds[1] < 0.011
    restarted = SatelliteRasterEngine(tmp_path/"restart", SessionLocal)
    assert restarted.calculate_mndwi(sid)["is_demo"] is True
    assert restarted.calculate_mndwi(sid)["data_source"] == "SYNTHETIC_TEST_FIXTURE"

def test_quality_nodata_threshold_and_offsets(tmp_path, db):
    sid = register(db, fixture_raster(tmp_path/"quality.tif", cloud=True))
    low = raster_engine.calculate_ndwi(sid, 0)
    high = raster_engine.calculate_ndwi(sid, 0.6)
    assert low["valid_pixels"] == 92
    assert low["water_pixel_count"] == 92
    assert high["water_pixel_count"] == 0
    scaled = register(db, fixture_raster(tmp_path/"scaled.tif", scale=True))
    result = raster_engine.calculate_mndwi(scaled, 0.6)
    assert result["water_pixel_count"] == 100  # index 2.0 after supplied offsets, not raw 0.5

def test_missing_named_bands_rejected(tmp_path):
    with pytest.raises(ValueError, match="Missing named bands"):
        inspect_raster(fixture_raster(tmp_path/"unnamed.tif", named=False))

def test_unregistered_cached_file_is_never_real(tmp_path):
    Path(raster_engine.raw_dir, "scn-001_multispectral.tif").write_bytes(b"untrusted")
    with pytest.raises(FileNotFoundError):
        raster_engine.resolve_scene_raster("scn-001")
    with pytest.raises(ValueError):
        raster_engine.resolve_scene_raster("../escape")

def test_uploaded_file_is_processed_and_date_stays_unknown(tmp_path, db):
    path = fixture_raster(tmp_path/"uploaded.tif", water=False)
    response = client.post("/api/v1/satellite/upload", data={"disaster_id": "../../escape"},
                           files={"file": ("../../input.tif", path.read_bytes(), "image/tiff")})
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["acquisition_datetime"] is None
    scene = db.get(SatelliteScene, data["scene_id"])
    assert Path(scene.image_path).read_bytes() == path.read_bytes()
    assert Path(scene.image_path).parent.name == "uploads"
    response = client.post("/api/v1/satellite/scenes/" + scene.id + "/flood-analysis",
                           json={"method": "NDWI", "threshold": 0, "operation_id": "test"})
    assert response.status_code == 200, response.text
    result = response.json()["data"]
    assert result["water_area_km2"] == 0
    assert result["threshold"] == 0
    assert result["confidence"] is None
    assert result["new_inundation"] is None
    assert result["is_demo"] is True
    assert client.get(result["mask_url"]).headers["content-type"] == "image/png"
    assert client.get(result["preview_url"]).status_code == 200
    assert client.get(result["raster_url"]).status_code == 200
    assert client.get(result["geojson_url"]).json()["features"] == []
    assert client.get("/api/v1/gis/flood/" + scene.id).json()["features"] == []

@pytest.mark.parametrize("filename,content", [("bad.tif", b"not a tiff"), ("rgb.png", b"png")])
def test_bad_upload_returns_error(filename, content):
    response = client.post("/api/v1/satellite/upload", files={"file": (filename, content)})
    assert response.status_code == 400, response.text

def test_empty_search_and_filters(monkeypatch):
    seen = {}
    class FakeClient:
        def __init__(self, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, url, json):
            seen.update(json)
            return httpx.Response(200, json={"features": []}, request=httpx.Request("POST", url))
    monkeypatch.setattr("app.services.satellite_providers.httpx.AsyncClient", FakeClient)
    response = client.post("/api/v1/satellite/stac/search", json={
        "bbox": [3, 0, 3.01, .01], "start_datetime": "2024-05-01T00:00:00Z",
        "end_datetime": "2024-05-02T00:00:00Z", "max_cloud_cover": 0})
    assert response.status_code == 200
    assert response.json()["data"]["scenes"] == []
    assert seen["bbox"] == [3, 0, 3.01, .01]
    assert seen["query"]["eo:cloud_cover"]["lte"] == 0
    assert seen["datetime"].startswith("2024-05-01")
    assert "/2024-05-02" in seen["datetime"]

def test_provider_failure_is_not_empty(monkeypatch):
    monkeypatch.setattr(hub.providers["PLANETARY_COMPUTER"], "search", AsyncMock(side_effect=RuntimeError("Provider unreachable")))
    response = client.post("/api/v1/satellite/stac/search", json={"bbox": [3, 0, 3.01, .01]})
    assert response.status_code == 502
    assert response.json()["success"] is False

def test_failed_download_cannot_complete(tmp_path, db, monkeypatch):
    sid = "failure-" + uuid.uuid4().hex
    db.add(SatelliteScene(id=sid, scene_id=sid, platform="Sentinel-2", source="PLANETARY_COMPUTER"))
    jid = "job-" + uuid.uuid4().hex
    db.add(SatelliteIngestionJob(job_id=jid, scene_id=sid, output_directory=str(tmp_path), status="QUEUED", progress=0))
    db.commit()
    def fail(*args): raise RuntimeError("Download failed")
    monkeypatch.setattr(hub.providers["PLANETARY_COMPUTER"], "download_sync", fail)
    hub._ingest_worker(jid, [3, 0, 3.01, .01], SessionLocal)
    status = hub.get_job_status(jid, db)
    db.expire_all()
    status = hub.get_job_status(jid, db)
    assert status["status"] == "FAILED"
    assert status["progress"] < 100
    assert status["error_message"] == "Download failed"

def test_status_poll_does_not_advance(db):
    jid = "queued-" + uuid.uuid4().hex
    db.add(SatelliteIngestionJob(job_id=jid, status="QUEUED", progress=0)); db.commit()
    assert hub.get_job_status(jid, db)["progress"] == 0
    assert hub.get_job_status(jid, db)["status"] == "QUEUED"

def test_missing_invalid_and_unsupported_scenes():
    assert client.post("/api/v1/satellite/scenes/missing/ingest", json={}).status_code == 404
    assert client.post("/api/v1/satellite/scenes/missing/flood-analysis", json={"method": "MNDWI"}).status_code == 404
    assert client.post("/api/v1/satellite/scenes/missing/flood-analysis", json={"method": "SAR Change"}).status_code == 501
    assert client.get("/api/v1/ai/status").json()["data"]["status"] == "UNAVAILABLE"
    assert client.post("/api/v1/ai/damage-segmentation", json={"post_scene_id": "missing"}).status_code == 501

def test_download_aligns_real_grids_and_preserves_metadata(tmp_path, monkeypatch):
    provider = PlanetaryComputerProvider()
    assets = {}
    for key in NAMES:
        size = 10 if key in ["B02", "B03", "B04", "B08"] else 5
        path = tmp_path / (key + ".tif")
        with rasterio.open(path, "w", driver="GTiff", width=size, height=size, count=1, dtype="uint16",
                           crs="EPSG:32631", transform=from_origin(500000, 200, 200/size, 200/size), nodata=0) as dst:
            arr = np.full((size,size), 4 if key == "SCL" else 2000, dtype="uint16")
            if key == "SCL": arr[:, :2] = 8
            dst.write(arr, 1)
        assets[key] = {"href": str(path), "raster:bands": [{"scale": 0.0001, "offset": -0.1}]}
    item = {"id": "test-real-grid-fixture", "collection": "sentinel-2-l2a",
            "properties": {"datetime": "2024-05-01T00:00:00Z"}, "assets": assets}
    monkeypatch.setattr(provider, "item_sync", lambda sid: item)
    monkeypatch.setattr(provider, "sign_asset", lambda href: href)
    path = provider.download_sync(item["id"], str(tmp_path/"output"), [3.00001, .00001, 3.001, .001])
    metadata = inspect_raster(path)
    assert metadata["crs"] == "EPSG:32631"
    with rasterio.open(path) as src:
        assert set(np.unique(src.read(7))) <= {4, 8}
        assert np.allclose(src.read(2), 0.1)
        assert src.descriptions == tuple(NAMES)
        assert src.width <= 10 and src.height <= 10
    assert json.loads(Path(path).with_suffix(".stac.json").read_text()) == item

def test_bad_aoi_and_collection_fail_without_network():
    provider = PlanetaryComputerProvider()
    with pytest.raises(ValueError):
        asyncio.run(provider.search([3, 2, 1, 4]))
    with pytest.raises(NotImplementedError):
        asyncio.run(provider.search([3, 0, 3.01, .01], collections=["sentinel-1-rtc"]))

def test_migration_preserves_scene_and_file(tmp_path):
    from sqlalchemy import create_engine, text
    from app.core.database import Base
    from app.core.migrations import migrate
    engine = create_engine("sqlite:///" + str(tmp_path/"legacy.db"))
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE satellite_scenes (id VARCHAR(64) PRIMARY KEY, acquisition_datetime DATETIME NOT NULL, image_path VARCHAR(255))"))
        connection.execute(text("INSERT INTO satellite_scenes VALUES ('old', '2024-05-01', 'keep-this-file.tif')"))
        migrate(connection, Base.metadata)
        migrate(connection, Base.metadata)
        row = connection.execute(text("SELECT id, image_path, source FROM satellite_scenes")).one()
        assert row == ("old", "keep-this-file.tif", "LEGACY_UNVERIFIED")
    engine.dispose()

def test_catalog_filters_operation_and_dates(db):
    from datetime import timedelta
    from app.models.satellite import OperationSatelliteScene
    now = datetime.now(timezone.utc)
    op_id = "filter-" + uuid.uuid4().hex
    recent, old, elsewhere = [uuid.uuid4().hex for _ in range(3)]
    for sid, when in [(recent, now), (old, now-timedelta(days=60)), (elsewhere, now)]:
        db.add(SatelliteScene(id=sid, scene_id=sid, platform="Sentinel-2", cloud_cover=0,
                              acquisition_datetime=when, source="SYNTHETIC_TEST_FIXTURE", is_demo=True))
        db.add(OperationSatelliteScene(scene_id=sid, operation_id=op_id if sid != elsewhere else "other", scene_role="TARGET"))
    db.commit()
    result = hub.get_flood_scenes(db, operation_id=op_id, hours=720, max_cloud_cover=0)
    assert [s["scene_id"] for s in result["scenes"]] == [recent]

def test_successful_worker_registers_before_preview_and_can_cancel(tmp_path, db, monkeypatch):
    sid = "worker-" + uuid.uuid4().hex
    path = fixture_raster(tmp_path/"worker.tif")
    path.with_suffix(".stac.json").write_text(json.dumps({"id": sid, "assets": {}}))
    db.add(SatelliteScene(id=sid, scene_id=sid, platform="Synthetic", source="SYNTHETIC_TEST_FIXTURE", is_demo=True))
    jid = "worker-job-" + uuid.uuid4().hex
    db.add(SatelliteIngestionJob(job_id=jid, scene_id=sid, output_directory=str(tmp_path), status="QUEUED", progress=0))
    db.commit()
    monkeypatch.setattr(hub.providers["PLANETARY_COMPUTER"], "download_sync", lambda *args: str(path))
    hub._ingest_worker(jid, [3,0,3.01,.01], SessionLocal)
    db.expire_all()
    assert hub.get_job_status(jid, db)["status"] == "COMPLETED"
    scene = db.get(SatelliteScene, sid)
    assert Path(scene.thumbnail_path).is_file()
    assert scene.metadata_json["registry_version"] == 1
    assert scene.is_demo is True
    cancelled = "cancelled-" + uuid.uuid4().hex
    db.add(SatelliteIngestionJob(job_id=cancelled, scene_id=sid, output_directory=str(tmp_path), status="CANCELLED", progress=0))
    db.commit()
    hub._ingest_worker(cancelled, [3,0,3.01,.01], SessionLocal)
    assert hub.get_job_status(cancelled, db)["status"] == "CANCELLED"

def test_product_xml_calibration_uses_declared_offsets():
    xml = "<root><BOA_QUANTIFICATION_VALUE>10000</BOA_QUANTIFICATION_VALUE><PROCESSING_BASELINE>05.10</PROCESSING_BASELINE>"
    for i, name in enumerate(["B2", "B3", "B4", "B8", "B11", "B12"]):
        xml += f'<Spectral_Information bandId="{i}" physicalBand="{name}"/><BOA_ADD_OFFSET band_id="{i}">-1000</BOA_ADD_OFFSET>'
    xml += "</root>"
    calibration = PlanetaryComputerProvider.parse_calibration(xml)
    assert calibration["B03"] == (0.0001, -0.1)
    assert calibration["B11"] == (0.0001, -0.1)
    with pytest.raises(ValueError, match="offset"):
        PlanetaryComputerProvider.parse_calibration("<root><BOA_QUANTIFICATION_VALUE>10000</BOA_QUANTIFICATION_VALUE></root>", "05.10")
