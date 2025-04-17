from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
import aiomysql
from typing import List
from datetime import timedelta

from ..db.session import get_cursor # Import get_cursor
from ..schemas.user import UserCreate, UserUpdate, UserRead, UserLogin
from ..schemas.token import Token # Import Token schema
from ..services import user_service
from ..core.security import create_access_token, get_current_user # Import JWT creation and user validation
from ..core.config import settings # Import settings for token expiry
# from ..core.security import create_access_token # Uncomment if implementing JWT
# from ..schemas.token import Token # Uncomment if implementing JWT

router = APIRouter()

@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_new_user(
    user_in: UserCreate,
    cursor = Depends(get_cursor) # Use get_cursor
):
    """Create a new user."""
    try:
        created_user = await user_service.create_user(cursor=cursor, user=user_in)
        return created_user
    except ValueError as e: # Catch specific error for existing email
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        # Log the exception e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {e}"
        )

# Updated Login endpoint
@router.post("/login", response_model=Token) # Use Token as response model
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    cursor = Depends(get_cursor)
):
    """Authenticate user and return an access token."""
    user = await user_service.authenticate_user(
        cursor, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate JWT
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.email, expires_delta=access_token_expires # Use email as subject
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/", response_model=List[UserRead])
async def read_all_users(
    skip: int = 0,
    limit: int = 100,
    cursor = Depends(get_cursor) # Use get_cursor
):
    """Retrieve a list of users (requires authentication/authorization)."""
    # TODO: Add authentication dependency here
    users = await user_service.get_users(cursor=cursor, skip=skip, limit=limit)
    return users

@router.get("/me", response_model=UserRead)
async def read_users_me(
    current_user: UserRead = Depends(get_current_user) # Use the dependency
):
    """Get current logged-in user's details."""
    # The dependency already fetches and validates the user
    return current_user

@router.get("/{user_id}", response_model=UserRead)
async def read_user_by_id(
    user_id: int,
    cursor = Depends(get_cursor) # Use get_cursor
):
    """Get a specific user by ID (requires authentication/authorization)."""
    # TODO: Add authentication/authorization checks
    user = await user_service.get_user_by_id(cursor=cursor, user_id=user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    return user

@router.put("/me", response_model=UserRead)
async def update_current_user(
    user_in: UserUpdate,
    # current_user: UserRead = Depends(get_current_active_user), # Add dependency
    cursor = Depends(get_cursor) # Use get_cursor
):
    """Update current logged-in user's details."""
    # Replace this logic once authentication is implemented.
    user_id_to_update = 1 # Placeholder for current_user.id
    updated_user = await user_service.update_user(
        cursor=cursor, user_id=user_id_to_update, user_update=user_in
    )
    if updated_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User not found or no updates provided"
        )
    return updated_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_user(
    user_id: int,
    cursor = Depends(get_cursor) # Use get_cursor
):
    """Delete a user (requires admin privileges)."""
    # TODO: Add authentication/authorization checks (e.g., is admin?)
    deleted = await user_service.delete_user(cursor=cursor, user_id=user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    return None 