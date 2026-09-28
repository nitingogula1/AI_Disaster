from fastapi.testclient import TestClient
from app.main import app
client = TestClient(app)
def test_empty_recent_window_remains_empty():
    response = client.get("/api/v1/satellite/flood-scenes?operation_id=never-searched&hours=1")
    assert response.status_code == 200
    assert response.json()["data"] == []
def test_no_invented_events():
    assert client.get("/api/v1/satellite/flood-scenes/events").json()["data"] == []
def test_unanalyzed_scene_has_no_gis_polygons():
    assert client.get("/api/v1/gis/flood/nonexistent").status_code == 404
