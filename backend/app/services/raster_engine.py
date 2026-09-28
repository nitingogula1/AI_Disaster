"""Measured surface water, never synthetic fallback or inferred inundation."""
import json
import os
import uuid
from pathlib import Path
import numpy as np
import rasterio
from rasterio.features import shapes
from rasterio.warp import transform_geom, reproject, Resampling
from PIL import Image
from pyproj import Geod
from shapely.geometry import shape
from app.services.scene_registry import safe_id, band_indices

class SatelliteRasterEngine:
    def __init__(self, base_dir=None, session_factory=None):
        self.base_dir = str(base_dir or Path(__file__).resolve().parents[2] / "data")
        for name in ("raw", "processed", "previews", "masks", "vectors"):
            value = str(Path(self.base_dir) / name)
            setattr(self, name + "_dir", value)
            Path(value).mkdir(parents=True, exist_ok=True)
        self.session_factory = session_factory

    def scene_record(self, scene_id):
        from app.core.database import SessionLocal
        from app.models.satellite import SatelliteScene
        safe_id(scene_id)
        with (self.session_factory or SessionLocal)() as db:
            scene = db.query(SatelliteScene).filter(
                (SatelliteScene.scene_id == scene_id) | (SatelliteScene.id == scene_id)).first()
            if not scene or not scene.image_path or not (scene.metadata_json or {}).get("registry_version"):
                raise FileNotFoundError("No validated raster registered for this scene. Ingest or upload it first.")
            if not Path(scene.image_path).is_file():
                raise FileNotFoundError("Registered raster is missing. Re-ingest or upload the dataset.")
            db.expunge(scene)
            return scene

    def resolve_scene_raster(self, scene_id):
        scene = self.scene_record(scene_id)
        return scene.image_path, bool(scene.is_demo)

    _detect_band_indices = staticmethod(band_indices)

    def _band(self, src, name):
        bands = band_indices(src)
        aliases = {"B02": "blue", "B03": "green", "B04": "red", "B08": "nir", "B11": "swir1", "B12": "swir2", "SCL": "scl"}
        key = aliases.get(name.upper(), name.lower())
        if key not in bands:
            raise ValueError(f"Required band {name} is missing from the dataset metadata.")
        index = bands[key]
        raw = src.read(index, masked=True).astype("float64")
        data = raw.filled(np.nan) * src.scales[index - 1] + src.offsets[index - 1]
        return data, np.isfinite(data) & ~np.ma.getmaskarray(raw)

    def _render(self, scene_id, names, suffix):
        path, _ = self.resolve_scene_raster(scene_id)
        with rasterio.open(path) as src:
            arrays = [self._band(src, name) for name in names]
        valid = np.logical_and.reduce([item[1] for item in arrays])
        channels = []
        for arr, _ in arrays:
            values = arr[valid]
            lo, hi = np.percentile(values, (2, 98)) if values.size else (0, 1)
            if hi <= lo:
                lo, hi = 0, max(float(hi), 1e-6)
            channels.append(np.uint8(np.nan_to_num(np.clip((arr - lo) / (hi - lo), 0, 1)) * 255))
        image = np.dstack(channels + [np.uint8(valid) * 255])
        out = str(Path(self.previews_dir) / f"{scene_id}_{suffix}_{uuid.uuid4().hex[:10]}.png")
        Image.fromarray(image).save(out)
        return out

    def render_rgb(self, scene_id, red_band="B04", green_band="B03", blue_band="B02"):
        return self._render(scene_id, [red_band, green_band, blue_band], "rgb")

    def render_false_color(self, scene_id, nir_band="B08", red_band="B04", green_band="B03"):
        return self._render(scene_id, [nir_band, red_band, green_band], "false_color")

    def _geometry(self, mask, transform, crs):
        features = []
        area = 0.0
        geod = Geod(ellps="WGS84")
        for geom, value in shapes(mask.astype("uint8"), mask=mask, transform=transform):
            if value != 1:
                continue
            wgs = transform_geom(crs, "EPSG:4326", geom, precision=-1)
            # Use geodesic ground area, also correct for feet, rotation and non-equal-area CRSs.
            polygon = shape(wgs)
            from shapely.geometry.polygon import orient
            polygon = orient(polygon, sign=1.0)
            area_m2 = abs(geod.geometry_area_perimeter(polygon)[0])
            area += area_m2
            if len(features) >= 50000:
                raise ValueError("Water mask has over 50,000 polygons. Use a smaller AOI.")
            features.append({"type": "Feature", "geometry": wgs,
                             "properties": {"water_area_km2": area_m2 / 1e6,
                                            "observation_type": "SURFACE_WATER"}})
        return {"type": "FeatureCollection", "features": features}, area / 1e6

    def calculate_index(self, scene_id, method="MNDWI", threshold=0.05):
        method = method.upper()
        if method not in ("NDWI", "MNDWI"):
            raise NotImplementedError("Only optical NDWI and MNDWI are implemented. SAR analysis is unavailable.")
        if not np.isfinite(threshold) or not -1 <= threshold <= 1:
            raise ValueError("Threshold must be between -1 and 1.")
        scene = self.scene_record(scene_id)
        with rasterio.open(scene.image_path) as src:
            green, valid_g = self._band(src, "green")
            other, valid_o = self._band(src, "nir" if method == "NDWI" else "swir1")
            scl, valid_scl = self._band(src, "scl")
            valid = valid_g & valid_o & valid_scl & np.isin(scl, [2, 4, 5, 6, 7])
            denom = green + other
            valid &= np.isfinite(denom) & (np.abs(denom) > 1e-12)
            index = np.full(green.shape, -9999, dtype="float32")
            np.divide(green - other, denom, out=index, where=valid)
            mask = valid & (index > threshold)
            profile = src.profile.copy()
            fc, area = self._geometry(mask, src.transform, src.crs)
        provenance = {"is_demo": bool(scene.is_demo), "source": scene.source, "method": method,
                      "threshold": threshold, "scene_id": scene_id, "observation_type": "SURFACE_WATER"}
        fc.update(provenance)
        for feature in fc["features"]:
            feature["properties"].update(provenance)
        token = f"{scene_id}_{method.lower()}_{uuid.uuid4().hex[:10]}"
        raster_path = str(Path(self.processed_dir) / (token + ".tif"))
        mask_path = str(Path(self.masks_dir) / (token + ".tif"))
        preview_path = str(Path(self.previews_dir) / (token + ".png"))
        mask_preview = str(Path(self.previews_dir) / (token + "_mask.png"))
        geojson_path = str(Path(self.vectors_dir) / (token + ".geojson"))
        profile.update(driver="GTiff", count=1, dtype="float32", nodata=-9999)
        profile.pop("photometric", None)
        with rasterio.open(raster_path, "w", **profile) as dst:
            dst.write(index, 1)
            dst.set_band_description(1, method)
            dst.update_tags(IS_DEMO=str(bool(scene.is_demo)).lower(), SOURCE=scene.source, THRESHOLD=threshold)
        profile.update(dtype="uint8", nodata=255)
        with rasterio.open(mask_path, "w", **profile) as dst:
            dst.write(np.where(valid, mask.astype("uint8"), 255).astype("uint8"), 1)
            dst.update_tags(IS_DEMO=str(bool(scene.is_demo)).lower(), SOURCE=scene.source, THRESHOLD=threshold)
        scaled = np.uint8(np.clip((index + 1) / 2, 0, 1) * 255)
        Image.fromarray(np.dstack([255-scaled, scaled, scaled, np.uint8(valid)*255])).save(preview_path)
        rgba = np.zeros((*mask.shape, 4), dtype="uint8")
        rgba[mask] = [2, 132, 199, 255]
        Image.fromarray(rgba).save(mask_preview)
        Path(geojson_path).write_text(json.dumps(fc), encoding="utf-8")
        values = index[valid]
        water_count = int(mask.sum())
        return {
            "scene_id": scene_id, "product_type": method, "method": method, "threshold": threshold,
            "data_source": scene.source, "is_demo": bool(scene.is_demo),
            "observation_type": "SURFACE_WATER", "new_inundation": None,
            "file_path": raster_path, "preview_path": preview_path, "mask_path": mask_path,
            "mask_preview_path": mask_preview, "geojson_path": geojson_path,
            "feature_collection": fc, "polygon_count": len(fc["features"]),
            "water_area_km2": area, "inundation_area_km2": area, "total_area_km2": area,
            "water_pixel_count": water_count, "total_pixels": int(mask.size),
            "valid_pixels": int(valid.sum()), "water_coverage_ratio": water_count / max(1, int(valid.sum())),
            "mean": float(values.mean()) if values.size else None,
            "min": float(values.min()) if values.size else None, "max": float(values.max()) if values.size else None,
        }

    def calculate_ndwi(self, scene_id, threshold=0.0):
        return self.calculate_index(scene_id, "NDWI", threshold)

    def calculate_mndwi(self, scene_id, threshold=0.05):
        return self.calculate_index(scene_id, "MNDWI", threshold)

    def vectorize_flood(self, scene_id, threshold=0.05, method="MNDWI"):
        return self.calculate_index(scene_id, method, threshold)

    def get_band_statistics(self, scene_id, band_name):
        path, _ = self.resolve_scene_raster(scene_id)
        with rasterio.open(path) as src:
            data, valid = self._band(src, band_name)
            values = data[valid]
            hist, bins = np.histogram(values, bins=10)
            return {"scene_id": scene_id, "band_name": band_name, "data_type": "scaled reflectance",
                    "resolution": str(src.res), "min": float(values.min()) if values.size else None,
                    "max": float(values.max()) if values.size else None,
                    "mean": float(values.mean()) if values.size else None,
                    "std": float(values.std()) if values.size else None,
                    "histogram": {"counts": hist.tolist(), "bins": bins.tolist()}}

    def compare_scenes(self, pre_scene_id: str, post_scene_id: str, method: str = "MNDWI", threshold: float = 0.05):
        """Aligns pre- and post-disaster rasters, calculates water masks from actual pixels, and derives new inundation."""
        method = method.upper()
        if method not in ("NDWI", "MNDWI"):
            raise NotImplementedError("Only optical NDWI and MNDWI are implemented. SAR analysis is unavailable.")
        if not np.isfinite(threshold) or not -1 <= threshold <= 1:
            raise ValueError("Threshold must be between -1 and 1.")

        pre_scene = self.scene_record(pre_scene_id)
        post_scene = self.scene_record(post_scene_id)

        # 1. Post-disaster water calculation
        with rasterio.open(post_scene.image_path) as post_src:
            post_crs = post_src.crs
            post_transform = post_src.transform
            post_shape = (post_src.height, post_src.width)
            post_res = list(post_src.res)
            post_g, post_vg = self._band(post_src, "green")
            post_o, post_vo = self._band(post_src, "nir" if method == "NDWI" else "swir1")
            post_scl, post_vscl = self._band(post_src, "scl")
            post_valid = post_vg & post_vo & post_vscl & np.isin(post_scl, [2, 4, 5, 6, 7])
            post_denom = post_g + post_o
            post_valid &= np.isfinite(post_denom) & (np.abs(post_denom) > 1e-12)
            post_idx = np.full(post_g.shape, -9999, dtype="float32")
            np.divide(post_g - post_o, post_denom, out=post_idx, where=post_valid)
            post_water_mask = post_valid & (post_idx > threshold)

        # 2. Pre-disaster water calculation
        with rasterio.open(pre_scene.image_path) as pre_src:
            pre_crs = pre_src.crs
            pre_transform = pre_src.transform
            pre_g, pre_vg = self._band(pre_src, "green")
            pre_o, pre_vo = self._band(pre_src, "nir" if method == "NDWI" else "swir1")
            pre_scl, pre_vscl = self._band(pre_src, "scl")
            pre_valid = pre_vg & pre_vo & pre_vscl & np.isin(pre_scl, [2, 4, 5, 6, 7])
            pre_denom = pre_g + pre_o
            pre_valid &= np.isfinite(pre_denom) & (np.abs(pre_denom) > 1e-12)
            pre_idx = np.full(pre_g.shape, -9999, dtype="float32")
            np.divide(pre_g - pre_o, pre_denom, out=pre_idx, where=pre_valid)
            pre_water_mask = pre_valid & (pre_idx > threshold)

        # 3. Align pre-disaster masks to post-disaster grid (same CRS, resolution, transform, and extent)
        aligned_pre_water = np.zeros(post_shape, dtype="uint8")
        aligned_pre_valid = np.zeros(post_shape, dtype="uint8")

        reproject(
            source=pre_water_mask.astype("uint8"),
            destination=aligned_pre_water,
            src_transform=pre_transform,
            src_crs=pre_crs,
            dst_transform=post_transform,
            dst_crs=post_crs,
            resampling=Resampling.nearest
        )
        reproject(
            source=pre_valid.astype("uint8"),
            destination=aligned_pre_valid,
            src_transform=pre_transform,
            src_crs=pre_crs,
            dst_transform=post_transform,
            dst_crs=post_crs,
            resampling=Resampling.nearest
        )

        joint_valid = post_valid & (aligned_pre_valid == 1)
        pre_water = (aligned_pre_water == 1) & joint_valid
        post_water = post_water_mask & joint_valid

        # Newly flooded: post has water, pre did not
        new_flood = post_water & (~pre_water)

        # 4. Physical area calculations and real vector polygons
        pre_fc, pre_area_km2 = self._geometry(pre_water, post_transform, post_crs)
        post_fc, post_area_km2 = self._geometry(post_water, post_transform, post_crs)
        diff_fc, new_flood_area_km2 = self._geometry(new_flood, post_transform, post_crs)

        # Percentage change
        if pre_area_km2 > 0:
            pct_change = round(((post_area_km2 - pre_area_km2) / pre_area_km2) * 100, 2)
        else:
            pct_change = 100.0 if post_area_km2 > 0 else 0.0

        # Provenance metadata
        provenance = {
            "pre_scene_id": pre_scene.id,
            "post_scene_id": post_scene.id,
            "method": method,
            "threshold": threshold,
            "observation_type": "NEW_FLOOD_INUNDATION",
            "newly_flooded_area_km2": new_flood_area_km2
        }
        diff_fc.update(provenance)
        for feat in diff_fc["features"]:
            feat["properties"].update(provenance)

        # 5. Previews: pre RGB, post RGB, and difference overlay PNG
        token = f"comp_{pre_scene.id}_{post_scene.id}_{uuid.uuid4().hex[:8]}"
        self.render_rgb(pre_scene.id)
        self.render_rgb(post_scene.id)

        diff_rgba = np.zeros((*post_shape, 4), dtype="uint8")
        diff_rgba[pre_water & post_water] = [59, 130, 246, 200]  # Permanent baseline water (Blue)
        diff_rgba[new_flood] = [239, 68, 68, 230]               # Newly inundated water (Red)
        receded = pre_water & (~post_water)
        diff_rgba[receded] = [245, 158, 11, 180]                 # Receded water (Amber)

        diff_preview_path = str(Path(self.previews_dir) / f"{token}_diff.png")
        Image.fromarray(diff_rgba).save(diff_preview_path)

        diff_geojson_path = str(Path(self.vectors_dir) / f"{token}_diff.geojson")
        Path(diff_geojson_path).write_text(json.dumps(diff_fc), encoding="utf-8")

        return {
            "pre_scene": {
                "id": pre_scene.id,
                "scene_id": pre_scene.scene_id,
                "platform": pre_scene.platform,
                "acquisition_date": pre_scene.acquisition_datetime.isoformat() if pre_scene.acquisition_datetime else None,
                "cloud_cover": pre_scene.cloud_cover,
                "water_area_km2": pre_area_km2,
                "preview_url": f"/api/satellite/scenes/{pre_scene.id}/image?type=rgb"
            },
            "post_scene": {
                "id": post_scene.id,
                "scene_id": post_scene.scene_id,
                "platform": post_scene.platform,
                "acquisition_date": post_scene.acquisition_datetime.isoformat() if post_scene.acquisition_datetime else None,
                "cloud_cover": post_scene.cloud_cover,
                "water_area_km2": post_area_km2,
                "preview_url": f"/api/satellite/scenes/{post_scene.id}/image?type=rgb"
            },
            "pre_area_km2": pre_area_km2,
            "post_area_km2": post_area_km2,
            "newly_flooded_area_km2": new_flood_area_km2,
            "percentage_change": pct_change,
            "method": method,
            "threshold": threshold,
            "polygon_count": len(diff_fc["features"]),
            "difference_geojson": diff_fc,
            "difference_mask_preview": f"/api/satellite/previews/{os.path.basename(diff_preview_path)}",
            "crs": str(post_crs),
            "resolution": post_res,
            "processing_status": "COMPLETED"
        }

raster_engine = SatelliteRasterEngine()
