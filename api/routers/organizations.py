"""
Organization API Router (Just-in-Time Organization System)

This router implements organization management endpoints that support the
just-in-time organization system where organization creation/assignment
is deferred to project creation time.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
import re
from pydantic import BaseModel, EmailStr

from ..database import get_db, Organization, User, OrganizationScope, UserRole
from ..schemas import OrganizationResponse, MessageResponse
from ..auth import get_current_active_user

router = APIRouter(prefix="/api/v1/organizations", tags=["organizations"])


# Organization Domain Checking Schemas


class OrganizationSuggestion(BaseModel):
    action: str  # "join", "create", or "personal"
    can_join: bool = False
    can_create: bool = False
    suggested_name: Optional[str] = None
    message: str


class DomainCheckResponse(BaseModel):
    domain_found: bool
    domain: str
    organization: Optional[OrganizationResponse] = None
    suggestions: OrganizationSuggestion


class OrganizationBase(BaseModel):
    name: str
    domain: Optional[str] = None
    scope: OrganizationScope = OrganizationScope.SHARED
    max_users: Optional[int] = None
    description: Optional[str] = None


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    scope: Optional[OrganizationScope] = None
    max_users: Optional[int] = None
    description: Optional[str] = None


class OrganizationListResponse(BaseModel):
    organizations: List[OrganizationResponse]
    total: int
    page: int = 1
    limit: int = 50


class JoinOrganizationResponse(BaseModel):
    message: str
    status: str
    organization_id: str


# Domain checking utilities
PERSONAL_EMAIL_DOMAINS = {
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "protonmail.com",
    "aol.com",
    "mail.com",
    "yandex.com",
    "zoho.com",
}


def extract_domain_from_email(email: str) -> str:
    """Extract domain from email address."""
    try:
        return email.split("@")[1].lower()
    except (IndexError, AttributeError):
        raise ValueError("Invalid email format")


def is_personal_email_domain(domain: str) -> bool:
    """Check if domain is a personal email provider."""
    return domain.lower() in PERSONAL_EMAIL_DOMAINS


def generate_organization_name_suggestion(domain: str) -> str:
    """Generate organization name suggestion from domain."""
    # Remove common TLD extensions and convert to title case
    name = domain.split(".")[0]
    # Remove hyphens and underscores
    name = re.sub(r"[-_]", " ", name)
    return name.lower()


@router.get("/check-domain", response_model=DomainCheckResponse)
async def check_organization_domain(
    email: EmailStr = Query(..., description="Email address to check domain for"),
    db: Session = Depends(get_db),
):
    """
    Check if an organization exists for the given email domain.

    This endpoint supports the just-in-time organization workflow by:
    1. Extracting domain from email address
    2. Checking if organization exists for that domain
    3. Providing suggestions for next steps (join, create, or personal)
    """
    try:
        domain = extract_domain_from_email(email)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email format"
        )

    # Check if it's a personal email domain
    if is_personal_email_domain(domain):
        return DomainCheckResponse(
            domain_found=False,
            domain=domain,
            organization=None,
            suggestions=OrganizationSuggestion(
                action="personal",
                can_join=False,
                can_create=False,
                message=(
                    "Personal email domain detected. Consider creating personal "
                    "projects or use a business email domain."
                ),
            ),
        )

    # Look for existing organization with this domain
    organization = db.query(Organization).filter(Organization.domain == domain).first()

    if organization:
        # Organization exists - suggest joining
        return DomainCheckResponse(
            domain_found=True,
            domain=domain,
            organization=OrganizationResponse.model_validate(organization),
            suggestions=OrganizationSuggestion(
                action="join",
                can_join=True,
                can_create=False,
                message=(
                    f"Organization '{organization.name}' exists for {domain}. "
                    "You can request to join."
                ),
            ),
        )
    else:
        # No organization exists - suggest creating
        suggested_name = generate_organization_name_suggestion(domain)
        return DomainCheckResponse(
            domain_found=False,
            domain=domain,
            organization=None,
            suggestions=OrganizationSuggestion(
                action="create",
                can_join=False,
                can_create=True,
                suggested_name=suggested_name,
                message=(
                    f"No organization found for {domain}. "
                    "You can create a new organization."
                ),
            ),
        )


@router.post("/", response_model=OrganizationResponse, status_code=201)
async def create_organization(
    organization: OrganizationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Create a new organization.

    Business rules:
    - Personal scope: max_users must be 1 or None (defaults to 1)
    - Enterprise scope: only admins can create, max_users must be None
    - Shared scope: default for regular users, configurable max_users
    - Domain and name must be unique if provided
    """
    # Validate scope-specific rules
    if organization.scope == OrganizationScope.PERSONAL:
        if organization.max_users is not None and organization.max_users > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Personal organizations cannot have more than 1 user",
            )
        organization.max_users = 1

    elif organization.scope == OrganizationScope.ENTERPRISE:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can create enterprise organizations",
            )
        organization.max_users = None  # Unlimited

    # Check for existing organization with same domain
    if organization.domain:
        existing_domain = (
            db.query(Organization)
            .filter(Organization.domain == organization.domain)
            .first()
        )
        if existing_domain:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Organization with domain '{organization.domain}' "
                    "already exists"
                ),
            )

    # Check for existing organization with same name
    existing_name = (
        db.query(Organization).filter(Organization.name == organization.name).first()
    )
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Organization with name '{organization.name}' already exists",
        )

    # Create organization
    db_organization = Organization(
        **organization.model_dump(),
        created_by=current_user.id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(db_organization)
    db.commit()
    db.refresh(db_organization)

    # Automatically assign the creator to the organization
    current_user.organization_id = db_organization.id
    db.commit()

    return OrganizationResponse.model_validate(db_organization)


@router.get("/", response_model=OrganizationListResponse)
async def list_organizations(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    scope: Optional[OrganizationScope] = Query(None, description="Filter by scope"),
    domain: Optional[str] = Query(None, description="Filter by domain"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    List organizations with pagination and filtering.

    Users can see:
    - Organizations they are members of
    - Public organizations (for joining)
    - Organizations they created
    """
    offset = (page - 1) * limit

    # Build query
    query = db.query(Organization)

    # Apply filters
    if scope:
        query = query.filter(Organization.scope == scope)

    if domain:
        query = query.filter(Organization.domain.ilike(f"%{domain}%"))

    # Apply pagination
    total = query.count()
    organizations = query.offset(offset).limit(limit).all()

    return OrganizationListResponse(
        organizations=[
            OrganizationResponse.model_validate(org) for org in organizations
        ],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{organization_id}", response_model=OrganizationResponse)
async def get_organization(
    organization_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get organization by ID."""
    organization = (
        db.query(Organization).filter(Organization.id == organization_id).first()
    )

    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
        )

    return OrganizationResponse.model_validate(organization)


@router.put("/{organization_id}", response_model=OrganizationResponse)
async def update_organization(
    organization_id: UUID,
    updates: OrganizationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Update organization information.

    Only organization members or admins can update organization details.
    """
    organization = (
        db.query(Organization).filter(Organization.id == organization_id).first()
    )

    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
        )

    # Check permissions: user must be member, creator, or admin
    if (
        current_user.organization_id != organization_id
        and organization.created_by != current_user.id
        and current_user.role != UserRole.ADMIN
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this organization",
        )

    # Apply updates
    update_data = updates.model_dump(exclude_unset=True)

    # Validate scope changes
    if "scope" in update_data:
        new_scope = update_data["scope"]
        if (
            new_scope == OrganizationScope.ENTERPRISE
            and current_user.role != UserRole.ADMIN
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can change organization to enterprise scope",
            )

    # Validate domain uniqueness if changing
    if "domain" in update_data and update_data["domain"] != organization.domain:
        existing_domain = (
            db.query(Organization)
            .filter(
                and_(
                    Organization.domain == update_data["domain"],
                    Organization.id != organization_id,
                )
            )
            .first()
        )
        if existing_domain:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Domain '{update_data['domain']}' is already in use",
            )

    # Apply updates
    for field, value in update_data.items():
        setattr(organization, field, value)

    organization.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(organization)

    return OrganizationResponse.model_validate(organization)


@router.delete("/{organization_id}", response_model=MessageResponse)
async def delete_organization(
    organization_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Delete organization.

    Only organization creators or admins can delete organizations.
    Cannot delete if organization has active members.
    """
    organization = (
        db.query(Organization).filter(Organization.id == organization_id).first()
    )

    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
        )

    # Check permissions
    if (
        organization.created_by != current_user.id
        and current_user.role != UserRole.ADMIN
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this organization",
        )

    # Check if organization has active members
    member_count = (
        db.query(User)
        .filter(and_(User.organization_id == organization_id, User.is_active))
        .count()
    )

    if member_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot delete organization with {member_count} active "
                "members. Remove all members first."
            ),
        )

    db.delete(organization)
    db.commit()

    return MessageResponse(message="Organization deleted successfully")


@router.post("/{organization_id}/join", response_model=JoinOrganizationResponse)
async def join_organization(
    organization_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Request to join an organization.

    This endpoint supports the just-in-time organization workflow by
    allowing users to request organization membership during project creation.
    """
    organization = (
        db.query(Organization).filter(Organization.id == organization_id).first()
    )

    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
        )

    # Check if user is already a member
    if current_user.organization_id == organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this organization",
        )

    # Check if user is already assigned to another organization
    if current_user.organization_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already assigned to another organization",
        )

    # Check organization capacity
    if organization.max_users is not None:
        current_member_count = (
            db.query(User)
            .filter(and_(User.organization_id == organization_id, User.is_active))
            .count()
        )

        if current_member_count >= organization.max_users:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization has reached maximum capacity",
            )

    # For now, auto-assign user to organization
    # In a full implementation, this might create a join request for approval
    current_user.organization_id = organization_id
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()

    return JoinOrganizationResponse(
        message=f"Successfully joined organization '{organization.name}'",
        status="approved",
        organization_id=str(organization_id),
    )


@router.post("/{organization_id}/leave", response_model=MessageResponse)
async def leave_organization(
    organization_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Leave an organization.

    Users can leave organizations unless they are the sole creator/admin.
    """
    organization = (
        db.query(Organization).filter(Organization.id == organization_id).first()
    )

    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
        )

    # Check if user is actually a member
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are not a member of this organization",
        )

    # Check if user is the creator and sole member
    if organization.created_by == current_user.id:
        member_count = (
            db.query(User)
            .filter(and_(User.organization_id == organization_id, User.is_active))
            .count()
        )

        if member_count == 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Cannot leave organization as sole creator. Delete the "
                    "organization or transfer ownership first."
                ),
            )

    # Remove user from organization
    current_user.organization_id = None
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()

    return MessageResponse(
        message=f"Successfully left organization '{organization.name}'"
    )
