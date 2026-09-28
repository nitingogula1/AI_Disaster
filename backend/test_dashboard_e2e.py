import os
import sys
from fastapi.testclient import TestClient
from app.main import app

def test_full_dashboard_flow():
    client = TestClient(app)

    print("\n=======================================================")
    print("SENTINELAID DASHBOARD BACKEND INTEGRATION END-TO-END TEST")
    print("=======================================================")

    # 1. LOGIN
    print("\n1. Testing LOGIN...")
    login_res = client.post("/api/v1/auth/login", json={"email": "admin@sentinelaid.gov", "password": "password"})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    data = login_res.json()
    token = data.get("access_token") or data.get("data", {}).get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print("   [PASS] LOGIN SUCCESSFUL (JWT token acquired)")


    # 2. GET ACTIVE OPERATION
    print("\n2. Testing GET ACTIVE OPERATION...")
    op_res = client.get("/api/v1/operations/active", headers=headers)
    assert op_res.status_code == 200, f"Get active operation failed: {op_res.text}"
    active_op = op_res.json()["data"]
    print(f"   [PASS] ACTIVE OPERATION: {active_op['name']} (ID: {active_op['id']}, Severity: {active_op['severity']}, Status: {active_op['status']})")
    assert active_op["id"] == "CY-2025-05B"

    # Also test all operations list
    all_ops = client.get("/api/v1/operations", headers=headers)
    assert all_ops.status_code == 200
    print(f"   [PASS] TOTAL OPERATIONS LOADED: {len(all_ops.json()['data'])}")

    # 3. GET SYSTEM TELEMETRY & STATUS
    print("\n3. Testing SYSTEM & TELEMETRY STATUS...")
    tl_res = client.get("/api/v1/system/threat-level", headers=headers)
    assert tl_res.status_code == 200
    tl = tl_res.json()["data"]
    print(f"   [PASS] THREAT LEVEL: Level {tl['level']} ({tl['label']})")
    assert tl["level"] == 4

    sat_res = client.get("/api/v1/system/satellite-status", headers=headers)
    assert sat_res.status_code == 200
    print(f"   [PASS] SATELLITE STATUS: {sat_res.json()['data']['status']} ({sat_res.json()['data']['provider']})")

    telem_res = client.get("/api/v1/system/telemetry", headers=headers)
    assert telem_res.status_code == 200
    print(f"   [PASS] TELEMETRY PULSE: {telem_res.json()['data']['sync_percentage']}% synced, {telem_res.json()['data']['latency_ms']}ms latency")

    cloud_res = client.get("/api/v1/satellite/cloud-status", headers=headers)
    assert cloud_res.status_code == 200
    print(f"   [PASS] CLOUD COVERAGE: < {cloud_res.json()['data']['cloud_cover']}% ({cloud_res.json()['data']['quality']})")

    ai_res = client.get("/api/v1/ai/status", headers=headers)
    assert ai_res.status_code == 200
    print(f"   [PASS] AI MODEL: {ai_res.json()['data']['model_name']} ({ai_res.json()['data']['inference_engine']})")

    # 4. GET DASHBOARD SUMMARY & METRICS
    print("\n4. Testing GET DASHBOARD SUMMARY (Calculated from DB)...")
    summary_res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert summary_res.status_code == 200
    s = summary_res.json()["data"]
    print(f"   [PASS] Active Disasters: {s['active_disasters']} (Critical: {s['active_disasters_critical']}, Elevated: {s['active_disasters_elevated']})")
    print(f"   [PASS] Affected Regions: {s['affected_regions_km2']:,} km²")
    print(f"   [PASS] Damaged Buildings: {s['damaged_buildings']} (Confidence: {s['damaged_buildings_ai_confidence']}%)")
    print(f"   [PASS] Blocked Road Segments: {s['blocked_road_segments']} ({s['blocked_network_km']} km)")
    print(f"   [PASS] Flooded Area: {s['flooded_area_km2']} km²")
    print(f"   [PASS] Priority Rescue Zones: {s['priority_rescue_zones']} ({s['civilians_at_direct_risk']:,} civilians at risk)")

    metrics_res = client.get("/api/v1/dashboard/metrics", headers=headers)
    assert metrics_res.status_code == 200
    m = metrics_res.json()["data"]
    print(f"   [PASS] KPI CARDS: {m['activeDisasters']['value']} | {m['affectedRegions']['value']} | {m['damagedBuildings']['value']} | {m['blockedRoads']['value']} | {m['floodedArea']['value']} | {m['priorityRescue']['value']}")

    # 5. GET ALERTS
    print("\n5. Testing GET ALERTS & FILTERING...")
    alerts_res = client.get("/api/v1/alerts", headers=headers)
    assert alerts_res.status_code == 200
    alerts_data = alerts_res.json().get("data", [])
    unread = alerts_res.json().get("unread_count", len(alerts_data))
    print(f"   [PASS] ALERTS LOADED: {len(alerts_data)} alerts ({unread} unread)")
    assert len(alerts_data) >= 4

    # 6. GET GIS LAYERS
    print("\n6. Testing GET GIS LAYERS...")
    gis_res = client.get("/api/v1/gis/operations/CY-2025-05B/layers", headers=headers)
    assert gis_res.status_code == 200
    layers = gis_res.json()
    print(f"   [PASS] GIS LAYERS LOADED: Flood features: {len(layers['flood_extent']['features'])}, Buildings: {len(layers['damage_buildings']['features'])}, Roads: {len(layers['blocked_roads']['features'])}, Teams: {len(layers['rescue_teams']['features'])}")

    flood_layer = client.get("/api/v1/gis/layers/flood", headers=headers)
    assert flood_layer.status_code == 200
    print("   [PASS] INDIVIDUAL LAYER GET /gis/layers/flood: OK")

    # 7. GET DAMAGE SUMMARY
    print("\n7. Testing GET DAMAGE SUMMARY...")
    dmg_res = client.get("/api/v1/damage/summary/CY-2025-05B", headers=headers)
    assert dmg_res.status_code == 200
    dmg = dmg_res.json()["data"]
    print(f"   [PASS] Total Assets: {dmg['total_assets']}, Impact Ratio: {dmg['aggregated_impact_ratio']}%")
    for cat in dmg["categories"]:
        print(f"     - {cat['category']}: {cat['count']} {cat['unit']} ({cat['confidence']}% Conf)")
    assert dmg["total_assets"] == 1056
    assert len(dmg["categories"]) == 4

    # 8. GET ACTIVE DISASTERS REGISTRY
    print("\n8. Testing GET ACTIVE DISASTERS...")
    dis_res = client.get("/api/v1/disasters/active?page=1&limit=10", headers=headers)
    assert dis_res.status_code == 200
    disasters = dis_res.json()["data"]
    print(f"   [PASS] ACTIVE DISASTERS MONITORED: {len(disasters)}")
    for d in disasters[:3]:
        print(f"     - {d['name']} ({d['type']}) | {d['affectedArea']} km² | {d['severity']} | {d['status']}")
    assert len(disasters) >= 3

    # 9. ACKNOWLEDGE & ASSIGN ALERT
    print("\n9. Testing ALERT ACTIONS...")
    target_alert_id = alerts_data[0]["id"]
    ack_res = client.post(f"/api/v1/alerts/{target_alert_id}/acknowledge", headers=headers)
    assert ack_res.status_code == 200
    print(f"   [PASS] Alert {target_alert_id} acknowledged")

    assign_res = client.post(f"/api/v1/alerts/{target_alert_id}/assign", json={"team_id": "RT-02"}, headers=headers)
    assert assign_res.status_code == 200
    print(f"   [PASS] Assigned unit to alert {target_alert_id}")

    # 10. TACTICAL COMMAND
    print("\n10. Testing TACTICAL COMMAND INPUT...")
    cmd_res = client.post("/api/v1/commands", json={
        "operation_id": "CY-2025-05B",
        "command": "Dispatch rescue team RT-02 to Sector 7"
    }, headers=headers)
    assert cmd_res.status_code == 200
    print(f"   [PASS] Command accepted: {cmd_res.json()['data']['command_type']} (Status: {cmd_res.json()['data']['status']})")

    # 11. BROADCAST SITREP
    print("\n11. Testing BROADCAST SITREP...")
    sitrep_res = client.post("/api/v1/reports/sitrep/broadcast", headers=headers)
    assert sitrep_res.status_code == 200
    assert sitrep_res.json()["data"]["broadcast_status"] == "GENERATED"
    print(f"   [PASS] SITREP BROADCAST: {sitrep_res.json()['data']['title']} (Status: {sitrep_res.json()['data']['broadcast_status']})")

    # 12. EXPORT GEOJSON & CAD
    print("\n12. Testing EXPORT GEOJSON & CAD...")
    geojson_res = client.get("/api/v1/export/operation/CY-2025-05B/geojson", headers=headers)
    assert geojson_res.status_code == 200
    gj = geojson_res.json()
    assert gj["type"] == "FeatureCollection"
    print(f"   [PASS] GeoJSON Export valid FeatureCollection with {len(gj['features'])} features")

    cad_res = client.get("/api/v1/export/operation/CY-2025-05B/cad", headers=headers)
    assert cad_res.status_code in [200, 501]
    print(f"   [PASS] CAD Export response code {cad_res.status_code} (Truthful CAD unavailable handler)")

    # 13. EXPORT AI MASK
    print("\n13. Testing EXPORT AI MASK...")
    mask_res = client.get("/api/v1/ai/export/CY-2025-05B/mask", headers=headers)
    assert mask_res.status_code in [200, 404]
    print(f"   [PASS] AI Mask GeoTIFF endpoint response: {mask_res.status_code} (Truthful raster checking, no fake tiff)")

    # 14. REAL-TIME UPDATES / POLLING
    print("\n14. Testing REAL-TIME UPDATES POLLING...")
    up_res = client.get("/api/v1/dashboard/updates", headers=headers)
    assert up_res.status_code == 200
    print(f"   [PASS] Dashboard updates poll: timestamp {up_res.json()['data']['timestamp']}, unread: {up_res.json()['data']['unread_alerts']}")


    print("\n=======================================================")
    print("ALL 14 CORE END-TO-END FLOW TESTS PASSED SUCCESSFULLY!")
    print("=======================================================\n")

if __name__ == "__main__":
    test_full_dashboard_flow()
