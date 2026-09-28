import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings
from app.core.logging import logger

Base = declarative_base()

def get_engine():
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite:///") and not db_url.endswith(":memory:"):
        from pathlib import Path
        from sqlalchemy.engine import make_url
        parsed = make_url(db_url)
        database_path = Path(parsed.database)
        if not database_path.is_absolute():
            parsed = parsed.set(database=str(Path(__file__).resolve().parents[2] / database_path))
            db_url = parsed
    try:
        if str(db_url).startswith("mysql"):
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
                connect_args={"check_same_thread": False} if "sqlite" in str(db_url) else {},
                echo=settings.SQL_ECHO
            )
            return engine
    except Exception as e:
        logger.warning(
            "Could not connect to MySQL (%s). Falling back to SQLite local database for instant zero-dependency execution.",
            str(e)
        )
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        default_db = os.path.join(backend_dir, "sentinelaid.db").replace(os.sep, "/")
        fallback_url = f"sqlite:///{default_db}"
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
    import app.models
    from app.core.migrations import migrate
    with engine.begin() as connection:
        migrate(connection, Base.metadata)
    logger.info("Database schema verified without deleting records.")
