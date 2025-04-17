import aiomysql
import os
from typing import AsyncGenerator
import re # To split SQL commands
from fastapi import Depends

from ..core.config import settings

pool = None

async def create_pool():
    """Creates an aiomysql connection pool."""
    global pool
    if pool is None:
        try:
            # Extract connection details from DATABASE_URL
            # Format: mysql+aiomysql://user:password@host:port/db_name
            print(f"DEBUG: Attempting to parse DATABASE_URL: '{settings.DATABASE_URL}'")
            match = re.match(r"mysql\+aiomysql://(.*?):(.*?)@(.*?):(.*?)/(.*)", settings.DATABASE_URL)
            if not match:
                raise ValueError("Invalid DATABASE_URL format for MySQL")
            user, password, host, port, db_name = match.groups()
            
            pool = await aiomysql.create_pool(
                host=host,
                port=int(port),
                user=user,
                password=password,
                db=db_name,
                autocommit=True, # Set autocommit for simplicity, or manage transactions explicitly
                minsize=5,
                maxsize=20
            )
            print("MySQL connection pool created successfully.")
            await init_db() # Initialize schema after pool creation
        except Exception as e:
            print(f"Error creating MySQL connection pool: {e}")
            pool = None # Ensure pool is None if creation fails
            raise

async def close_pool():
    """Closes the aiomysql connection pool."""
    global pool
    if pool:
        pool.close()
        await pool.wait_closed()
        pool = None
        print("MySQL connection pool closed.")

async def get_connection():
    """FastAPI dependency to get a MySQL connection from the pool."""
    global pool
    if pool is None:
        # Attempt to create pool if not initialized (e.g., during tests or specific startup flows)
        print("Connection pool not initialized. Attempting to create...")
        await create_pool()
        if pool is None: # Check again if creation failed
             raise RuntimeError("Database pool could not be initialized.")
    
    conn = None
    try:
        conn = await pool.acquire()
        yield conn
    except Exception as e:
         print(f"Error acquiring MySQL connection: {e}")
         raise
    finally:
        if conn:
            pool.release(conn)

async def get_cursor(conn = Depends(get_connection)):
    """FastAPI dependency to get a cursor from a connection."""
    # Note: conn is now injected by Depends(get_connection)
    cursor = None
    try:
        cursor = await conn.cursor(aiomysql.DictCursor) # Use DictCursor to get results as dictionaries
        yield cursor
    finally:
        if cursor:
            await cursor.close()

async def init_db():
    """Reads and executes the init_db.sql script for MySQL."""
    global pool
    if pool is None:
        print("Cannot initialize DB - pool not created yet.")
        return
        
    script_path = os.path.join(os.path.dirname(__file__), 'init_db.sql')
    if not os.path.exists(script_path):
        print(f"Database initialization script not found at: {script_path}")
        return
        
    print(f"Executing database initialization script for MySQL: {script_path}")
    try:
        with open(script_path, 'r') as f:
            # Split commands by semicolon, handling potential comments and empty lines
            sql_script = f.read()
            # Basic split, might need refinement for complex scripts with semicolons in strings/comments
            commands = [cmd.strip() for cmd in sql_script.split(';') if cmd.strip() and not cmd.strip().startswith('--')]

        async with pool.acquire() as conn:
            async with conn.cursor() as cursor:
                for command in commands:
                    if command: # Ensure command is not empty
                        try:
                            print(f"Executing: {command[:100]}...") # Log snippet
                            await cursor.execute(command)
                        except Exception as cmd_error:
                            # Log specific command error but continue if possible (e.g., table already exists)
                            print(f"Warning executing command: {cmd_error}\nCommand: {command}")
                            # Decide if you want to stop initialization on error
                            # raise cmd_error 
            await conn.commit() # Commit changes if autocommit=False in pool
        print("Database tables checked/created successfully for MySQL.")
    except Exception as e:
        print(f"Error during database initialization: {e}")

# Optional: If you need SQLAlchemy Core or ORM alongside asyncpg
# from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
# from sqlalchemy.orm import sessionmaker

# async_engine = create_async_engine(settings.DATABASE_URL, echo=True)
# AsyncSessionLocal = sessionmaker(
#     bind=async_engine,
#     class_=AsyncSession,
#     expire_on_commit=False,
# )

# async def get_session() -> AsyncGenerator[AsyncSession, None]:
#     async with AsyncSessionLocal() as session:
#         yield session 