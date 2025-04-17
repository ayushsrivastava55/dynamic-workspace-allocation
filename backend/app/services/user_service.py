import aiomysql
from typing import List, Optional

from ..schemas.user import UserCreate, UserUpdate, UserRead, UserDB
from ..core.security import get_password_hash, verify_password
from ..db.session import get_cursor

async def create_user(cursor: aiomysql.Cursor, user: UserCreate) -> UserRead:
    """Creates a new user record in the MySQL database."""
    # Check if user already exists
    query = "SELECT id FROM users WHERE email = %s"
    await cursor.execute(query, (user.email,))
    existing_user = await cursor.fetchone()
    if existing_user:
        raise ValueError(f"User with email {user.email} already exists.")

    # Hash the password before storing
    hashed_password = get_password_hash(user.password)

    query = """
    INSERT INTO users (email, full_name, hashed_password, level, department, is_active)
    VALUES (%s, %s, %s, %s, %s, %s)
    """
    await cursor.execute(
        query, 
        (
            user.email,
            user.full_name,
            hashed_password, # Store the hashed password
            user.level,
            user.department,
            user.is_active if user.is_active is not None else True
        )
    )
    user_id = cursor.lastrowid
    
    # Fetch the newly created user to return it
    created_user = await get_user_by_id(cursor, user_id)
    if not created_user:
         raise Exception("Failed to retrieve created user.") # Should not happen
    return created_user

async def get_user_by_id(cursor: aiomysql.Cursor, user_id: int) -> Optional[UserRead]:
    """Retrieves a single user by their ID from MySQL."""
    query = "SELECT id, email, full_name, level, department, is_active, created_at FROM users WHERE id = %s"
    await cursor.execute(query, (user_id,))
    user_data = await cursor.fetchone()
    if user_data:
        return UserRead(**user_data)
    return None

async def get_user_by_email_internal(cursor: aiomysql.Cursor, email: str) -> Optional[UserDB]:
    """Fetch a single user by email, including the hashed password (internal use only)."""
    query = "SELECT id, email, full_name, hashed_password, level, department, is_active, created_at FROM users WHERE email = %s"
    await cursor.execute(query, (email,))
    user_data = await cursor.fetchone()
    if user_data:
        return UserDB(**user_data)
    return None

async def get_user_by_email(cursor: aiomysql.Cursor, email: str) -> Optional[UserRead]:
    """Fetch a single user by email (public version - no password hash)."""
    user_db = await get_user_by_email_internal(cursor, email)
    if not user_db:
        return None
    return UserRead(
        id=user_db.id,
        email=user_db.email,
        full_name=user_db.full_name,
        level=user_db.level,
        department=user_db.department,
        is_active=user_db.is_active,
        created_at=user_db.created_at
    )

async def get_users(cursor: aiomysql.Cursor, skip: int = 0, limit: int = 100) -> List[UserRead]:
    """Retrieves a list of users from MySQL with pagination."""
    query = "SELECT id, email, full_name, level, department, is_active, created_at FROM users LIMIT %s OFFSET %s"
    await cursor.execute(query, (limit, skip))
    users_data = await cursor.fetchall()
    # Note: We are not fetching hashed_password for the list view
    return [UserRead(**user_data) for user_data in users_data]

async def update_user(cursor: aiomysql.Cursor, user_id: int, user_update: UserUpdate) -> Optional[UserRead]:
    """Updates an existing user record in MySQL."""
    update_data = user_update.model_dump(exclude_unset=True)
    if not update_data:
        return await get_user_by_id(cursor, user_id)

    set_clauses = []
    params = []

    for key, value in update_data.items():
        if key == 'password' and value:
            set_clauses.append(f"hashed_password = %s")
            params.append(get_password_hash(value))
        elif key != 'password': # Don't update password field directly unless hashed
            set_clauses.append(f"{key} = %s")
            params.append(value)

    if not set_clauses: # Handle case where only password was in update_data but was None/empty
        return await get_user_by_id(cursor, user_id)
        
    params.append(user_id) # For WHERE clause
    
    set_query = ", ".join(set_clauses)
    sql = f"UPDATE users SET {set_query} WHERE id = %s"
    
    rows_affected = await cursor.execute(sql, tuple(params))
    
    if rows_affected > 0:
        return await get_user_by_id(cursor, user_id)
    else:
        return None # User not found or no change

async def authenticate_user(cursor: aiomysql.Cursor, email: str, password: str) -> Optional[UserRead]:
    user_db = await get_user_by_email_internal(cursor, email=email)
    if not user_db:
        return None
    # Verify the provided password against the stored hash
    if not verify_password(password, user_db.hashed_password):
        return None
    # Convert UserDB to UserRead (drops the hashed_password)
    return UserRead(
        id=user_db.id,
        email=user_db.email,
        full_name=user_db.full_name,
        level=user_db.level,
        department=user_db.department,
        is_active=user_db.is_active,
        created_at=user_db.created_at
    )

async def delete_user(cursor: aiomysql.Cursor, user_id: int) -> bool:
    """Deletes a user record from MySQL. Returns True if deleted, False otherwise."""
    query = "DELETE FROM users WHERE id = %s"
    await cursor.execute(query, (user_id,))
    return cursor.rowcount > 0 