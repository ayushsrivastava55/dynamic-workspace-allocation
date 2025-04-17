# Smart Workspace Allocation System

A full-stack application for managing and allocating office workspaces intelligently, featuring a FastAPI backend and a React frontend.

## Features

- **User Management:** User registration and login (placeholder for full auth).
- **Workspace Management:** CRUD operations for office workspaces (desks, meeting rooms).
- **Allocation Engine:** Suggests suitable workspaces based on user needs (team size, privacy, collaboration, facilities).
- **Booking System:** Allows users to confirm suggested allocations and view booking history.
- **RESTful API:** Backend provides a well-defined API for frontend interaction.
- **Interactive Frontend:** User-friendly interface built with React and Material UI.

## Tech Stack

- **Backend:**
  - Python 3.9+
  - FastAPI
  - MySQL (via `aiomysql`)
  - Uvicorn (ASGI Server)
  - Pydantic (Data validation)
  - `python-dotenv` (Environment variable management)
  - `cryptography` (For secure password handling)
- **Frontend:**
  - React (with Vite)
  - TypeScript
  - Material UI (MUI)
  - Axios (HTTP client)
  - React Router
  - `@tanstack/react-query` (Data fetching/caching)
  - `react-hot-toast` (Notifications)
- **Database:**
  - MySQL 8.0+

## Database Schema

The application uses a MySQL database with the following core tables:

- **`users`**: Stores user information including email, hashed password, name, level, department, and status.
- **`workspaces`**: Contains details about each workspace, such as name, type (e.g., 'desk', 'meeting room'), floor, capacity, list of facilities (stored as JSON), availability status, description, and optional coordinates.
- **`allocations`**: Represents bookings. It links users (`user_id`) and workspaces (`workspace_id`), storing start/end times, team size, user needs (privacy, collaboration - ENUMs), required facilities (JSON), status (e.g., 'Active', 'Pending', 'Completed'), and optional suitability/confidence scores from the ML model.

Key relationships:

- `allocations.user_id` -> `users.id` (Many-to-One)
- `allocations.workspace_id` -> `workspaces.id` (Many-to-One)

Indexes are added for frequently queried columns (user ID, workspace ID, time ranges, workspace type/floor).

## Machine Learning Component

The core of the workspace suggestion feature (`POST /api/v1/allocations/suggest`) utilizes a machine learning model to predict the suitability of available workspaces based on user requests.

- **Model:** The system uses a pre-trained transformer model from Hugging Face (`distilbert-base-uncased-finetuned-sst-2-english` by default). This model is loaded using the `transformers` library.
- **Input:** User data (level, department), workspace data (type, capacity, floor, facilities), and context data (team size, privacy/collaboration needs, required facilities, time of day, duration) are formatted into a single text string.
- **Prediction:** The model predicts a suitability score (classification) and provides a confidence level.
- **Scoring & Reasoning:** A hybrid scoring system (`_calculate_score`) combines the model's confidence with rule-based adjustments (e.g., penalties for insufficient capacity or missing facilities, bonuses for matching preferences). A rule-based reasoning generator (`_generate_reasoning`) provides human-readable explanations for the suggestion.
- **Integration:** The `WorkspaceAllocator` class encapsulates the model loading and prediction logic. The `allocation_service.suggest_workspaces_for_request` function orchestrates fetching available workspaces, preparing data, running predictions concurrently using `asyncio`, and formatting the final suggestions.

**(Note:** The current implementation uses a general-purpose classification model. For optimal performance, this model could be fine-tuned on domain-specific data related to workspace satisfaction and allocation patterns.)

## Prerequisites

- Python 3.9 or higher installed.
- Node.js and npm (or yarn) installed.
- A running MySQL server instance.
- Git installed.

## Installation

1.  **Clone the repository:**

    ```bash
    git clone <your-repository-url>
    cd dms-proj
    ```

2.  **Backend Setup:**

    - Navigate to the backend directory:
      ```bash
      cd backend
      ```
    - Create and activate a virtual environment:
      ```bash
      python -m venv venv
      source venv/bin/activate  # On Windows use `venv\Scripts\activate`
      ```
    - Install Python dependencies:
      ```bash
      pip install -r requirements.txt
      ```
    - Configure the environment:
      - Create a `.env` file inside the `backend` directory (`backend/.env`).
      - Copy the contents of `backend/.env.example` (if you create one) or add the following, replacing placeholders with your actual MySQL details:
        ```env
        DATABASE_URL="mysql+aiomysql://YOUR_MYSQL_USER:YOUR_MYSQL_PASSWORD@YOUR_MYSQL_HOST:YOUR_MYSQL_PORT/YOUR_DATABASE_NAME"
        # Example:
        # DATABASE_URL="mysql+aiomysql://workspace_user:your_secure_password@127.0.0.1:3306/workspace_db"
        ```
    - Set up the MySQL database:
      - Ensure your MySQL server is running.
      - Create the database specified in your `.env` file (e.g., `workspace_db`).
      - Create the user specified in your `.env` file (e.g., `workspace_user`) and grant it permissions on the database. Example SQL commands (run as MySQL root):
        ```sql
        CREATE DATABASE IF NOT EXISTS workspace_db;
        CREATE USER IF NOT EXISTS 'workspace_user'@'localhost' IDENTIFIED BY 'your_secure_password'; -- Use the password from .env
        GRANT ALL PRIVILEGES ON workspace_db.* TO 'workspace_user'@'localhost';
        FLUSH PRIVILEGES;
        ```

3.  **Frontend Setup:**
    - Navigate back to the project root and then to the frontend directory:
      ```bash
      cd ../frontend # Or `cd dms-proj/frontend` from another location
      ```
    - Install Node.js dependencies:
      ```bash
      npm install
      # or if you use yarn:
      # yarn install
      ```
    - (Optional) Configure API URL: By default, the frontend connects to `http://localhost:8000`. If your backend runs elsewhere, create a `.env` file in the `frontend` directory (`frontend/.env`) and add:
      ```env
      VITE_API_URL=http://your-backend-api-url
      ```

## Running the Application

1.  **Start the Backend Server:**

    - Make sure you are in the project root directory (`dms-proj`).
    - Activate the backend virtual environment:
      ```bash
      source backend/venv/bin/activate
      ```
    - Run the Uvicorn server:
      ```bash
      python -m uvicorn backend.app.main:app --reload --port 8000
      ```
    - The backend API will be available at `http://localhost:8000`.

2.  **Start the Frontend Development Server:**
    - Open a **new terminal window/tab**.
    - Navigate to the frontend directory:
      ```bash
      cd /path/to/dms-proj/frontend
      ```
    - Run the Vite development server:
      ```bash
      npm run dev
      # or if you use yarn:
      # yarn dev
      ```
    - The frontend application will be available at `http://localhost:5173` (or another port if 5173 is busy).

## API Documentation

Once the backend server is running, interactive API documentation (provided by FastAPI/Swagger UI) is available at:

`http://localhost:8000/docs`

## Contributing

(Optional: Add guidelines for contributing if this is an open project).

## License

(Optional: Specify the license for your project, e.g., MIT).
