# Module 05: GIS Mapping & Spatial Analytics Engine

## 1. Executive Summary & Code Architecture

The **GIS Mapping & Spatial Analytics Engine** ([`app/api/gis.py`](file:///d:/AI-Disaster/backend/app/api/gis.py)) handles spatial layer composition, Coordinate Reference System (CRS) reprojections, and GeoJSON vector exports for Leaflet interactive rendering.

The system translates spherical global GPS coordinates (WGS84) into metric Cartesian coordinates (UTM Zone 45N) for precise distance and area computations.

---

## 2. Coordinate Reference Systems (CRS)

```mermaid
graph LR
    A[Global GPS / STAC Input: EPSG:4326 WGS84] -->|On-the-fly PyProj Reprojection| B[EPSG:32645 UTM Zone 45N]
    B -->|Metric Distance & Area Calculations| C[PostGIS / Spatial Engine]
    C -->|Projected to Web Mercator| D[EPSG:3857 Leaflet Web Canvas]
```

### Supported CRS Transformations
1. **WGS 84 (EPSG:4326):** Standard latitude/longitude coordinates used by GPS, NASA EONET events, and GeoJSON schemas.
2. **Web Mercator (EPSG:3857):** Cylindrical tile projection used by Leaflet basemaps (CartoDB Dark Matter, OpenStreetMap).
3. **UTM Zone 45N (EPSG:32645):** Conformal map projection using Cartesian metric coordinates $(X, Y)$ in meters for the Bengal Delta region. Used to compute exact flood surface areas ($\text{km}^2$) and road blockage lengths ($m$).

---

## 3. Vector Layer Architecture

The GIS map organizes data into discrete vector layers served via `GET /api/v1/gis/layers`:

```json
{
  "success": true,
  "data": [
    {
      "id": "layer-flood",
      "name": "Flood Inundation Extent",
      "type": "POLYGON",
      "color": "#06b6d4",
      "opacity": 0.55,
      "feature_count": 14,
      "visible": true
    },
    {
      "id": "layer-damaged-buildings",
      "name": "Damaged Building Footprints",
      "type": "POINT",
      "color": "#ef4444",
      "opacity": 0.85,
      "feature_count": 1126,
      "visible": true
    },
    {
      "id": "layer-blocked-roads",
      "name": "Impassable Road Cuts",
      "type": "LINESTRING",
      "color": "#dc2626",
      "opacity": 1.0,
      "feature_count": 42,
      "visible": true
    }
  ]
}
```

---

## 4. Dual-Viewport Swipe Slider Component

For visual verification of AI detections, the frontend GIS canvas incorporates a hardware-accelerated **Swipe Comparison Slider**:

```
[ Pre-Disaster Sentinel-2 ]  |  [ Post-Disaster False-Color ]
      Natural Color          |       Flood Inundation
                             |
         Intact Grid         |      Submerged Farmland
       Visible Bridges       |       Washed Out Decks
                             ▲
                       [ SWIPE HANDLE ]
```

- **Synchronization:** Dragging or zooming either viewport immediately updates camera position across both views.
- **CSS Clip-Path:** Smooth split rendering using `clip-path: inset(0 0 0 ${sliderPos}%)`.

---

## 5. GeoJSON Export Endpoints

Field teams can export spatial vectors in standard GIS formats:

```http
GET /api/v1/gis/export?format=geojson&layer=all
```
Returns a unified `FeatureCollection` containing all inundated polygons, damaged building centroids, and severed transport corridors for ingestion into QGIS, ArcGIS, or handheld tactical receivers.
