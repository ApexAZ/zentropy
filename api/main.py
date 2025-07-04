from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.exc import OperationalError
from datetime import datetime
import os
import time

from .database import engine, Base, test_database_connection
from .schemas import HealthResponse, MessageResponse
from .routers import users, teams, calendar_entries, invitations, auth

# Wait for database with retry logic
max_retries = 30
for attempt in range(max_retries):
    try:
        db_connected = test_database_connection()
        if db_connected:
            print("✅ Database connection successful")
            # Create tables if database is available
            Base.metadata.create_all(bind=engine)
            print("✅ Database tables verified/created")
            break
    except (OperationalError, Exception):
        if attempt == 0:
            print("⏳ Waiting for database to be ready...")
        elif attempt % 5 == 0:
            print(
                f"⏳ Still waiting for database... (attempt {attempt + 1}/{max_retries})"
            )

        if attempt == max_retries - 1:
            print(f"⚠️  Could not connect to database after {max_retries} attempts")
            print("⚠️  Starting without database - some features may not work")
            break

        # Exponential backoff with cap at 5 seconds
        wait_time = min(1 * (1.5**attempt), 5)
        time.sleep(wait_time)

# Initialize FastAPI app
app = FastAPI(
    title="Zentropy API",
    description=(
        "A comprehensive Product Management platform with project workflows, "
        "team collaboration, and capacity planning"
    ),
    version="1.0.0",
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
    ],  # React dev server and production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with v1 API versioning
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(teams.router, prefix="/api/v1/teams", tags=["teams"])
app.include_router(
    calendar_entries.router, prefix="/api/v1/calendar_entries", tags=["calendar"]
)
app.include_router(
    invitations.router, prefix="/api/v1/invitations", tags=["invitations"]
)

# Serve React static files
if os.path.exists("dist/public"):
    app.mount("/static", StaticFiles(directory="dist/public"), name="static")


@app.get("/", response_model=MessageResponse)
def root() -> MessageResponse:
    return MessageResponse(message="Zentropy API v1.0.0 - Capacity Planner")


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    try:
        # Test database connection without dependency injection
        db_status = "connected" if test_database_connection() else "disconnected"
    except Exception:
        db_status = "disconnected"

    return HealthResponse(status="ok", database=db_status, timestamp=datetime.utcnow())


# Serve React app for any non-API routes
@app.get("/{path:path}")
def serve_react_app(path: str) -> FileResponse:
    # If the path is an API route, let it 404 naturally
    if path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")

    # Serve the React index.html for all other routes (client-side routing)
    index_path = "dist/public/index.html"
    if os.path.exists(index_path):
        return FileResponse(index_path)
    else:
        raise HTTPException(status_code=404, detail="Frontend not built")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=3000, log_level="info")
