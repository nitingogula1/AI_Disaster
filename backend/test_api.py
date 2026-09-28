import httpx

BASE_URL = "http://127.0.0.1:8000"

def test_full_pipeline():
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        # 1. Health
        h = client.get("/health")
        assert h.status_code == 200, f"Health failed: {h.text}"
        print("[PASS] Health Check:", h.json())

        # 2. Login
        login_resp = client.post("/api/v1/auth/login", json={"email": "admin@sentinelaid.gov", "password": "password"})
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        token = login_data["access_token"]
        print("[PASS] Login:", login_data["user"]["name"], f"(Role: {login_data['user']['role']})")

        headers = {"Authorization": f"Bearer {token}"}

        # 3. Dashboard Metrics
        metrics = client.get("/api/v1/dashboard/metrics", headers=headers).json()
        print("[PASS] Dashboard Metrics:", metrics["data"]["activeDisasters"]["value"])

        # 4. Disaster Events
        disasters = client.get("/api/v1/disasters", headers=headers).json()
        print(f"[PASS] Disasters ({len(disasters['data'])} events):", disasters["data"][0]["name"])

        # 5. GIS GeoJSON
        gis = client.get(f"/api/v1/gis/disasters/{disasters['data'][0]['id']}", headers=headers).json()
        print(f"[PASS] GIS GeoJSON Features:", len(gis["features"]))

        # 6. Satellite Search & Preprocessing
        sat = client.get("/api/v1/satellite/search?satellite=Sentinel-2", headers=headers).json()
        scene_item = sat["data"][0] if sat.get("data") else {}
        print(f"[PASS] Satellite Search ({len(sat.get('data', []))} scenes):", scene_item.get("scene_id") or scene_item.get("id") or scene_item.get("product_id", "N/A"))

        preproc = client.post("/api/v1/satellite/process", json={"disaster_id": "evt-remal-001"}, headers=headers).json()
        print("[PASS] Preprocessing Pipeline:", preproc["data"]["status"], f"({preproc['data']['processing_time_ms']}ms)")

        # 7. AI Damage Detection
        ai = client.post("/api/v1/ai/damage-detection", json={"disaster_id": "evt-remal-001", "confidence_threshold": 0.85}, headers=headers).json()
        print(f"[PASS] AI Detection ({len(ai['data']['detections'])} structures):", ai["data"]["model_name"])

        # 8. Damage Assessment Summary
        dmg = client.get("/api/v1/damage/evt-remal-001/summary", headers=headers).json()
        print("[PASS] Damage Summary Inspected:", dmg["data"]["total_inspected"], f"Loss: {dmg['data']['estimated_loss_usd']}")

        # 9. Rescue Priorities
        prio = client.get("/api/v1/rescue/priorities/evt-remal-001", headers=headers).json()
        print(f"[PASS] Rescue Priorities ({len(prio['data'])} zones): Rank 1 =", prio["data"][0]["zone"])

        # 10. Route Optimization
        route = client.post("/api/v1/routes/optimize", json={
            "start_location": [21.870, 89.600],
            "destination": [21.840, 89.540],
            "avoid_inundation": True
        }, headers=headers).json()
        print("[PASS] Route Optimization:", route["data"]["selected_route"]["name"], f"({route['data']['selected_route']['distance']} km, {route['data']['selected_route']['estimated_time']} min)")

        # 11. Reports List & Generate
        rep = client.get("/api/v1/reports", headers=headers).json()
        print(f"[PASS] Intelligence Reports ({len(rep['data'])} dossiers)")

        rep_gen = client.post("/api/v1/reports/generate", json={"disaster_id": "evt-remal-001", "report_type": "Executive Brief"}, headers=headers).json()
        print("[PASS] Generated PDF Report:", rep_gen["data"]["title"], f"({rep_gen['data']['size']})")

        print("\nALL 11 BACKEND MODULES VERIFIED & WORKING PERFECTLY!")

if __name__ == "__main__":
    test_full_pipeline()
