# Backend API & Database Schema Reference

## 1. API Architecture
The backend is built on FastAPI and exposes 21 modular REST routers under `/api/v1`:

### 1.1 Core Endpoint Catalog
* `/api/v1/auth`: User authentication, JWT issuance, and RBAC validation.
* `/api/v1/dashboard`: KPI metrics, cloud cover statistics, and operational theater metadata.
* `/api/v1/disasters`: Multi-hazard incident registry and active theater management.
* `/api/v1/routes`: Road routing requests, OSRM proxy, and hazard avoidance calculations.
* `/api/v1/drone`: Fleet telemetry, flight coordinates, battery status, synthetic exercise HUD preview (Note: Physical drone hardware RTSP video streaming is Disconnected / Simulation Preview).
* `/api/v1/ai-detection`: Model inference triggers, damage classification results, and confidence scores.
* `/api/v1/gis`: GeoJSON layer exports, district choropleth geometries, and watershed polygons.
* `/api/v1/rescue`: Rescue team rosters, unit dispatch commands, and triage priority lists.
* `/api/v1/alerts`: Disaster warnings and scenario drill notifications (Note: Physical IoT river gauge hardware ingestion is ROADMAP — Not Implemented).

---

## 2. Database Models (SQLAlchemy ORM)
1. `User`: Account credentials, roles (`ADMIN`, `DISASTER_OFFICER`, `GIS_ANALYST`, `RESCUE_TEAM`).
2. `DisasterEvent`: Incident classification, geographic centroid, bounding box, severity tier.
3. `Drone`: UAV callsign, model, battery level, current GPS position, sensor payload.
4. `RescueTeam`: Unit name, organization (NDRF, APF, Red Cross), vehicle type, assigned sector.
5. `Route`: Waypoints, elevation profile, flood hazard intersections, safety score.
6. `DamageRecord`: Building footprint, damage grade (Destroyed, Major, Minor, Intact).
7. `Alert`: Alert source (Disaster / Scenario Drill; physical IoT river gauge hardware: ROADMAP — Not Implemented), severity level, message payload, acknowledgment status.
8. `SatellitePass`: Sentinel-1 SAR / Sentinel-2 optical metadata, cloud cover percentage, STAC link.
