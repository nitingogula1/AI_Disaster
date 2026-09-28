"""All automated tests use a separate database and output directory."""
import os
import uuid
from pathlib import Path
TEST_ROOT = Path(__file__).resolve().parents[1] / ".test-runs" / uuid.uuid4().hex
TEST_ROOT.mkdir(parents=True)
os.environ["SENTINELAID_DEBUG"] = "false"
os.environ["DATABASE_URL"] = "sqlite:///" + (TEST_ROOT / "tests.db").as_posix()
os.environ["REPORT_DIR"] = str(TEST_ROOT / "reports")
os.environ["UPLOAD_DIR"] = str(TEST_ROOT / "uploads")
import pytest
from app.core.database import init_db, SessionLocal
init_db()
from app.services.raster_engine import raster_engine
for name in ("raw", "processed", "previews", "masks", "vectors"):
    path = TEST_ROOT / name
    path.mkdir()
    setattr(raster_engine, name + "_dir", str(path))
raster_engine.base_dir = str(TEST_ROOT)

@pytest.fixture(scope="session", autouse=True)
def seed_legacy_test_data():
    from app.seed import seed_database
    seed_database()
    yield

@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session
