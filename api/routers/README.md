# API Routers Documentation

## Overview

The Zentropy API routers implement RESTful endpoints using FastAPI with consistent patterns for authentication, error handling, and data validation. All routes use the `/api/v1/` versioning structure.

## Router Structure

```
api/routers/
├── auth.py              # Authentication & user registration
├── calendar_entries.py  # Calendar/task management
├── invitations.py       # Team invitation system
├── teams.py            # Team management
└── projects.py         # Project management
└── README.md           # This documentation
```

## Common Patterns

### Standard Router Setup

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone # Added datetime, timezone

from ..database import get_db
from ..schemas import ResponseModel, CreateModel
from ..auth import get_current_user
from .. import database

router = APIRouter(prefix="/api/v1/resource", tags=["resource"])
```

### Authentication Dependencies

```python
# Basic authenticated user
current_user: User = Depends(get_current_user)

# Active user verification  
current_user: User = Depends(get_current_active_user)

# Project-specific permissions
Depends(require_projects_access)
```

### RESTful Endpoint Patterns

```python
# List resources with filtering
@router.get("/", response_model=List[ResourceResponse])
async def list_resources(
    skip: int = 0,
    limit: int = 100,
    team_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Resource).filter(Resource.user_id == current_user.id)
    if team_id:
        query = query.filter(Resource.team_id == team_id)
    return query.offset(skip).limit(limit).all()

# Create resource
@router.post("/", response_model=ResourceResponse, status_code=201)
async def create_resource(
    resource: ResourceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_resource = database.Resource(**resource.dict(), user_id=current_user.id)
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource

# Get specific resource
@router.get("/{resource_id}", response_model=ResourceResponse)
async def get_resource(
    resource_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resource = db.query(database.Resource).filter(
        database.Resource.id == resource_id,
        database.Resource.user_id == current_user.id
    ).first()
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found"
        )
    return resource

# Update resource
@router.put("/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    resource_id: str,
    updates: ResourceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resource = db.query(database.Resource).filter(
        database.Resource.id == resource_id,
        database.Resource.user_id == current_user.id
    ).first()
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found"
        )
    
    for field, value in updates.dict(exclude_unset=True).items():
        setattr(resource, field, value)
    
    resource.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(resource)
    return resource

# Delete resource
@router.delete("/{resource_id}", response_model=MessageResponse)
async def delete_resource(
    resource_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resource = db.query(database.Resource).filter(
        database.Resource.id == resource_id,
        database.Resource.user_id == current_user.id
    ).first()
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found"
        )
    
    db.delete(resource)
    db.commit()
    return {"message": "Resource deleted successfully"}
```

## Error Handling

### Standard HTTP Status Codes

```python
# 400 - Validation errors
raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Invalid input data"
)

# 401 - Authentication required
raise HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Authentication required",
    headers={"WWW-Authenticate": "Bearer"}
)

# 403 - Permission denied
raise HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Not enough permissions"
)

# 404 - Resource not found
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Resource not found"
)

# 429 - Rate limiting
raise HTTPException(
    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
    detail="Too many requests"
)
```

### Business Logic Validation

```python
# Date validation
if end_date <= start_date:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="End date must be after start date"
    )

# Duplicate prevention
existing = db.query(Model).filter(
    Model.email == email,
    Model.team_id == team_id
).first()
if existing:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Resource already exists"
    )

# Permission verification
if resource.user_id != current_user.id:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to access this resource"
    )
```

## Security Features

### Rate Limiting

```python
from ..rate_limiter import rate_limit

@router.post("/login")
@rate_limit(max_requests=5, window_seconds=300)  # 5 attempts per 5 minutes
async def login():
    pass

@router.post("/send-verification")
@rate_limit(max_requests=3, window_seconds=3600)  # 3 emails per hour
async def send_verification():
    pass
```

### Input Validation

```python
# Email normalization
email = email.lower().strip()

# Password strength validation
if not validate_password_strength(password, user_data):
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Password does not meet security requirements"
    )
```

## Router Examples

### Authentication Router

```python
from pydantic import BaseModel
from typing import Optional
from fastapi import Request # Added Request import

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse # Assuming UserResponse is defined elsewhere

@router.post("/register", response_model=AuthResponse, status_code=201)
@rate_limit(max_requests=5, window_seconds=3600)
async def register(
    user: UserCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    # Check if user exists
    existing_user = db.query(database.User).filter(
        database.User.email == user.email.lower()
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password
    if not validate_password_strength(user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password does not meet requirements"
        )
    
    # Create user
    hashed_password = get_password_hash(user.password)
    db_user = database.User(
        email=user.email.lower(),
        hashed_password=hashed_password,
        full_name=user.full_name
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Generate tokens
    access_token = create_access_token({"sub": db_user.email})
    
    return AuthResponse( # Return AuthResponse instance
        access_token=access_token,
        token_type="bearer",
        user=db_user
    )
```

### Teams Router

```python
@router.post("/{team_id}/members/{user_id}", response_model=MessageResponse)
async def add_team_member(
    team_id: str,
    user_id: str,
    role: TeamRole,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify team exists and user has admin rights
    team = db.query(database.Team).filter(
        database.Team.id == team_id
    ).first()
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    # Check if current user is admin
    membership = db.query(database.TeamMembership).filter(
        database.TeamMembership.team_id == team_id,
        database.TeamMembership.user_id == current_user.id,
        database.TeamMembership.role.in_([TeamRole.ADMIN, TeamRole.LEAD])
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    # Add member
    new_membership = database.TeamMembership(
        team_id=team_id,
        user_id=user_id,
        role=role
    )
    
    db.add(new_membership)
    db.commit()
    
    return {"message": "Member added successfully"}
```

## Best Practices

### 1. **Consistent Response Models**

```python
# Use typed Pydantic models
@router.get("/", response_model=List[ResourceResponse])
@router.post("/", response_model=ResourceResponse, status_code=201)
@router.delete("/", response_model=MessageResponse)
```

### 2. **Proper Database Transactions**

```python
try:
    # Multiple operations
    db.add(resource1)
    db.add(resource2)
    db.commit()
except Exception:
    db.rollback()
    raise
```

### 3. **Query Optimization**

```python
# Use query-level filtering
query = db.query(Resource).filter(Resource.user_id == current_user.id)

# Avoid N+1 queries with joins
resources = db.query(Resource).options(
    joinedload(Resource.team),
    joinedload(Resource.creator)
).all()
```

### 4. **Pagination**

```python
@router.get("/", response_model=PaginatedResponse[ResourceResponse])
async def list_resources(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    resources = db.query(Resource).offset(skip).limit(limit).all()
    total = db.query(Resource).count()
    
    return {
        "items": resources,
        "total": total,
        "skip": skip,
        "limit": limit
    }
```

## Testing Router Endpoints

```python
def test_create_resource(client, auth_headers):
    """Test resource creation."""
    response = client.post(
        "/api/v1/resources",
        json={
            "name": "Test Resource",
            "description": "Test description"
        },
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Resource"
    assert "id" in data

def test_unauthorized_access(client):
    """Test that unauthorized requests are rejected."""
    response = client.get("/api/v1/resources")
    assert response.status_code == 401

def test_rate_limiting(client):
    """Test rate limiting on sensitive endpoints."""
    # Make requests up to limit
    for _ in range(5):
        response = client.post("/api/v1/auth/login", json={
            "username": "test@example.com",
            "password": "wrong"
        })
        assert response.status_code in [400, 401]
    
    # Next request should be rate limited
    response = client.post("/api/v1/auth/login", json={
        "username": "test@example.com", 
        "password": "wrong"
    })
    assert response.status_code == 429
```

## Related Documentation

- [Core API Documentation](../README.md)
- [Authentication Guide](../auth.py)
- [Database Models](../database.py)
- [Testing Guide](../../tests/README.md)