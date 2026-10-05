# Hazard-Aware Emergency Routing & Rescue Navigation

## 1. Problem Statement
During severe monsoon disasters, standard navigation tools (like generic consumer GPS apps) direct emergency vehicles through the shortest path—often steering ambulances directly into submerged highways, washed-out bridges, or landslides.

SentinelAid implements a **Hazard-Aware Elevation Routing Engine** that guarantees rescue teams are routed only across certified high-ground corridors.

---

## 2. Routing Algorithm Architecture

```
  [Start Base Camp]                                  [Disaster Destination]
         │                                                     ▲
         ▼                                                     │
   [OSRM Road Graph] ──► [Elevation & Water Depth Matrix] ────┘
                                   │
              Is Road Elevation < Flood Depth + Safety Margin?
                                   │
                    ┌──────────────┴──────────────┐
                    │ YES                         │ NO
                    ▼                             ▼
             [TAG AS CUTOFF]               [TAG AS SAFE CORRIDOR]
         (Calculate High-Ground Detour)      (Render Emerald Path)
```

### 2.1 Key Routing Components
1. **OpenStreetMap OSRM Driving Engine**:
   * Queries real paved and unpaved mountain highways (e.g., Pasang Lhamu Highway NH-21 in Nepal).
   * Generates exact polyline geometry and turn-by-turn driving steps.
2. **Hazard Elevation Masking**:
   * Any road segment intersecting a known flood inundation zone ($>0.4	ext{m}$ water depth) or verified bridge collapse is tagged as **IMPASSABLE**.
   * The routing graph dynamically applies penalty costs to flooded links, forcing the route finder along higher bedrock ridges.

---

## 3. Dual-Line Visual Display

| Visual Indicator | Polyline Style | Operational Meaning |
| :--- | :--- | :--- |
| **Safe Route** | **Solid Emerald Green (Glow)** | Verified high-ground route. Safe for ambulances and 4x4 relief trucks. |
| **Hazard Direct Route** | **Dashed Red / Amber** | Normal direct road currently underwater or blocked by debris. Bypassed by system. |
| **Hazard Marker** | **Orange Warning Icon** | Exact blockage point (e.g. *Betrawati Bridge East Approach Washed Out*). |

---

## 4. Instant Search & 1-Click Dashboard Integration
* **Search Bar**: Dual-engine geocoding supporting local landmarks (hospitals, army depots, mountain villages) with live autocompletion and endpoint swap (⇅).
* **1-Click Route from Dashboard**: Clicking **"↗ Route"** in the Affected Villages Directory automatically launches `/command/routes?dest=...&lat=...&lng=...` with full turn-by-turn guidance pre-computed.
