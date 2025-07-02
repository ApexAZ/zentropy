from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime

from ..database import get_db, UserRole, TeamRole
from ..schemas import (
    TeamResponse,
    TeamCreate,
    TeamUpdate,
    TeamWithMembers,
    MessageResponse,
)
from ..auth import get_current_active_user
from .. import database

router = APIRouter()


@router.get("/", response_model=List[TeamResponse])
def get_teams(
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> List[database.Team]:
    """Get all teams"""
    teams = db.query(database.Team).all()
    return teams


@router.post("/", response_model=TeamResponse)
def create_team(
    team_create: TeamCreate,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
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
        team_id=db_team.id, user_id=current_user.id, role=TeamRole.ADMIN
    )
    db.add(membership)
    db.commit()

    return db_team


@router.get("/{team_id}", response_model=TeamWithMembers)
def get_team(
    team_id: UUID,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> TeamWithMembers:
    """Get team by ID with members"""
    team = db.query(database.Team).filter(database.Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )

    # Get team members
    members = (
        db.query(database.User)
        .join(database.TeamMembership)
        .filter(database.TeamMembership.team_id == team_id)
        .all()
    )

    team_with_members = TeamWithMembers(
        id=team.id,  # type: ignore
        name=team.name,  # type: ignore
        description=team.description,  # type: ignore
        velocity_baseline=team.velocity_baseline,  # type: ignore
        sprint_length_days=team.sprint_length_days,  # type: ignore
        working_days_per_week=team.working_days_per_week,  # type: ignore
        created_by=team.created_by,  # type: ignore
        created_at=team.created_at,  # type: ignore
        updated_at=team.updated_at,  # type: ignore
        members=members,  # type: ignore
    )

    return team_with_members


@router.put("/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: UUID,
    team_update: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
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
            database.TeamMembership.role.in_([TeamRole.ADMIN, TeamRole.LEAD]),
        )
        .first()
    )

    if not membership and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )

    update_data = team_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(team, field, value)

    team.updated_at = datetime.utcnow()  # type: ignore
    db.commit()
    db.refresh(team)

    return team


@router.post("/{team_id}/members/{user_id}", response_model=MessageResponse)
def add_team_member(
    team_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> MessageResponse:
    """Add user to team"""
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
    current_user: database.User = Depends(get_current_active_user),
) -> MessageResponse:
    """Remove user from team"""
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
