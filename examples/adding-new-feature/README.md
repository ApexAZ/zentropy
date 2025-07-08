# Example: Adding a New CRUD Feature

This example shows how to add a complete "Projects" feature to Zentropy, demonstrating the full stack implementation from database to UI.

## What You'll Learn

- How to create SQLAlchemy database models
- How to implement RESTful API endpoints with FastAPI
- How to build React components with TypeScript
- How to write comprehensive tests with auto-isolation
- How to follow established Zentropy patterns

## Feature Overview

We'll add a **Projects** feature that allows teams to:
- Create and manage projects
- Assign projects to team members
- Track project status and deadlines
- View project lists and details

## Implementation Steps

### Step 1: Database Model (SQLAlchemy 2.0 Typed Syntax)

Add the Project model to `api/database.py` using the fully-typed SQLAlchemy 2.0 style. This is the standard for our project to ensure type safety with `pyright`.

```python
# Add to existing imports
from enum import Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, ForeignKey, DateTime, Date, CheckConstraint
import uuid
from datetime import datetime, date
from typing import Optional, List

# Add new enum for project status
class ProjectStatus(str, Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

# Add new model using fully-typed syntax
class Project(Base):
    __tablename__ = "projects"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(default=ProjectStatus.PLANNING)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id"))
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    team: Mapped["Team"] = relationship(back_populates="projects")
    creator: Mapped["User"] = relationship(back_populates="created_projects")
    
    # Add validation
    __table_args__ = (
        CheckConstraint('end_date >= start_date', name='valid_date_range'),
    )

# Update existing models to add back-references
# In Team model, add:
# projects: Mapped[List["Project"]] = relationship(back_populates="team")

# In User model, add:
# created_projects: Mapped[List["Project"]] = relationship(back_populates="creator")
```

### Step 2: Pydantic Schemas

Add schemas to `api/schemas.py`:

```python
# Add to existing imports
from datetime import date
from typing import Optional

# Project schemas
class ProjectBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.PLANNING
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    team_id: str

class ProjectCreate(ProjectBase):
    @validator('end_date')
    def validate_end_date(cls, v, values):
        if v and values.get('start_date') and v < values['start_date']:
            raise ValueError('End date must be after start date')
        return v

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    @validator('end_date')
    def validate_end_date(cls, v, values):
        if v and values.get('start_date') and v < values['start_date']:
            raise ValueError('End date must be after start date')
        return v

class ProjectResponse(ProjectBase):
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    
    # Optional related data
    creator: Optional[UserResponse] = None
    team: Optional[TeamResponse] = None
    
    class Config:
        from_attributes = True
```

### Step 3: API Router

Create `api/routers/projects.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date

from ..database import get_db, Project, Team, TeamMembership, TeamRole
from ..auth import get_current_user
from ..schemas import ProjectCreate, ProjectUpdate, ProjectResponse, MessageResponse
from .. import database

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])

@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    project: ProjectCreate,
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new project."""
    # Verify user has access to the team
    team_membership = db.query(TeamMembership).filter(
        TeamMembership.team_id == project.team_id,
        TeamMembership.user_id == current_user.id,
        TeamMembership.role.in_([TeamRole.ADMIN, TeamRole.LEAD])
    ).first()
    
    if not team_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Lead role required to create projects"
        )
    
    # Create project
    db_project = Project(
        **project.dict(),
        created_by=current_user.id
    )
    
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return db_project

@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    team_id: Optional[str] = Query(None),
    status: Optional[ProjectStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List projects accessible to the user."""
    # Build query for projects in teams where user is a member
    query = db.query(Project).join(Team).join(TeamMembership).filter(
        TeamMembership.user_id == current_user.id
    ).options(
        joinedload(Project.creator),
        joinedload(Project.team)
    )
    
    # Apply filters
    if team_id:
        query = query.filter(Project.team_id == team_id)
    
    if status:
        query = query.filter(Project.status == status)
    
    # Order by creation date (newest first)
    query = query.order_by(Project.created_at.desc())
    
    return query.offset(skip).limit(limit).all()

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific project."""
    project = db.query(Project).options(
        joinedload(Project.creator),
        joinedload(Project.team)
    ).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Verify user has access to the project's team
    team_membership = db.query(TeamMembership).filter(
        TeamMembership.team_id == project.team_id,
        TeamMembership.user_id == current_user.id
    ).first()
    
    if not team_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this project"
        )
    
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    updates: ProjectUpdate,
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Verify user has edit permissions
    team_membership = db.query(TeamMembership).filter(
        TeamMembership.team_id == project.team_id,
        TeamMembership.user_id == current_user.id,
        TeamMembership.role.in_([TeamRole.ADMIN, TeamRole.LEAD])
    ).first()
    
    if not team_membership and project.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied to update this project"
        )
    
    # Apply updates
    for field, value in updates.dict(exclude_unset=True).items():
        setattr(project, field, value)
    
    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    
    return project

@router.delete("/{project_id}", response_model=MessageResponse)
async def delete_project(
    project_id: str,
    current_user: database.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Verify user has delete permissions (admin/lead or creator)
    team_membership = db.query(TeamMembership).filter(
        TeamMembership.team_id == project.team_id,
        TeamMembership.user_id == current_user.id,
        TeamMembership.role.in_([TeamRole.ADMIN, TeamRole.LEAD])
    ).first()
    
    if not team_membership and project.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied to delete this project"
        )
    
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted successfully"}
```

### Step 4: Register Router

Add to `api/main.py`:

```python
# Add import
from .routers import projects

# Add router registration (with other routers)
app.include_router(projects.router)
```

### Step 5: Frontend Service

Create `src/client/services/ProjectService.ts`:

```typescript
interface CreateProjectData {
  name: string;
  description?: string;
  status?: ProjectStatus;
  start_date?: string; // ISO date string
  end_date?: string;
  team_id: string;
}

interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  start_date?: string;
  end_date?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  start_date?: string;
  end_date?: string;
  team_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: {
    email: string;
    full_name: string;
  };
  team?: {
    name: string;
  };
}

type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

interface ProjectValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export class ProjectService {
  private static readonly API_BASE = '/api/v1/projects';
  
  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        message: "Unknown error" 
      }));
      throw new Error(
        errorData.detail || 
        errorData.message || 
        `HTTP ${response.status}: ${response.statusText}`
      );
    }
    return response.json();
  }
  
  private static getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }
  
  static async createProject(data: CreateProjectData): Promise<Project> {
    const response = await fetch(this.API_BASE, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    
    return this.handleResponse<Project>(response);
  }
  
  static async getProjects(filters?: {
    team_id?: string;
    status?: ProjectStatus;
    skip?: number;
    limit?: number;
  }): Promise<Project[]> {
    const params = new URLSearchParams();
    if (filters?.team_id) params.append('team_id', filters.team_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.skip) params.append('skip', filters.skip.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const url = `${this.API_BASE}?${params.toString()}`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse<Project[]>(response);
  }
  
  static async getProject(id: string): Promise<Project> {
    const response = await fetch(`${this.API_BASE}/${id}`, {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse<Project>(response);
  }
  
  static async updateProject(id: string, data: UpdateProjectData): Promise<Project> {
    const response = await fetch(`${this.API_BASE}/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    
    return this.handleResponse<Project>(response);
  }
  
  static async deleteProject(id: string): Promise<void> {
    const response = await fetch(`${this.API_BASE}/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    
    await this.handleResponse(response);
  }
  
  static validateProject(data: CreateProjectData): ProjectValidationResult {
    const errors: Record<string, string> = {};
    
    if (!data.name?.trim()) {
      errors.name = 'Project name is required';
    }
    
    if (data.name && data.name.length > 100) {
      errors.name = 'Project name must be less than 100 characters';
    }
    
    if (data.description && data.description.length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
    }
    
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      
      if (endDate <= startDate) {
        errors.end_date = 'End date must be after start date';
      }
    }
    
    if (!data.team_id?.trim()) {
      errors.team_id = 'Team selection is required';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
  
  static getStatusColor(status: ProjectStatus): string {
    const statusColors = {
      planning: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      on_hold: 'bg-orange-100 text-orange-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  }
  
  static formatStatus(status: ProjectStatus): string {
    const statusLabels = {
      planning: 'Planning',
      active: 'Active',
      on_hold: 'On Hold',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    
    return statusLabels[status] || status;
  }
}

export type { Project, ProjectStatus, CreateProjectData, UpdateProjectData };
```

### Step 6: Custom Hook

Create `src/client/hooks/useProjects.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { ProjectService, Project, CreateProjectData, UpdateProjectData, ProjectStatus } from '../services/ProjectService';

interface UseProjectsReturn {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  createProject: (data: CreateProjectData) => Promise<void>;
  updateProject: (id: string, data: UpdateProjectData) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
  filterProjects: (filters: { team_id?: string; status?: ProjectStatus }) => Promise<void>;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const loadProjects = useCallback(async (filters?: { team_id?: string; status?: ProjectStatus }) => {
    try {
      setIsLoading(true);
      setError(null);
      const projectsData = await ProjectService.getProjects(filters);
      setProjects(projectsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const createProject = useCallback(async (data: CreateProjectData) => {
    try {
      setError(null);
      const newProject = await ProjectService.createProject(data);
      setProjects(prev => [newProject, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      throw err;
    }
  }, []);
  
  const updateProject = useCallback(async (id: string, data: UpdateProjectData) => {
    try {
      setError(null);
      const updatedProject = await ProjectService.updateProject(id, data);
      setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
      throw err;
    }
  }, []);
  
  const deleteProject = useCallback(async (id: string) => {
    try {
      setError(null);
      await ProjectService.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      throw err;
    }
  }, []);
  
  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);
  
  return {
    projects,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects: loadProjects,
    filterProjects: loadProjects
  };
}
```

### Step 7: React Components

Create `src/client/components/ProjectCard.tsx`:

```typescript
import React from 'react';
import { Card } from './atoms/Card';
import { Button } from './atoms/Button';
import { Project, ProjectService } from '../services/ProjectService';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };
  
  return (
    <Card
      title={project.name}
      description={project.description}
      data={[
        { label: 'Status', value: ProjectService.formatStatus(project.status) },
        { label: 'Team', value: project.team?.name || 'Unknown' },
        { label: 'Start Date', value: formatDate(project.start_date) },
        { label: 'End Date', value: formatDate(project.end_date) },
        { label: 'Created By', value: project.creator?.full_name || 'Unknown' }
      ]}
      actions={[
        {
          icon: '✏️',
          onClick: () => onEdit(project),
          label: 'Edit Project'
        },
        {
          icon: '🗑️',
          onClick: () => onDelete(project),
          label: 'Delete Project'
        }
      ]}
    >
      <div className="flex items-center gap-2 mt-4">
        <span 
          className={`px-2 py-1 rounded-full text-sm font-medium ${
            ProjectService.getStatusColor(project.status)
          }`}
        >
          {ProjectService.formatStatus(project.status)}
        </span>
        <span className="text-sm text-gray-500">
          Created {new Date(project.created_at).toLocaleDateString()}
        </span>
      </div>
    </Card>
  );
}
```

Create `src/client/components/ProjectForm.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { Input } from './atoms/Input';
import { Button } from './atoms/Button';
import { ProjectService, CreateProjectData, Project, ProjectStatus } from '../services/ProjectService';

interface ProjectFormProps {
  project?: Project; // For editing
  teams: Array<{ id: string; name: string }>;
  onSubmit: (data: CreateProjectData) => Promise<void>;
  onCancel: () => void;
}

export function ProjectForm({ project, teams, onSubmit, onCancel }: ProjectFormProps) {
  const [formData, setFormData] = useState<CreateProjectData>({
    name: '',
    description: '',
    status: 'planning',
    start_date: '',
    end_date: '',
    team_id: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pre-fill form for editing
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || '',
        status: project.status,
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        team_id: project.team_id
      });
    }
  }, [project]);
  
  const handleChange = (field: keyof CreateProjectData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const validation = ProjectService.validateProject(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    
    try {
      setIsSubmitting(true);
      await onSubmit(formData);
    } catch (err) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const statusOptions: Array<{ value: ProjectStatus; label: string }> = [
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Active' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Project Name"
        value={formData.name}
        onChange={(e) => handleChange('name', e.target.value)}
        error={errors.name}
        required
        placeholder="Enter project name"
      />
      
      <Input
        label="Description"
        type="textarea"
        value={formData.description}
        onChange={(e) => handleChange('description', e.target.value)}
        error={errors.description}
        placeholder="Describe the project (optional)"
        rows={3}
      />
      
      <Input
        label="Team"
        type="select"
        value={formData.team_id}
        onChange={(e) => handleChange('team_id', e.target.value)}
        error={errors.team_id}
        required
      >
        <option value="">Select a team</option>
        {teams.map(team => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </Input>
      
      <Input
        label="Status"
        type="select"
        value={formData.status}
        onChange={(e) => handleChange('status', e.target.value as ProjectStatus)}
      >
        {statusOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Input>
      
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start Date"
          type="date"
          value={formData.start_date}
          onChange={(e) => handleChange('start_date', e.target.value)}
          error={errors.start_date}
        />
        
        <Input
          label="End Date"
          type="date"
          value={formData.end_date}
          onChange={(e) => handleChange('end_date', e.target.value)}
          error={errors.end_date}
        />
      </div>
      
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {project ? 'Update Project' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
}
```

### Step 8: Integration Tests

Create comprehensive tests following the existing patterns.

## Database Migration

If using a migration system, create a migration file:

```sql
-- Add to your migration system
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status project_status DEFAULT 'planning',
    start_date DATE,
    end_date DATE,
    team_id UUID NOT NULL REFERENCES teams(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_projects_team_id ON projects(team_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_status ON projects(status);
```

## Testing the Implementation

### 1. Backend Testing

```bash
# Test API endpoints
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Project",
    "description": "A test project",
    "team_id": "TEAM_ID"
  }'
```

### 2. Frontend Testing

```bash
# Start development server
npm run dev

# Navigate to projects page and test:
# - Creating new projects
# - Editing existing projects
# - Deleting projects
# - Filtering by team/status
```

### 3. Automated Tests

```bash
# Run all tests
npm test

# Run specific test files
npm run test:python -- tests/test_projects.py
npm run test:frontend -- src/client/components/__tests__/ProjectCard.test.tsx
```

## Key Patterns Demonstrated

### ✅ **Backend Patterns**
- SQLAlchemy model with relationships
- Pydantic validation with custom validators
- FastAPI router with proper error handling
- Role-based authorization
- Database query optimization with joins

### ✅ **Frontend Patterns**
- Service layer for API abstraction
- Custom hook for state management
- Reusable components with props
- Form handling with validation
- TypeScript interfaces for type safety

### ✅ **Testing Patterns**
- Auto-isolation for database tests
- Component testing with user interactions
- API endpoint testing with authentication
- Error handling test scenarios

### ✅ **Quality Standards**
- Consistent error handling
- Input validation on both client and server
- Proper TypeScript types throughout
- Semantic color system usage
- Accessibility considerations

This example demonstrates the complete Zentropy development workflow while maintaining all established quality and consistency standards.