from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Any
from passlib.context import CryptContext
from jose import jwt, JWTError

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
import aiomysql

from .config import settings
from ..schemas.user import UserRead
from ..services import user_service # To fetch user from DB
from ..db.session import get_cursor # To get DB cursor for service

# Password Hashing Context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 Scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/users/login")

# TokenData Schema (moved from schemas/token.py for simplicity here)
class TokenData(BaseModel):
    email: Optional[str] = None

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Creates a JWT access token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a stored hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a plain password."""
    return pwd_context.hash(password)

# Dependency to get current user
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    cursor: aiomysql.Cursor = Depends(get_cursor)
) -> UserRead:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
        
    # Use the internal version to get the user with hashed_password
    # We'll convert it to UserRead without the hash before returning
    user_db = await user_service.get_user_by_email_internal(cursor, email=token_data.email)
    if user_db is None:
        raise credentials_exception
    
    # Convert to UserRead to avoid exposing hashed_password
    user = UserRead(
        id=user_db.id,
        email=user_db.email, 
        full_name=user_db.full_name,
        level=user_db.level,
        department=user_db.department,
        is_active=user_db.is_active,
        created_at=user_db.created_at
    )
    
    # Optional: Check if user is active
    # if not user.is_active:
    #     raise HTTPException(status_code=400, detail="Inactive user")
    return user

# Potential JWT functions (add if needed)
# from datetime import datetime, timedelta, timezone
# from typing import Optional
# from jose import JWTError, jwt
# from ..core.config import settings

# def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
#     to_encode = data.copy()
#     if expires_delta:
#         expire = datetime.now(timezone.utc) + expires_delta
#     else:
#         expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
#     to_encode.update({"exp": expire})
#     encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
#     return encoded_jwt 