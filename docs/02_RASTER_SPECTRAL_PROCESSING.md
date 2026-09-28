# Module 02: Raster Spectral Processing Engine

## 1. Executive Summary & Code Architecture

The **Raster Spectral Processing Engine** ([`app/services/raster_engine.py`](file:///d:/AI-Disaster/backend/app/services/raster_engine.py)) performs pixel-level multispectral calculations on Sentinel-2 7-band GeoTIFF rasters using `Rasterio` and `NumPy`.

It generates Normalized Difference Water Index (NDWI) layers, Modified NDWI (MNDWI) layers, 2%–98% contrast-stretched False-Color Infrared (B08-B04-B03) PNG previews, and GeoJSON flood boundary vector polygons.

---

## 2. Spectral Index Equations & NumPy Implementation

### 2.1 McFeeters Normalized Difference Water Index (NDWI)

$$\text{NDWI} = \frac{\text{Green} - \text{NIR}}{\text{Green} + \text{NIR}} = \frac{\text{B03} - \text{B08}}{\text{B03} + \text{B08} + 10^{-6}}$$

- **Band 3 (Green):** 560nm wavelength.
- **Band 8 (NIR):** 842nm wavelength (absorbed by water bodies).

```python
# Implementation in app/services/raster_engine.py
def calculate_ndwi(self, scene_id: str) -> Dict[str, Any]:
    tif_path = os.path.join(self.raw_dir, f"{scene_id}_multispectral.tif")
    
    with rasterio.open(tif_path) as src:
        green = src.read(2).astype(np.float32)  # Band 2 -> B03
        nir = src.read(4).astype(np.float32)    # Band 4 -> B08
        meta = src.meta.copy()

    denominator = green + nir + 1e-6
    ndwi = (green - nir) / denominator

    out_tif = os.path.join(self.processed_dir, f"{scene_id}_ndwi.tif")
    meta.update(count=1, dtype=rasterio.float32, nodata=-9999.0)
    with rasterio.open(out_tif, 'w', **meta) as dst:
        dst.write(ndwi.astype(rasterio.float32), 1)
        
    water_mask = ndwi > 0.0
    water_pixels = int(np.sum(water_mask))
    total_pixels = int(ndwi.size)
    
    return {
        "product_type": "NDWI",
        "file_path": out_tif,
        "water_pixel_count": water_pixels,
        "water_coverage_ratio": round(float(water_pixels / total_pixels), 4)
    }
```

### 2.2 Xu Modified Normalized Difference Water Index (MNDWI)

$$\text{MNDWI} = \frac{\text{Green} - \text{SWIR1}}{\text{Green} + \text{SWIR1}} = \frac{\text{B03} - \text{B11}}{\text{B03} + \text{B11} + 10^{-6}}$$

- **Band 11 (SWIR 1):** 1610nm wavelength.
- **Advantage:** Suppresses false positives caused by built-up concrete, urban asphalt, and shadows, isolating true flood waters in built environments.

```python
# Implementation in app/services/raster_engine.py
def calculate_mndwi(self, scene_id: str) -> Dict[str, Any]:
    tif_path = os.path.join(self.raw_dir, f"{scene_id}_multispectral.tif")
    
    with rasterio.open(tif_path) as src:
        green = src.read(2).astype(np.float32)  # Band 2 -> B03
        swir = src.read(5).astype(np.float32)   # Band 5 -> B11
        meta = src.meta.copy()

    denominator = green + swir + 1e-6
    mndwi = (green - swir) / denominator

    out_tif = os.path.join(self.processed_dir, f"{scene_id}_mndwi.tif")
    meta.update(count=1, dtype=rasterio.float32, nodata=-9999.0)
    with rasterio.open(out_tif, 'w', **meta) as dst:
        dst.write(mndwi.astype(rasterio.float32), 1)

    return {
        "product_type": "MNDWI",
        "file_path": out_tif,
        "water_pixel_count": int(np.sum(mndwi > 0.05))
    }
```

---

## 3. False-Color Infrared (B08-B04-B03) Synthesis

To highlight standing floodwaters and vegetation health, `render_false_color` maps NIR to Red, Red to Green, and Green to Blue, applying a 2% to 98% cumulative percentile linear stretch:

```python
# Implementation in app/services/raster_engine.py
def render_false_color(self, scene_id: str) -> str:
    tif_path = os.path.join(self.raw_dir, f"{scene_id}_multispectral.tif")
    
    with rasterio.open(tif_path) as src:
        nir = src.read(4).astype(np.float32)  # B08 -> Red channel
        r = src.read(3).astype(np.float32)    # B04 -> Green channel
        g = src.read(2).astype(np.float32)    # B03 -> Blue channel

    def stretch(arr):
        p2, p98 = np.percentile(arr, (2, 98))
        if p98 <= p2:
            p98 = p2 + 1e-5
        stretched = np.clip((arr - p2) / (p98 - p2), 0, 1)
        return (stretched * 255).astype(np.uint8)

    fc = np.dstack([stretch(nir), stretch(r), stretch(g)])
    img = Image.fromarray(fc)
    out_png = os.path.join(self.previews_dir, f"{scene_id}_false_color.png")
    img.save(out_png, "PNG")
    return out_png
```

### Visual Palette Legend:
- **Deep Navy / Black:** Deep open water and standing inundation (high NIR absorption).
- **Scarlet Red:** Healthy vegetation and intact forest canopy (strong NIR chlorophyll scattering).
- **Cyan / Grey:** Concrete buildings, bare soil, and urban pavement.

---

## 4. Vectorization & GeoJSON Polygon Export

Binary flood masks ($1 = \text{Flooded}, 0 = \text{Dry}$) are converted into GeoJSON vector polygon features for Leaflet rendering via `vectorize_flood_extent(scene_id)`:

- **Raster Output:** Written to `processed/{scene_id}_mndwi.tif`
- **Preview PNG Output:** Written to `previews/{scene_id}_ndwi.png` and `previews/{scene_id}_mndwi.png`
- **Vector Output:** GeoJSON MultiPolygon feature structures served via REST endpoint `GET /api/v1/satellite/scenes/{id}/image?type=ndwi` and `GET /api/v1/satellite/scenes/{id}/image?type=mndwi`.
