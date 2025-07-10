"""
Tests for Organization API Endpoints (Just-in-Time Organization System)

These tests verify the Organization API endpoints that support the just-in-time
organization system where organization creation/assignment is deferred to
project creation time, including domain checking and organization management.
"""

import pytest
import uuid
from uuid import UUID
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch

from api.database import Organization, User, OrganizationScope, UserRole
from api.schemas import OrganizationResponse


class TestOrganizationDomainCheckingAPI:
    """Test organization domain checking API endpoints."""
    
    def test_check_domain_existing_organization(self, client, db):
        """Test domain checking for existing organization."""
        # Create organization with domain
        org = Organization(
            name="Test Company",
            domain="testcompany.com",
            scope=OrganizationScope.SHARED,
            max_users=50
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Check domain that exists
        response = client.get("/api/v1/organizations/check-domain?email=user@testcompany.com")
        assert response.status_code == 200
        
        data = response.json()
        assert data["domain_found"] is True
        assert data["domain"] == "testcompany.com"
        assert data["organization"]["name"] == "Test Company"
        assert data["organization"]["id"] == str(org.id)
        assert data["suggestions"]["action"] == "join"
        assert data["suggestions"]["can_join"] is True
    
    def test_check_domain_no_existing_organization(self, client):
        """Test domain checking for non-existing organization."""
        response = client.get("/api/v1/organizations/check-domain?email=user@newcompany.com")
        assert response.status_code == 200
        
        data = response.json()
        assert data["domain_found"] is False
        assert data["domain"] == "newcompany.com"
        assert data["organization"] is None
        assert data["suggestions"]["action"] == "create"
        assert data["suggestions"]["can_create"] is True
        assert data["suggestions"]["suggested_name"] == "newcompany"
    
    def test_check_domain_invalid_email(self, client):
        """Test domain checking with invalid email format."""
        response = client.get("/api/v1/organizations/check-domain?email=invalid-email")
        assert response.status_code == 422  # FastAPI validation error
        
        data = response.json()
        assert "detail" in data
    
    def test_check_domain_personal_email_domain(self, client):
        """Test domain checking with personal email domains."""
        personal_domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"]
        
        for domain in personal_domains:
            response = client.get(f"/api/v1/organizations/check-domain?email=user@{domain}")
            assert response.status_code == 200
            
            data = response.json()
            assert data["domain_found"] is False
            assert data["domain"] == domain
            assert data["organization"] is None
            assert data["suggestions"]["action"] == "personal"
            assert data["suggestions"]["can_create"] is False
            assert "personal email" in data["suggestions"]["message"].lower()
    
    def test_check_domain_extraction_from_email(self, client):
        """Test that domain is properly extracted from email."""
        import urllib.parse
        
        test_cases = [
            ("user@example.com", "example.com"),
            ("test.user+tag@subdomain.example.org", "subdomain.example.org"),
            ("admin@company-name.co.uk", "company-name.co.uk"),
        ]
        
        for email, expected_domain in test_cases:
            encoded_email = urllib.parse.quote(email)
            response = client.get(f"/api/v1/organizations/check-domain?email={encoded_email}")
            assert response.status_code == 200
            
            data = response.json()
            assert data["domain"] == expected_domain


class TestOrganizationManagementAPI:
    """Test organization CRUD API operations."""
    
    def test_create_organization_shared_scope(self, client, auth_headers, db):
        """Test creating a shared organization."""
        org_data = {
            "name": "New Shared Organization",
            "domain": "newshared.com",
            "scope": "shared",
            "max_users": 100,
            "description": "A new shared organization for testing"
        }
        
        response = client.post(
            "/api/v1/organizations/",
            json=org_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        
        data = response.json()
        assert data["name"] == "New Shared Organization"
        assert data["domain"] == "newshared.com"
        assert data["scope"] == "shared"
        assert data["max_users"] == 100
        assert data["description"] == "A new shared organization for testing"
        assert "id" in data
        assert "created_at" in data
    
    def test_create_organization_enterprise_scope(self, client, admin_auth_headers, db):
        """Test creating an enterprise organization (requires admin)."""
        org_data = {
            "name": "Enterprise Corp",
            "domain": "enterprise.com",
            "scope": "enterprise",
            "max_users": None,  # Unlimited
            "description": "Enterprise organization"
        }
        
        response = client.post(
            "/api/v1/organizations/",
            json=org_data,
            headers=admin_auth_headers
        )
        assert response.status_code == 201
        
        data = response.json()
        assert data["name"] == "Enterprise Corp"
        assert data["scope"] == "enterprise"
        assert data["max_users"] is None
    
    def test_create_organization_personal_scope(self, client, auth_headers, db):
        """Test creating a personal organization."""
        org_data = {
            "name": "Personal Workspace",
            "scope": "personal",
            "max_users": 1,
            "description": "Personal workspace"
        }
        
        response = client.post(
            "/api/v1/organizations/",
            json=org_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        
        data = response.json()
        assert data["name"] == "Personal Workspace"
        assert data["scope"] == "personal"
        assert data["max_users"] == 1
    
    def test_create_organization_validation_errors(self, client, auth_headers):
        """Test organization creation validation errors."""
        # Missing required fields
        response = client.post(
            "/api/v1/organizations/",
            json={},
            headers=auth_headers
        )
        assert response.status_code == 422
        
        # Invalid scope
        response = client.post(
            "/api/v1/organizations/",
            json={
                "name": "Invalid Scope Org",
                "scope": "invalid_scope"
            },
            headers=auth_headers
        )
        assert response.status_code == 422
        
        # Invalid max_users for personal scope
        response = client.post(
            "/api/v1/organizations/",
            json={
                "name": "Invalid Personal Org",
                "scope": "personal",
                "max_users": 5  # Personal should have max 1
            },
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "Personal organizations cannot have more than 1 user" in response.json()["detail"]
    
    def test_get_organization_by_id(self, client, auth_headers, db):
        """Test retrieving organization by ID."""
        # Create organization
        org = Organization(
            name="Get Test Organization",
            domain="gettest.com",
            scope=OrganizationScope.SHARED,
            max_users=50
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        response = client.get(f"/api/v1/organizations/{org.id}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Get Test Organization"
        assert data["domain"] == "gettest.com"
        assert data["id"] == str(org.id)
    
    def test_get_organization_not_found(self, client, auth_headers):
        """Test retrieving non-existent organization."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/organizations/{fake_id}", headers=auth_headers)
        assert response.status_code == 404
        assert "Organization not found" in response.json()["detail"]
    
    def test_list_organizations(self, client, auth_headers, db):
        """Test listing organizations with pagination."""
        # Create multiple organizations
        orgs = []
        for i in range(5):
            org = Organization(
                name=f"List Test Org {i}",
                domain=f"listtest{i}.com",
                scope=OrganizationScope.SHARED,
                max_users=50
            )
            orgs.append(org)
            db.add(org)
        
        db.commit()
        
        # Test default pagination
        response = client.get("/api/v1/organizations/", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "organizations" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert len(data["organizations"]) >= 5
    
    def test_list_organizations_with_pagination(self, client, auth_headers, db):
        """Test listing organizations with custom pagination."""
        response = client.get(
            "/api/v1/organizations/?page=1&limit=2",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["page"] == 1
        assert data["limit"] == 2
        assert len(data["organizations"]) <= 2
    
    def test_update_organization(self, client, auth_headers, db, current_user):
        """Test updating organization information."""
        # Create organization with current user as creator
        org = Organization(
            name="Update Test Organization",
            domain="updatetest.com",
            scope=OrganizationScope.SHARED,
            max_users=50,
            created_by=current_user.id
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        # Update organization
        update_data = {
            "name": "Updated Organization Name",
            "description": "Updated description",
            "max_users": 75
        }
        
        response = client.put(
            f"/api/v1/organizations/{org.id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Updated Organization Name"
        assert data["description"] == "Updated description"
        assert data["max_users"] == 75
        assert data["domain"] == "updatetest.com"  # Should remain unchanged
    
    def test_delete_organization(self, client, auth_headers, db, current_user):
        """Test deleting organization."""
        # Create organization with current user as creator
        org = Organization(
            name="Delete Test Organization",
            domain="deletetest.com",
            scope=OrganizationScope.SHARED,
            max_users=50,
            created_by=current_user.id
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        # Delete organization
        response = client.delete(f"/api/v1/organizations/{org.id}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "deleted successfully" in data["message"]
        
        # Verify organization is deleted
        response = client.get(f"/api/v1/organizations/{org.id}", headers=auth_headers)
        assert response.status_code == 404


class TestOrganizationJoinWorkflowAPI:
    """Test organization joining workflow API."""
    
    def test_join_organization_request(self, client, auth_headers, db):
        """Test requesting to join an organization."""
        # Create organization
        org = Organization(
            name="Join Test Organization",
            domain="jointest.com",
            scope=OrganizationScope.SHARED,
            max_users=50
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        # Request to join
        response = client.post(
            f"/api/v1/organizations/{org.id}/join",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "joined" in data["message"].lower() or "join" in data["message"].lower()
        assert data["status"] == "approved"  # Auto-approved in current implementation
        assert data["organization_id"] == str(org.id)
    
    def test_join_organization_already_member(self, client, auth_headers, db, current_user):
        """Test joining organization when already a member."""
        # Create organization and assign user
        org = Organization(
            name="Already Member Org",
            domain="alreadymember.com",
            scope=OrganizationScope.SHARED,
            max_users=50
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        # Assign user to organization
        current_user.organization_id = org.id
        db.commit()
        
        # Try to join again
        response = client.post(
            f"/api/v1/organizations/{org.id}/join",
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "already a member" in response.json()["detail"].lower()
    
    def test_join_organization_capacity_full(self, client, auth_headers, db):
        """Test joining organization when at capacity."""
        # Create organization with max 1 user
        org = Organization(
            name="Full Capacity Org",
            domain="fullcapacity.com",
            scope=OrganizationScope.PERSONAL,
            max_users=1
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        # Create and assign another user to fill capacity
        other_user = User(
            email="existing@fullcapacity.com",
            first_name="Existing",
            last_name="User",
            password_hash="hashed_password",
            organization_id=org.id
        )
        db.add(other_user)
        db.commit()
        
        # Try to join when full
        response = client.post(
            f"/api/v1/organizations/{org.id}/join",
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "capacity" in response.json()["detail"].lower()


class TestOrganizationAuthorizationAPI:
    """Test organization API authorization and permissions."""
    
    def test_organization_crud_requires_authentication(self, client):
        """Test that organization endpoints require authentication."""
        endpoints = [
            ("GET", "/api/v1/organizations/"),
            ("POST", "/api/v1/organizations/"),
            ("GET", f"/api/v1/organizations/{uuid.uuid4()}"),
            ("PUT", f"/api/v1/organizations/{uuid.uuid4()}"),
            ("DELETE", f"/api/v1/organizations/{uuid.uuid4()}")
        ]
        
        for method, url in endpoints:
            response = getattr(client, method.lower())(url)
            assert response.status_code in [401, 403]  # Either Unauthorized or Forbidden is acceptable
    
    def test_organization_creation_admin_only(self, client, db):
        """Test that only admins can create certain organization types."""
        # Create non-admin user
        user = User(
            email="user@example.com",
            first_name="Regular",
            last_name="User",
            password_hash="hashed_password",
            role=UserRole.BASIC_USER
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create auth headers for non-admin user
        from api.auth import create_access_token
        token = create_access_token(data={"sub": str(user.id)})
        non_admin_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Try to create enterprise organization
        org_data = {
            "name": "Enterprise Corp",
            "scope": "enterprise",
            "max_users": None
        }
        
        response = client.post("/api/v1/organizations/", json=org_data, headers=non_admin_headers)
        assert response.status_code == 403
        assert "admin" in response.json()["detail"].lower()
    
    def test_organization_modification_requires_membership(self, client, auth_headers, db, current_user):
        """Test that organization modification requires membership or admin rights."""
        # Create organization without current user
        org = Organization(
            name="Other Organization",
            domain="other.com",
            scope=OrganizationScope.SHARED,
            max_users=50
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        # Try to update organization user is not a member of
        update_data = {"name": "Unauthorized Update"}
        
        response = client.put(
            f"/api/v1/organizations/{org.id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 403
        assert "not authorized" in response.json()["detail"].lower()


class TestOrganizationErrorHandling:
    """Test organization API error handling and edge cases."""
    
    def test_organization_domain_conflict(self, client, auth_headers, db):
        """Test creating organization with existing domain."""
        # Create organization with domain
        org = Organization(
            name="First Organization",
            domain="conflict.com",
            scope=OrganizationScope.SHARED,
            max_users=50
        )
        db.add(org)
        db.commit()
        
        # Try to create another organization with same domain
        org_data = {
            "name": "Second Organization",
            "domain": "conflict.com",
            "scope": "shared",
            "max_users": 25
        }
        
        response = client.post(
            "/api/v1/organizations/",
            json=org_data,
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()
    
    def test_organization_name_conflict(self, client, auth_headers, db):
        """Test creating organization with existing name."""
        # Create organization
        org = Organization(
            name="Unique Organization Name",
            domain="unique1.com",
            scope=OrganizationScope.SHARED,
            max_users=50
        )
        db.add(org)
        db.commit()
        
        # Try to create another organization with same name
        org_data = {
            "name": "Unique Organization Name",
            "domain": "unique2.com",
            "scope": "shared",
            "max_users": 25
        }
        
        response = client.post(
            "/api/v1/organizations/",
            json=org_data,
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()
    
    def test_invalid_uuid_format(self, client, auth_headers):
        """Test API endpoints with invalid UUID format."""
        invalid_id = "not-a-uuid"
        
        endpoints = [
            ("GET", f"/api/v1/organizations/{invalid_id}"),
            ("PUT", f"/api/v1/organizations/{invalid_id}"),
            ("DELETE", f"/api/v1/organizations/{invalid_id}"),
            ("POST", f"/api/v1/organizations/{invalid_id}/join")
        ]
        
        for method, url in endpoints:
            response = getattr(client, method.lower())(url, headers=auth_headers)
            assert response.status_code == 422  # Validation error
    
    def test_rate_limiting_on_sensitive_endpoints(self, client):
        """Test rate limiting on organization creation endpoint."""
        org_data = {
            "name": "Rate Limit Test Org",
            "scope": "shared",
            "max_users": 50
        }
        
        # This test would require implementing rate limiting
        # For now, just verify the endpoint exists and requires auth
        response = client.post("/api/v1/organizations/", json=org_data)
        assert response.status_code in [401, 403, 422, 429]  # Various expected responses including 403 Forbidden


class TestOrganizationAPIIntegration:
    """Test organization API integration scenarios."""
    
    def test_organization_creation_and_user_assignment_workflow(self, client, auth_headers, db, current_user):
        """Test complete workflow of creating organization and verifying user assignment."""
        # Step 1: Create organization
        org_data = {
            "name": "Integration Test Org",
            "domain": "integration.com",
            "scope": "shared",
            "max_users": 50,
            "description": "Organization for integration testing"
        }
        
        response = client.post(
            "/api/v1/organizations/",
            json=org_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        org_id = response.json()["id"]
        
        # Step 2: Verify user was automatically assigned to the organization they created
        db.refresh(current_user)
        assert current_user.organization_id == UUID(org_id)
        
        # Step 3: Test that the user cannot join the organization they're already a member of
        response = client.post(
            f"/api/v1/organizations/{org_id}/join",
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "already a member" in response.json()["detail"]
    
    def test_organization_domain_checking_to_creation_workflow(self, client, auth_headers):
        """Test workflow from domain checking to organization creation."""
        # Step 1: Check domain that doesn't exist
        response = client.get("/api/v1/organizations/check-domain?email=user@neworg.com")
        assert response.status_code == 200
        
        domain_data = response.json()
        assert domain_data["domain_found"] is False
        assert domain_data["suggestions"]["action"] == "create"
        
        # Step 2: Create organization based on domain suggestion
        org_data = {
            "name": domain_data["suggestions"]["suggested_name"].title() + " Corp",
            "domain": domain_data["domain"],
            "scope": "shared",
            "max_users": 50
        }
        
        response = client.post(
            "/api/v1/organizations/",
            json=org_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        
        # Step 3: Verify domain checking now finds the organization
        response = client.get("/api/v1/organizations/check-domain?email=user@neworg.com")
        assert response.status_code == 200
        
        updated_domain_data = response.json()
        assert updated_domain_data["domain_found"] is True
        assert updated_domain_data["organization"]["name"] == org_data["name"]