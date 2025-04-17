import json

async def create_sample_workspaces(cursor) -> None:
    """Create sample workspaces if none exist in the database."""
    # Check if any workspaces exist
    await cursor.execute("SELECT COUNT(*) FROM workspaces")
    count = await cursor.fetchone()
    if count and count.get('COUNT(*)', 0) > 0:
        print(f"Found {count.get('COUNT(*)')} existing workspaces, skipping sample data creation.")
        return

    print("Creating sample workspaces...")
    
    # Sample workspace types
    workspace_types = ["Meeting Room", "Hot Desk", "Private Office", "Conference Room", "Collaboration Space"]
    
    # Sample facilities
    all_facilities = [
        ["Whiteboard", "Projector", "Video Conferencing"],
        ["Whiteboard", "Ergonomic Chair", "Standing Desk"],
        ["Whiteboard", "TV Monitor", "Coffee Machine", "Refrigerator"],
        ["Projector", "Video Conferencing", "Whiteboard", "TV Monitor"],
        ["Whiteboard", "Coffee Machine", "Natural Light"]
    ]
    
    # Create 15 sample workspaces across 3 floors
    for i in range(1, 16):
        type_index = (i % 5)
        floor = (i % 3) + 1
        capacity = (i % 5) + 2  # Capacities between 3-7
        facilities = json.dumps(all_facilities[type_index])
        
        sql = """
        INSERT INTO workspaces (name, type, floor, capacity, facilities, is_available, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        await cursor.execute(sql, (
            f"Workspace {i}",
            workspace_types[type_index],
            floor,
            capacity,
            facilities,
            True,
            f"A {workspace_types[type_index]} on floor {floor} with capacity for {capacity} people."
        ))
    
    print("Sample workspaces created successfully.")

# Add call to this function in the init_db function
async def init_db(connection_pool) -> None:
    """Initialize the database with required tables and initial data."""
    async with connection_pool.acquire() as conn:
        async with conn.cursor() as cursor:
            await create_tables(cursor)
            await create_sample_workspaces(cursor)  # Add this line
            await conn.commit() 