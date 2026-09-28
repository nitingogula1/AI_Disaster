"""Optional live check: real STAC -> signing -> raster pixels -> saved artifacts."""
import os
import sys
import json
import asyncio
import uuid
from pathlib import Path
backend = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend))
target = backend / ".test-runs" / ("live-" + uuid.uuid4().hex[:10])
target.mkdir(parents=True)
os.environ["DATABASE_URL"] = "sqlite:///" + (target / "live.db").as_posix()
os.environ["SENTINELAID_DEBUG"] = "false"
from app.core.database import init_db, SessionLocal
from app.services.satellite_hub_service import satellite_hub_service as hub
from app.services.raster_engine import raster_engine
from app.models.satellite import SatelliteIngestionJob
init_db()
raster_engine.base_dir = str(target)
for name in ("raw", "processed", "previews", "masks", "vectors"):
    path = target / name
    path.mkdir()
    setattr(raster_engine, name + "_dir", str(path))

async def main():
    bbox = [-122.45, 37.75, -122.44, 37.76]
    with SessionLocal() as db:
        hub.set_aoi("LIVE-CHECK", bbox, db, "San Francisco small AOI")
        response = await hub.search_stac("LIVE-CHECK", bbox, "2024-06-01T00:00:00Z",
                  "2024-06-30T23:59:59Z", ["sentinel-2-l2a"], 100, 10, db)
        if not response["scenes"]:
            raise RuntimeError("Live catalog returned no matches; no acquisition verified.")
        item = min(response["scenes"], key=lambda s: s["cloud_cover"] or 0)
        sid = item["scene_id"]
        print("Real scene selected:", sid, flush=True)
        job = SatelliteIngestionJob(job_id="LIVE-CHECK", scene_id=sid, operation_id="LIVE-CHECK",
                  output_directory=str(target/"raw"), status="QUEUED", progress=0)
        db.add(job); db.commit()
        hub._ingest_worker("LIVE-CHECK", bbox, SessionLocal)
        db.expire_all()
        status = hub.get_job_status("LIVE-CHECK", db)
        if status["status"] != "COMPLETED":
            raise RuntimeError(status["error_message"])
        result = hub.run_scene_flood_analysis(sid, "LIVE-CHECK", "MNDWI", db, threshold=0)
        summary = {key: result[key] for key in ["scene_id", "status", "valid_pixels", "water_pixel_count",
                    "water_area_km2", "polygon_count", "is_demo", "data_source"]}
        summary["output_directory"] = str(target)
        (backend / "live-check-result.json").write_text(json.dumps(summary, indent=2))
        print(json.dumps(summary, indent=2), flush=True)
try:
    asyncio.run(main())
except Exception as exc:
    # Service errors are sanitized so signing credentials never appear here.
    summary = {"status": "UNVERIFIED", "error": str(exc), "output_directory": str(target)}
    (backend / "live-check-result.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2), flush=True)
    sys.exit(1)
