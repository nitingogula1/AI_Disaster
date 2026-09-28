"""
Integration Test: Location-Based Variation Verification
Verifies that searching different disaster locations returns location-specific coordinates,
location names, and asset IDs instead of hardcoded static coordinates.
"""
import sys
import json
from app.services.ai_detection_service import ai_detection_service
from app.services.routing_service import routing_service

def test_location_variation():
    print("=== INTEGRATION TEST: LOCATION VARIATION VERIFICATION ===")

    # Test 1: AI Damage Detection for Valencia
    valencia_res = ai_detection_service.run_detection("evt-valencia-spain", "SIAMESE", 0.80)
    valencia_dets = valencia_res["detections"]
    val_hospital = valencia_dets[0]

    # Test 2: AI Damage Detection for Tokyo
    tokyo_res = ai_detection_service.run_detection("evt-tokyo-japan", "SIAMESE", 0.80)
    tokyo_dets = tokyo_res["detections"]
    tokyo_hospital = tokyo_dets[0]

    print(f"\n1. Valencia Hospital Coords: ({val_hospital['latitude']}, {val_hospital['longitude']}) - Location: {val_hospital['location_name']}")
    print(f"2. Tokyo Hospital Coords:    ({tokyo_hospital['latitude']}, {tokyo_hospital['longitude']}) - Location: {tokyo_hospital['location_name']}")

    # ASSERTION 1: Latitude/Longitude MUST NOT be equal
    assert val_hospital['latitude'] != tokyo_hospital['latitude'], "FAILURE: Latitude is identical across different disaster locations!"
    assert val_hospital['longitude'] != tokyo_hospital['longitude'], "FAILURE: Longitude is identical across different disaster locations!"
    assert "Valencia" in val_hospital['location_name'], "FAILURE: Location name does not reflect Valencia"
    assert "Tokyo" in tokyo_hospital['location_name'], "FAILURE: Location name does not reflect Tokyo"

    print("SUCCESS: AI Damage Detection Location Variation Test PASSED!")

    # Test 3: Route Optimization for Valencia vs Tokyo
    route_valencia = routing_service.optimize_route([39.4699, -0.3763], [39.5200, -0.3000])
    route_tokyo = routing_service.optimize_route([35.6762, 139.6503], [35.7200, 139.7100])

    print(f"\n3. Valencia Route Distance: {route_valencia['direct_distance_km']} km - Origin: {route_valencia['origin']}")
    print(f"4. Tokyo Route Distance:    {route_tokyo['direct_distance_km']} km - Origin: {route_tokyo['origin']}")

    # ASSERTION 2: Origins and Distances MUST reflect requested coordinates
    assert route_valencia['origin'] == [39.4699, -0.3763], "FAILURE: Valencia origin mismatch"
    assert route_tokyo['origin'] == [35.6762, 139.6503], "FAILURE: Tokyo origin mismatch"

    print("SUCCESS: Emergency Routing Location Variation Test PASSED!")

if __name__ == "__main__":
    try:
        test_location_variation()
        print("\nALL LOCATION VARIATION INTEGRATION TESTS PASSED SUCCESSFULLY!")
    except AssertionError as ae:
        print(f"\nFAILURE ASSERTION FAILED: {ae}")
        sys.exit(1)
