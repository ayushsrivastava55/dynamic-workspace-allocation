from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl
from typing import List

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Smart Workspace Allocation API"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@host:port/db_name"
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = [
        "http://localhost:3000",
        "http://localhost:5173",  # Vite default
        "http://127.0.0.1:5173",  # Also allow localhost IP
        # Add your frontend deployment URL here
    ]

    # CORS Settings
    ALLOW_CREDENTIALS: bool = True
    ALLOW_METHODS: List[str] = ["*"]
    ALLOW_HEADERS: List[str] = ["*"]

    # JWT Settings
    SECRET_KEY: str = "default_secret_key_if_not_in_env"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = "backend/.env"
        env_file_encoding = 'utf-8'
        case_sensitive = True

settings = Settings() 