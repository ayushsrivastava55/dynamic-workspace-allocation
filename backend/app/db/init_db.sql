-- backend/app/db/init_db.sql (MySQL Version)

-- Create custom Enum types (MySQL specific)
CREATE TABLE IF NOT EXISTS custom_enum_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    value ENUM('low', 'medium', 'high') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    level VARCHAR(50) NOT NULL,
    department VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    floor INT NOT NULL,
    capacity INT NOT NULL,
    facilities JSON, -- Use JSON to store list of facilities
    is_available BOOLEAN DEFAULT true NOT NULL,
    description TEXT,
    x_coord DOUBLE,
    y_coord DOUBLE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL, -- Auto-update timestamp
    CONSTRAINT chk_capacity CHECK (capacity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: allocations
CREATE TABLE IF NOT EXISTS allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    workspace_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    team_size INT NOT NULL,
    privacy_need ENUM('low', 'medium', 'high') DEFAULT 'low' NOT NULL,
    collaboration_need ENUM('low', 'medium', 'high') DEFAULT 'low' NOT NULL,
    required_facilities JSON, -- Use JSON here too
    notes TEXT,
    status ENUM('Active', 'Pending', 'Completed', 'Cancelled') DEFAULT 'Active' NOT NULL,
    suitability_score DOUBLE,
    confidence_score DOUBLE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL, -- Auto-update timestamp
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
    CONSTRAINT chk_allocation_times CHECK (end_time > start_time),
    CONSTRAINT chk_allocation_team_size CHECK (team_size > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for frequently queried columns
CREATE INDEX idx_allocations_user_id ON allocations(user_id);
CREATE INDEX idx_allocations_workspace_id ON allocations(workspace_id);
CREATE INDEX idx_allocations_start_time ON allocations(start_time);
CREATE INDEX idx_allocations_end_time ON allocations(end_time);
CREATE INDEX idx_workspaces_type ON workspaces(type);
CREATE INDEX idx_workspaces_floor ON workspaces(floor);

-- Note: The automatic ON UPDATE CURRENT_TIMESTAMP for updated_at handles the trigger logic. 