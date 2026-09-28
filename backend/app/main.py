import time
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.core.database import init_db, engine
from app.api import (
    auth, users, dashboard, disasters, incidents,
    gis, satellite, ai_detection, damage, rescue,
    routes, alerts, reports, operations, commands,
    system, export
)

setup_logging()

app = FastAPI(
    title="SentinelAid AI — Disaster Response Intelligence API",
    description="Synchronized rapid satellite ingestion, deep-learning damage detection, life-safety triage prioritization, and tactical route optimization engine.",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
    return response

# Global Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail
            }
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": exc.errors()
            }
        }
    )

# Health & System Status Endpoints
@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_PREFIX}/health", tags=["Health"])
def health_check():
    db_status = "connected"
    try:
        with engine.connect() as conn:
            pass
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "database": db_status,
        "version": settings.VERSION,
        "environment": settings.APP_ENV
    }

@app.get(f"{settings.API_V1_PREFIX}/system/status", tags=["Health"])
def system_status():
    return {
        "success": True,
        "data": {
            "database": "ONLINE",
            "ai_engine": "ONLINE",
            "satellite_pipeline": "SYNCED",
            "gis_engine": "ONLINE",
            "routing_engine": "OPERATIONAL",
            "telemetry_stream": "ACTIVE",
            "stac_api": "LIVE"
        }
    }

# Register API v1 Routers
api_v1 = settings.API_V1_PREFIX
app.include_router(auth.router, prefix=api_v1)
app.include_router(users.router, prefix=api_v1)
app.include_router(dashboard.router, prefix=api_v1)
app.include_router(disasters.router, prefix=api_v1)
app.include_router(incidents.router, prefix=api_v1)
app.include_router(gis.router, prefix=api_v1)
app.include_router(satellite.router, prefix=api_v1)
app.include_router(ai_detection.router, prefix=api_v1)
app.include_router(damage.router, prefix=api_v1)
app.include_router(rescue.router, prefix=api_v1)
app.include_router(routes.router, prefix=api_v1)
app.include_router(alerts.router, prefix=api_v1)
app.include_router(reports.router, prefix=api_v1)
app.include_router(operations.router, prefix=api_v1)
app.include_router(commands.router, prefix=api_v1)
app.include_router(system.router, prefix=api_v1)
app.include_router(export.router, prefix=api_v1)

@app.get("/api/satellite/test-planetary-computer", tags=["Satellite"])
async def test_planetary_computer_direct():
    from app.api.satellite import test_planetary_computer
    return await test_planetary_computer()

@app.on_event("startup")
def on_startup():
    logger.info("Initializing SentinelAid AI backend services...")
    init_db()
