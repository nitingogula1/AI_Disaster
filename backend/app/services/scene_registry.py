"""One validated, persistent registry for local and acquired raster pixels."""
import re
from pathlib import Path
import numpy as np
import rasterio
from rasterio.warp import transform_bounds

BAND_ALIASES = {
    "B02": "blue", "BLUE": "blue", "B03": "green", "GREEN": "green",
    "B04": "red", "RED": "red", "B08": "nir", "NIR": "nir",
    "B11": "swir1", "SWIR1": "swir1", "SWIR-1": "swir1",
    "B12": "swir2", "SWIR2": "swir2", "SWIR-2": "swir2", "SCL": "scl",
}
MAX_PIXELS = 4_194_304

def safe_id(value):
    if not value or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,149}", value) or ".." in value:
        raise ValueError("Invalid scene identifier.")
    return value

def band_indices(src):
    result = {}
    for i, desc in enumerate(src.descriptions, 1):
        name = (desc or src.tags(i).get("NAME", "")).upper().strip()
        if name in BAND_ALIASES:
            key = BAND_ALIASES[name]
            if key in result:
                raise ValueError(f"Duplicate band description: {name}")
            result[key] = i
    return result

def inspect_raster(path, require_water=True):
    with rasterio.open(path) as src:
        if src.driver != "GTiff":
            raise ValueError("Only georeferenced GeoTIFF datasets are supported.")
        if not src.crs or src.transform.is_identity or abs(src.transform.determinant) == 0:
            raise ValueError("A valid CRS and non-identity georeferencing transform are required.")
        if src.width * src.height > MAX_PIXELS or src.count > 16:
            raise ValueError("Raster exceeds 4,194,304 pixels or 16 bands. Clip a smaller AOI before uploading.")
        bands = band_indices(src)
        required = {"blue", "green", "red", "nir", "swir1", "scl"} if require_water else set()
        missing = required - bands.keys()
        if missing:
            raise ValueError("Missing named bands: " + ", ".join(sorted(missing)) +
                             ". Set GeoTIFF band descriptions to B02, B03, B04, B08, B11, SCL (B12 optional).")
        # Decode every block, so truncated/corrupt content cannot become READY.
        valid_count = 0
        for _, window in src.block_windows(1):
            values = src.read(window=window, masked=True)
            valid_count += int(np.isfinite(values.filled(np.nan).astype("float64")).sum()) if values.dtype.kind == "f" else int(values.count())
        if not valid_count:
            raise ValueError("Dataset contains no valid pixels.")
        if "scl" in bands:
            scl = src.read(bands["scl"], masked=True).compressed()
            if not np.all(np.isfinite(scl) & (scl >= 0) & (scl <= 11) & (scl == np.floor(scl))):
                raise ValueError("SCL must contain Sentinel-2 classification integers 0 through 11.")
        return {
            "path": str(Path(path).resolve()), "bands": bands, "descriptions": list(src.descriptions),
            "crs": str(src.crs), "epsg": src.crs.to_epsg(), "transform": list(src.transform)[:6],
            "width": src.width, "height": src.height, "count": src.count,
            "band_tags": [src.tags(i) for i in src.indexes], "scales": list(src.scales), "offsets": list(src.offsets),
            "bbox": list(transform_bounds(src.crs, "EPSG:4326", *src.bounds)),
            "resolution": list(src.res), "dtypes": list(src.dtypes),
            "acquisition_datetime": src.tags().get("ACQUISITION_DATETIME"),
            "is_demo": src.tags().get("IS_DEMO", "").lower() == "true",
        }

def register_file(scene, path, source, is_demo=False):
    metadata = inspect_raster(path)
    scene.image_path = metadata["path"]
    scene.metadata_json = {**(scene.metadata_json or {}), "registry_version": 1, "raster": metadata,
                           "acquisition_known": bool(scene.acquisition_date)}
    scene.crs = metadata["crs"]
    scene.epsg_code = metadata["epsg"]
    scene.bbox = metadata["bbox"]
    scene.bands_count = metadata["count"]
    scene.source = source
    scene.is_demo = bool(is_demo or metadata["is_demo"])
    scene.file_size = f"{Path(path).stat().st_size / 1048576:.2f} MB"
    scene.resolution = f'{metadata["resolution"][0]:g} CRS units'
    scene.status = "READY"
    scene.processing_status = "Ready"
    return metadata
