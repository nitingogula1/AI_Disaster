# SentinelAid: Complete System & Audit Documentation

Welcome to the comprehensive documentation repository for the **SentinelAid Disaster Response Platform**. This folder contains detailed technical audits, architectural blueprints, operational user manuals, and API specifications.

---


> [!IMPORTANT]
> **Authoritative Capability Truth**: [00_REAL_VS_MOCK_CAPABILITY_AUDIT.md](./00_REAL_VS_MOCK_CAPABILITY_AUDIT.md) is the sole source of capability truth for this codebase. Any architectural diagrams, specs, or feature claims elsewhere in this documentation suite represent aspirational designs or simulation presets unless confirmed as verified in Document 00.

## Documentation Index

| Document | Title | Description |
| :---: | :--- | :--- |
| [**00**](./00_REAL_VS_MOCK_CAPABILITY_AUDIT.md) | **Real vs. Mock Capability Audit** | Code-verified breakdown of what is functionally real (OSRM, React UI, Leaflet) vs what is simulated/mock (AI detection, Drone RTSP, IoT). |
| [**01**](./01_SYSTEM_ARCHITECTURE_AND_TECH_STACK.md) | **Architecture & Tech Stack** | System diagrams, technology choices (React 19 + TypeScript + Leaflet + FastAPI), and data flow. |
| [**02**](./02_TACTICAL_DRONE_RECON_AND_FLIR_HUD.md) | **Drone Recon & FLIR HUD** | UAV fleet operations, FLIR Thermal IR heat vision, 4K Optical, and AI survivor bounding boxes. |
| [**03**](./03_EMERGENCY_ROUTING_AND_HAZARD_AVOIDANCE.md) | **Emergency Routing Engine** | OSRM road graph integration, elevation flood bypass heuristics, and turn-by-turn driving guidance. |
| [**04**](./04_DISASTER_COMMAND_DASHBOARD_AND_THEATERS.md) | **Dashboard & Active Theaters** | Situational awareness, monitored villages directory, risk tiers, and authentic geographic corridors. |
| [**05**](./05_AI_DAMAGE_DETECTION_AND_ASSESSMENT.md) | **AI Damage Detection** | Siamese UNet/ResNet deep learning models, structural collapse classification, and loss valuation. |
| [**06**](./06_RESCUE_TRIAGE_AND_FLEET_MANAGEMENT.md) | **Rescue Triage & Fleet Logistics** | Automated priority index calculation, stranded casualty census, boat and vehicle dispatch tracking. |
| [**07**](./07_GIS_SPATIAL_MAPPING_ENGINE.md) | **GIS Spatial Mapping Engine** | Map layer stack, elevation models, watershed polygons, district choropleths, and GeoJSON export. |
| [**08**](./08_OPERATIONAL_USER_MANUAL.md) | **Operational User Manual** | Step-by-step commander handbook: finding trapped people, inspecting with drones, routing rescue teams. |
| [**09**](./09_BACKEND_API_AND_DATABASE_REFERENCE.md) | **Backend API & Schema Reference** | 21 REST API routers, SQLAlchemy models, Pydantic schemas, and database seeding scripts. |

---

### System Quick Links
* **Frontend Application**: `http://localhost:5173` (Command Dashboard: `/command`)
* **Backend API & Swagger Docs**: `http://localhost:8000/docs`
