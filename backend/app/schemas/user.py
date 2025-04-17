from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# Shared properties
class UserBase(BaseModel):
    email: Optional[EmailStr] = Field(None, description="User's email address")
    full_name: Optional[str] = Field(None, max_length=100, description="User's full name")
    level: Optional[str] = Field(None, max_length=50, description="User level (e.g., Staff, Manager, Executive)")
    department: Optional[str] = Field(None, max_length=100, description="User's department")
    is_active: Optional[bool] = Field(True, description="Whether the user account is active")

# Properties to receive via API on creation
class UserCreate(UserBase):
    email: EmailStr = Field(..., description="User's email address (required for creation)")
    password: str = Field(..., min_length=8, description="User's password (required for creation)")
    full_name: str = Field(..., max_length=100, description="User's full name (required for creation)")
    level: str = Field(..., max_length=50, description="User level (required for creation)")
    department: str = Field(..., max_length=100, description="User's department (required for creation)")

# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = Field(None, min_length=8, description="New password (optional)")

# Properties returned to client (never include password hash)
class UserRead(UserBase):
    id: int
    email: EmailStr # Make email required for reading
    full_name: str
    level: str
    department: str
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Schema for user login
class UserLogin(BaseModel):
    email: EmailStr
    password: str 

# Schema for database user with hashed_password (internal use only)
class UserDB(UserRead):
    hashed_password: str
    
    class Config:
        from_attributes = True 