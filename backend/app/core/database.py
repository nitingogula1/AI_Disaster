import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings
from app.core.logging import logger

Base = declarative_base()

def get_engine():
    db_url = settings.DATABASE_URL
    try:
        if db_url.startswith("mysql"):
            # Test MySQL connection with timeout
            engine = create_engine(
                db_url,
                pool_pre_ping=True,
                pool_recycle=3600,
                connect_args={"connect_timeout": 3}
            )
            # Try connecting
            with engine.connect() as conn:
                logger.info("Successfully connected to MySQL database: %s", db_url.split('@')[-1])
            return engine
        else:
            engine = create_engine(
                db_url,
                connect_args={"check_same_thread": False} if "sqlite" in db_url else {},
                echo=settings.SQL_ECHO
            )
            return engine
    except Exception as e:
        logger.warning(
            "Could not connect to MySQL (%s). Falling back to SQLite local database for instant zero-dependency execution.",
            str(e)
        )
        fallback_url = "sqlite:///./sentinelaid.db"
        engine = create_engine(fallback_url, connect_args={"check_same_thread": False})
        return engine

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes tables and performs lightweight migrations"""
    from sqlalchemy import text
    # Check if satellite_scenes needs migration to new schema
    try:
        with engine.connect() as conn:
            res = conn.execute(text("PRAGMA table_info(satellite_scenes)"))
            cols = [row[1] for row in res.fetchall()]
            if cols and "scene_id" not in cols:
                conn.execute(text("DROP TABLE IF EXISTS satellite_scenes"))
                conn.commit()
    except Exception:
        pass

    import app.models
    Base.metadata.create_all(bind=engine)
    # Check if operation_id column exists in disaster_events
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE disaster_events ADD COLUMN operation_id VARCHAR(64) DEFAULT 'CY-2025-05B'"))
            conn.commit()
    except Exception:
        # Column already exists or table freshly created
        pass

    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE operations ADD COLUMN target_bbox JSON"))
            conn.commit()
    except Exception:
        pass
    logger.info("Database tables verified/created successfully.")

