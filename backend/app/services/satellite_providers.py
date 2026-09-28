"""Sentinel-2 L2A catalog and bounded, georeferenced asset acquisition."""
import asyncio
import json
import math
import os
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import quote, urlsplit, urlunsplit
import httpx
import numpy as np
import planetary_computer as pc
import rasterio
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT
from rasterio.windows import Window, from_bounds
from rasterio.warp import transform_bounds
from app.core.config import settings
from app.services.scene_registry import safe_id, inspect_raster

def validate_bbox(bbox):
    if bbox is None or len(bbox) != 4 or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in bbox):
        raise ValueError("Provide [west, south, east, north] for a small AOI.")
    w, s, e, n = bbox
    if not (-180 <= w < e <= 180 and -90 <= s < n <= 90):
        raise ValueError("AOI must have ordered longitude/latitude coordinates.")
    return bbox

def normalized(item):
    props = item["properties"]
    return {"scene_id": item["id"], "collection": item["collection"],
            "provider": "PLANETARY_COMPUTER", "source": "PLANETARY_COMPUTER",
            "platform": props.get("platform", "Sentinel-2"), "sensor": "MSI",
            "acquisition_datetime": props.get("datetime"), "cloud_cover": props.get("eo:cloud_cover"),
            "resolution": "10m", "processing_level": "L2A", "sensor_type": "Optical Multispectral",
            "bbox": item.get("bbox"), "geometry": item.get("geometry"),
            "asset_metadata": item["assets"], "scene_metadata": {"stac_item": item},
            "status": "DISCOVERED", "is_demo": False, "thumbnail_url": None}

class PlanetaryComputerProvider:
    def __init__(self):
        self.endpoint = settings.PLANETARY_COMPUTER_URL.rstrip("/")

    async def check_connection(self):
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(self.endpoint)
                response.raise_for_status()
            return {"provider": "Microsoft Planetary Computer", "status": "CONNECTED",
                    "endpoint": self.endpoint, "timestamp": datetime.now(timezone.utc).isoformat()}
        except Exception:
            return {"provider": "Microsoft Planetary Computer", "status": "DISCONNECTED",
                    "endpoint": self.endpoint, "error": "STAC endpoint unreachable or returned an error."}

    async def search(self, bbox, start_datetime=None, end_datetime=None, collections=None, max_cloud_cover=15, limit=50):
        validate_bbox(bbox)
        if (collections or ["sentinel-2-l2a"]) != ["sentinel-2-l2a"]:
            raise NotImplementedError("Only collection sentinel-2-l2a is supported.")
        if not 0 <= max_cloud_cover <= 100 or not 1 <= limit <= 100:
            raise ValueError("Cloud cover must be 0..100 and limit 1..100.")
        def parse(value):
            if not value: return None
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed.astimezone(timezone.utc) if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        start, end = parse(start_datetime), parse(end_datetime)
        if start and end and start > end:
            raise ValueError("Start date must precede end date.")
        payload = {"collections": ["sentinel-2-l2a"], "bbox": bbox, "limit": limit,
                   "query": {"eo:cloud_cover": {"lte": max_cloud_cover}}}
        if start or end:
            payload["datetime"] = f"{start.isoformat() if start else '..'}/{end.isoformat() if end else '..'}"
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(self.endpoint + "/search", json=payload)
                response.raise_for_status()
                items = response.json()["features"]
        except Exception as exc:
            raise RuntimeError("Planetary Computer STAC search failed. Check network access and retry.") from exc
        return [normalized(item) for item in items[:limit]]

    def item_sync(self, scene_id, collection="sentinel-2-l2a"):
        safe_id(scene_id)
        if collection != "sentinel-2-l2a":
            raise NotImplementedError("Only sentinel-2-l2a acquisition is supported.")
        try:
            with httpx.Client(timeout=30) as client:
                response = client.get(f"{self.endpoint}/collections/{collection}/items/{quote(scene_id)}")
                if response.status_code == 404:
                    raise FileNotFoundError(f"Scene {scene_id} does not exist in {collection}.")
                response.raise_for_status()
                item = response.json()
                if item.get("id") != scene_id or item.get("collection") != collection:
                    raise ValueError("Provider returned a different scene or collection.")
                return item
        except httpx.HTTPError as exc:
            raise RuntimeError("Cannot retrieve STAC item. Check Planetary Computer connectivity.") from exc

    async def get_scene(self, scene_id):
        return normalized(await asyncio.to_thread(self.item_sync, scene_id))

    async def get_metadata(self, scene_id):
        return await asyncio.to_thread(self.item_sync, scene_id)

    async def get_assets(self, scene_id):
        return (await self.get_metadata(scene_id))["assets"]


    def sign_asset(self, href):
        # Genuine PC SAS API, bounded timeout, SDK token validation/signing.
        # Strip expired signatures; never use signed URLs as long-lived metadata.
        parsed = urlsplit(href)
        if not parsed.hostname or not parsed.hostname.endswith(".blob.core.windows.net"):
            raise ValueError("Expected a Planetary Computer Azure Blob asset.")
        account = parsed.hostname.split(".")[0]
        container = parsed.path.lstrip("/").split("/")[0]
        endpoint = f"https://planetarycomputer.microsoft.com/api/sas/v1/token/{account}/{container}"
        with httpx.Client(timeout=20) as client:
            response = client.get(endpoint)
            response.raise_for_status()
            token = pc.sas.SASToken(**response.json())
        if token.ttl() < 60:
            raise RuntimeError("Provider returned an expired access token. Retry later.")
        return token.sign(urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))).href


    @staticmethod
    def parse_calibration(xml_text, baseline=None):
        root = ET.fromstring(xml_text)
        def tag(node): return node.tag.split("}")[-1]
        quant = next((float(n.text) for n in root.iter() if tag(n) == "BOA_QUANTIFICATION_VALUE"), None)
        if not quant or quant <= 0:
            raise ValueError("Product metadata lacks a valid BOA_QUANTIFICATION_VALUE.")
        band_names = {}
        for node in root.iter():
            if tag(node) == "Spectral_Information":
                name = node.attrib.get("physicalBand", "")
                name = "B" + name[1:].zfill(2) if name[1:].isdigit() else name
                band_names[node.attrib["bandId"]] = name
        offsets = {}
        for node in root.iter():
            if tag(node) == "BOA_ADD_OFFSET":
                name = band_names.get(node.attrib.get("band_id"))
                if name: offsets[name] = float(node.text)
        baseline = next((n.text for n in root.iter() if tag(n) == "PROCESSING_BASELINE"), baseline)
        result = {}
        for key in ["B02", "B03", "B04", "B08", "B11", "B12"]:
            if key not in offsets and (baseline is None or float(baseline) >= 4):
                raise ValueError(f"Product metadata lacks radiometric offset for {key}.")
            result[key] = (1 / quant, offsets.get(key, 0) / quant)
        return result

    def calibration(self, item):
        keys = ["B02", "B03", "B04", "B08", "B11", "B12"]
        bands = {key: item["assets"][key].get("raster:bands", [{}])[0] for key in keys}
        if all("scale" in band and "offset" in band for band in bands.values()):
            return {key: (band["scale"], band["offset"]) for key, band in bands.items()}, None
        asset = item["assets"].get("product-metadata")
        if not asset:
            raise ValueError("Reflectance calibration is missing from both STAC assets and product metadata.")
        href = self.sign_asset(asset["href"])
        content = bytearray()
        with httpx.Client(timeout=30) as client, client.stream("GET", href) as response:
            response.raise_for_status()
            for chunk in response.iter_bytes():
                content.extend(chunk)
                if len(content) > 2 * 1024 * 1024:
                    raise ValueError("Product metadata exceeds the supported 2 MB limit.")
        xml_text = content.decode("utf-8")
        return self.parse_calibration(xml_text, item["properties"].get("s2:processing_baseline")), xml_text

    def download_sync(self, scene_id, output_dir, aoi_bbox=None):
        validate_bbox(aoi_bbox)
        item = self.item_sync(scene_id)
        assets = item["assets"]
        keys = ["B02", "B03", "B04", "B08", "B11", "B12", "SCL"]
        if any(key not in assets for key in keys):
            raise ValueError("Sentinel-2 item is missing required spectral or SCL assets.")
        out_dir = Path(output_dir).resolve()
        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / f"{safe_id(scene_id)}_multispectral.tif"
        temporary = out.with_suffix(".partial.tif")
        try:
            calibration, metadata_xml = self.calibration(item)
            # Never persist expiring SAS URLs. SDK signs the original asset again on each read.
            with rasterio.Env(GDAL_HTTP_TIMEOUT="30", GDAL_HTTP_CONNECTTIMEOUT="10",
                              GDAL_HTTP_MAX_RETRY="2", GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
                              CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
                with rasterio.open(self.sign_asset(assets["B03"]["href"])) as ref:
                    bounds = transform_bounds("EPSG:4326", ref.crs, *aoi_bbox)
                    try:
                        win = from_bounds(*bounds, transform=ref.transform).intersection(Window(0, 0, ref.width, ref.height))
                    except Exception as exc:
                        raise ValueError("Selected AOI does not overlap this scene.") from exc
                    left, top = math.floor(win.col_off), math.floor(win.row_off)
                    width = math.ceil(win.col_off + win.width) - left
                    height = math.ceil(win.row_off + win.height) - top
                    if width * height > 4_194_304 or width < 1 or height < 1:
                        raise ValueError("AOI exceeds 4,194,304 pixels. Select a smaller area (for example 0.01 x 0.01 degrees).")
                    transform = ref.window_transform(Window(left, top, width, height))
                    crs = ref.crs
                with rasterio.open(temporary, "w", driver="GTiff", width=width, height=height,
                                   count=len(keys), dtype="float32", crs=crs, transform=transform,
                                   nodata=-9999, compress="deflate") as dst:
                    for i, key in enumerate(keys, 1):
                        try:
                            href = self.sign_asset(assets[key]["href"])
                            with rasterio.open(href) as source:
                                scale, offset = calibration.get(key, (1.0, 0.0))
                                with WarpedVRT(source, crs=crs, transform=transform, width=width, height=height,
                                               resampling=Resampling.nearest if key == "SCL" else Resampling.bilinear,
                                               dtype="float32", nodata=-9999) as vrt:
                                    raw = vrt.read(1, masked=True).astype("float32")
                                    arr = raw if key == "SCL" else raw * scale + offset
                                    dst.write(arr.filled(-9999), i)
                                    dst.set_band_description(i, key)
                                    dst.update_tags(i, ORIGINAL_SCALE=scale, ORIGINAL_OFFSET=offset)
                        except Exception as exc:
                            raise RuntimeError(f"Unable to sign/read asset {key}. Retry ingestion to obtain fresh access tokens.") from exc
                    dst.update_tags(SOURCE="PLANETARY_COMPUTER", IS_DEMO="false",
                                    ACQUISITION_DATETIME=item["properties"].get("datetime", ""))
            inspect_raster(temporary)
            os.replace(temporary, out)
            if metadata_xml:
                out.with_suffix(".metadata.xml").write_text(metadata_xml, encoding="utf-8")
            out.with_suffix(".stac.json").write_text(json.dumps(item), encoding="utf-8")
            return str(out)
        except (ValueError, FileNotFoundError):
            raise
        except Exception as exc:
            raise RuntimeError("Asset acquisition failed. Check network/signing access and retry ingestion.") from exc
        finally:
            if temporary.exists():
                temporary.unlink()

    async def download(self, scene_id, output_dir, aoi_bbox=None):
        return await asyncio.to_thread(self.download_sync, scene_id, output_dir, aoi_bbox)

class UnavailableProvider:
    async def check_connection(self):
        return {"status": "UNAVAILABLE", "provider": type(self).__name__,
                "message": "Imagery acquisition is not implemented for this provider."}
    async def search(self, *args, **kwargs):
        raise NotImplementedError("Use Planetary Computer Sentinel-2 L2A. This imagery provider is unavailable.")
    get_scene = search
    get_metadata = search
    get_assets = search
    download = search

class CopernicusProvider(UnavailableProvider):
    pass
class USGSProvider(UnavailableProvider):
    pass
class NASAProvider(UnavailableProvider):
    pass
class LocalDemoProvider(UnavailableProvider):
    def get_curated_scenes(self, *args, **kwargs):
        return []
    def get_scene_by_id(self, scene_id):
        return None
