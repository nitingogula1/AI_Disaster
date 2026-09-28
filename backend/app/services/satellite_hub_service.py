import json
import uuid
from pathlib import Path
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy import desc
from sqlalchemy.orm import sessionmaker
from app.models.operation import Operation
from app.models.satellite import SatelliteScene, SatelliteIngestionJob, OperationSatelliteScene, ProcessingResult, FloodAnalysisResult, SatelliteProvider
from app.services.satellite_providers import PlanetaryComputerProvider, CopernicusProvider, USGSProvider, NASAProvider, LocalDemoProvider, validate_bbox
from app.services.scene_registry import register_file, safe_id
from app.services.raster_engine import raster_engine
from app.core.config import settings

class SatelliteHubService:
    def __init__(self):
        self.providers = {"PLANETARY_COMPUTER": PlanetaryComputerProvider(), "NASA": NASAProvider(),
                          "COPERNICUS": CopernicusProvider(), "USGS": USGSProvider(), "LOCAL": LocalDemoProvider()}
        self.executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="satellite")
        self.benchmark_jobs = {}

    def get_provider(self, name):
        if name.upper() not in self.providers:
            raise ValueError("Unknown imagery provider.")
        return self.providers[name.upper()]

    def get_active_operation(self, db, operation_id=None):
        op = db.get(Operation, operation_id) if operation_id else db.query(Operation).filter(Operation.status == "ACTIVE").first()
        if not op:
            raise FileNotFoundError("Operation not found. Configure an operation and AOI first.")
        return {"id": op.id, "name": op.name, "region": op.region, "status": op.status,
                "severity": op.severity, "target_bbox": op.target_bbox or {}, "crs": "EPSG:4326",
                "cog_protocol": "HTTP Range Requests"}

    def set_aoi(self, operation_id, bbox, db, region=None, incident_name=None):
        validate_bbox(bbox)
        safe_id(operation_id)
        op = db.get(Operation, operation_id)
        if not op:
            op = Operation(id=operation_id, name=incident_name or operation_id, region=region or "User AOI")
            db.add(op)
        op.target_bbox = dict(zip(["min_lon", "min_lat", "max_lon", "max_lat"], bbox))
        if region: op.region = region
        if incident_name: op.name = incident_name
        db.commit()
        return {"operation_id": operation_id, "bbox": bbox, "target_bbox": op.target_bbox,
                "region": op.region, "crs": "EPSG:4326", "status": "AOI_CONFIGURED"}

    async def connect_planetary_computer(self, db):
        res = await self.providers["PLANETARY_COMPUTER"].check_connection()
        record = db.query(SatelliteProvider).filter_by(provider_type="PLANETARY_COMPUTER").first()
        if not record:
            record = SatelliteProvider(name="Microsoft Planetary Computer", provider_type="PLANETARY_COMPUTER")
            db.add(record)
        record.status = res["status"]
        record.endpoint = res["endpoint"]
        db.commit()
        return res

    async def connect_nasa(self, db):
        return await self.providers["NASA"].check_connection()

    def get_providers_list(self, db):
        record = db.query(SatelliteProvider).filter_by(provider_type="PLANETARY_COMPUTER").first()
        return [{"name": name, "type": name, "status":
                 (record.status if record else "NOT_CHECKED") if name == "PLANETARY_COMPUTER" else
                 ("UPLOAD_ONLY" if name == "LOCAL" else "UNAVAILABLE")} for name in self.providers]

    def upsert_scene(self, item, db):
        sid = safe_id(item["scene_id"])
        scene = db.query(SatelliteScene).filter_by(scene_id=sid).first()
        if not scene:
            scene = SatelliteScene(id=sid, scene_id=sid)
            db.add(scene)
        for name in ("provider", "collection", "platform", "sensor", "bbox", "geometry",
                     "asset_metadata", "scene_metadata", "processing_level", "cloud_cover", "resolution"):
            if name in item: setattr(scene, name, item[name])
        raw = item.get("acquisition_datetime")
        scene.acquisition_datetime = datetime.fromisoformat(raw.replace("Z", "+00:00")) if raw else None
        scene.acquisition_date = scene.acquisition_datetime
        if not (scene.metadata_json or {}).get("registry_version"):
            scene.status = "DISCOVERED"
            scene.source = item["source"]
            scene.is_demo = item.get("is_demo", False)
        return scene

    async def search_stac(self, operation_id, bbox, start_datetime, end_datetime, collections, max_cloud_cover, limit, db):
        results = await self.providers["PLANETARY_COMPUTER"].search(
            bbox, start_datetime, end_datetime, collections, max_cloud_cover, limit)
        for result in results:
            scene = self.upsert_scene(result, db)
            if not db.query(OperationSatelliteScene).filter_by(operation_id=operation_id, scene_id=scene.scene_id).first():
                db.add(OperationSatelliteScene(operation_id=operation_id, scene_id=scene.scene_id, scene_role="TARGET"))
        db.commit()
        return {"operation_id": operation_id, "total_discovered": len(results), "scenes": results}

    def serialize_scene(self, scene):
        known = (scene.metadata_json or {}).get("acquisition_known", True)
        return {"id": scene.scene_id, "scene_id": scene.scene_id, "platform": scene.platform,
                "acquisition_datetime": scene.acquisition_datetime.isoformat() if scene.acquisition_datetime and known else None,
                "acquisitionDate": scene.acquisition_datetime.isoformat() if scene.acquisition_datetime and known else "Unknown",
                "cloudCover": scene.cloud_cover, "cloud_cover": scene.cloud_cover, "resolution": scene.resolution,
                "sensorType": scene.sensor, "pipelineStatus": scene.status, "status": scene.status,
                "bands": scene.bands_count, "size": scene.file_size, "bbox": scene.bbox,
                "is_demo": bool(scene.is_demo), "source": scene.source,
                "flood_status": "NOT_ANALYZED", "flood_relevant": False}

    def list_scenes(self, db, operation_id=None, cloud_max=None, platform=None, date_from=None, date_to=None,
                    status=None, sort="acquisition_desc", page=1, limit=50):
        query = db.query(SatelliteScene)
        if operation_id:
            query = query.filter(SatelliteScene.scene_id.in_(
                db.query(OperationSatelliteScene.scene_id).filter_by(operation_id=operation_id)))
        if cloud_max is not None: query = query.filter(SatelliteScene.cloud_cover <= cloud_max)
        if platform: query = query.filter(SatelliteScene.platform.ilike(f"%{platform}%"))
        if status: query = query.filter(SatelliteScene.status == status)
        if date_from: query = query.filter(SatelliteScene.acquisition_datetime >= datetime.fromisoformat(date_from.replace("Z", "+00:00")))
        if date_to: query = query.filter(SatelliteScene.acquisition_datetime <= datetime.fromisoformat(date_to.replace("Z", "+00:00")))
        query = query.order_by(SatelliteScene.acquisition_datetime.asc() if sort == "acquisition_asc" else SatelliteScene.acquisition_datetime.desc())
        return {"total": query.count(), "scenes": [self.serialize_scene(s) for s in query.offset((page-1)*limit).limit(limit).all()]}

    def assign_scene_role(self, scene_id, operation_id, role, db):
        if role not in ("PRE_DISASTER", "POST_DISASTER", "REFERENCE", "TARGET"):
            raise ValueError("Invalid scene role.")
        if not db.query(SatelliteScene).filter_by(scene_id=scene_id).first():
            raise FileNotFoundError("Scene not found.")
        record = db.query(OperationSatelliteScene).filter_by(operation_id=operation_id, scene_id=scene_id).first()
        if not record:
            record = OperationSatelliteScene(operation_id=operation_id, scene_id=scene_id)
            db.add(record)
        record.scene_role = role
        record.selected = True
        db.commit()
        return {"scene_id": scene_id, "scene_role": role, "operation_id": operation_id}

    def direct_ingest(self, scene_id, operation_id, scene_role, db):
        safe_id(scene_id)
        scene = db.query(SatelliteScene).filter_by(scene_id=scene_id).first()
        if not scene:
            raise FileNotFoundError("Discover the exact scene before ingestion.")
        if scene.is_demo or scene.source != "PLANETARY_COMPUTER":
            raise ValueError("This endpoint acquires live Planetary Computer scenes only. Uploaded files are already registered.")
        op = db.get(Operation, operation_id)
        if not op or not op.target_bbox:
            raise ValueError("Configure the selected operation's small AOI before ingestion.")
        bbox = [op.target_bbox[k] for k in ("min_lon", "min_lat", "max_lon", "max_lat")]
        validate_bbox(bbox)
        active = db.query(SatelliteIngestionJob).filter(SatelliteIngestionJob.scene_id == scene_id,
                    SatelliteIngestionJob.status.in_(["QUEUED", "DOWNLOADING", "VALIDATING"])).first()
        if active:
            return self.get_job_status(active.job_id, db)
        self.assign_scene_role(scene_id, operation_id, scene_role, db)
        job_id = "INGEST-" + uuid.uuid4().hex[:16]
        output = str(Path(raster_engine.raw_dir) / job_id)
        job = SatelliteIngestionJob(scene_id=scene_id, operation_id=operation_id, job_id=job_id,
                                    status="QUEUED", progress=0, current_stage="Queued", source=scene.source,
                                    output_directory=output)
        db.add(job)
        scene.status = "INGESTING"
        db.commit()
        factory = sessionmaker(bind=db.get_bind(), expire_on_commit=False)
        self.executor.submit(self._ingest_worker, job_id, bbox, factory)
        return {"job_id": job_id, "status": "QUEUED", "progress": 0}

    def _ingest_worker(self, job_id, bbox, factory):
        from app.services.raster_engine import SatelliteRasterEngine
        engine = SatelliteRasterEngine(raster_engine.base_dir, session_factory=factory)
        with factory() as db:
            job = db.query(SatelliteIngestionJob).filter_by(job_id=job_id).one()
            try:
                if job.status == "CANCELLED": return
                job.status, job.progress, job.current_stage = "DOWNLOADING", 10, "Reading signed AOI assets"
                job.started_at = datetime.now(timezone.utc)
                db.commit()
                path = self.providers["PLANETARY_COMPUTER"].download_sync(job.scene_id, job.output_directory, bbox)
                db.refresh(job)
                if job.status == "CANCELLED": return
                job.status, job.progress, job.current_stage = "VALIDATING", 80, "Validating decoded raster"
                scene = db.query(SatelliteScene).filter_by(scene_id=job.scene_id).one()
                register_file(scene, path, "PLANETARY_COMPUTER")
                scene.scene_metadata = {"stac_item": json.loads(Path(path).with_suffix(".stac.json").read_text())}
                scene.status = "VALIDATING"
                db.commit()
                preview = engine.render_rgb(job.scene_id)
                db.refresh(job)
                if job.status == "CANCELLED":
                    scene.status = "CANCELLED"
                    db.commit()
                    return
                scene.thumbnail_path = preview
                scene.status = "READY"
                scene.thumbnail_url = f"/api/v1/satellite/scenes/{job.scene_id}/preview"
                job.status, job.progress, job.current_stage = "COMPLETED", 100, "Validated raster and preview ready"
                job.completed_at = datetime.now(timezone.utc)
                db.commit()
            except Exception as exc:
                db.rollback()
                job = db.query(SatelliteIngestionJob).filter_by(job_id=job_id).one()
                if job.status != "CANCELLED":
                    job.status = "FAILED"
                    job.error_message = str(exc)
                    job.current_stage = "Failed"
                    job.completed_at = datetime.now(timezone.utc)
                    scene = db.query(SatelliteScene).filter_by(scene_id=job.scene_id).first()
                    if scene: scene.status = "FAILED"
                    db.commit()

    def get_job_status(self, job_id, db):
        job = db.query(SatelliteIngestionJob).filter_by(job_id=job_id).first()
        if not job: raise FileNotFoundError("Job not found.")
        return {"job_id": job.job_id, "scene_id": job.scene_id, "status": job.status,
                "progress": job.progress, "current_stage": job.current_stage, "error_message": job.error_message,
                "eta_seconds": None}

    def get_ingestion_queue(self, db):
        jobs = db.query(SatelliteIngestionJob).order_by(desc(SatelliteIngestionJob.created_at)).all()
        return {"pending": sum(j.status == "QUEUED" for j in jobs),
                "processing": sum(j.status in ("DOWNLOADING", "VALIDATING") for j in jobs),
                "completed": sum(j.status == "COMPLETED" for j in jobs),
                "failed": sum(j.status == "FAILED" for j in jobs),
                "jobs": [self.get_job_status(j.job_id, db) for j in jobs[:20]]}

    def cancel_job(self, job_id, db):
        job = db.query(SatelliteIngestionJob).filter_by(job_id=job_id).first()
        if not job: raise FileNotFoundError("Job not found.")
        if job.status not in ("COMPLETED", "FAILED"):
            job.status, job.current_stage = "CANCELLED", "Cancelled; current asset read may finish"
            db.commit()
        return self.get_job_status(job_id, db)

    def execute_preprocessing(self, *args, **kwargs):
        raise NotImplementedError("Independent atmospheric correction and pre/post co-registration are unavailable. L2A assets are already atmospherically corrected; ingestion aligns bands and water analysis applies SCL.")

    def get_preprocessing_job(self, *args, **kwargs):
        raise FileNotFoundError("No implemented preprocessing job is available.")

    def run_benchmark(self):
        raise NotImplementedError("Pipeline benchmark is unavailable.")

    def get_scene_bands(self, scene_id, db):
        scene = raster_engine.scene_record(scene_id)
        info = scene.metadata_json["raster"]
        return [{"name": name, "short_name": name, "wavelength": "See dataset metadata",
                 "res": str(info["resolution"]), "color": "#3B82F6", "data_type": info["dtypes"][i],
                 "scale_factor": info["scales"][i]} for i, name in enumerate(info["descriptions"])]

    def get_band_summary(self, scene_id, db):
        info = raster_engine.scene_record(scene_id).metadata_json["raster"]
        return {**info, "bit_depth": ", ".join(sorted(set(info["dtypes"]))),
                "tile_dimension": f'{info["width"]} x {info["height"]} px', "bands": self.get_scene_bands(scene_id, db)}

    def get_band_detail(self, scene_id, band_name, db):
        return raster_engine.get_band_statistics(scene_id, band_name)

    def render_rgb(self, scene_id, red="B04", green="B03", blue="B02", db=None):
        return {"file_path": raster_engine.render_rgb(scene_id, red, green, blue),
                "url": f"/api/v1/satellite/scenes/{scene_id}/preview"}

    def render_false_color(self, scene_id, nir="B08", red="B04", green="B03", db=None):
        return {"file_path": raster_engine.render_false_color(scene_id, nir, red, green),
                "url": f"/api/v1/satellite/scenes/{scene_id}/image?type=false_color"}

    def run_scene_flood_analysis(self, scene_id, operation_id, method, db, threshold=0.05):
        result = raster_engine.calculate_index(scene_id, method, threshold)
        product = ProcessingResult(scene_id=scene_id, operation_id=operation_id, product_type=result["method"],
                                   file_path=result["file_path"], geometry=result["feature_collection"],
                                   metadata_json={k: v for k, v in result.items() if k != "feature_collection"})
        db.add(product)
        db.flush()
        record = FloodAnalysisResult(scene_id=scene_id, operation_id=operation_id, method=result["method"],
                    flood_area_km2=result["water_area_km2"], water_pixels=result["water_pixel_count"],
                    confidence=None, flood_relevance_score=None, geojson_path=result["geojson_path"],
                    raster_path=result["file_path"], status="SURFACE_WATER")
        db.add(record)
        db.commit()
        base = f"/api/v1/satellite/products/{product.id}"
        return {**result, "id": product.id, "product_id": product.id, "status": "COMPLETED",
                "flood_area_km2": result["water_area_km2"], "water_pixels": result["water_pixel_count"],
                "confidence": None, "preview_url": base + "/preview", "mask_url": base + "/mask",
                "geojson_url": base + "/geojson", "raster_url": base + "/raster"}

    def calculate_ndwi(self, scene_id, db=None, threshold=0.0):
        return self.run_scene_flood_analysis(scene_id, "UNASSIGNED", "NDWI", db, threshold)

    def calculate_mndwi(self, scene_id, db=None, threshold=0.05):
        return self.run_scene_flood_analysis(scene_id, "UNASSIGNED", "MNDWI", db, threshold)

    def vectorize_flood(self, scene_id, threshold=0.05, db=None):
        return self.run_scene_flood_analysis(scene_id, "UNASSIGNED", "MNDWI", db, threshold)

    def send_to_gis(self, product_id, operation_id, db):
        product = db.get(ProcessingResult, product_id)
        if not product: raise FileNotFoundError("Analyze a scene first and use the returned product_id.")
        if product.operation_id != operation_id:
            raise ValueError("Product belongs to a different operation.")
        return {"layer_id": product.id, "url": f"/api/v1/satellite/products/{product.id}/geojson",
                "message": "Computed surface-water polygons ready", "status": "READY"}

    def get_flood_scenes(self, db, operation_id=None, hours=72, max_cloud_cover=30, satellites=None, limit=50):
        now = datetime.now(timezone.utc)
        data = self.list_scenes(db, operation_id=operation_id, cloud_max=max_cloud_cover,
                               date_from=(now-timedelta(hours=hours)).isoformat(), date_to=now.isoformat(), limit=limit)
        scenes = data["scenes"]
        if satellites and "All" not in satellites:
            scenes = [s for s in scenes if any(v.lower() in s["platform"].lower() for v in satellites)]
        return {"scenes": scenes, "total_scenes": len(scenes)}

    def get_flood_events(self, db):
        return []

satellite_hub_service = SatelliteHubService()
