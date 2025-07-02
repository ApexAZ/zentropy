from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from ..database import get_db
from ..schemas import CalendarEntryResponse, CalendarEntryCreate, CalendarEntryUpdate, MessageResponse
from ..auth import get_current_active_user
from .. import database

router = APIRouter()

@router.get("/", response_model=List[CalendarEntryResponse])
def get_calendar_entries(
    team_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user)
):
    """Get calendar entries with optional filters"""
    query = db.query(database.CalendarEntry)
    
    # Filter by team if specified
    if team_id:
        query = query.filter(database.CalendarEntry.team_id == team_id)
    else:
        # If no team specified, show user's entries
        query = query.filter(database.CalendarEntry.user_id == current_user.id)
    
    # Filter by date range if specified
    if start_date:
        query = query.filter(database.CalendarEntry.start_date >= start_date)
    if end_date:
        query = query.filter(database.CalendarEntry.end_date <= end_date)
    
    entries = query.order_by(database.CalendarEntry.start_date).all()
    return entries

@router.post("/", response_model=CalendarEntryResponse)
def create_calendar_entry(
    entry_create: CalendarEntryCreate,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user)
):
    """Create a new calendar entry"""
    # Validate that end_date is after start_date
    if entry_create.end_date <= entry_create.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )
    
    # If team_id is specified, check if user is a team member
    if entry_create.team_id:
        membership = db.query(database.TeamMembership).filter(
            database.TeamMembership.team_id == entry_create.team_id,
            database.TeamMembership.user_id == current_user.id
        ).first()
        
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this team"
            )
    
    db_entry = database.CalendarEntry(
        title=entry_create.title,
        description=entry_create.description,
        start_date=entry_create.start_date,
        end_date=entry_create.end_date,
        all_day=entry_create.all_day,
        user_id=current_user.id,
        team_id=entry_create.team_id
    )
    
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    
    return db_entry

@router.get("/{entry_id}", response_model=CalendarEntryResponse)
def get_calendar_entry(
    entry_id: UUID,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user)
):
    """Get calendar entry by ID"""
    entry = db.query(database.CalendarEntry).filter(
        database.CalendarEntry.id == entry_id
    ).first()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar entry not found"
        )
    
    # Check if user has access to this entry
    if entry.user_id != current_user.id:
        # Check if it's a team entry and user is a team member
        if entry.team_id:
            membership = db.query(database.TeamMembership).filter(
                database.TeamMembership.team_id == entry.team_id,
                database.TeamMembership.user_id == current_user.id
            ).first()
            
            if not membership:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view this entry"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this entry"
            )
    
    return entry

@router.put("/{entry_id}", response_model=CalendarEntryResponse)
def update_calendar_entry(
    entry_id: UUID,
    entry_update: CalendarEntryUpdate,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user)
):
    """Update calendar entry"""
    entry = db.query(database.CalendarEntry).filter(
        database.CalendarEntry.id == entry_id
    ).first()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar entry not found"
        )
    
    # Check if user owns this entry
    if entry.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this entry"
        )
    
    update_data = entry_update.dict(exclude_unset=True)
    
    # Validate dates if being updated
    start_date = update_data.get("start_date", entry.start_date)
    end_date = update_data.get("end_date", entry.end_date)
    
    if end_date <= start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )
    
    # Update entry
    for field, value in update_data.items():
        setattr(entry, field, value)
    
    entry.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)
    
    return entry

@router.delete("/{entry_id}", response_model=MessageResponse)
def delete_calendar_entry(
    entry_id: UUID,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user)
):
    """Delete calendar entry"""
    entry = db.query(database.CalendarEntry).filter(
        database.CalendarEntry.id == entry_id
    ).first()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar entry not found"
        )
    
    # Check if user owns this entry
    if entry.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this entry"
        )
    
    db.delete(entry)
    db.commit()
    
    return MessageResponse(message="Calendar entry deleted successfully")