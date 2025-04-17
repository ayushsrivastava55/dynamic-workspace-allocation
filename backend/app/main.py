import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .core.config import settings
from .db.session import create_pool, close_pool
# Import your API routers here once they are created
from .routers import workspaces, users, allocations, monitoring, dashboard # Import the monitoring router and the dashboard router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    await create_pool() # Initialize the database connection pool
    yield
    print("Shutting down...")
    await close_pool() # Close the database connection pool

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # More permissive for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Placeholder root endpoint
@app.get("/")
async def read_root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}"}

# Include your API routers here
app.include_router(workspaces.router, prefix=f"{settings.API_V1_STR}/workspaces", tags=["Workspaces"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["Users"])
app.include_router(allocations.router, prefix=f"{settings.API_V1_STR}/allocations", tags=["Allocations"])
app.include_router(monitoring.router, prefix=f"{settings.API_V1_STR}/monitoring", tags=["Monitoring"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["Dashboard"])

# Add other application-wide configurations if needed 