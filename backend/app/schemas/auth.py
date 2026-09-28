from typing import Optional
from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "DISASTER_OFFICER"
    phone: Optional[str] = None
    organization: Optional[str] = "SentinelAid Incident Command"
    title: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    organization: Optional[str] = None
    title: Optional[str] = None
    avatar: Optional[str] = None
    is_active: bool = True

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
