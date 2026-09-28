from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import (
    verify_password, get_password_hash, create_access_token, 
    create_refresh_token, decode_token, get_current_user
)
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, RefreshTokenRequest, TokenResponse, UserResponse
from app.schemas.common import success_response, error_response

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials. Access denied.")

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials. Access denied.")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated.")

    access_token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    refresh_token = create_refresh_token({"sub": user.id})

    user_data = UserResponse.model_validate(user).model_dump()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_data
    }

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered.")

    new_user = User(
        name=req.name,
        email=req.email,
        password_hash=get_password_hash(req.password),
        role=req.role,
        phone=req.phone,
        organization=req.organization,
        title=req.title
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token({"sub": new_user.id, "email": new_user.email, "role": new_user.role})
    refresh_token = create_refresh_token({"sub": new_user.id})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(new_user).model_dump()
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return success_response(data=UserResponse.model_validate(current_user).model_dump())

@router.post("/refresh")
def refresh_token(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    payload = decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token type.")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    new_access_token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }
