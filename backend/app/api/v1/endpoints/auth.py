from datetime import timedelta
from typing import Any
from urllib.parse import parse_qs

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas.user import UserCreate, User as UserSchema
from app.schemas.token import Token

router = APIRouter()


class LoginCredentials(BaseModel):
    username: str
    password: str


async def get_login_credentials(request: Request) -> LoginCredentials:
    content_type = (request.headers.get("content-type") or "").lower()
    username = ""
    password = ""

    if "application/json" in content_type:
        payload = await request.json()
        if isinstance(payload, dict):
            username = str(payload.get("username") or payload.get("email") or "")
            password = str(payload.get("password") or "")
    else:
        body = await request.body()
        parsed = parse_qs(body.decode("utf-8"))
        username = (parsed.get("username") or parsed.get("email") or [""])[0]
        password = (parsed.get("password") or [""])[0]

    if not username or not password:
        raise HTTPException(status_code=422, detail="username and password are required")

    return LoginCredentials(username=username, password=password)

@router.post("/register", response_model=UserSchema)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Register new user.
    """
    result = await db.execute(select(User).where(User.email == user_in.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
    
    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=security.get_password_hash(user_in.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login", response_model=Token)
async def login(
    db: AsyncSession = Depends(deps.get_db),
    credentials: LoginCredentials = Depends(get_login_credentials),
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    result = await db.execute(select(User).where(User.email == credentials.username))
    user = result.scalar_one_or_none()
    
    if not user or not security.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.internal_id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }
