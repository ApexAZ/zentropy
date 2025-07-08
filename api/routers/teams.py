from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from typing import List
from uuid import UUID
from datetime import datetime, timezone

from ..database import get_db, UserRole, TeamRole
from ..schemas import (
    TeamResponse,
    TeamCreate,
    TeamUpdate,
    TeamWithMembers,
    MessageResponse,
)
from ..auth import require_projects_access
from .. import database

router = APIRouter()


@router.get("/", response_model=List[TeamResponse])
def get_teams(
    db: Session = Depends(get_db),
    current_user: database.User = Depends(require_projects_access),
) -> List[database.Team]:
    """Get all teams"""
    _ = current_user  # Reserved for future authorization implementation
    teams = db.query(database.Team).all()
    return teams


@router.post("/", response_model=TeamResponse)
def create_team(
    team_create: TeamCreate,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(require_projects_access),
) -> database.Team:
    """Create a new team"""
    db_team = database.Team(
        name=team_create.name,
        description=team_create.description,
        velocity_baseline=team_create.velocity_baseline,
        sprint_length_days=team_create.sprint_length_days,
        working_days_per_week=team_create.working_days_per_week,
        created_by=current_user.id,
    )

    db.add(db_team)
    db.commit()
    db.refresh(db_team)

    # Add creator as team member
    membership = database.TeamMembership(
        team_id=db_team.id, user_id=current_user.id, role=TeamRole.TEAM_ADMIN
    )
    db.add(membership)
    db.commit()

    return db_team


@router.get("/{team_id}", response_model=TeamWithMembers)
def get_team(
    team_id: UUID,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(require_projects_access),
) -> TeamWithMembers:
    """Get team by ID with members"""
    _ = current_user  # Reserved for future authorization implementation
    team = (
        db.query(database.Team)
        .options(selectinload(database.Team.members))
        .filter(database.Team.id == team_id)
        .first()
    )
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )

    # Use Pydantic's from_attributes for efficient serialization
    return TeamWithMembers.model_validate(team)


@router.put("/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: UUID,
    team_update: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(require_projects_access),
) -> database.Team:
    """Update team"""
    team = db.query(database.Team).filter(database.Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )

    # Check if user is team member with admin rights
    membership = (
        db.query(database.TeamMembership)
        .filter(
            database.TeamMembership.team_id == team_id,
            database.TeamMembership.user_id == current_user.id,
            database.TeamMembership.role.in_([TeamRole.TEAM_ADMIN, TeamRole.LEAD]),
        )
        .first()
    )

    if membership is None and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )

    update_data = team_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(team, field, value)

    team.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(team)

    return team


@router.post("/{team_id}/members/{user_id}", response_model=MessageResponse)
def add_team_member(
    team_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(require_projects_access),
) -> MessageResponse:
    """Add user to team"""
    _ = current_user  # Reserved for future authorization implementation
    # Check if team exists
    team = db.query(database.Team).filter(database.Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )

    # Check if user exists
    user = db.query(database.User).filter(database.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Check if user is already a member
    existing_membership = (
        db.query(database.TeamMembership)
        .filter(
            database.TeamMembership.team_id == team_id,
            database.TeamMembership.user_id == user_id,
        )
        .first()
    )

    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a team member",
        )

    # Add membership
    membership = database.TeamMembership(
        team_id=team_id, user_id=user_id, role=TeamRole.MEMBER
    )
    db.add(membership)
    db.commit()

    return MessageResponse(message="User added to team successfully")


@router.delete("/{team_id}/members/{user_id}", response_model=MessageResponse)
def remove_team_member(
    team_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(require_projects_access),
) -> MessageResponse:
    """Remove user from team"""
    _ = current_user  # Reserved for future authorization implementation
    membership = (
        db.query(database.TeamMembership)
        .filter(
            database.TeamMembership.team_id == team_id,
            database.TeamMembership.user_id == user_id,
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User is not a team member"
        )

    db.delete(membership)
    db.commit()

    return MessageResponse(message="User removed from team successfully")
