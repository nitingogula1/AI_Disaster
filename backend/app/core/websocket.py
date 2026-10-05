import asyncio
import json
import math
import random
from typing import List, Dict, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from app.core.logging import logger

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total active: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        if not self.active_connections:
            return
        payload = json.dumps(message)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Error sending message to websocket: {e}")
                disconnected.append(connection)
        for dead in disconnected:
            self.disconnect(dead)

ws_manager = ConnectionManager()

# Tactical Simulated Teams State
SIMULATED_TEAMS = [
    {
        "id": "RT-01",
        "name": "Alpha Sector Swiftwater",
        "type": "BOAT",
        "status": "DEPLOYED",
        "latitude": 21.7480,
        "longitude": 89.3140,
        "heading": 135,
        "speed": 12.4,
        "fuel": 84,
        "battery": 92,
        "currentMission": "Zone 4B Evacuation",
        "targetLat": 21.7439,
        "targetLng": 89.3068,
        "color": "#3b82f6"
    },
    {
        "id": "RT-02",
        "name": "Bravo Urban Search & Rescue",
        "type": "AMPHIBIOUS",
        "status": "DEPLOYED",
        "latitude": 21.7350,
        "longitude": 89.2980,
        "heading": 290,
        "speed": 8.1,
        "fuel": 68,
        "battery": 78,
        "currentMission": "Hospital Wing B Extraction",
        "targetLat": 21.7439,
        "targetLng": 89.3068,
        "color": "#10b981"
    },
    {
        "id": "RT-03",
        "name": "Charlie Medical Evac Squad",
        "type": "MEDEVAC",
        "status": "EN_ROUTE",
        "latitude": 21.7610,
        "longitude": 89.3290,
        "heading": 215,
        "speed": 18.0,
        "fuel": 76,
        "battery": 89,
        "currentMission": "Sector 4 Shelter Triage",
        "targetLat": 21.7512,
        "targetLng": 89.3120,
        "color": "#ef4444"
    },
    {
        "id": "RT-04",
        "name": "Delta Hazmat & Grid Shutdown",
        "type": "VEHICLE",
        "status": "STANDBY",
        "latitude": 21.7580,
        "longitude": 89.3240,
        "heading": 45,
        "speed": 0.0,
        "fuel": 95,
        "battery": 98,
        "currentMission": "Substation Security",
        "targetLat": 21.7588,
        "targetLng": 89.3245,
        "color": "#f59e0b"
    },
    {
        "id": "AIR-01",
        "name": "SkyWatch SAR Bell 412",
        "type": "AERIAL",
        "status": "AIRBORNE",
        "latitude": 21.7700,
        "longitude": 89.3000,
        "heading": 170,
        "speed": 85.0,
        "fuel": 58,
        "battery": 100,
        "currentMission": "Air Recon & Winch Operations",
        "targetLat": 21.7381,
        "targetLng": 89.2942,
        "color": "#8b5cf6"
    }
]

def calculate_haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Returns distance in kilometers between two GPS coordinates."""
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def find_nearest_rescue_team(lat: float, lon: float) -> Dict[str, Any]:
    """Finds the closest available rescue team to a given point."""
    best_team = None
    min_dist = float("inf")
    for team in SIMULATED_TEAMS:
        dist = calculate_haversine(lat, lon, team["latitude"], team["longitude"])
        if dist < min_dist:
            min_dist = dist
            best_team = {
                **team,
                "distance_km": round(dist, 2),
                "eta_minutes": max(2, int(dist / max(team["speed"] * 1.852, 15.0) * 60))
            }
    return best_team or {
        "id": "RT-02",
        "name": "Bravo Urban Search & Rescue",
        "distance_km": 1.8,
        "eta_minutes": 6
    }

async def telemetry_simulation_loop():
    """Background task to simulate live movement, fuel consumption, and telemetry updates."""
    logger.info("Starting live rescue team telemetry simulation loop...")
    while True:
        try:
            await asyncio.sleep(3.5)
            if not ws_manager.active_connections:
                continue

            for team in SIMULATED_TEAMS:
                if team["status"] in ["DEPLOYED", "EN_ROUTE", "AIRBORNE"]:
                    # Small random movement toward target or drift
                    dlat = (team["targetLat"] - team["latitude"]) * 0.05 + random.uniform(-0.0003, 0.0003)
                    dlng = (team["targetLng"] - team["longitude"]) * 0.05 + random.uniform(-0.0003, 0.0003)
                    team["latitude"] = round(team["latitude"] + dlat, 6)
                    team["longitude"] = round(team["longitude"] + dlng, 6)

                    # Update heading
                    angle = math.degrees(math.atan2(dlng, dlat))
                    team["heading"] = int((angle + 360) % 360)

                    # Slight fuel/battery drain
                    if random.random() < 0.2:
                        team["fuel"] = max(15, team["fuel"] - 1)
                    if random.random() < 0.15:
                        team["battery"] = max(20, team["battery"] - 1)

            # Broadcast to all connected clients
            await ws_manager.broadcast({
                "type": "TELEMETRY_UPDATE",
                "timestamp": asyncio.get_event_loop().time(),
                "teams": SIMULATED_TEAMS
            })
        except Exception as e:
            logger.error(f"Error in telemetry simulation: {e}")
            await asyncio.sleep(5)
