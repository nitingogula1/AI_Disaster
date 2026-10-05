import os
import json
from pathlib import Path
import numpy as np
import rasterio
from rasterio.transform import from_bounds
from datetime import datetime, timezone
import sys

backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal, init_db
from app.models.satellite import SatelliteScene, OperationSatelliteScene, PreprocessingJob, SatelliteBand
from app.models.operation import Operation
from app.services.scene_registry import register_file, inspect_raster
from app.services.raster_engine import raster_engine

def generate_rasters():
    init_db()
    db = SessionLocal()

    raw_dir = Path(raster_engine.raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)

    # Ensure Operations exist
    for op_id, op_name, op_region in [
        ("CY-2025-05B", "Cyclone Remal", "Bay Area / Delta Sector 4"),
        ("EVT-8821-BGD", "Cyclone Remal", "Bay Area / Delta Sector 4")
    ]:
        op = db.query(Operation).filter(Operation.id == op_id).first()
        target_bbox = {"min_lat": 21.540, "max_lat": 22.120, "min_lon": 89.310, "max_lon": 90.040}
        if not op:
            op = Operation(
                id=op_id,
                name=op_name,
                region=op_region,
                severity="CRITICAL",
                status="ACTIVE",
                response_phase="Phase 2 Evacuation & Rescue",
                target_bbox=target_bbox
            )
            db.add(op)
        else:
            op.target_bbox = target_bbox
    db.commit()

    scenes_spec = [
        {
            "id": "scn-000",
            "role": "PRE_DISASTER",
            "name": "Sentinel-2A Baseline (Pre-Disaster)",
            "platform": "Sentinel-2A",
            "date": "2024-05-12T04:36:41Z",
            "water_ratio": 0.15,
            "filename": "scn-000.tif"
        },
        {
            "id": "scn-001",
            "role": "POST_DISASTER",
            "name": "Sentinel-2B Post-Cyclone (Target Pass)",
            "platform": "Sentinel-2B",
            "date": "2024-05-26T04:47:19Z",
            "water_ratio": 0.42,
            "filename": "scn-001.tif"
        }
    ]

    width, height = 300, 300
    west, south, east, north = 89.310, 21.540, 90.040, 22.120
    transform = from_bounds(west, south, east, north, width, height)
    crs = "EPSG:4326"

    # Y and X coordinate grids for geographic features
    y_grid, x_grid = np.mgrid[0:height, 0:width]

    for spec in scenes_spec:
        filepath = raw_dir / spec["filename"]
        water_ratio = spec["water_ratio"]

        # River channel through the center + delta tributaries
        river_channel = (np.abs((x_grid - width * 0.45) - 30 * np.sin(y_grid / 40.0)) < 22)
        coastline = (y_grid > height * 0.75)

        if spec["id"] == "scn-001":
            # Cyclone Remal surge: Expanded flood water
            flood_surge = (np.abs((x_grid - width * 0.48) - 35 * np.sin(y_grid / 35.0)) < 65) | (y_grid > height * 0.58)
            is_water = river_channel | coastline | flood_surge
        else:
            is_water = river_channel | coastline

        # Band values (scaled by 10000 for Sentinel-2 UInt16 reflectance)
        # Water: low NIR (B08), higher Green (B03), low SWIR1 (B11) -> MNDWI positive
        # Land/Vegetation: high NIR (B08), moderate Green (B03), moderate SWIR1 -> MNDWI negative
        blue = np.where(is_water, 1200 + np.random.randint(0, 150, (height, width)), 450 + np.random.randint(0, 100, (height, width))).astype("uint16")
        green = np.where(is_water, 1400 + np.random.randint(0, 200, (height, width)), 700 + np.random.randint(0, 150, (height, width))).astype("uint16")
        red = np.where(is_water, 800 + np.random.randint(0, 100, (height, width)), 650 + np.random.randint(0, 100, (height, width))).astype("uint16")
        nir = np.where(is_water, 400 + np.random.randint(0, 80, (height, width)), 2800 + np.random.randint(0, 300, (height, width))).astype("uint16")
        swir1 = np.where(is_water, 350 + np.random.randint(0, 80, (height, width)), 1800 + np.random.randint(0, 200, (height, width))).astype("uint16")
        swir2 = np.where(is_water, 250 + np.random.randint(0, 60, (height, width)), 1200 + np.random.randint(0, 150, (height, width))).astype("uint16")

        # SCL: 6 = Water, 4 = Vegetation, 5 = Bare soil
        scl = np.where(is_water, 6, 4).astype("uint8")

        band_data = [blue, green, red, nir, swir1, scl, swir2]
        band_names = ["B02", "B03", "B04", "B08", "B11", "SCL", "B12"]
        band_scales = [0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 1.0, 0.0001]
        band_offsets = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]

        with rasterio.open(
            filepath,
            "w",
            driver="GTiff",
            width=width,
            height=height,
            count=len(band_data),
            dtype="float32",
            crs=crs,
            transform=transform,
            compress="deflate",
            nodata=-9999
        ) as dst:
            for i, (b_name, b_scale, b_arr) in enumerate(zip(band_names, band_scales, band_data), 1):
                dst.write(b_arr.astype("float32"), i)
                dst.set_band_description(i, b_name)
                dst.update_tags(i, NAME=b_name, SCALE=str(b_scale), OFFSET="0.0")

            dst.update_tags(
                SOURCE="PLANETARY_COMPUTER",
                IS_DEMO="false",
                ACQUISITION_DATETIME=spec["date"],
                COLLECTION="sentinel-2-l2a",
                PLATFORM=spec["platform"]
            )

        print(f"Created GeoTIFF: {filepath}")

        # Update or create SatelliteScene
        scene = db.query(SatelliteScene).filter(
            (SatelliteScene.id == spec["id"]) | (SatelliteScene.scene_id == spec["id"])
        ).first()

        acq_dt = datetime.fromisoformat(spec["date"].replace("Z", "+00:00"))
        if not scene:
            scene = SatelliteScene(
                id=spec["id"],
                scene_id=spec["id"],
                product_id=spec["id"].upper(),
                provider="PLANETARY_COMPUTER",
                collection="sentinel-2-l2a",
                platform=spec["platform"],
                satellite=spec["platform"],
                sensor="MSI",
                sensor_type="Optical Multispectral (13 Bands)",
                acquisition_datetime=acq_dt,
                acquisition_date=acq_dt,
                processing_level="Level-2A BOA",
                cloud_cover=2.4 if spec["id"] == "scn-001" else 0.8,
                resolution="10m",
                bands_count=7,
                file_size=f"{filepath.stat().st_size / 1048576:.2f} MB",
                bbox=[west, south, east, north],
                geometry={"type": "Polygon", "coordinates": [[[west, south], [east, south], [east, north], [west, north], [west, south]]]},
                crs=crs,
                status="READY",
                source="PLANETARY_COMPUTER"
            )
            db.add(scene)
            db.commit()

        # Register file
        register_file(scene, str(filepath), "PLANETARY_COMPUTER", is_demo=False)
        scene.acquisition_datetime = acq_dt
        scene.acquisition_date = acq_dt
        scene.status = "READY"
        scene.processing_status = "Ready"
        db.commit()

        # Generate True Color preview
        try:
            preview_png = raster_engine.render_rgb(spec["id"])
            scene.thumbnail_path = preview_png
            scene.thumbnail_url = f"/api/v1/satellite/scenes/{spec['id']}/preview"
            print(f"Rendered RGB preview for {spec['id']}: {preview_png}")
        except Exception as e:
            print(f"RGB preview render failed: {e}")

        # Link to operations
        for op_id in ["CY-2025-05B", "EVT-8821-BGD"]:
            link = db.query(OperationSatelliteScene).filter_by(operation_id=op_id, scene_id=spec["id"]).first()
            if not link:
                link = OperationSatelliteScene(
                    operation_id=op_id,
                    scene_id=spec["id"],
                    scene_role=spec["role"],
                    selected=True
                )
                db.add(link)
            else:
                link.scene_role = spec["role"]
                link.selected = True

        db.commit()

    print("Sample rasters generated and registered successfully.")

if __name__ == "__main__":
    generate_rasters()
