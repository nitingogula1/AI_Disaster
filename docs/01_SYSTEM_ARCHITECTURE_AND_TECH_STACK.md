# System Architecture & Technical Specifications: SentinelAid

## 1. System Overview
SentinelAid is designed as a distributed, high-availability Disaster Information & Command System (DICS). The system aggregates earth observation data, real-time drone telemetry, and simulated disaster scenarios to deliver actionable situational awareness for emergency coordinators.

```
                    ┌──────────────────────────────────────────────┐
                    │            DATA ACQUISITION LAYER            │
                    │  Copernicus Sentinel-1/2 SAR | UAV Telemetry │
                    │  OpenStreetMap (OSRM) | Open-Meteo Radars    │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │               BACKEND SERVICES               │
                    │   FastAPI (Python 3.11) | SQLAlchemy ORM     │
                    │   FastAPI REST Routers | Demo Models  │
                    │   SQLite / PostgreSQL Database Engine        │
                    └──────────────────────┬───────────────────────┘
                                           │  REST / GeoJSON / WebSocket
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │              FRONTEND WEB APP                │
                    │   React 19 + TypeScript + Vite               │
                    │   Leaflet & React-Leaflet GIS Interactive Map│
                    │   Lucide Icons | Tailwind CSS Design System  │
                    └──────────────────────────────────────────────┘
```

---

## 2. Technology Stack Details

### 2.1 Frontend Framework & Tooling
* **Core Library**: React 19 (Functional components, hooks, React Router v7).
* **Language**: TypeScript 5.8 (Strict typing mode enabled).
* **Build System**: Vite 6 / Rollup with manual chunk splitting.
* **GIS Mapping Engine**: Leaflet 1.9 & `react-leaflet` 5.0 with custom Canvas/SVG tile layers.
* **Iconography & Design Tokens**: `lucide-react`, custom CSS custom properties, and responsive layout primitives.
* **State Management**: Zustand / Custom reactive stores (`authStore`, `appStore`).

### 2.2 Backend Framework & Storage
* **API Framework**: FastAPI (Asynchronous Python 3.11 ASGI framework).
* **Data Validation**: Pydantic v2 schemas.
* **Database & ORM**: SQLAlchemy 2.0 with SQLite / PostgreSQL support.
* **Routing Engine**: Project OSRM public graph API for road geometry; hazard/elevation costs are arithmetic heuristic formulas.
* **Machine Learning Runtime**: DemoModel (returns fixed JSON predictions; no active PyTorch weights loaded).

---

## 3. Directory & File Organization
```
AI-Disaster/
├── backend/
│   ├── app/
│   │   ├── api/             # 21 modular FastAPI router endpoints
│   │   ├── core/            # Config, security, database connectors
│   │   ├── models/          # 12 SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic request/response models
│   │   ├── services/        # Routing, drone, satellite, AI inference
│   │   └── seed.py          # Database seeder with tactical theaters
│   └── run.py               # Uvicorn ASGI server entrypoint
├── sentinelaid/
│   ├── src/
│   │   ├── components/      # Layout, Sidebar, Header, Modals
│   │   ├── data/            # Tactical scenarios, regional corridors
│   │   ├── pages/           # 18 Page views (Dashboard, Routing, Recon, etc.)
│   │   ├── store/           # Zustand stores for auth and app state
│   │   └── App.tsx          # Root routing and alias redirects
│   ├── package.json
│   └── vite.config.ts
└── docs/                    # Complete End-to-End System Documentation
```
