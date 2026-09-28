# Module 07: Backend REST API Reference & Schema Catalog

## 1. Executive Summary & Framework Specs

SentinelAid AI's backend is powered by **FastAPI (Python 3.11+)** with asynchronous route handlers, **Pydantic v2** validation, and **SQLAlchemy 2.0 ORM** database models.

- **Base URL:** `http://127.0.0.1:8000/api/v1`
- **OpenAPI Interactive Documentation (Swagger UI):** `http://127.0.0.1:8000/docs`
- **ReDoc Technical Schema:** `http://127.0.0.1:8000/redoc`
- **Health Check Endpoints:** `http://127.0.0.1:8000/health` and `http://127.0.0.1:8000/api/v1/health`

---

## 2. API Endpoint Catalog

```
├── /health                               [GET]    System health & DB connectivity
├── /auth
│   ├── /login                           [POST]   OAuth2 password bearer token
│   ├── /register                        [POST]   Register new user profile
│   └── /me                              [GET]    Fetch current authenticated user
├── /satellite
│   ├── /aoi                             [POST]   Set target Area of Interest (AOI)
│   ├── /aoi                             [GET]    Fetch active operation AOI
│   ├── /providers/nasa/connect          [POST]   Validate & connect NASA API key
│   ├── /providers/nasa/events           [GET]    Fetch live NASA EONET disaster events
│   ├── /scenes                          [GET]    List ingested satellite scenes
│   ├── /scenes/{id}/assign-role         [POST]   Assign PRE_DISASTER or POST_DISASTER role
│   └── /scenes/{id}/image               [GET]    Stream rendered PNG (RGB, false_color, ndwi, mndwi)
├── /ai
│   ├── /status                          [GET]    Query AI model & engine status
│   └── /damage-detection                [POST]   Run damage detection analysis
├── /dashboard
│   ├── /summary                         [GET]    Fetch calculated KPI summary data
│   └── /metrics                         [GET]    Fetch KPI metric cards formatting
├── /alerts
│   ├── /                                [GET]    List active incident alerts
│   ├── /                                [POST]   Publish new alert notification
│   └── /{id}/read                       [PATCH]  Mark alert as read
├── /routes
│   ├── /optimize                        [POST]   Compute dynamic hazard-free route
│   └── /                                [GET]    Fetch default routing paths
└── /places
    ├── /presets                         [GET]    List 8 global disaster presets
    └── /custom                          [POST]   Validate & set custom GPS coordinates
```

---

## 3. Core API Endpoint Definitions

### 3.1 System Health Check

```http
GET /health
```
```json
{
  "status": "healthy",
  "database": "connected",
  "version": "1.4.2",
  "environment": "development"
}
```

---

### 3.2 Authentication & User Login

```http
POST /api/v1/auth/login
Content-Type: application/json
```
```json
{
  "email": "admin@sentinelaid.gov",
  "password": "YOUR_SECURE_PASSWORD"
}
```
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "usr-admin-01",
    "email": "admin@sentinelaid.gov",
    "name": "Cmdr. Sarah Jenkins",
    "role": "ADMIN"
  }
}
```

---

### 3.3 Target Area of Interest (AOI) Configuration

```http
POST /api/v1/satellite/aoi
Content-Type: application/json
```
```json
{
  "operation_id": "EVT-8821-BGD",
  "bbox": [89.310, 21.540, 90.040, 22.120],
  "region": "Delta Sector 4",
  "incident_name": "Cyclone Remal Inundation"
}
```

---

### 3.4 Stream Rendered Raster Preview PNG

```http
GET /api/v1/satellite/scenes/{id}/image?type=false_color
```
- **Query Parameter `type`:** `rgb`, `false_color`, `ndwi`, `mndwi`
- **Response:** `image/png` visual preview file stream.

---

### 3.5 Dynamic Route Optimization

```http
POST /api/v1/routes/optimize
Content-Type: application/json
```
```json
{
  "start_location": [22.3569, 91.7832],
  "destination": [22.3125, 91.8241],
  "avoid_inundation": true
}
```

---

## 4. Standard Error Envelopes & HTTP Status Codes

SentinelAid API uses standard HTTP response codes and RFC-7807 structured JSON error payloads:

```json
{
  "success": false,
  "error": {
    "code": "HTTP_404",
    "message": "Satellite scene 'scn-999' not found in database or local cache."
  }
}
```

| HTTP Code | Usage Scenario |
|---|---|
| **200 OK** | Successful API execution. |
| **201 Created** | Record created in database. |
| **400 Bad Request** | Invalid BBOX coordinates or malformed payload. |
| **401 Unauthorized** | Missing or invalid JWT bearer token. |
| **404 Not Found** | Scene, alert, or route resource does not exist. |
| **422 Unprocessable** | Request schema validation error. |
