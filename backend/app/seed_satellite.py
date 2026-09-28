import uuid
from datetime import datetime, timezone
from app.core.database import SessionLocal, init_db
from app.models.operation import Operation
from app.models.satellite import (
    SatelliteProvider,
    SatelliteScene,
    OperationSatelliteScene,
    SatelliteIngestionJob,
    PreprocessingJob,
    SatelliteBand,
    ProcessingResult,
)
from app.services.raster_engine import raster_engine
from app.core.logging import logger

def seed_satellite_data():
    logger.info("Initializing database schema for satellite hub...")
    init_db()
    db = SessionLocal()

    try:
        # 1. Seed or Update Active Operation: Cyclone Remal (EVT-8821-BGD)
        logger.info("Seeding Operation EVT-8821-BGD (Cyclone Remal)...")
        op = db.query(Operation).filter((Operation.id == "EVT-8821-BGD") | (Operation.id == "CY-2025-05B")).first()
        target_bbox = {
            "min_lat": 21.540,
            "max_lat": 22.120,
            "min_lon": 89.310,
            "max_lon": 90.040
        }
        if not op:
            op = Operation(
                id="EVT-8821-BGD",
                name="Cyclone Remal",
                region="Bay Area / Delta Sector 4",
                severity="CRITICAL",
                status="ACTIVE",
                response_phase="Phase 2 Evacuation & Rescue",
                details="Delta Inundation & Severe Structural Damage Response Hub",
                target_bbox=target_bbox
            )
            db.add(op)
        else:
            op.target_bbox = target_bbox
            if op.id != "EVT-8821-BGD":
                # Ensure EVT-8821-BGD is also available
                alt_op = db.query(Operation).filter(Operation.id == "EVT-8821-BGD").first()
                if not alt_op:
                    alt_op = Operation(
                        id="EVT-8821-BGD",
                        name="Cyclone Remal",
                        region="Bay Area / Delta Sector 4",
                        severity="CRITICAL",
                        status="ACTIVE",
                        response_phase="Phase 2 Evacuation & Rescue",
                        details="Delta Inundation & Severe Structural Damage Response Hub",
                        target_bbox=target_bbox
                    )
                    db.add(alt_op)
        db.commit()

        # 2. Seed Satellite Providers
        logger.info("Seeding satellite providers...")
        providers = [
            {
                "id": "prov-pc",
                "name": "Microsoft Planetary Computer",
                "provider_type": "PLANETARY_COMPUTER",
                "endpoint": "https://planetarycomputer.microsoft.com/api/stac/v1",
                "status": "CONNECTED"
            },
            {
                "id": "prov-cop",
                "name": "Copernicus Data Space Ecosystem",
                "provider_type": "COPERNICUS",
                "endpoint": "https://catalogue.dataspace.copernicus.eu/stac",
                "status": "READY"
            },
            {
                "id": "prov-usgs",
                "name": "USGS EarthExplorer",
                "provider_type": "USGS",
                "endpoint": "https://m2m.cr.usgs.gov/api/api/json/stable",
                "status": "READY"
            },
            {
                "id": "prov-nasa",
                "name": "NASA CMR STAC",
                "provider_type": "NASA",
                "endpoint": "https://cmr.earthdata.nasa.gov/stac",
                "status": "READY"
            },
            {
                "id": "prov-local",
                "name": "Local Dataset",
                "provider_type": "LOCAL",
                "endpoint": "local://data/raw",
                "status": "READY"
            }
        ]
        for p in providers:
            existing_p = db.query(SatelliteProvider).filter(SatelliteProvider.provider_type == p["provider_type"]).first()
            if not existing_p:
                db.add(SatelliteProvider(**p))
        db.commit()

        # 3. Seed Satellite Scenes
        logger.info("Seeding satellite scenes with calibrated multispectral metadata...")
        bbox = [89.310, 21.540, 90.040, 22.120]
        geometry = {
            "type": "Polygon",
            "coordinates": [[[89.310, 21.540], [90.040, 21.540], [90.040, 22.120], [89.310, 22.120], [89.310, 21.540]]]
        }

        scenes_data = [
            # Pre-disaster reference baseline
            {
                "id": "scn-000",
                "scene_id": "scn-000",
                "product_id": "S2A-MSI-2024-0512",
                "provider": "PLANETARY_COMPUTER",
                "collection": "sentinel-2-l2a",
                "platform": "Sentinel-2A",
                "satellite": "Sentinel-2A",
                "constellation": "Sentinel-2",
                "sensor": "MSI Sentinel-2A",
                "sensor_type": "Optical Multispectral (13 Bands)",
                "acquisition_datetime": datetime(2024, 5, 12, 4, 36, 41, tzinfo=timezone.utc),
                "acquisition_date": datetime(2024, 5, 12, 4, 36, 41, tzinfo=timezone.utc),
                "processing_level": "Sen2Cor v2.11 BOA",
                "cloud_cover": 0.8,
                "resolution": "10m VNIR / 20m SWIR",
                "bands_count": 13,
                "file_size": "514 MB",
                "bbox": bbox,
                "geometry": geometry,
                "crs": "EPSG:32645 (WGS 84 / UTM 45N)",
                "epsg_code": 32645,
                "thumbnail_url": "/api/v1/satellite/scenes/scn-000/preview",
                "status": "VERIFIED",
                "scene_metadata": {"datum": "WGS84 / UTM 45N", "orbit": "R098", "sun_elevation": 63.8}
            },
            # Post-disaster target pass
            {
                "id": "scn-001",
                "scene_id": "scn-001",
                "product_id": "S2B-MSI-2024-0526",
                "provider": "PLANETARY_COMPUTER",
                "collection": "sentinel-2-l2a",
                "platform": "Sentinel-2B",
                "satellite": "Sentinel-2B",
                "constellation": "Sentinel-2",
                "sensor": "MSI Sentinel-2B",
                "sensor_type": "Optical Multispectral (13 Bands)",
                "acquisition_datetime": datetime(2024, 5, 26, 4, 47, 19, tzinfo=timezone.utc),
                "acquisition_date": datetime(2024, 5, 26, 4, 47, 19, tzinfo=timezone.utc),
                "processing_level": "Sen2Cor v2.11 BOA",
                "cloud_cover": 3.8,
                "resolution": "10m",
                "bands_count": 13,
                "file_size": "514 MB",
                "bbox": bbox,
                "geometry": geometry,
                "crs": "EPSG:32645 (WGS 84 / UTM 45N)",
                "epsg_code": 32645,
                "thumbnail_url": "/api/v1/satellite/scenes/scn-001/preview",
                "status": "VERIFIED",
                "scene_metadata": {"datum": "WGS84 / UTM 45N", "orbit": "R098", "sun_elevation": 64.2}
            },
            # PlanetScope commercial pass
            {
                "id": "scn-002",
                "scene_id": "scn-002",
                "product_id": "PS-SuperDove-0526",
                "provider": "PLANETARY_COMPUTER",
                "collection": "planetscope",
                "platform": "PlanetScope",
                "satellite": "PlanetScope",
                "constellation": "Flock 4p",
                "sensor": "PSB.SD SuperDove",
                "sensor_type": "Commercial Optical (8 Bands)",
                "acquisition_datetime": datetime(2024, 5, 26, 6, 12, 0, tzinfo=timezone.utc),
                "acquisition_date": datetime(2024, 5, 26, 6, 12, 0, tzinfo=timezone.utc),
                "processing_level": "3B Analytic Ortho",
                "cloud_cover": 8.4,
                "resolution": "3m High-Res",
                "bands_count": 8,
                "file_size": "280 MB",
                "bbox": bbox,
                "geometry": geometry,
                "crs": "EPSG:32645 (WGS 84 / UTM 45N)",
                "epsg_code": 32645,
                "thumbnail_url": "/api/v1/satellite/scenes/scn-002/preview",
                "status": "READY",
                "scene_metadata": {"constellation": "Flock 4p", "gsd": 3.12}
            },
            # Sentinel-1A SAR radar pass
            {
                "id": "scn-003",
                "scene_id": "scn-003",
                "product_id": "S1A-SAR-0525",
                "provider": "COPERNICUS",
                "collection": "sentinel-1-grd",
                "platform": "Sentinel-1A",
                "satellite": "Sentinel-1A",
                "constellation": "Sentinel-1",
                "sensor": "C-SAR Synthetic Aperture",
                "sensor_type": "C-Band Dual-Pol (VV + VH)",
                "acquisition_datetime": datetime(2024, 5, 25, 23, 15, 0, tzinfo=timezone.utc),
                "acquisition_date": datetime(2024, 5, 25, 23, 15, 0, tzinfo=timezone.utc),
                "processing_level": "Level-1 GRD",
                "cloud_cover": 0.0,
                "resolution": "20m Synthetic Aperture",
                "bands_count": 2,
                "file_size": "1.2 GB",
                "bbox": bbox,
                "geometry": geometry,
                "crs": "EPSG:32645 (WGS 84 / UTM 45N)",
                "epsg_code": 32645,
                "thumbnail_url": "/api/v1/satellite/scenes/scn-003/preview",
                "status": "VERIFIED",
                "scene_metadata": {"polarization": "VV+VH", "mode": "IW"}
            },
            # Landsat-9 pass
            {
                "id": "scn-004",
                "scene_id": "scn-004",
                "product_id": "L9-OLI-0523",
                "provider": "USGS",
                "collection": "landsat-c2l2-sr",
                "platform": "Landsat-9",
                "satellite": "Landsat-9",
                "constellation": "Landsat",
                "sensor": "OLI-2 Optical Reflectance",
                "sensor_type": "OLI-2 Optical Reflectance",
                "acquisition_datetime": datetime(2024, 5, 23, 4, 22, 0, tzinfo=timezone.utc),
                "acquisition_date": datetime(2024, 5, 23, 4, 22, 0, tzinfo=timezone.utc),
                "processing_level": "Collection 2 L2",
                "cloud_cover": 1.1,
                "resolution": "30m Multispectral / 15m Pan",
                "bands_count": 11,
                "file_size": "890 MB",
                "bbox": bbox,
                "geometry": geometry,
                "crs": "EPSG:32645 (WGS 84 / UTM 45N)",
                "epsg_code": 32645,
                "thumbnail_url": "/api/v1/satellite/scenes/scn-004/preview",
                "status": "VERIFIED",
                "scene_metadata": {"path": 137, "row": 44}
            }
        ]

        for sc in scenes_data:
            existing_sc = db.query(SatelliteScene).filter((SatelliteScene.id == sc["id"]) | (SatelliteScene.scene_id == sc["scene_id"])).first()
            if not existing_sc:
                db.add(SatelliteScene(**sc))
            else:
                existing_sc.cloud_cover = sc["cloud_cover"]
                existing_sc.status = sc["status"]
                existing_sc.resolution = sc["resolution"]
                existing_sc.platform = sc["platform"]
                existing_sc.acquisition_datetime = sc["acquisition_datetime"]
        db.commit()

        # 4. Assign Pre-Disaster and Post-Disaster Scene Roles
        logger.info("Assigning operational scene roles...")
        op_id = "EVT-8821-BGD"
        roles = [
            ("scn-000", "PRE_DISASTER"),
            ("scn-001", "POST_DISASTER"),
            ("scn-002", "REFERENCE"),
            ("scn-003", "REFERENCE")
        ]
        for scn_id, role in roles:
            existing_role = db.query(OperationSatelliteScene).filter(
                OperationSatelliteScene.operation_id == op_id,
                OperationSatelliteScene.scene_id == scn_id
            ).first()
            if not existing_role:
                db.add(OperationSatelliteScene(
                    id=str(uuid.uuid4()),
                    operation_id=op_id,
                    scene_id=scn_id,
                    scene_role=role,
                    selected=True
                ))
        db.commit()

        # 5. Seed Multispectral Bands
        logger.info("Seeding multispectral band records...")
        bands = [
            {"band_name": "B02", "common_name": "Blue", "wavelength_nm": "490 nm", "resolution_m": "10m", "data_type": "UInt16", "scale_factor": 0.0001},
            {"band_name": "B03", "common_name": "Green", "wavelength_nm": "560 nm", "resolution_m": "10m", "data_type": "UInt16", "scale_factor": 0.0001},
            {"band_name": "B04", "common_name": "Red", "wavelength_nm": "665 nm", "resolution_m": "10m", "data_type": "UInt16", "scale_factor": 0.0001},
            {"band_name": "B08", "common_name": "NIR", "wavelength_nm": "842 nm", "resolution_m": "10m", "data_type": "UInt16", "scale_factor": 0.0001},
            {"band_name": "B11", "common_name": "SWIR-1", "wavelength_nm": "1610 nm", "resolution_m": "20m", "data_type": "UInt16", "scale_factor": 0.0001},
            {"band_name": "B12", "common_name": "SWIR-2", "wavelength_nm": "2190 nm", "resolution_m": "20m", "data_type": "UInt16", "scale_factor": 0.0001},
            {"band_name": "SCL", "common_name": "Quality", "wavelength_nm": "Classification", "resolution_m": "20m", "data_type": "UInt8", "scale_factor": 1.0}
        ]
        for scn_id in ["scn-000", "scn-001"]:
            for b in bands:
                existing_b = db.query(SatelliteBand).filter(
                    SatelliteBand.scene_id == scn_id,
                    SatelliteBand.band_name == b["band_name"]
                ).first()
                if not existing_b:
                    db.add(SatelliteBand(
                        id=str(uuid.uuid4()),
                        scene_id=scn_id,
                        **b
                    ))
        db.commit()

        # 6. Seed Ingestion Jobs
        logger.info("Seeding ingestion batch queue...")
        existing_job = db.query(SatelliteIngestionJob).first()
        if not existing_job:
            jobs = [
                SatelliteIngestionJob(
                    id=str(uuid.uuid4()),
                    scene_id="scn-001",
                    operation_id=op_id,
                    job_id="JOB-INGEST-S2B-01",
                    status="COMPLETED",
                    progress=100,
                    current_stage="Completed & Calibrated",
                    eta_seconds=0,
                    started_at=datetime.now(timezone.utc),
                    completed_at=datetime.now(timezone.utc),
                    source="Microsoft Planetary Computer"
                ),
                SatelliteIngestionJob(
                    id=str(uuid.uuid4()),
                    scene_id="scn-002",
                    operation_id=op_id,
                    job_id="JOB-INGEST-PS-02",
                    status="DOWNLOADING",
                    progress=30,
                    current_stage="Downloading Optical Assets",
                    eta_seconds=45,
                    started_at=datetime.now(timezone.utc),
                    source="PlanetScope STAC"
                ),
                SatelliteIngestionJob(
                    id=str(uuid.uuid4()),
                    scene_id="scn-003",
                    operation_id=op_id,
                    job_id="JOB-INGEST-S1A-03",
                    status="QUEUED",
                    progress=0,
                    current_stage="Queued in Telemetry Buffer",
                    eta_seconds=90,
                    started_at=datetime.now(timezone.utc),
                    source="Copernicus Data Space"
                )
            ]
            db.add_all(jobs)
            db.commit()

        # 7. Seed Preprocessing Pipeline Job
        logger.info("Seeding 4-stage preprocessing pipeline job...")
        stages_data = [
            {
                "id": 1,
                "stage": "RADIOMETRIC",
                "name": "Radiometric Calibration",
                "status": "Verified",
                "progress": 100,
                "detail": "DN to Bottom-Of-Atmosphere (BOA) surface reflectance conversion complete. Solar irradiance corrected."
            },
            {
                "id": 2,
                "stage": "ATMOSPHERIC",
                "name": "Atmospheric & AOT",
                "status": "Calibrated",
                "progress": 100,
                "detail": "Aerosol Optical Thickness modeling via 940nm water vapor band. Ground elevation SRTM 30m coupled."
            },
            {
                "id": 3,
                "stage": "CLOUD_MASK",
                "name": "Cloud & Shadow Masking",
                "status": "Verified",
                "progress": 100,
                "detail": "SCL Cloud Exclusion Mask: 85% Opacity. Exclude Cirrus & Semi-Transparent.",
                "cloud_percentage": 1.2
            },
            {
                "id": 4,
                "stage": "COREGISTRATION",
                "name": "Co-Registration & Resample",
                "status": "Verified",
                "progress": 100,
                "detail": "20m SWIR/RedEdge bands cubic-spline resampled to unified 10m grid. Absolute displacement: 0.18px.",
                "displacement_px": 0.18
            }
        ]
        existing_prep = db.query(PreprocessingJob).first()
        if not existing_prep:
            db.add(PreprocessingJob(
                id=str(uuid.uuid4()),
                scene_id="scn-001",
                operation_id=op_id,
                job_id="PREPROC-EXEC-001",
                status="RUNNING",
                progress=89,
                current_stage="Co-Registration & Resample",
                eta_seconds=24,
                stages_data=stages_data,
                started_at=datetime.now(timezone.utc)
            ))
            db.commit()

        # 8. Generate Authentic Rasters via Rasterio & PIL
        logger.info("Generating authentic raster files and previews via Raster Engine...")
        raster_engine.generate_demo_raster("scn-000", bbox, is_post_disaster=False)
        raster_engine.generate_demo_raster("scn-001", bbox, is_post_disaster=True)
        raster_engine.render_rgb("scn-000")
        raster_engine.render_rgb("scn-001")
        raster_engine.render_false_color("scn-000")
        raster_engine.render_false_color("scn-001")
        raster_engine.calculate_ndwi("scn-001")
        raster_engine.calculate_mndwi("scn-001")
        raster_engine.vectorize_flood("scn-001")

        logger.info("Satellite hub seed completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_satellite_data()
