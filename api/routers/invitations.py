from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime, timedelta, timezone

from ..database import get_db, TeamRole, InvitationStatus
from ..schemas import TeamInvitationResponse, TeamInvitationCreate, MessageResponse
from ..auth import get_current_active_user
from .. import database

router = APIRouter()


@router.get("/", response_model=List[TeamInvitationResponse])
def get_invitations(
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> List[database.TeamInvitation]:
    """Get invitations for current user"""
    invitations = (
        db.query(database.TeamInvitation)
        .filter(
            database.TeamInvitation.email == current_user.email,
            database.TeamInvitation.status == InvitationStatus.PENDING,
            database.TeamInvitation.expires_at > datetime.now(timezone.utc),
        )
        .all()
    )

    return invitations


@router.post("/", response_model=TeamInvitationResponse)
def create_invitation(
    invitation_create: TeamInvitationCreate,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> database.TeamInvitation:
    """Create a team invitation"""
    # Check if team exists
    team = (
        db.query(database.Team)
        .filter(database.Team.id == invitation_create.team_id)
        .first()
    )

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )

    # Check if user has permission to invite (team admin/lead)
    membership = (
        db.query(database.TeamMembership)
        .filter(
            database.TeamMembership.team_id == invitation_create.team_id,
            database.TeamMembership.user_id == current_user.id,
            database.TeamMembership.role.in_([TeamRole.TEAM_ADMIN, TeamRole.LEAD]),
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to invite users to this team",
        )

    # Check if user is already a team member
    invited_user = (
        db.query(database.User)
        .filter(database.User.email == invitation_create.email.lower())
        .first()
    )

    if invited_user:
        existing_membership = (
            db.query(database.TeamMembership)
            .filter(
                database.TeamMembership.team_id == invitation_create.team_id,
                database.TeamMembership.user_id == invited_user.id,
            )
            .first()
        )

        if existing_membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a team member",
            )

    # Check for existing pending invitation
    existing_invitation = (
        db.query(database.TeamInvitation)
        .filter(
            database.TeamInvitation.team_id == invitation_create.team_id,
            database.TeamInvitation.email == invitation_create.email.lower(),
            database.TeamInvitation.status == InvitationStatus.PENDING,
            database.TeamInvitation.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )

    if existing_invitation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pending invitation already exists for this user",
        )

    # Create invitation
    db_invitation = database.TeamInvitation(
        team_id=invitation_create.team_id,
        email=invitation_create.email.lower(),
        role=invitation_create.role,
        invited_by=current_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),  # 7 days to accept
    )

    db.add(db_invitation)
    db.commit()
    db.refresh(db_invitation)

    return db_invitation


@router.post("/{invitation_id}/accept", response_model=MessageResponse)
def accept_invitation(
    invitation_id: UUID,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> MessageResponse:
    """Accept a team invitation"""
    invitation = (
        db.query(database.TeamInvitation)
        .filter(
            database.TeamInvitation.id == invitation_id,
            database.TeamInvitation.email == current_user.email,
            database.TeamInvitation.status == InvitationStatus.PENDING,
            database.TeamInvitation.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or expired",
        )

    # Check if user is already a team member
    existing_membership = (
        db.query(database.TeamMembership)
        .filter(
            database.TeamMembership.team_id == invitation.team_id,
            database.TeamMembership.user_id == current_user.id,
        )
        .first()
    )

    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this team",
        )

    # Create team membership
    membership = database.TeamMembership(
        team_id=invitation.team_id, user_id=current_user.id, role=invitation.role
    )
    db.add(membership)

    # Update invitation status
    invitation.status = InvitationStatus.ACCEPTED
    invitation.updated_at = datetime.now(timezone.utc)

    db.commit()

    return MessageResponse(message="Invitation accepted successfully")


@router.post("/{invitation_id}/decline", response_model=MessageResponse)
def decline_invitation(
    invitation_id: UUID,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> MessageResponse:
    """Decline a team invitation"""
    invitation = (
        db.query(database.TeamInvitation)
        .filter(
            database.TeamInvitation.id == invitation_id,
            database.TeamInvitation.email == current_user.email,
            database.TeamInvitation.status == InvitationStatus.PENDING,
        )
        .first()
    )

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found"
        )

    # Update invitation status
    invitation.status = InvitationStatus.DECLINED
    invitation.updated_at = datetime.now(timezone.utc)

    db.commit()

    return MessageResponse(message="Invitation declined successfully")
