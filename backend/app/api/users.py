from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_admin, get_current_user, get_password_hash
from app.models.user import User
from app.schemas.auth import UserResponse, RegisterRequest
from app.schemas.common import success_response

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("")
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    data = [UserResponse.model_validate(u).model_dump() for u in users]
    return success_response(data=data)

@router.post("", dependencies=[Depends(require_admin)])
def create_user(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=req.name,
        email=req.email,
        password_hash=get_password_hash(req.password),
        role=req.role,
        phone=req.phone,
        organization=req.organization,
        title=req.title
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return success_response(data=UserResponse.model_validate(user).model_dump(), message="User created successfully")

@router.put("/{id}", dependencies=[Depends(require_admin)])
def update_user(id: str, req: RegisterRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.name = req.name
    user.email = req.email
    if req.password:
        user.password_hash = get_password_hash(req.password)
    user.role = req.role
    user.phone = req.phone
    user.organization = req.organization
    user.title = req.title
    db.commit()
    db.refresh(user)
    return success_response(data=UserResponse.model_validate(user).model_dump(), message="User updated successfully")

@router.delete("/{id}", dependencies=[Depends(require_admin)])
def delete_user(id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return success_response(message="User deleted successfully")
