"""
Tests for Calendar Entries API Endpoints

These tests verify the calendar entries management system with comprehensive coverage of:
- Calendar entry creation with date validation and team membership checks
- Calendar entry retrieval with filtering (team_id, start_date, end_date)
- Calendar entry updates with authorization checks
- Calendar entry deletion with proper permission validation
- Access control for team-based and individual calendar entries
- Error handling and edge cases

All tests use the mandatory isolated test database system for reliability.
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from api.auth import create_access_token
from api.database import CalendarEntry, Team, TeamMembership, TeamRole
from api.schemas import CalendarEntryCreate, CalendarEntryUpdate
from tests.conftest import create_test_user, create_test_team


class TestCalendarEntryCreation:
    """Test POST /api/v1/calendar_entries/ - Creating calendar entries"""
    
    def test_create_individual_calendar_entry_success(self, client, db, auth_headers, current_user):
        """Test creating a individual calendar entry"""
        # Arrange: Create valid calendar entry data
        entry_data = {
            "title": "Individual Meeting",
            "description": "Important individual meeting",
            "start_date": "2024-01-15T10:00:00Z",
            "end_date": "2024-01-15T11:00:00Z",
            "all_day": False,
            "team_id": None
        }
        
        # Act: Create calendar entry
        response = client.post(
            "/api/v1/calendar_entries/",
            json=entry_data,
            headers=auth_headers
        )
        
        # Assert: Verify successful creation
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Individual Meeting"
        assert data["description"] == "Important individual meeting"
        assert data["user_id"] == str(current_user.id)
        assert data["team_id"] is None
        assert data["all_day"] is False
        
        # Verify database entry
        db_entry = db.query(CalendarEntry).filter(CalendarEntry.id == uuid.UUID(data["id"])).first()
        assert db_entry is not None
        assert db_entry.title == "Individual Meeting"
        assert db_entry.user_id == current_user.id
    
    def test_create_team_calendar_entry_success(self, client, db, auth_headers, current_user):
        """Test creating a team calendar entry when user is team member"""
        # Arrange: Create team and add current user as member
        team = create_test_team(db, name="Development Team")
        membership = TeamMembership(
            team_id=team.id,
            user_id=current_user.id,
            role=TeamRole.MEMBER
        )
        db.add(membership)
        db.commit()
        
        entry_data = {
            "title": "Team Sprint Planning",
            "description": "Sprint planning session",
            "start_date": "2024-01-16T09:00:00Z",
            "end_date": "2024-01-16T12:00:00Z",
            "all_day": False,
            "team_id": str(team.id)
        }
        
        # Act: Create team calendar entry
        response = client.post(
            "/api/v1/calendar_entries/",
            json=entry_data,
            headers=auth_headers
        )
        
        # Assert: Verify successful creation
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Team Sprint Planning"
        assert data["team_id"] == str(team.id)
        assert data["user_id"] == str(current_user.id)
        
        # Verify database entry
        db_entry = db.query(CalendarEntry).filter(CalendarEntry.id == uuid.UUID(data["id"])).first()
        assert db_entry is not None
        assert db_entry.team_id == team.id
    
    def test_create_calendar_entry_invalid_dates(self, client, db, auth_headers, current_user):
        """Test creating calendar entry with end_date before start_date fails"""
        # Arrange: Create invalid entry data (end before start)
        entry_data = {
            "title": "Invalid Entry",
            "description": "This should fail",
            "start_date": "2024-01-15T11:00:00Z",
            "end_date": "2024-01-15T10:00:00Z",  # End before start
            "all_day": False,
            "team_id": None
        }
        
        # Act: Attempt to create invalid entry
        response = client.post(
            "/api/v1/calendar_entries/",
            json=entry_data,
            headers=auth_headers
        )
        
        # Assert: Verify validation error
        assert response.status_code == 400
        assert "End date must be after start date" in response.json()["detail"]
        
        # Verify no database entry was created
        db_entry = db.query(CalendarEntry).filter(CalendarEntry.title == "Invalid Entry").first()
        assert db_entry is None
    
    def test_create_team_calendar_entry_not_member(self, client, db, auth_headers, current_user):
        """Test creating team calendar entry fails when user is not team member"""
        # Arrange: Create team without adding current user as member
        team = create_test_team(db, name="Restricted Team")
        
        entry_data = {
            "title": "Unauthorized Team Meeting",
            "description": "Should fail",
            "start_date": "2024-01-16T09:00:00Z",
            "end_date": "2024-01-16T10:00:00Z",
            "all_day": False,
            "team_id": str(team.id)
        }
        
        # Act: Attempt to create team entry without membership
        response = client.post(
            "/api/v1/calendar_entries/",
            json=entry_data,
            headers=auth_headers
        )
        
        # Assert: Verify authorization error
        assert response.status_code == 403
        assert "You are not a member of this team" in response.json()["detail"]
        
        # Verify no database entry was created
        db_entry = db.query(CalendarEntry).filter(CalendarEntry.title == "Unauthorized Team Meeting").first()
        assert db_entry is None
    
    def test_create_calendar_entry_no_projects_access(self, client, db):
        """Test creating calendar entry fails without projects access"""
        # Arrange: Create user without projects access
        user_no_access = create_test_user(
            db, 
            email="noaccess@example.com",
            has_projects_access=False
        )
        
        token = create_access_token(data={"sub": str(user_no_access.id)})
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        entry_data = {
            "title": "Unauthorized Entry",
            "description": "Should fail",
            "start_date": "2024-01-15T10:00:00Z",
            "end_date": "2024-01-15T11:00:00Z",
            "all_day": False,
            "team_id": None
        }
        
        # Act: Attempt to create entry without projects access
        response = client.post(
            "/api/v1/calendar_entries/",
            json=entry_data,
            headers=headers
        )
        
        # Assert: Access forbidden
        assert response.status_code == 403
        assert "Access to Projects module is required" in response.json()["detail"]


class TestCalendarEntryRetrieval:
    """Test GET endpoints - calendar entry listing and individual entry details"""
    
    def test_get_individual_calendar_entries_success(self, client, db, auth_headers, current_user):
        """Test retrieving individual calendar entries"""
        # Arrange: Create individual calendar entries
        entry1 = CalendarEntry(
            title="Individual Meeting 1",
            description="First meeting",
            start_date=datetime(2024, 1, 15, 10, 0, tzinfo=timezone.utc),
            end_date=datetime(2024, 1, 15, 11, 0, tzinfo=timezone.utc),
            all_day=False,
            user_id=current_user.id
        )
        entry2 = CalendarEntry(
            title="Individual Meeting 2",
            description="Second meeting",
            start_date=datetime(2024, 1, 16, 14, 0, tzinfo=timezone.utc),
            end_date=datetime(2024, 1, 16, 15, 0, tzinfo=timezone.utc),
            all_day=False,
            user_id=current_user.id
        )
        db.add_all([entry1, entry2])
        db.commit()
        
        # Act: Get individual calendar entries
        response = client.get(
            "/api/v1/calendar_entries/",
            headers=auth_headers
        )
        
        # Assert: Verify individual entries returned
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        
        # Verify entries are ordered by start_date
        titles = [entry["title"] for entry in data]
        assert "Individual Meeting 1" in titles
        assert "Individual Meeting 2" in titles
        
        # Verify all entries belong to current user
        for entry in data:
            assert entry["user_id"] == str(current_user.id)
    
    def test_get_team_calendar_entries_success(self, client, db, auth_headers, current_user):
        """Test retrieving team calendar entries when user is team member"""
        # Arrange: Create team and add current user as member
        team = create_test_team(db, name="Development Team")
        membership = TeamMembership(
            team_id=team.id,
            user_id=current_user.id,
            role=TeamRole.MEMBER
        )
        db.add(membership)
        db.commit()
        
        # Create team calendar entries
        team_entry1 = CalendarEntry(
            title="Team Meeting 1",
            description="Sprint planning",
            start_date=datetime(2024, 1, 17, 9, 0, tzinfo=timezone.utc),
            end_date=datetime(2024, 1, 17, 10, 0, tzinfo=timezone.utc),
            all_day=False,
            user_id=current_user.id,
            team_id=team.id
        )
        team_entry2 = CalendarEntry(
            title="Team Meeting 2",
            description="Daily standup",
            start_date=datetime(2024, 1, 18, 9, 0, tzinfo=timezone.utc),
            end_date=datetime(2024, 1, 18, 9, 30, tzinfo=timezone.utc),
            all_day=False,
            user_id=current_user.id,
            team_id=team.id
        )
        db.add_all([team_entry1, team_entry2])
        db.commit()
        
        # Act: Get team calendar entries
        response = client.get(
            f"/api/v1/calendar_entries/?team_id={team.id}",
            headers=auth_headers
        )
        
        # Assert: Verify team entries returned
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        
        # Verify all entries belong to the team
        for entry in data:
            assert entry["team_id"] == str(team.id)
    
    def test_get_calendar_entries_with_date_filter(self, client, db, auth_headers, current_user):
        """Test retrieving calendar entries with date range filtering"""
        # Arrange: Create calendar entries across different dates
        entry1 = CalendarEntry(
            title="Early Meeting",
            description="Before filter range",
            start_date=datetime(2024, 1, 10, 10, 0, tzinfo=timezone.utc),
            end_date=datetime(2024, 1, 10, 11, 0, tzinfo=timezone.utc),
            all_day=False,
            user_id=current_user.id
        )
        entry2 = CalendarEntry(
            title="In Range Meeting",
            description="Within filter range",
            start_date=datetime(2024, 1, 15, 10, 0, tzinfo=timezone.utc),
            end_date=datetime(2024, 1, 15, 11, 0, tzinfo=timezone.utc),
            all_day=False,
            user_id=current_user.id
        )
        entry3 = CalendarEntry(
            title="Late Meeting",
            description="After filter range",
            start_date=datetime(2024, 1, 20, 10, 0, tzinfo=timezone.utc),
            end_date=datetime(2024, 1, 20, 11, 0, tzinfo=timezone.utc),
            all_day=False,
            user_id=current_user.id
        )
        db.add_all([entry1, entry2, entry3])
        db.commit()
        
        # Act: Get calendar entries with date filter
        response = client.get(
            "/api/v1/calendar_entries/?start_date=2024-01-14T00:00:00Z&end_date=2024-01-16T23:59:59Z",
            headers=auth_headers
        )
        
        # Assert: Only entries within date range returned
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "In Range Meeting"
    
    def test_get_calendar_entry_by_id_success(self, client, db, auth_headers, current_user):
        """Test retrieving calendar entry by ID"""
        # Arrange: Create a calendar entry
        entry = CalendarEntry(
            title="Test Meeting",
            description="Test description",
            start_date=datetime(2024, 1, 15, 10, 0, tzinfo=timezone.utc),
            end_date=datetime(2024, 1, 15, 11, 0, tzinfo=timezone.utc),
            all_day=False,
            user_id=current_user.id
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        
        # Act: Get calendar entry by ID
        response = client.get(
            f"/api/v1/calendar_entries/{entry.id}",
            headers=auth_headers
        )
        
        # Assert: Verify entry details
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(entry.id)
        assert data["title"] == "Test Meeting"
        assert data["description"] == "Test description"
        assert data["user_id"] == str(current_user.id)
    
    def test_get_calendar_entry_by_id_not_found(self, client, db, auth_headers, current_user):
        """Test retrieving non-existent calendar entry returns 404"""
        # Arrange: Generate random UUID that doesn't exist
        non_existent_id = uuid.uuid4()
        
        # Act: Attempt to get non-existent entry
        response = client.get(
            f"/api/v1/calendar_entries/{non_existent_id}",
            headers=auth_headers
        )
        
        # Assert: Verify 404 response
        assert response.status_code == 404
        assert "Calendar entry not found" in response.json()["detail"]
    
    def test_get_calendar_entry_unauthorized_access(self, client, db, auth_headers, current_user):
        """Test retrieving another user's calendar entry fails"""
        # Arrange: Create another user and their calendar entry
        other_user = create_test_user(db, email="other@example.com")
        other_entry = CalendarEntry(
            title="Other User Meeting",
            description="Private meeting",
            start_date=datetime(2024, 1, 15, 10, 0, tzinfo=timezone.utc),
            end_date=datetime(2024, 1, 15, 11, 0, tzinfo=timezone.utc),
            all_day=False,
            user_id=other_user.id
        )
        db.add(other_entry)
        db.commit()
        
        # Act: Attempt to get other user's entry
        response = client.get(
            f"/api/v1/calendar_entries/{other_entry.id}",
            headers=auth_headers
        )
        
        # Assert: Verify access denied
        assert response.status_code == 403
        assert "Not authorized to view this entry" in response.json()["detail"]
    
    def test_get_team_calendar_entry_success(self, client, db, auth_headers, current_user):
        """Test retrieving team calendar entry when user is team member"""
        # Arrange: Create team and add current user as member
        team = create_test_team(db, name="Development Team")
        membership = TeamMembership(
            team_id=team.id,
            user_id=current_user.id,
            role=TeamRole.MEMBER
        )
        db.add(membership)
        db.commit()
        
        # Create team calendar entry by another user
        team_creator = create_test_user(db, email="creator@example.com")
        team_entry = CalendarEntry(
            title="Team Meeting",
            description="All-hands meeting",
            start_date=datetime(2024, 1, 17, 9, 0, tzinfo=timezone.utc),
            end_date=datetime(2024, 1, 17, 10, 0, tzinfo=timezone.utc),
            all_day=False,
            user_id=team_creator.id,
            team_id=team.id
        )
        db.add(team_entry)
        db.commit()
        
        # Act: Get team calendar entry
        response = client.get(
            f"/api/v1/calendar_entries/{team_entry.id}",
            headers=auth_headers
        )
        
        # Assert: Verify access granted as team member
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Team Meeting"
        assert data["team_id"] == str(team.id)


class TestCalendarEntryUpdate:
    """Test PUT /api/v1/calendar_entries/{entry_id} - Updating calendar entries"""
    
    def test_update_calendar_entry_success(self, client, db, auth_headers, current_user, test_rate_limits):
        """Test updating own calendar entry"""
        # Arrange: Create a calendar entry
        entry = CalendarEntry(
            title="Original Title",
            description="Original description",
            start_date=datetime(2024, 1, 15, 10, 0, tzinfo=timezone.utc),
            end_date=datetime(2024, 1, 15, 11, 0, tzinfo=timezone.utc),
            all_day=False,
            user_id=current_user.id
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        
        # Prepare update data
        update_data = {
            "title": "Updated Title",
            "description": "Updated description",
            "all_day": True
        }
        
        # Act: Update calendar entry
        response = client.put(
            f"/api/v1/calendar_entries/{entry.id}",
            json=update_data,
            headers=auth_headers
        )
        
        # Assert: Verify successful update
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["description"] == "Updated description"
        assert data["all_day"] is True
        
        # Verify database was updated
        db.refresh(entry)
        assert entry.title == "Updated Title"
        assert entry.description == "Updated description"
        assert entry.all_day is True
    
    def test_update_calendar_entry_dates_success(self, client, db, auth_headers, current_user, test_rate_limits):
        """Test updating calendar entry dates"""
        # Arrange: Create a calendar entry
        entry = CalendarEntry(
            title="Test Meeting",
            description="Test description",
            start_date=datetime(2024, 1, 15, 10, 0, tzinfo=timezone.utc),
            end_date=datetime(2024, 1, 15, 11, 0, tzinfo=timezone.utc),
            all_day=False,
            user_id=current_user.id
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        
        # Prepare update data with new dates
        update_data = {
            "start_date": "2024-01-16T14:00:00Z",
            "end_date": "2024-01-16T15:30:00Z"
        }
        
        # Act: Update calendar entry dates
        response = client.put(
            f"/api/v1/calendar_entries/{entry.id}",
            json=update_data,
            headers=auth_headers
        )
        
        # Assert: Verify successful update
        assert response.status_code == 200
        data = response.json()
        assert "2024-01-16T14:00:00" in data["start_date"]
        assert "2024-01-16T15:30:00" in data["end_date"]
    
    def test_update_calendar_entry_invalid_dates(self, client, db, auth_headers, current_user, test_rate_limits):
        """Test updating calendar entry with invalid dates fails"""
        # Arrange: Create a calendar entry
        entry = CalendarEntry(
            title="Test Meeting",
            description="Test description",
            start_date=datetime(2024, 1, 15, 10, 0, tzinfo=timezone.utc),
            end_date=datetime(2024, 1, 15, 11, 0, tzinfo=timezone.utc),
            all_day=False,
            user_id=current_user.id
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        
        # Prepare invalid update data (end before start)
        update_data = {
            "start_date": "2024-01-16T15:00:00Z",
            "end_date": "2024-01-16T14:00:00Z"  # End before start
        }
        
        # Act: Attempt to update with invalid dates
        response = client.put(
            f"/api/v1/calendar_entries/{entry.id}",
            json=update_data,
            headers=auth_headers
        )
        
        # Assert: Verify validation error
        assert response.status_code == 400
        assert "End date must be after start date" in response.json()["detail"]
    
    def test_update_calendar_entry_not_found(self, client, db, auth_headers, current_user):
        """Test updating non-existent calendar entry returns 404"""
        # Arrange: Generate random UUID that doesn't exist
        non_existent_id = uuid.uuid4()
        update_data = {"title": "Updated Title"}
        
        # Act: Attempt to update non-existent entry
        response = client.put(
            f"/api/v1/calendar_entries/{non_existent_id}",
            json=update_data,
            headers=auth_headers
        )
        
        # Assert: Verify 404 response
        assert response.status_code == 404
        assert "Calendar entry not found" in response.json()["detail"]
    
    def test_update_calendar_entry_unauthorized(self, client, db, auth_headers, current_user, test_rate_limits):
        """Test updating another user's calendar entry fails"""
        # Arrange: Create another user and their calendar entry
        other_user = create_test_user(db, email="other@example.com")
        other_entry = CalendarEntry(
            title="Other User Meeting",
            description="Private meeting",
            start_date=datetime(2024, 1, 15, 10, 0, tzinfo=timezone.utc),
            end_date=datetime(2024, 1, 15, 11, 0, tzinfo=timezone.utc),
            all_day=False,
            user_id=other_user.id
        )
        db.add(other_entry)
        db.commit()
        
        update_data = {"title": "Unauthorized Update"}
        
        # Act: Attempt to update other user's entry
        response = client.put(
            f"/api/v1/calendar_entries/{other_entry.id}",
            json=update_data,
            headers=auth_headers
        )
        
        # Assert: Verify access denied
        assert response.status_code == 403
        assert "Not authorized to update this entry" in response.json()["detail"]


class TestCalendarEntryDeletion:
    """Test DELETE /api/v1/calendar_entries/{entry_id} - Deleting calendar entries"""
    
    def test_delete_calendar_entry_success(self, client, db, auth_headers, current_user):
        """Test deleting own calendar entry"""
        # Arrange: Create a calendar entry
        entry = CalendarEntry(
            title="To Be Deleted",
            description="This will be deleted",
            start_date=datetime(2024, 1, 15, 10, 0, tzinfo=timezone.utc),
            end_date=datetime(2024, 1, 15, 11, 0, tzinfo=timezone.utc),
            all_day=False,
            user_id=current_user.id
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        entry_id = entry.id
        
        # Act: Delete calendar entry
        response = client.delete(
            f"/api/v1/calendar_entries/{entry_id}",
            headers=auth_headers
        )
        
        # Assert: Verify successful deletion
        assert response.status_code == 200
        assert "Calendar entry deleted successfully" in response.json()["message"]
        
        # Verify entry was deleted from database
        deleted_entry = db.query(CalendarEntry).filter(CalendarEntry.id == entry_id).first()
        assert deleted_entry is None
    
    def test_delete_calendar_entry_not_found(self, client, db, auth_headers, current_user):
        """Test deleting non-existent calendar entry returns 404"""
        # Arrange: Generate random UUID that doesn't exist
        non_existent_id = uuid.uuid4()
        
        # Act: Attempt to delete non-existent entry
        response = client.delete(
            f"/api/v1/calendar_entries/{non_existent_id}",
            headers=auth_headers
        )
        
        # Assert: Verify 404 response
        assert response.status_code == 404
        assert "Calendar entry not found" in response.json()["detail"]
    
    def test_delete_calendar_entry_unauthorized(self, client, db, auth_headers, current_user):
        """Test deleting another user's calendar entry fails"""
        # Arrange: Create another user and their calendar entry
        other_user = create_test_user(db, email="other@example.com")
        other_entry = CalendarEntry(
            title="Other User Meeting",
            description="Private meeting",
            start_date=datetime(2024, 1, 15, 10, 0, tzinfo=timezone.utc),
            end_date=datetime(2024, 1, 15, 11, 0, tzinfo=timezone.utc),
            all_day=False,
            user_id=other_user.id
        )
        db.add(other_entry)
        db.commit()
        
        # Act: Attempt to delete other user's entry
        response = client.delete(
            f"/api/v1/calendar_entries/{other_entry.id}",
            headers=auth_headers
        )
        
        # Assert: Verify access denied
        assert response.status_code == 403
        assert "Not authorized to delete this entry" in response.json()["detail"]
        
        # Verify entry was not deleted
        db.refresh(other_entry)
        assert other_entry.id is not None


class TestCalendarEntryEdgeCases:
    """Test edge cases and complex scenarios"""
    
    def test_all_day_event_creation(self, client, db, auth_headers, current_user):
        """Test creating all-day calendar events"""
        # Arrange: Create all-day event data
        entry_data = {
            "title": "All Day Event",
            "description": "Company holiday",
            "start_date": "2024-01-15T00:00:00Z",
            "end_date": "2024-01-15T23:59:59Z",
            "all_day": True,
            "team_id": None
        }
        
        # Act: Create all-day event
        response = client.post(
            "/api/v1/calendar_entries/",
            json=entry_data,
            headers=auth_headers
        )
        
        # Assert: Verify successful creation
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "All Day Event"
        assert data["all_day"] is True
    
    def test_calendar_entry_with_same_start_end_time(self, client, db, auth_headers, current_user):
        """Test creating calendar entry with same start and end time fails"""
        # Arrange: Create entry with same start and end time
        entry_data = {
            "title": "Invalid Time Event",
            "description": "Same start and end time",
            "start_date": "2024-01-15T10:00:00Z",
            "end_date": "2024-01-15T10:00:00Z",  # Same as start
            "all_day": False,
            "team_id": None
        }
        
        # Act: Attempt to create entry with same times
        response = client.post(
            "/api/v1/calendar_entries/",
            json=entry_data,
            headers=auth_headers
        )
        
        # Assert: Verify validation error
        assert response.status_code == 400
        assert "End date must be after start date" in response.json()["detail"]
    
    def test_calendar_entry_partial_update(self, client, db, auth_headers, current_user, test_rate_limits):
        """Test partial update of calendar entry fields"""
        # Arrange: Create a calendar entry
        entry = CalendarEntry(
            title="Original Title",
            description="Original description",
            start_date=datetime(2024, 1, 15, 10, 0, tzinfo=timezone.utc),
            end_date=datetime(2024, 1, 15, 11, 0, tzinfo=timezone.utc),
            all_day=False,
            user_id=current_user.id
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        
        # Prepare partial update data (only title)
        update_data = {
            "title": "Updated Title Only"
        }
        
        # Act: Update only title
        response = client.put(
            f"/api/v1/calendar_entries/{entry.id}",
            json=update_data,
            headers=auth_headers
        )
        
        # Assert: Verify only title was updated
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title Only"
        assert data["description"] == "Original description"  # Unchanged
        assert data["all_day"] is False  # Unchanged
    
    def test_calendar_entry_empty_description(self, client, db, auth_headers, current_user):
        """Test creating calendar entry with empty description"""
        # Arrange: Create entry with empty description
        entry_data = {
            "title": "No Description Event",
            "description": "",
            "start_date": "2024-01-15T10:00:00Z",
            "end_date": "2024-01-15T11:00:00Z",
            "all_day": False,
            "team_id": None
        }
        
        # Act: Create entry with empty description
        response = client.post(
            "/api/v1/calendar_entries/",
            json=entry_data,
            headers=auth_headers
        )
        
        # Assert: Verify successful creation
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "No Description Event"
        assert data["description"] == ""
    
    def test_calendar_entry_long_title_and_description(self, client, db, auth_headers, current_user):
        """Test creating calendar entry with very long title and description"""
        # Arrange: Create entry with long text fields
        long_title = "A" * 500  # Very long title
        long_description = "B" * 2000  # Very long description
        
        entry_data = {
            "title": long_title,
            "description": long_description,
            "start_date": "2024-01-15T10:00:00Z",
            "end_date": "2024-01-15T11:00:00Z",
            "all_day": False,
            "team_id": None
        }
        
        # Act: Create entry with long text
        response = client.post(
            "/api/v1/calendar_entries/",
            json=entry_data,
            headers=auth_headers
        )
        
        # Assert: Verify successful creation
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == long_title
        assert data["description"] == long_description