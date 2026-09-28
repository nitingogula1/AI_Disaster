from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class RouteOptimizeRequest(BaseModel):
    disaster_id: Optional[str] = None
    start_location: List[float]  # [lat, lng]
    destination: List[float]     # [lat, lng]
    vehicle_type: Optional[str] = "Amphibious Craft B-14"
    max_flood_depth: Optional[float] = 0.8
    avoid_inundation: bool = True
    exclude_bridges: bool = True
    prioritize_paved: bool = True

class RouteWaypoint(BaseModel):
    name: str
    position: List[float]

class OptimizedRouteResponse(BaseModel):
    id: str
    route_code: str
    name: str
    label: str
    distance: float
    estimated_time: int
    risk_factor: str
    risk_percent: int
    status: str
    blocked_segments: int
    max_depth: float
    waypoints: List[RouteWaypoint]
    geometry: List[List[float]]
    turn_by_turn: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True

class RouteOptimizationResult(BaseModel):
    selected_route: OptimizedRouteResponse
    alternative_routes: List[OptimizedRouteResponse]
    routing_engine: str = "A* / Dijkstra Hybrid Graph Engine v4.2"
    latency_ms: int = 42
    graph_nodes_evaluated: int = 18420
