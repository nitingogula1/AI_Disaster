# GIS Spatial Engine & Multi-Layer Mapping Architecture

## 1. Map Layer Stack
The GIS Disaster Map (`/command/gis`) renders multi-spectral, elevation, and vector layers:

1. **Basemap Providers**:
   * High-Resolution Satellite Orthophoto (Esri World Imagery).
   * Dark-Mode Tactical Vector Map (CartoDB Dark Matter).
   * Thermal Elevation Contour Shading.
2. **Dynamic Disaster Layers**:
   * **District Choropleth Polygons**: Outlines regional administrative borders color-coded by alert status.
   * **Inundated River Basins**: Organic blue flood polygons depicting the exact water surge area.
   * **Safe Ground Relief Havens**: Green polygons representing high-ground sanctuaries.
   * **OpenStreetMap Highway Mesh**: Real road corridors color-coded by passability.

---

## 2. GeoJSON Export Capabilities
Incident commanders can export the complete active geospatial picture:
* Single-click **"Export (GeoJSON)"** produces standard `FeatureCollection` files containing:
  * Flooded polygon coordinates.
  * Monitored village point features with casualty attributes.
  * Calculated safe road geometries for use in external QGIS, ArcGIS, or defense field devices.
