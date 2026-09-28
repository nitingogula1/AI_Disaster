# AI-Disaster: backend review and satellite implementation guide

Reviewed: 28 September 2026. Source: your uploaded AI-Disaster.zip.

## Main finding

The project contains a React/TypeScript frontend and FastAPI backend, with a database, satellite search routes and raster calculations. However, the real satellite workflow is incomplete. Several steps use generated images, fixed results or mock responses. This is more than a database connection or API-key problem.

This document is a review and repair guide. The original project has not been modified. The changes below have not been applied to your laptop.

## What I checked

- Inspected the satellite provider, ingestion, upload, raster, flood-analysis and frontend request code.
- Parsed all 65 backend Python files successfully for syntax.
- Installed the dependencies from the supplied requirements in an isolated Python 3.12 environment.
- Attempted the supplied flood API tests. Test collection failed while importing the app because `email-validator` is missing. This can also prevent a clean installation from starting.
- The available package index did not provide `email-validator` when I tried adding it, so I could not complete the API test run here. This does not establish that the package is unavailable on your laptop.
- Ran the provider and raster services directly to reproduce the defects below, using temporary generated test files.
- Inspected the copied SQLite database read-only: 58 satellite scenes, 7 ingestion jobs, 0 processing results and 6 flood-analysis records. Stored records alone do not prove that imagery was downloaded or processed.
- Did not use the uploaded `.env`, test your credentials, build the frontend, or validate a live satellite download. Your laptop's exact terminal error is still unknown.

## Confirmed problems

Paths below are relative to `D:\AI-Disaster`.

| Priority | File / function | Finding and effect |
|---|---|---|
| Immediate | `backend/requirements.txt`; `app/schemas/auth.py` | EmailStr requires email validation support, but `email-validator` is absent. Clean installation failed during app import. |
| Immediate | `sentinelaid/vite.config.ts`; `SatelliteAcquisitionPage.tsx` | Image elements request relative `/api/v1/...` URLs. The Vite config has no `/api` proxy. Under the documented two-server setup, these image requests go to the frontend server instead of port 8000. Axios's absolute base URL does not apply to image elements. |
| Critical | `backend/app/services/satellite_providers.py`, `PlanetaryComputerProvider.download()` | Returns an output filename without downloading or writing a file. `/satellite/download` nevertheless reports `COMPLETED`. |
| Critical | `backend/app/services/satellite_hub_service.py`, `direct_ingest()` and `get_job_status()` | Ingestion inserts a queued database job, but does not start a download worker. Reading status advances queued work to 75% without doing the work. |
| Critical | `backend/app/api/satellite.py`, `upload_satellite_image()` | Saves uploads under `uploads/disasters/...`, but does not register a SatelliteScene or connect the file to the raster engine. The engine instead reads `data/raw/{scene_id}_multispectral.tif`. |
| Critical | `backend/app/services/raster_engine.py` | Missing files trigger synthetic image generation. Existing synthetic files are subsequently labelled `REAL_STAC_SCENE`, because provenance is inferred only from file existence. |
| Critical | `satellite_hub_service.py`, `get_flood_scenes()` and `run_scene_flood_analysis()` | The flood catalog contains hard-coded records labelled live. Flood analysis chooses fixed areas and pixel counts without analyzing the selected raster. The frontend's Discover action calls this flood catalog route, rather than the separate real STAC search route. |
| Critical | `raster_engine.py`, `calculate_mndwi()` and `vectorize_flood()` | Zero detected water becomes 18.64 km²; vectorization outputs fixed polygons instead of tracing the computed mask. |
| High | `raster_engine.py`, `generate_demo_raster()` | The transform uses longitude/latitude bounds but the CRS is labelled EPSG:32645, whose coordinate units are metres. Areas and spatial alignment are therefore invalid. |
| High | `satellite_providers.py`, `PlanetaryComputerProvider.search()` | `planetary-computer` is missing from requirements. The fallback adds `?mspc=signed`, which is not an actual SAS signature. Search errors and empty results also silently return curated demo scenes. |
| High | `sentinelaid/src/services/api.ts`; `SatelliteAcquisitionPage.tsx` | Multiple catch blocks substitute mock scenes, successful analysis results or success messages when requests fail. This hides backend errors. |
| High | `satellite_providers.py`, `NASAProvider` | Uses EONET event metadata and invents scene-like fields. It does not download HLS/MODIS imagery. APOD API-key validation does not verify an Earth observation imagery pipeline. Copernicus and USGS search/download implementations are also placeholders. |
| High | `backend/app/services/ai_detection_service.py` | The named model returns programmed detections. The inspected implementation does not load trained model weights or perform image inference. |

### Reproduced results

| Check | Actual result |
|---|---|
| Call Planetary Computer download with a nonexistent scene | A path was returned; no file existed there. |
| Calculate NDWI twice for a missing scene | First response: `LOCAL_DEMO_SYNTHETIC_GENERATOR`; second response for the same file: `REAL_STAC_SCENE`. |
| Generate demo raster | CRS EPSG:32645 with bounds `[89.31, 21.54, 90.04, 22.12]`, revealing the degrees/metres mismatch. |
| Calculate MNDWI on a controlled raster with no water | `water_pixel_count = 0`, `inundation_area_km2 = 18.64`. |
| Vectorize that zero-water raster | Two fixed polygons and 18.64 km² returned. |
| Request a one-hour flood-scene window | 64 records returned; the first had a 2024 acquisition date. The time window is not enforced as a strict date filter. |

The existing tests mostly check successful status codes and field presence. They do not establish that results come from real image pixels.

## First: repair startup and image routing

### 1. Add the missing dependency

Add this line to `backend/requirements.txt`:

```text
email-validator>=2.0.0
```

Then run in PowerShell using the project's existing environment:

```powershell
cd D:\AI-Disaster\backend
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

If there is no usable environment, first create one with `py -3.12 -m venv venv`. A successful server start only verifies startup, not the satellite pipeline. Open `http://127.0.0.1:8000/docs` to confirm route availability.

### 2. Add the development image proxy

In `sentinelaid/vite.config.ts`, keep the existing imports and plugins and add this `server` block:

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
```

Restart Vite in a second PowerShell window:

```powershell
cd D:\AI-Disaster\sentinelaid
npm run dev
```

This addresses relative image requests in development. A production deployment needs its own reverse proxy or correctly configured absolute image URLs. It does not repair missing imagery or synthetic analysis.

## Then: implement one real satellite workflow

Start with Sentinel-2 L2A for the existing optical water-index code. Implement and verify one provider before adding NASA, Landsat or SAR.

1. **Expose real errors.** Make live mode explicit. Remove silent demo fallback from live searches, missing-file reads, flood analysis and frontend catch blocks. Return an empty list for a successful search with no scenes; return an error for provider failures. Preserve explicit demo mode separately and persist provenance.

2. **Connect Discover to the real catalog.** Update `handleDiscoverSTAC()` to call `/api/v1/satellite/stac/search` with the selected operation's bounding box, start/end dates, cloud limit and collection `sentinel-2-l2a`. Normalize the real results for the table. Do not assign flood scores until raster analysis exists. Use the existing request schema's `start_datetime` and `end_datetime`; extend the frontend service typing to include them.

3. **Download real bands.** Add the `planetary-computer` SDK and use its actual signing support, removing `?mspc=signed`. Resolve the exact STAC item by collection and ID, persist its original asset metadata, sign assets when reading, and fetch the needed bands. Implement ingestion as real background work with a separate database session, errors and verifiable completion. For an initial local prototype, a small synchronous processing endpoint is also acceptable if it reports its actual outcome. A queued status alone is not implementation.

4. **Use one file registry.** Make downloaded and uploaded files follow the same scene-registration path. Record source, scene ID, acquisition date, local paths, CRS, transform, dimensions, band names, resolution and processing status. Have the raster engine resolve paths from this record, rather than guessing a filename. Uploaded files must be validated as rasters; extension checks alone are insufficient. Restrict user-provided path components and stream large uploads instead of reading them all into memory.

5. **Align and validate bands.** The existing engine assumes a seven-band stack in the order `B02, B03, B04, B08, B11, B12, SCL`. Provider assets are separate files, and arbitrary TIFFs or JPEGs need not follow that layout. Read declared band metadata, clip to the selected area, and reproject/resample onto a shared grid. Use nearest-neighbour for classification masks and an appropriate continuous resampling method for reflectance. Read scale and offset metadata before index calculation. Reject missing required bands with an actionable error. Ordinary RGB screenshots do not supply NIR or SWIR bands.

6. **Compute results from valid pixels.** Use green/NIR for NDWI and green/SWIR-1 for MNDWI. Mask cloud, shadow, snow and nodata pixels using the dataset's quality information. Do not count invalid pixels in coverage. Measure area using the actual grid geometry and an appropriate projected/equal-area or geodesic method; do not assume every pixel is 100 m². Keep zero water as zero.

7. **Create polygons from the mask.** Replace fixed coordinates in `vectorize_flood()` with `rasterio.features.shapes()` using the raster transform and valid-water mask. Transform the resulting geometry to longitude/latitude for the frontend. An all-dry mask should produce an empty FeatureCollection. Distinguish observed surface water from newly flooded land by comparing aligned pre/post imagery and accounting for permanent water; MNDWI alone does not establish flood damage.

8. **Connect the real outputs to the UI.** Link each analysis to the selected scene and operation, save output paths and computed metrics, and serve actual previews and GeoJSON. Remove fixed scene IDs such as `scn-001` where user selection should apply. Leave unsupported SAR analysis explicitly unavailable until a real SAR processing path exists.

9. **Add trained AI separately.** Once ingestion and preprocessing are trustworthy, choose a model and compatible labelled data, load actual weights, preprocess inputs, run inference, and assess accuracy on held-out data. Replacing the current programmed damage detections requires model integration, not just placing a dataset in a folder.

## Acceptance checks before calling it working

- A successful ingestion creates readable raster files with the expected bands and metadata.
- An invalid scene or unavailable provider returns an error; it does not produce a demo result.
- A valid search with no matching scenes returns an empty list.
- Uploading a supported raster registers a scene and analysis uses that exact file.
- Missing NIR/SWIR/quality data is handled explicitly, never replaced with invented bands.
- Dry input produces zero water area and no water polygons.
- Known water input produces geometry in the correct location and an area consistent with the grid.
- Cloud/nodata pixels are excluded, and changing the threshold affects the actual calculation.
- Different areas and dates change search results; out-of-window scenes are excluded.
- A preview request in the browser reaches port 8000 under the development setup.
- Stopping the backend shows an error state instead of a successful mock result.
- Demo provenance stays demo after caching, restarting and repeated processing.

## Official implementation references

- Planetary Computer SDK and signing: https://github.com/microsoft/planetary-computer-sdk-for-python
- Planetary Computer SAS API: https://planetarycomputer.microsoft.com/api/sas/v1/docs
- Rasterio reprojection: https://rasterio.readthedocs.io/en/stable/topics/reproject.html
- Rasterio raster-to-vector features: https://rasterio.readthedocs.io/en/stable/topics/features.html
- Rasterio spatial masking: https://rasterio.readthedocs.io/en/latest/api/rasterio.mask.html

The immediate dependency and Vite changes address two concrete setup issues. The provider, file-registration, raster and frontend changes are still required for real satellite analysis.
