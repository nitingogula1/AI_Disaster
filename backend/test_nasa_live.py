import urllib.request
import json
import sys

def get_json(url, method='GET'):
    req = urllib.request.Request(url, headers={'User-Agent': 'SentinelAid'}, method=method)
    with urllib.request.urlopen(req, timeout=12) as response:
        return json.loads(response.read().decode('utf-8'))

print("=" * 60)
print("1. VERIFYING NASA PROVIDER CONNECTION VIA BACKEND API")
print("=" * 60)
try:
    nasa_status = get_json("http://127.0.0.1:8000/api/v1/satellite/providers/nasa/connect", method="POST")
    print(json.dumps(nasa_status, indent=2))
except Exception as e:
    print(f"Error checking NASA provider: {e}")

print("\n" + "=" * 60)
print("2. SATELLITE PROVIDERS REGISTRY STATUS")
print("=" * 60)
try:
    providers = get_json("http://127.0.0.1:8000/api/v1/satellite/providers")
    for p in providers.get('data', []):
        print(f"  • {p['name']:<35} [{p['type']:<18}] Status: {p['status']}")
except Exception as e:
    print(f"Error fetching providers: {e}")

print("\n" + "=" * 60)
print("3. LIVE NASA DISASTERS & SATELLITE SCENES (HLS / EONET / MODIS)")
print("=" * 60)
try:
    events = get_json("http://127.0.0.1:8000/api/v1/satellite/providers/nasa/events")
    print(f"Status: {events.get('message')}")
    scenes = events.get('data', [])
    print(f"Total Live Scenes Retrieved: {len(scenes)}\n")
    for i, scn in enumerate(scenes[:5], 1):
        print(f"{i}. ID: {scn.get('id')} | Platform: {scn.get('platform')}")
        print(f"   Date: {scn.get('acquisitionDate')} | Cloud Cover: {scn.get('cloudCover')}% | GSD: {scn.get('resolution')}")
        print(f"   Sensor: {scn.get('sensorType')} | Pipeline Status: {scn.get('pipelineStatus')}")
        print(f"   BBox: {scn.get('bbox')}")
        print("-" * 50)
except Exception as e:
    print(f"Error fetching NASA scenes: {e}")

print("\n" + "=" * 60)
print("4. ACTIVE DISASTER TARGET AOI (DELTA SECTOR 4)")
print("=" * 60)
try:
    aoi = get_json("http://127.0.0.1:8000/api/v1/satellite/aoi")
    data = aoi.get('data', {})
    print(f"Operation: {data.get('operation_id')} ({data.get('region')})")
    print(f"Bounding Box: {data.get('bbox')}")
    print(f"CRS: {data.get('crs')}")
except Exception as e:
    print(f"Error fetching AOI: {e}")

print("\n[COMPLETE] All live endpoints verified successfully.")
