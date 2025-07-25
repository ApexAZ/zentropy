"""
Project API Router (Just-in-Time Organization System)

This router implements project management endpoints that support the
just-in-time organization system where project creation drives organization
assignment decisions and enables frictionless project workflows.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from ..database import (
    get_db,
    Project,
    User,
    Organization,
    ProjectVisibility,
    ProjectStatus,
    UserRole,
)
from ..schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
    MessageResponse,
)
from ..auth import get_current_active_user

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


def validate_project_organization_constraints(
    project_data: dict, current_user: User, db: Session
) -> None:
    """
    Validate project visibility and organization constraints.

    Business rules:
    - Personal projects: organization_id must be None
    - Team projects: organization_id required, user must be member
    - Organization projects: organization_id required, user must be member
    """
    visibility = project_data.get("visibility", ProjectVisibility.INDIVIDUAL)
    organization_id = project_data.get("organization_id")

    if visibility == ProjectVisibility.INDIVIDUAL:
        if organization_id is not None:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Individual projects cannot be assigned to an organization",
            )

    elif visibility in [ProjectVisibility.TEAM, ProjectVisibility.ORGANIZATION]:
        if organization_id is None:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"{visibility.value.title()} projects require an organization",
            )

        # Verify organization exists
        organization = (
            db.query(Organization).filter(Organization.id == organization_id).first()
        )

        if not organization:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Organization not found",
            )

        # Just-in-time organization assignment: if user is not assigned to any
        # organization, automatically assign them to this organization
        if current_user.organization_id is None:
            # Check if organization can accommodate another user
            if not organization.can_add_user(db):
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail="Organization has reached its maximum user capacity",
                )
            # Automatically assign user to organization
            current_user.organization_id = organization_id
            db.commit()
        # Check if user is now a member of the organization or is admin
        elif (
            current_user.organization_id != organization_id
            and current_user.role != UserRole.ADMIN
        ):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail=(
                    "You must be a member of the organization to create "
                    "projects in it"
                ),
            )


def validate_project_name_uniqueness(
    name: str,
    current_user: User,
    organization_id: Optional[UUID],
    db: Session,
    existing_project_id: Optional[UUID] = None,
) -> None:
    """
    Validate project name uniqueness within user/organization scope.

    Project names must be unique within:
    - User's personal projects
    - Organization's projects (if organization-scoped)
    """
    query = db.query(Project).filter(Project.name == name)

    if existing_project_id:
        query = query.filter(Project.id != existing_project_id)

    if organization_id:
        # Check uniqueness within organization
        query = query.filter(Project.organization_id == organization_id)
    else:
        # Check uniqueness within user's personal projects
        query = query.filter(
            and_(
                Project.created_by == current_user.id, Project.organization_id.is_(None)
            )
        )

    existing = query.first()
    if existing:
        scope = "organization" if organization_id else "your individual projects"
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Project name '{name}' already exists in {scope}",
        )


def check_project_access(project: Project, current_user: User) -> bool:
    """
    Check if current user can access the project based on visibility rules.

    Access rules:
    - Personal projects: Only creator can access
    - Team projects: Organization members can access
    - Organization projects: Organization members can access
    - Admins can access all projects
    """
    if current_user.role == UserRole.ADMIN:
        return True

    if project.visibility == ProjectVisibility.INDIVIDUAL:
        return project.created_by == current_user.id

    elif project.visibility in [ProjectVisibility.TEAM, ProjectVisibility.ORGANIZATION]:
        return (
            current_user.organization_id == project.organization_id
            or project.created_by == current_user.id
        )

    return False


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    project: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Create a new project with just-in-time organization workflow support.

    This endpoint supports:
    - Personal projects without organization assignment
    - Team/organization projects with organization assignment
    - Automatic organization assignment during project creation
    """
    # Check if user has projects access
    if not current_user.has_projects_access:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="User does not have projects access",
        )

    project_data = project.model_dump()

    # Validate organization constraints
    validate_project_organization_constraints(project_data, current_user, db)

    # Validate name uniqueness
    validate_project_name_uniqueness(
        project_data["name"], current_user, project_data.get("organization_id"), db
    )

    # Create project using appropriate factory method
    if project.visibility == ProjectVisibility.INDIVIDUAL:
        db_project = Project.create_individual_project(
            name=project.name,
            description=project.description,
            creator_id=current_user.id,
        )
    elif project.visibility == ProjectVisibility.TEAM:
        if project.organization_id is None:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Team projects require an organization ID",
            )
        db_project = Project.create_team_project(
            name=project.name,
            description=project.description,
            creator_id=current_user.id,
            organization_id=project.organization_id,
        )
    elif project.visibility == ProjectVisibility.ORGANIZATION:
        if project.organization_id is None:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Organization projects require an organization ID",
            )
        db_project = Project.create_organization_project(
            name=project.name,
            description=project.description,
            creator_id=current_user.id,
            organization_id=project.organization_id,
        )
    else:
        # Fallback to manual creation
        db_project = Project(
            **project_data,
            created_by=current_user.id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

    # Set any additional fields from project data
    if hasattr(project, "status") and project.status:
        db_project.status = project.status

    db.add(db_project)
    db.commit()
    db.refresh(db_project)

    return ProjectResponse.model_validate(db_project)


@router.get("/", response_model=ProjectListResponse)
async def list_projects(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    status: Optional[ProjectStatus] = Query(None, description="Filter by status"),
    visibility: Optional[ProjectVisibility] = Query(
        None, description="Filter by visibility"
    ),
    organization_id: Optional[UUID] = Query(None, description="Filter by organization"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    List projects accessible to the current user with pagination and filtering.

    Users can see:
    - Their own personal projects
    - Team/organization projects they have access to
    - Projects in organizations they belong to
    """
    offset = (page - 1) * limit

    # Build base query for projects user can access
    if current_user.role == UserRole.ADMIN:
        # Admins can see all projects
        query = db.query(Project)
    else:
        # Regular users can see:
        # 1. Their own personal projects
        # 2. Team/org projects in their organization
        # Build query conditions
        conditions = [Project.created_by == current_user.id]  # Own projects

        # Add organization projects if user belongs to an organization
        if current_user.organization_id is not None:
            conditions.append(
                and_(  # Organization projects
                    Project.organization_id == current_user.organization_id,
                    Project.visibility.in_(
                        [ProjectVisibility.TEAM, ProjectVisibility.ORGANIZATION]
                    ),
                )
            )

        query = db.query(Project).filter(or_(*conditions))

    # Apply filters
    if status:
        query = query.filter(Project.status == status)

    if visibility:
        query = query.filter(Project.visibility == visibility)

    if organization_id:
        query = query.filter(Project.organization_id == organization_id)

    # Order by most recently updated
    query = query.order_by(desc(Project.updated_at))

    # Apply pagination
    total = query.count()
    projects = query.offset(offset).limit(limit).all()

    return ProjectListResponse(
        projects=[ProjectResponse.model_validate(project) for project in projects],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get project by ID with access control."""
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # Check access permissions
    if not check_project_access(project, current_user):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this project",
        )

    return ProjectResponse.model_validate(project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    updates: ProjectUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Update project information.

    Only project creators or organization admins can update projects.
    Supports changing project scope from personal to team/organization.
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # Check modification permissions (stricter than read access)
    if project.created_by != current_user.id and current_user.role != UserRole.ADMIN:
        # TODO: Add organization admin check when roles are implemented
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this project",
        )

    update_data = updates.model_dump(exclude_unset=True)

    # If visibility or organization is being changed, validate constraints
    if "visibility" in update_data or "organization_id" in update_data:
        # Build new project data for validation
        new_project_data = {
            "visibility": update_data.get("visibility", project.visibility),
            "organization_id": update_data.get(
                "organization_id", project.organization_id
            ),
        }
        validate_project_organization_constraints(new_project_data, current_user, db)

    # Validate name uniqueness if name is being changed
    if "name" in update_data and update_data["name"] != project.name:
        new_org_id = update_data.get("organization_id", project.organization_id)
        validate_project_name_uniqueness(
            update_data["name"],
            current_user,
            new_org_id,
            db,
            existing_project_id=project_id,
        )

    # Apply updates
    for field, value in update_data.items():
        setattr(project, field, value)

    project.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(project)

    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}", response_model=MessageResponse)
async def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Delete project.

    Only project creators or admins can delete projects.
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # Check deletion permissions
    if project.created_by != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this project",
        )

    db.delete(project)
    db.commit()

    return MessageResponse(message="Project deleted successfully")


@router.get("/{project_id}/access-check")
async def check_project_access_endpoint(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Check if current user can access a project.

    Utility endpoint for frontend to check access before displaying UI elements.
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    has_access = check_project_access(project, current_user)
    can_modify = (
        project.created_by == current_user.id or current_user.role == UserRole.ADMIN
    )

    return {
        "has_access": has_access,
        "can_modify": can_modify,
        "project_id": str(project_id),
        "visibility": project.visibility.value,
        "is_creator": project.created_by == current_user.id,
    }


@router.post("/{project_id}/archive", response_model=ProjectResponse)
async def archive_project(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Archive a project (set status to archived).

    Convenience endpoint for project lifecycle management.
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # Check modification permissions
    if project.created_by != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Not authorized to archive this project",
        )

    project.status = ProjectStatus.ARCHIVED
    project.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(project)

    return ProjectResponse.model_validate(project)


@router.post("/{project_id}/restore", response_model=ProjectResponse)
async def restore_project(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Restore an archived project (set status to active).

    Convenience endpoint for project lifecycle management.
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # Check modification permissions
    if project.created_by != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Not authorized to restore this project",
        )

    project.status = ProjectStatus.ACTIVE
    project.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(project)

    return ProjectResponse.model_validate(project)


@router.get("/organization/{organization_id}", response_model=ProjectListResponse)
async def list_organization_projects(
    organization_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    status: Optional[ProjectStatus] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    List projects for a specific organization.

    Only organization members or admins can access organization projects.
    """
    # Verify organization exists
    organization = (
        db.query(Organization).filter(Organization.id == organization_id).first()
    )

    if not organization:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Organization not found"
        )

    # Check access permissions
    if (
        current_user.organization_id != organization_id
        and current_user.role != UserRole.ADMIN
    ):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view projects for this organization",
        )

    offset = (page - 1) * limit

    # Build query
    query = db.query(Project).filter(Project.organization_id == organization_id)

    # Apply filters
    if status:
        query = query.filter(Project.status == status)

    # Order by most recently updated
    query = query.order_by(desc(Project.updated_at))

    # Apply pagination
    total = query.count()
    projects = query.offset(offset).limit(limit).all()

    return ProjectListResponse(
        projects=[ProjectResponse.model_validate(project) for project in projects],
        total=total,
        page=page,
        limit=limit,
    )
