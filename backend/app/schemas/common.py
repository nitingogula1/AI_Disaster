from typing import Generic, TypeVar, Optional, Any, List
from pydantic import BaseModel

T = TypeVar("T")

class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    pages: int

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None

class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = "Success"
    pagination: Optional[PaginationMeta] = None
    error: Optional[ErrorDetail] = None

def success_response(data: Any = None, message: str = "Success", pagination: Optional[PaginationMeta] = None) -> dict:
    resp = {
        "success": True,
        "data": data,
        "message": message
    }
    if pagination:
        resp["pagination"] = pagination.model_dump()
    return resp

def error_response(code: str, message: str, details: Any = None) -> dict:
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details
        }
    }
