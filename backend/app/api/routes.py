from fastapi import APIRouter
from app.services.routing_service import routing_service
from app.schemas.route import RouteOptimizeRequest
from app.schemas.common import success_response

router = APIRouter(prefix="/routes", tags=["Routes"])

@router.get("")
def list_available_routes():
    res = routing_service.optimize_route([21.870, 89.600], [21.840, 89.540])
    routes = [res["selected_route"]] + res["alternative_routes"]
    return success_response(data=routes)

@router.post("/optimize")
def optimize_route_endpoint(req: RouteOptimizeRequest):
    result = routing_service.optimize_route(
        start_location=req.start_location,
        destination=req.destination,
        avoid_inundation=req.avoid_inundation,
        exclude_bridges=req.exclude_bridges,
        prioritize_paved=req.prioritize_paved
    )
    return success_response(data=result)
