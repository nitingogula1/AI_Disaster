
# SentinelAid AI — Disaster Response & Satellite Intelligence

SentinelAid AI is an end-to-end disaster intelligence system integrating Microsoft Planetary Computer Sentinel-2 Level-2A satellite imagery, real raster processing (NDWI / MNDWI), georeferenced flood-extent polygon extraction, and tactical incident command capabilities.

---

## 1. System Architecture & Capabilities

- **Satellite Imagery Engine**: Queries Microsoft Planetary Computer STAC endpoint (`sentinel-2-l2a`), authenticates via genuine SAS token signing, streams and warps required multispectral bands (`B02, B03, B04, B08, B11, B12, SCL`).
- **Scene & File Registry**: Validates georeferencing, coordinate reference system (CRS), affine transforms, band names, and data integrity. Distinguishes live acquisitions from uploaded and demo files (`is_demo` provenance).
- **Surface-Water & Flood Vectorization**: 
  - Standardized indices: $NDWI = (Green - NIR) / (Green + NIR)$, $MNDWI = (Green - SWIR1) / (Green + SWIR1)$
  - SCL masking: Automatically excludes cloud, cloud shadow, snow, and nodata pixels.
  - Geometry: Generates real vector polygons via `rasterio.features.shapes()` transformed into WGS84 GeoJSON.
- **Frontend Command Center**: React 19 + TypeScript + Vite + TailwindCSS + Leaflet GIS with live backend connectivity telemetry and real image rendering.
- **AI Damage Detection**: Honestly exposed as `UNAVAILABLE` (HTTP 501) pending training weights and labelled dataset integration; no mock/fake detections are generated.

---

## 2. Installation & Quick Start

### Prerequisites
- Python 3.10+ (Python 3.12 recommended)
- Node.js 18+ (Node.js 20/24 recommended)
- Microsoft Edge or Chrome (for headless browser testing)

### Step 1: Backend Setup (FastAPI)

```powershell
cd D:\AI-Disaster\backend

# Activate virtual environment (or create with py -3.12 -m venv venv)
.\venv\Scripts\Activate.ps1

# Install dependencies
.\venv\Scripts\python.exe -m pip install -r requirements.txt

# Start backend server
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Verify backend health:
- Health check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- Interactive API Docs (Swagger UI): [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Step 2: Frontend Setup (React / Vite)

```powershell
cd D:\AI-Disaster\sentinelaid

# Install dependencies
npm install

# Start development server
npm run dev
```

Open the web application: [http://localhost:5173/](http://localhost:5173/)

---

## 3. How to Use the Satellite Pipeline

### 3.1 Discovering Real STAC Satellite Scenes
1. Open **[http://localhost:5173/command/satellite](http://localhost:5173/command/satellite)**.
2. In the **Target Operation & Area** panel:
   - Provide bounding box coordinates (e.g., `West: 89.50, South: 21.80, East: 89.51, North: 21.81` or small AOI $\le 0.01^\circ$).
   - Set start date, end date, and maximum cloud cover percentage.
3. Click **Discover STAC Scenes**.
4. Real Sentinel-2 L2A scenes matching your spatial and temporal criteria will populate the **Satellite Scene Catalog** table with genuine acquisition dates and cloud cover percentages.

### 3.2 Ingesting a Scene
1. Click **Select** on any discovered Sentinel-2 scene in the catalog.
2. Click **Ingest selected scene**.
3. The backend:
   - Signs the STAC asset URLs with Planetary Computer SAS credentials.
   - Streams the 7 required bands (`B02, B03, B04, B08, B11, B12, SCL`).
   - Warps and aligns them to the AOI grid in a single georeferenced GeoTIFF.
   - Registers the scene in the database and renders a true-color RGB preview.

### 3.3 Uploading a Local GeoTIFF
1. Click **Upload GeoTIFF** on the Satellite Ingestion Hub.
2. Select a georeferenced GeoTIFF with named band descriptions (`B02, B03, B04, B08, B11, SCL`).
3. The backend validates transform, projection, and band count before registering the file into the unified registry.

### 3.4 Processing Water & Flood Extents (NDWI / MNDWI)
1. Select any ingested or uploaded scene (status `READY`).
2. Choose calculation method:
   - **MNDWI** (Modified Normalized Difference Water Index, optimal for built-up and mixed terrain).
   - **NDWI** (Standard Normalized Difference Water Index).
3. Set the threshold (default: `0.05`).
4. Click **Analyze pixels**.
5. Inspect the computed metrics:
   - Exact surface-water area in $\text{km}^2$.
   - Water pixel count vs. valid non-cloud pixels.
   - Interactive Leaflet vector layer displaying actual flood polygon outlines.
   - Toggle between **Mask View** and **True Color Preview**.
   - Download the generated **GeoJSON** or full index GeoTIFF.

---

## 4. Running Regression Tests

### Backend Unit & Integration Tests (pytest)
```powershell
cd D:\AI-Disaster\backend
.\venv\Scripts\python.exe -m pytest -q
```
*Expected: 37 passed.*

### Frontend Tests & Production Build
```powershell
cd D:\AI-Disaster\sentinelaid
npm run test
npm run build
```
*Expected: 4 passed, build completed without errors.*

### End-to-End Live Check
To test live Microsoft Planetary Computer STAC querying, real token acquisition, band streaming, and polygon generation:
```powershell
cd D:\AI-Disaster\backend
.\venv\Scripts\python.exe scripts\live_satellite_check.py
```

### End-to-End Headless Browser Integration Check
```powershell
cd D:\AI-Disaster\backend
.\venv\Scripts\python.exe scripts\browser_satellite_check.py
```

---

## 5. Provenance & Operational Integrity Notes

1. **Synthetic / Demo Data**:
   - Any fixture or synthetic file is explicitly marked with `IS_DEMO="true"` and `is_demo: true` in metadata and API responses.
   - Dry rasters return exactly `0` water pixels, `0.0 km²`, and empty `FeatureCollection` geometries.
2. **AI Damage Detection**:
   - Currently returns `HTTP 501 Not Implemented` with status `UNAVAILABLE`.
   - Programmed or random bbox damage detections have been removed. Requires integration of a trained model checkpoint (e.g. Siamese Transformer) with aligned pre/post rasters.
3. **NASA, USGS & Copernicus Providers**:
   - Optical Sentinel-2 L2A via Planetary Computer is the active, verified implementation.
   - Other providers return honest `UNAVAILABLE` status rather than synthetic placeholders.
