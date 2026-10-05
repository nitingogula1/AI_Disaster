# Technical Capability Audit: Real vs. Mock/Demo Matrix
**Repository**: SentinelAid Disaster Response Platform  
**Audit Type**: Independent Source Code Verification  
**Evaluation Standard**: Source File Line Verification (`file:line`)  

> **Last independently verified**: October 4, 2026. Re-run full audit before trusting any REAL verdict older than 30 days.

---

## 1. Executive Summary

This document replaces all previous self-graded audit reports with a factual, source-verified accounting of what is actually functional versus what is simulated, hardcoded, or stubbed in the SentinelAid codebase.

### Core Reality Summary
* **The Web Application & UI**: **REAL & FUNCTIONAL**. The React 19 + TypeScript + Leaflet frontend is a rich, responsive interface with working routing across all pages, working local/OpenStreetMap geocoding, working Leaflet map rendering, and responsive HUD overlays.
* **The OpenStreetMap Road Routing**: **REAL (EXTERNAL)**. The system successfully calls public Project-OSRM APIs (`https://router.project-osrm.org`) to fetch actual drivable road geometry between coordinates.
* **AI Computer Vision Damage Detection**: **MOCK / SIMULATED**. There are no `.pt`, `.pth`, or `.onnx` model weights in the repository. The backend returns hardcoded JSON detections with fixed building codes and coordinates.
* **Elevation & Flood Hazard Avoidance**: **MOCK / ARITHMETIC FORMULAS**. There is no DEM (Digital Elevation Model) raster engine or vector polygon collision engine. Hazard routes are generated using sinusoidal offset formulas, and risk percentages are hardcoded constants.
* **Aerial Drone Video & Telemetry**: **MOCK / FRONTEND ANIMATION**. There is no RTSP decoder, WebRTC stream, or physical drone hardware connection. The HUD is rendered entirely via CSS, SVG, and HTML timers.
* **IoT River Gauges & Physical Sensors**: **NON-EXISTENT**. No MQTT, WebSocket, or REST ingestion pipelines exist for physical river gauges or sensor hardware.
* **Disaster Village Casualty Counts**: **HARDCODED FRONTEND CONSTANTS**. Village casualties (e.g., Rasuwagadhi, Timure) exist purely as JavaScript arrays in the client application, not in database tables.

---

## 2. Detailed Findings by Capability

### 2.1 AI Damage Detection & Segmentation
* **Code Reference**: [`backend/app/services/ai_detection_service.py:L16-37, L133-147`](file:///d:/AI-Disaster/backend/app/services/ai_detection_service.py)
* **Status**: **MOCK / DEMO**
* **Technical Reality**:
  * Line 134: `SiameseSegFormerModel.predict()` executes `return DemoModel().predict()`.
  * Line 20–37: `DemoModel.predict()` returns a static list containing a hardcoded asset dictionary:
    * `asset_code`: `"BLD-8821"`
    * `location_name`: `"Coastal District Hospital - Wing B"`
    * `confidence`: `96.2%`
    * `latitude`: `21.7439`, `longitude`: `89.3068`
  * Line 147: `get_model_status()` explicitly returns `"status": "ONLINE (DEMO MODE)"`.
  * Repository check: **Zero** PyTorch checkpoint files (`.pt`, `.pth`) or ONNX models exist anywhere in the repository.

---

### 2.2 Route Optimization & Hazard Bypass
* **Code Reference**: [`backend/app/services/routing_service.py:L66-85, L117-138`](file:///d:/AI-Disaster/backend/app/services/routing_service.py)
* **Status**: **PARTIAL (Real OSRM Call + Mock Hazard Avoidance)**
* **Technical Reality**:
  * **Real Component**: Lines 73–82 build an HTTP request to `https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}`. If reachable, real asphalt road geometry is parsed and returned for Route A.
  * **Mock Component**: 
    * Route B (the "Hazard" route) does not query a flood model. Line 120 generates its path using mathematical sine-wave offsets: `offset_lat = 0.005 * math.sin(t * math.pi)`.
    * Risk percentages are hardcoded: Route A is fixed at `12%` risk and `0.12m` depth; Route B is fixed at `88%` risk and `1.15m` depth.
    * No Digital Elevation Models (DEM) or GeoTIFF rasters are queried.

---

### 2.3 Backend API Surface & Router Architecture
* **Code Reference**: [`backend/app/main.py:L106-126`](file:///d:/AI-Disaster/backend/app/main.py), [`backend/app/api/`](file:///d:/AI-Disaster/backend/app/api)
* **Status**: **REAL ARCHITECTURE / MOSTLY MOCKED RESPONSES**
* **Technical Reality**:
  * There are **21 Python router files** in `app/api/`.
  * **19 routers** are mounted in `main.py` under the `/api/v1` prefix (`chat.py` and `impact.py` are unmounted).
  * Across all routers, there are **144 distinct endpoint paths**.
  * While the routing structure is comprehensive, most endpoints return predefined seed structures or synthetic in-memory payloads rather than querying live operational sensors.

---

### 2.4 IoT River Gauges & Physical Environmental Telemetry
* **Code Reference**: Global Backend Codebase
* **Status**: **NON-EXISTENT (Claim in previous docs was false)**
* **Technical Reality**:
  * There are zero database models, endpoints, or background workers handling MQTT, CoAP, or HTTP sensor pushes from physical river gauges.
  * Any previous architectural diagrams claiming "IoT River Gauge Readings" as a live ingested data source were conceptual and not implemented in code.

---

### 2.5 External Satellite & Earth Observation Providers
* **Code Reference**: [`backend/app/services/satellite_providers.py:L44-55, L238-254`](file:///d:/AI-Disaster/backend/app/services/satellite_providers.py), [`backend/app/api/satellite.py:L147-151`](file:///d:/AI-Disaster/backend/app/api/satellite.py)
* **Status**: **PARTIAL (Planetary Computer STAC exists; NASA/Copernicus/USGS are Stubs)**
* **Technical Reality**:
  * `PlanetaryComputerProvider`: Real async HTTP search querying Microsoft Planetary Computer STAC catalog for Sentinel-2 L2A scenes.
  * `NASAProvider`, `CopernicusProvider`, `USGSProvider`: All inherit from `UnavailableProvider` (line 238), which returns `{"status": "UNAVAILABLE"}`.
  * Any endpoint attempting ingestion from NASA raises `NotImplementedError("NASA imagery ingestion is unavailable...")` (line 151).

---

### 2.6 Monitored Villages & Casualty Counts
* **Code Reference**: [`sentinelaid/src/pages/Dashboard/DashboardPage.tsx:L217-250`](file:///d:/AI-Disaster/sentinelaid/src/pages/Dashboard/DashboardPage.tsx), [`sentinelaid/src/data/regionalDisasterCorridors.ts:L162-175`](file:///d:/AI-Disaster/sentinelaid/src/data/regionalDisasterCorridors.ts)
* **Status**: **HARDCODED FRONTEND CONSTANTS**
* **Technical Reality**:
  * Settlement casualties (e.g., 72 at Rasuwagadhi, 48 at Timure, 64 at Trishuli Bazaar) are hardcoded JavaScript objects in the frontend repository.
  * The "Flood Drill Mode" vs "Normal Clear Mode" toggle does not query an external API or database; it is an in-memory client-side `.map()` filter that sets `depth` to `'0.0m'` and `stranded` to `0`.

---

### 2.7 Aerial Drone HUD & Video Streaming
* **Code Reference**: [`backend/app/api/drone.py:L211`](file:///d:/AI-Disaster/backend/app/api/drone.py), [`sentinelaid/src/pages/DroneRecon/DroneReconPage.tsx:L3581`](file:///d:/AI-Disaster/sentinelaid/src/pages/DroneRecon/DroneReconPage.tsx)
* **Status**: **MOCK / SIMULATED UI ANIMATION**
* **Technical Reality**:
  * The backend returns a static string: `"rtsp_stream_url": "rtsp://drone-stream.sentinelaid.internal/live/uav01"`.
  * The frontend HUD displays animated SVG crosshairs, telemetry readouts (`64.8m AGL`, `28.4 km/h`), and bounding boxes purely through React state and CSS timers.
  * There is no video decoding pipeline, no WebRTC media server, and no connection to physical drone autopilots (e.g., MAVLink).

### 2.8 Geographical Theater Naming & Template Residue ("Sector 4B")
* **Code Reference**: [`sentinelaid/src/pages/GISMap/GISMapPage.tsx:L392`](file:///d:/AI-Disaster/sentinelaid/src/pages/GISMap/GISMapPage.tsx), [`sentinelaid/src/data/regionalDisasterCorridors.ts:L427`](file:///d:/AI-Disaster/sentinelaid/src/data/regionalDisasterCorridors.ts), [`backend/app/seed.py:L142`](file:///d:/AI-Disaster/backend/app/seed.py)
* **Status**: **RESOLVED DISCREPANCY & CODEBASE PURGE**
* **Contradiction Identified**:
  * Previous audit documents claimed: *"The artificial template sector ('Sector 4B') was removed from operational views and replaced with authentic geographical theaters."*
  * Real-world screenshot audit of `/command/gis` proved this claim was false: "Sector 4B — South Delta" persisted as the default state string, which fed into the dynamic corridor generator and prefixed every single marker (`Sector 4B — South Delta Riverbed Lowlands`, `Sector 4B — South Delta Market Sector`, etc.).
  * In addition, the dynamic generator positioned 5 town markers within 0.0015° (~150m) of each other, causing all 120px HTML marker badges to collide into an unreadable black blob on Leaflet zoom 13.
* **Technical Remediation (Verified October 5, 2026)**:
  * Eradicated all 17 hardcoded occurrences of `Sector 4B` across frontend data files, page templates, and backend seed models, replacing them with authentic geographical theaters (`Trishuli Valley Nepal`, `Nuwakot Corridor`, `Rajam AP`).
  * Redistributed dynamic town coordinates across realistic geographical offsets (`0.015°` to `0.035°` / ~1.6km to 3.8km), expanding the minimum pairwise marker distance to >114 screen pixels to eliminate label collision.
  * Neutralized district center badge color from red (`#dc2626`) to dark navy (`#0f172a` with `#38bdf8` cyan border) and designated flood-affected towns with distinct violet markers (`rgba(88,28,135,0.92)` / `#c084fc`) to resolve legend color collisions.
  * Rebuilt top control bar with explicit flex truncation and bounds (`max-w-[480px]`, `shrink-0`) to eliminate basemap switcher clipping.

---

## 3. Truthful Feature Capability Matrix

| System Component | What It Actually Is | What It Is NOT |
| :--- | :--- | :--- |
| **Emergency Route Finder** | Calls public OpenStreetMap OSRM server for road polylines. | Does NOT query elevation models or perform spatial flood polygon clipping. |
| **Drone Recon HUD** | High-fidelity interactive UI simulation with FLIR/Optical color shaders. | Does NOT connect to live RTSP hardware or physical drones. |
| **AI Damage Detection** | Fixed demo JSON schema with hardcoded building IDs and coordinates. | Does NOT execute PyTorch or ONNX deep learning inference. |
| **Village Directory** | Authentic geographical coordinates and town names hardcoded in React. | Is NOT populated by a live relational database or IoT telemetry network. |
| **Satellite Imagery** | Microsoft Planetary Computer STAC catalog browser for Sentinel-2. | Does NOT ingest live NASA or Copernicus radar passes. |
| **Frontend Platform** | Complete, working React 19 single-page application with Leaflet GIS. | Is NOT a simple mockup; it is a fully compiled, routed web client. |
