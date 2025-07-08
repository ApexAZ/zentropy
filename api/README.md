# API Module Documentation

## Overview

The `api/` module is the core backend of Zentropy, built with FastAPI, SQLAlchemy, and PostgreSQL. It provides a modern, type-safe, and performant REST API for the Product Management platform.

## Architecture

```
api/
├── main.py                 # FastAPI application entry point
├── database.py             # Database models and connection management
├── auth.py                 # Authentication logic (JWT tokens)
├── google_oauth.py         # Google OAuth integration
├── email_verification.py   # Email verification system
├── rate_limiter.py         # Redis-based rate limiting
├── schemas.py              # Pydantic models for API validation
├── dependencies.py         # Dependency injection functions
├── config.py              # Configuration management
└── routers/               # API endpoint modules
    ├── auth.py
    ├── calendar_entries.py
    ├── invitations.py
    ├── teams.py
    └── users.py
```

## Key Components

### Database Models (`database.py`)

SQLAlchemy models with PostgreSQL as the backend:

```python
# Core models
- User: User accounts with authentication
- Team: Team management with ownership
- TeamMember: Many-to-many relationship with roles
- CalendarEntry: Project/task tracking
- TeamInvitation: Pending team invitations
```

**Database Features:**
- UUID primary keys for all tables
- Enum-based role system (ADMIN, MEMBER, VIEWER)
- Automatic timestamp tracking (created_at, updated_at)
- Proper indexes for performance
- Foreign key constraints for data integrity

### Authentication (`auth.py`)

JWT-based authentication with secure password hashing:

```python
# Key functions
- verify_password(plain_password, hashed_password)
- get_password_hash(password) 
- create_access_token(data: dict)
- get_current_user(token: str) -> User
```

**Security Features:**
- Bcrypt password hashing
- JWT tokens with expiration (30 days default)
- Token validation middleware
- Secure cookie support

### Google OAuth (`google_oauth.py`)

Seamless Google authentication integration:

```python
# OAuth flow
1. Frontend sends Google credential token
2. Backend verifies token with Google
3. Creates/updates user account
4. Returns JWT token
```

**Configuration:**
```bash
# Required environment variables
GOOGLE_CLIENT_ID=your-client-id-here
```

### Rate Limiting (`rate_limiter.py`)

Redis-based rate limiting to prevent abuse:

```python
# Default limits
- 50 requests per minute per IP
- 200 requests per minute per authenticated user
- Configurable per endpoint
```

**Usage:**
```python
@router.post("/endpoint")
@rate_limit(max_requests=10, window_seconds=60)
async def limited_endpoint():
    pass
```

### Email Verification (`email_verification.py`)

Token-based email verification system:

```python
# Flow
1. User registers
2. Verification token generated
3. Email sent with verification link
4. User clicks link to verify
5. Account activated
```

## API Patterns

### Consistent Response Format

All API responses follow this structure:

```python
# Success response
{
    "status": "success",
    "data": { ... },
    "message": "Operation completed"
}

# Error response
{
    "status": "error",
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid input",
        "details": { ... }
    }
}
```

### Dependency Injection

FastAPI's dependency system for clean code:

```python
# Common dependencies
async def get_db() -> Session:
    """Database session dependency"""
    
async def get_current_user(token: str) -> User:
    """Current authenticated user"""
    
async def get_current_team(team_id: str, user: User) -> Team:
    """Current team with permission check"""
```

### Error Handling

Structured error handling with proper HTTP status codes:

```python
# Custom exceptions
class AuthenticationError(HTTPException):
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(status_code=401, detail=detail)

class PermissionError(HTTPException):
    def __init__(self, detail: str = "Not enough permissions"):
        super().__init__(status_code=403, detail=detail)
```

## Environment Variables

Required configuration in `.env`:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost/zentropy

# Authentication
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_DAYS=30

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id

# Redis (for rate limiting)
REDIS_URL=redis://localhost:6379

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## Example: Adding a New Authenticated Endpoint

Here's how to add a new feature to the API:

```python
# 1. Create schema in schemas.py
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    team_id: str
    
class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    team_id: str
    created_at: datetime
    
# 2. Add model in database.py (using SQLAlchemy 2.0 typed syntax)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, ForeignKey, DateTime
import uuid
from datetime import datetime

class Project(Base):
    __tablename__ = "projects"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    team: Mapped["Team"] = relationship(back_populates="projects")

# 3. Create router in routers/projects.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db, Project
from ..auth import get_current_user
from ..schemas import ProjectCreate, ProjectResponse

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])

@router.post("/", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new project."""
    # Verify user has access to team
    team = db.query(Team).filter(
        Team.id == project.team_id,
        Team.members.any(user_id=current_user.id)
    ).first()
    
    if not team:
        raise PermissionError("No access to this team")
    
    # Create project
    db_project = Project(**project.dict())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return db_project

@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    team_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List projects accessible to user."""
    query = db.query(Project).join(Team).join(TeamMember).filter(
        TeamMember.user_id == current_user.id
    )
    
    if team_id:
        query = query.filter(Project.team_id == team_id)
    
    return query.all()

# 4. Register router in main.py
from .routers import projects

app.include_router(projects.router)
```

## Testing

Write tests for all API endpoints:

```python
# tests/test_projects.py
def test_create_project(client, test_user, test_team):
    """Test project creation."""
    response = client.post(
        "/api/v1/projects",
        json={
            "name": "New Project",
            "description": "Test project",
            "team_id": str(test_team.id)
        },
        headers={"Authorization": f"Bearer {test_user.token}"}
    )
    
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "New Project"
```

## Performance Considerations

1. **Database Queries**: Use eager loading to avoid N+1 queries
   ```python
   teams = db.query(Team).options(
       joinedload(Team.members),
       joinedload(Team.owner)
   ).all()
   ```

2. **Pagination**: Always paginate list endpoints
   ```python
   @router.get("/items")
   async def list_items(skip: int = 0, limit: int = 100):
       return db.query(Item).offset(skip).limit(limit).all()
   ```

3. **Caching**: Use Redis for frequently accessed data
   ```python
   @cache(expire=300)  # Cache for 5 minutes
   async def get_team_stats(team_id: str):
       # Expensive calculation
       return stats
   ```

## Debugging

Enable debug logging:

```python
# In development
import logging
logging.basicConfig(level=logging.DEBUG)

# FastAPI debug mode
app = FastAPI(debug=True)
```

View API documentation:
- Interactive docs: http://localhost:3000/docs
- ReDoc: http://localhost:3000/redoc

## Related Documentation

- [API Routes Documentation](./routers/README.md)
- [Testing Guide](../tests/README.md)
- [Frontend Integration](../src/client/services/README.md)