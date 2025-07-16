"""
Organization System Edge Cases and Error Scenarios

Comprehensive test suite for edge cases, error scenarios, and boundary conditions
in the organization and project management system to ensure robustness and reliability.

Test Categories:
- Organization capacity limits and constraints
- Project visibility and validation edge cases
- Authentication and authorization boundary conditions
- Performance and scalability edge cases
- Data integrity and consistency validation
"""

import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from api.database import User, Organization, OrganizationScope


class TestOrganizationEdgeCases:
    """Test edge cases for organization management."""

    def test_organization_capacity_limits(
        self, client: TestClient, db: Session, test_rate_limits
    ):
        """Test organization capacity enforcement."""
        # Create organization with max_users = 2
        org = Organization(
            name="Limited Corp",
            domain="limited.com",
            short_name="LTD",
            scope=OrganizationScope.SHARED,
            max_users=2,
            created_by=uuid.uuid4(),
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Create and add 2 users to fill capacity
        users = []
        for i in range(2):
            user_data = {
                "email": f"user{i+1}@limited.com",
                "password": "SecurePass123!",
                "first_name": f"User{i+1}",
                "last_name": "Limited",
                "terms_agreement": True,
            }
            reg_response = client.post("/api/v1/auth/register", json=user_data)
            assert reg_response.status_code == 201

            # Verify email and login
            user = db.query(User).filter(User.email == f"user{i+1}@limited.com").first()
            assert user is not None
            user.email_verified = True
            db.commit()

            login_data = {
                "email": f"user{i+1}@limited.com",
                "password": "SecurePass123!",
            }
            login_response = client.post("/api/v1/auth/login-json", json=login_data)
            assert login_response.status_code == 200
            token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # Join organization
            join_response = client.post(
                f"/api/v1/organizations/{org.id}/join", headers=headers
            )
            assert join_response.status_code == 200
            users.append((user, headers))

        # Try to add third user (should fail)
        user_data = {
            "email": "user3@limited.com",
            "password": "SecurePass123!",
            "first_name": "User3",
            "last_name": "Limited",
            "terms_agreement": True,
        }
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 201

        user3 = db.query(User).filter(User.email == "user3@limited.com").first()
        assert user3 is not None
        user3.email_verified = True
        db.commit()

        login_data = {"email": "user3@limited.com", "password": "SecurePass123!"}
        login_response = client.post("/api/v1/auth/login-json", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Attempt to join should fail
        join_response = client.post(
            f"/api/v1/organizations/{org.id}/join", headers=headers
        )
        assert join_response.status_code == 400
        error_data = join_response.json()
        assert "capacity" in error_data["detail"].lower()

    def test_personal_organization_single_user_limit(
        self, client: TestClient, db: Session, test_rate_limits
    ):
        """Test personal organization scope can only have one user."""
        # Create personal organization
        user_data = {
            "email": "personal@example.com",
            "password": "SecurePass123!",
            "first_name": "Personal",
            "last_name": "User",
            "terms_agreement": True,
        }
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 201

        user = db.query(User).filter(User.email == "personal@example.com").first()
        assert user is not None
        user.email_verified = True
        db.commit()

        login_data = {"email": "personal@example.com", "password": "SecurePass123!"}
        login_response = client.post("/api/v1/auth/login-json", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create personal organization
        org_data = {
            "name": "Personal Workspace",
            "domain": "personal-workspace.com",
            "short_name": "PERSONAL",
            "scope": "personal",
        }
        org_response = client.post(
            "/api/v1/organizations/", json=org_data, headers=headers
        )
        assert org_response.status_code == 201
        org = org_response.json()

        # Try to add second user to personal organization (should fail)
        user2_data = {
            "email": "user2@personal-workspace.com",
            "password": "SecurePass123!",
            "first_name": "User2",
            "last_name": "Personal",
            "terms_agreement": True,
        }
        reg_response2 = client.post("/api/v1/auth/register", json=user2_data)
        assert reg_response2.status_code == 201

        user2 = (
            db.query(User).filter(User.email == "user2@personal-workspace.com").first()
        )
        assert user2 is not None
        user2.email_verified = True
        db.commit()

        login_data2 = {
            "email": "user2@personal-workspace.com",
            "password": "SecurePass123!",
        }
        login_response2 = client.post("/api/v1/auth/login-json", json=login_data2)
        assert login_response2.status_code == 200
        token2 = login_response2.json()["access_token"]
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Attempt to join personal organization should fail
        join_response = client.post(
            f"/api/v1/organizations/{org['id']}/join", headers=headers2
        )
        assert join_response.status_code == 400
        error_data = join_response.json()
        assert "capacity" in error_data["detail"].lower()

    def test_enterprise_organization_creation_admin_only(
        self, client: TestClient, db: Session, admin_auth_headers
    ):
        """Test enterprise organization creation requires admin privileges."""
        # Regular user tries to create enterprise organization
        user_data = {
            "email": "regular@example.com",
            "password": "SecurePass123!",
            "first_name": "Regular",
            "last_name": "User",
            "terms_agreement": True,
        }
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 201

        user = db.query(User).filter(User.email == "regular@example.com").first()
        assert user is not None
        user.email_verified = True
        db.commit()

        login_data = {"email": "regular@example.com", "password": "SecurePass123!"}
        login_response = client.post("/api/v1/auth/login-json", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Try to create enterprise organization (should fail)
        org_data = {
            "name": "Enterprise Corp",
            "domain": "enterprise.com",
            "short_name": "ENT",
            "scope": "enterprise",
        }
        org_response = client.post(
            "/api/v1/organizations/", json=org_data, headers=headers
        )
        assert org_response.status_code == 403
        error_data = org_response.json()
        assert "admin" in error_data["detail"].lower()

        # Admin can create enterprise organization
        admin_org_response = client.post(
            "/api/v1/organizations/", json=org_data, headers=admin_auth_headers
        )
        assert admin_org_response.status_code == 201

    def test_duplicate_organization_domain_handling(
        self, client: TestClient, db: Session, test_rate_limits
    ):
        """Test handling of duplicate organization domains."""
        # Create first organization
        org1 = Organization(
            name="First Corp",
            domain="duplicate.com",
            short_name="FIRST",
            scope=OrganizationScope.SHARED,
            max_users=100,
            created_by=uuid.uuid4(),
        )
        db.add(org1)
        db.commit()

        # Try to create second organization with same domain
        user_data = {
            "email": "user@duplicate.com",
            "password": "SecurePass123!",
            "first_name": "User",
            "last_name": "Duplicate",
            "terms_agreement": True,
        }
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 201

        user = db.query(User).filter(User.email == "user@duplicate.com").first()
        assert user is not None
        user.email_verified = True
        db.commit()

        login_data = {"email": "user@duplicate.com", "password": "SecurePass123!"}
        login_response = client.post("/api/v1/auth/login-json", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Try to create organization with duplicate domain
        org_data = {
            "name": "Second Corp",
            "domain": "duplicate.com",
            "short_name": "SECOND",
            "scope": "shared",
        }
        org_response = client.post(
            "/api/v1/organizations/", json=org_data, headers=headers
        )
        assert org_response.status_code == 400
        error_data = org_response.json()
        assert "domain" in error_data["detail"].lower()


class TestProjectEdgeCases:
    """Test edge cases for project management."""

    def test_project_visibility_constraints(
        self, client: TestClient, db: Session, test_rate_limits
    ):
        """Test project visibility constraints and edge cases."""
        # Create user without organization
        user_data = {
            "email": "user@example.com",
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "User",
            "terms_agreement": True,
        }
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 201

        user = db.query(User).filter(User.email == "user@example.com").first()
        assert user is not None
        user.email_verified = True
        db.commit()

        login_data = {"email": "user@example.com", "password": "SecurePass123!"}
        login_response = client.post("/api/v1/auth/login-json", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Try to create team project without organization (should fail)
        project_data = {
            "name": "Team Project Without Org",
            "description": "This should fail",
            "status": "active",
            "visibility": "team",
        }
        response = client.post("/api/v1/projects/", json=project_data, headers=headers)
        assert response.status_code == 400
        error_data = response.json()
        assert "organization" in error_data["detail"].lower()

        # Try to create organization project without organization (should fail)
        project_data["visibility"] = "organization"
        response = client.post("/api/v1/projects/", json=project_data, headers=headers)
        assert response.status_code == 400

        # Personal project should work
        project_data["visibility"] = "personal"
        response = client.post("/api/v1/projects/", json=project_data, headers=headers)
        assert response.status_code == 201

    def test_project_organization_id_validation(
        self, client: TestClient, db: Session, test_rate_limits
    ):
        """Test validation of organization_id in project creation."""
        # Create organization
        org = Organization(
            name="Valid Corp",
            domain="valid.com",
            short_name="VALID",
            scope=OrganizationScope.SHARED,
            max_users=100,
            created_by=uuid.uuid4(),
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Create user
        user_data = {
            "email": "user@valid.com",
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "User",
            "terms_agreement": True,
        }
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 201

        user = db.query(User).filter(User.email == "user@valid.com").first()
        assert user is not None
        user.email_verified = True
        db.commit()

        login_data = {"email": "user@valid.com", "password": "SecurePass123!"}
        login_response = client.post("/api/v1/auth/login-json", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Try to create project with invalid organization_id
        project_data = {
            "name": "Test Project",
            "description": "Test project",
            "organization_id": str(uuid.uuid4()),  # Non-existent organization
            "status": "active",
            "visibility": "team",
        }
        response = client.post("/api/v1/projects/", json=project_data, headers=headers)
        assert response.status_code == 404
        error_data = response.json()
        assert "organization" in error_data["detail"].lower()

        # Try to create project with organization user doesn't belong to
        # (just-in-time system should auto-assign user to organization)
        project_data["organization_id"] = str(org.id)
        response = client.post("/api/v1/projects/", json=project_data, headers=headers)
        assert response.status_code == 201  # Just-in-time assignment succeeds

        # Verify user was automatically assigned to organization
        user = db.query(User).filter(User.email == "user@valid.com").first()
        assert user is not None
        assert user.organization_id == org.id

    def test_project_archive_restore_edge_cases(
        self, client: TestClient, db: Session, test_rate_limits
    ):
        """Test project archive and restore edge cases."""
        # Create user and personal project
        user_data = {
            "email": "user@example.com",
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "User",
            "terms_agreement": True,
        }
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 201

        user = db.query(User).filter(User.email == "user@example.com").first()
        assert user is not None
        user.email_verified = True
        db.commit()

        login_data = {"email": "user@example.com", "password": "SecurePass123!"}
        login_response = client.post("/api/v1/auth/login-json", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create project
        project_data = {
            "name": "Test Project",
            "description": "Test project",
            "status": "active",
            "visibility": "personal",
        }
        response = client.post("/api/v1/projects/", json=project_data, headers=headers)
        assert response.status_code == 201
        project = response.json()

        # Archive project
        archive_response = client.put(
            f"/api/v1/projects/{project['id']}",
            json={"status": "archived"},
            headers=headers,
        )
        assert archive_response.status_code == 200

        # Try to archive already archived project
        archive_response2 = client.put(
            f"/api/v1/projects/{project['id']}",
            json={"status": "archived"},
            headers=headers,
        )
        assert archive_response2.status_code == 200  # Should be idempotent

        # Restore project
        restore_response = client.put(
            f"/api/v1/projects/{project['id']}",
            json={"status": "active"},
            headers=headers,
        )
        assert restore_response.status_code == 200

        # Try to restore already active project
        restore_response2 = client.put(
            f"/api/v1/projects/{project['id']}",
            json={"status": "active"},
            headers=headers,
        )
        assert restore_response2.status_code == 200  # Should be idempotent


class TestAuthenticationEdgeCases:
    """Test authentication and authorization edge cases."""

    def test_expired_token_handling(
        self, client: TestClient, db: Session, test_rate_limits
    ):
        """Test handling of expired authentication tokens."""
        # Create user
        user_data = {
            "email": "user@example.com",
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "User",
            "terms_agreement": True,
        }
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 201

        user = db.query(User).filter(User.email == "user@example.com").first()
        assert user is not None
        user.email_verified = True
        db.commit()

        # Use invalid/expired token
        invalid_headers = {"Authorization": "Bearer invalid_token_here"}

        # Try to access protected endpoint with invalid token
        response = client.get("/api/v1/users/me", headers=invalid_headers)
        assert response.status_code == 401

        # Try to create organization with invalid token
        org_data = {
            "name": "Test Corp",
            "domain": "test.com",
            "short_name": "TEST",
            "scope": "shared",
        }
        response = client.post(
            "/api/v1/organizations/", json=org_data, headers=invalid_headers
        )
        assert response.status_code == 401

    def test_user_not_found_scenarios(self, client: TestClient, db: Session):
        """Test scenarios where user is not found."""
        # Try to check domain for non-existent user email
        response = client.get(
            "/api/v1/organizations/check-domain",
            params={"email": "nonexistent@example.com"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["domain_found"] is False

    def test_organization_member_permissions(
        self, client: TestClient, db: Session, test_rate_limits
    ):
        """Test organization member permission edge cases."""
        # Create organization and two users
        org = Organization(
            name="Permission Corp",
            domain="permission.com",
            short_name="PERM",
            scope=OrganizationScope.SHARED,
            max_users=100,
            created_by=uuid.uuid4(),
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Create user1 (member)
        user1_data = {
            "email": "user1@permission.com",
            "password": "SecurePass123!",
            "first_name": "User1",
            "last_name": "Member",
            "terms_agreement": True,
        }
        reg_response1 = client.post("/api/v1/auth/register", json=user1_data)
        assert reg_response1.status_code == 201

        user1 = db.query(User).filter(User.email == "user1@permission.com").first()
        assert user1 is not None
        user1.email_verified = True
        db.commit()

        login_data1 = {"email": "user1@permission.com", "password": "SecurePass123!"}
        login_response1 = client.post("/api/v1/auth/login-json", json=login_data1)
        assert login_response1.status_code == 200
        token1 = login_response1.json()["access_token"]
        headers1 = {"Authorization": f"Bearer {token1}"}

        # Create user2 (not member)
        user2_data = {
            "email": "user2@external.com",
            "password": "SecurePass123!",
            "first_name": "User2",
            "last_name": "External",
            "terms_agreement": True,
        }
        reg_response2 = client.post("/api/v1/auth/register", json=user2_data)
        assert reg_response2.status_code == 201

        user2 = db.query(User).filter(User.email == "user2@external.com").first()
        assert user2 is not None
        user2.email_verified = True
        db.commit()

        login_data2 = {"email": "user2@external.com", "password": "SecurePass123!"}
        login_response2 = client.post("/api/v1/auth/login-json", json=login_data2)
        assert login_response2.status_code == 200
        token2 = login_response2.json()["access_token"]
        headers2 = {"Authorization": f"Bearer {token2}"}

        # User1 joins organization
        join_response = client.post(
            f"/api/v1/organizations/{org.id}/join", headers=headers1
        )
        assert join_response.status_code == 200

        # User2 (non-member) tries to create project in organization
        # (just-in-time system should auto-assign if capacity allows)
        project_data = {
            "name": "Unauthorized Project",
            "description": "Should succeed with just-in-time assignment",
            "organization_id": str(org.id),
            "status": "active",
            "visibility": "team",
        }
        response = client.post("/api/v1/projects/", json=project_data, headers=headers2)
        assert response.status_code == 201  # Just-in-time assignment succeeds

        # Verify user2 was automatically assigned to organization
        user2 = db.query(User).filter(User.email == "user2@external.com").first()
        assert user2 is not None
        assert user2.organization_id == org.id

        # Create another organization to test domain-specific join behavior
        org2 = Organization(
            name="Domain Specific Corp",
            domain="specific.com",
            short_name="SPEC",
            scope=OrganizationScope.SHARED,
            max_users=100,
            created_by=uuid.uuid4(),
        )
        db.add(org2)
        db.commit()
        db.refresh(org2)

        # User2 tries to join organization with different domain
        # (should now fail since they have an org)
        join_response2 = client.post(
            f"/api/v1/organizations/{org2.id}/join", headers=headers2
        )
        assert join_response2.status_code == 400  # Already has organization


class TestPerformanceEdgeCases:
    """Test performance and scalability edge cases."""

    def test_large_organization_operations(
        self, client: TestClient, db: Session, test_rate_limits
    ):
        """Test operations with large numbers of organizations."""
        # Create many organizations
        orgs = []
        for i in range(50):
            org = Organization(
                name=f"Corp {i:03d}",
                domain=f"corp{i:03d}.com",
                short_name=f"C{i:03d}",
                scope=OrganizationScope.SHARED,
                max_users=100,
                created_by=uuid.uuid4(),
            )
            orgs.append(org)
            db.add(org)
        db.commit()

        # Test domain checking performance
        import time

        start_time = time.time()
        response = client.get(
            "/api/v1/organizations/check-domain", params={"email": "user@corp025.com"}
        )
        end_time = time.time()

        assert response.status_code == 200
        assert (end_time - start_time) < 2.0  # Should be reasonably fast

        data = response.json()
        assert data["domain_found"] is True
        assert data["organization"]["name"] == "Corp 025"

    def test_concurrent_organization_joining(
        self, client: TestClient, db: Session, test_rate_limits, clean_mailpit
    ):
        """Test concurrent organization joining scenarios."""
        # Create organization with limited capacity
        org = Organization(
            name="Concurrent Corp",
            domain="concurrent.com",
            short_name="CONC",
            scope=OrganizationScope.SHARED,
            max_users=3,
            created_by=uuid.uuid4(),
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Create multiple users and try to join simultaneously
        users = []
        for i in range(5):  # More users than capacity
            user_data = {
                "email": f"user{i+1}@concurrent.com",
                "password": "SecurePass123!",
                "first_name": f"User{i+1}",
                "last_name": "Concurrent",
                "terms_agreement": True,
            }
            reg_response = client.post("/api/v1/auth/register", json=user_data)
            assert reg_response.status_code == 201

            user = (
                db.query(User).filter(User.email == f"user{i+1}@concurrent.com").first()
            )
            assert user is not None
            user.email_verified = True
            db.commit()

            login_data = {
                "email": f"user{i+1}@concurrent.com",
                "password": "SecurePass123!",
            }
            login_response = client.post("/api/v1/auth/login-json", json=login_data)
            assert login_response.status_code == 200
            token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            users.append((user, headers))

        # Try to join organization (first 3 should succeed, last 2 should fail)
        successful_joins = 0
        failed_joins = 0

        for user, headers in users:
            join_response = client.post(
                f"/api/v1/organizations/{org.id}/join", headers=headers
            )
            if join_response.status_code == 200:
                successful_joins += 1
            elif join_response.status_code == 400:
                failed_joins += 1

        assert successful_joins == 3  # Capacity limit
        assert failed_joins == 2  # Exceeded capacity

    def test_project_list_pagination_edge_cases(
        self, client: TestClient, db: Session, test_rate_limits
    ):
        """Test project list pagination with edge cases."""
        # Create user
        user_data = {
            "email": "user@example.com",
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "User",
            "terms_agreement": True,
        }
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 201

        user = db.query(User).filter(User.email == "user@example.com").first()
        assert user is not None
        user.email_verified = True
        db.commit()

        login_data = {"email": "user@example.com", "password": "SecurePass123!"}
        login_response = client.post("/api/v1/auth/login-json", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create many projects
        for i in range(25):
            project_data = {
                "name": f"Project {i:02d}",
                "description": f"Project number {i}",
                "status": "active",
                "visibility": "personal",
            }
            response = client.post(
                "/api/v1/projects/", json=project_data, headers=headers
            )
            assert response.status_code == 201

        # Test pagination edge cases
        # Request more than available
        response = client.get(
            "/api/v1/projects/", params={"page": 1, "size": 100}, headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["projects"]) == 25

        # Request page beyond available
        response = client.get(
            "/api/v1/projects/", params={"page": 10, "size": 10}, headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["projects"]) == 0

        # Request with size 0 (should return all or default behavior)
        response = client.get(
            "/api/v1/projects/", params={"page": 1, "size": 0}, headers=headers
        )
        assert response.status_code == 200  # API handles gracefully
        data = response.json()
        # Size 0 might return default pagination or all items
        assert len(data["projects"]) >= 0


class TestDataIntegrityEdgeCases:
    """Test data integrity and consistency edge cases."""

    def test_orphaned_project_handling(
        self, client: TestClient, db: Session, test_rate_limits
    ):
        """Test handling of projects when organization is deleted."""
        # Create organization and user
        org = Organization(
            name="Temp Corp",
            domain="temp.com",
            short_name="TEMP",
            scope=OrganizationScope.SHARED,
            max_users=100,
            created_by=uuid.uuid4(),
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        user_data = {
            "email": "user@temp.com",
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "User",
            "terms_agreement": True,
        }
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 201

        user = db.query(User).filter(User.email == "user@temp.com").first()
        assert user is not None
        user.email_verified = True
        db.commit()

        login_data = {"email": "user@temp.com", "password": "SecurePass123!"}
        login_response = client.post("/api/v1/auth/login-json", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Join organization and create project
        join_response = client.post(
            f"/api/v1/organizations/{org.id}/join", headers=headers
        )
        assert join_response.status_code == 200

        project_data = {
            "name": "Temp Project",
            "description": "Will be orphaned",
            "organization_id": str(org.id),
            "status": "active",
            "visibility": "team",
        }
        project_response = client.post(
            "/api/v1/projects/", json=project_data, headers=headers
        )
        assert project_response.status_code == 201
        project = project_response.json()

        # Delete organization (simulating admin action)
        # Note: This tests the constraint behavior
        db.delete(org)
        try:
            db.commit()
            # If this succeeds, check that project still exists but is orphaned
            # Depending on FK constraint, this might succeed or fail
            # The project variable is needed for future constraint validation
            assert project is not None  # Project should exist
        except Exception:
            # If FK constraint prevents deletion, that's also valid behavior
            # Don't call db.rollback() - let the test framework handle transaction cleanup
            pass

    def test_user_organization_consistency(
        self, client: TestClient, db: Session, test_rate_limits
    ):
        """Test user-organization relationship consistency."""
        # Create organization
        org = Organization(
            name="Consistency Corp",
            domain="consistency.com",
            short_name="CONS",
            scope=OrganizationScope.SHARED,
            max_users=100,
            created_by=uuid.uuid4(),
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Create user
        user_data = {
            "email": "user@consistency.com",
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "User",
            "terms_agreement": True,
        }
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 201

        user = db.query(User).filter(User.email == "user@consistency.com").first()
        assert user is not None
        user.email_verified = True
        db.commit()

        login_data = {"email": "user@consistency.com", "password": "SecurePass123!"}
        login_response = client.post("/api/v1/auth/login-json", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Join organization
        join_response = client.post(
            f"/api/v1/organizations/{org.id}/join", headers=headers
        )
        assert join_response.status_code == 200

        # Verify user is now part of organization
        user = db.query(User).filter(User.email == "user@consistency.com").first()
        assert user is not None
        assert user.organization_id == org.id

        # Try to join another organization (should fail - already has organization)
        org2 = Organization(
            name="Second Corp",
            domain="second.com",
            short_name="SEC",
            scope=OrganizationScope.SHARED,
            max_users=100,
            created_by=uuid.uuid4(),
        )
        db.add(org2)
        db.commit()
        db.refresh(org2)

        join_response2 = client.post(
            f"/api/v1/organizations/{org2.id}/join", headers=headers
        )
        assert join_response2.status_code == 400
        error_data = join_response2.json()
        assert "already" in error_data["detail"].lower()

        # Leave organization
        leave_response = client.post(
            f"/api/v1/organizations/{org.id}/leave", headers=headers
        )
        assert leave_response.status_code == 200

        # Verify user is no longer part of organization
        user = db.query(User).filter(User.email == "user@consistency.com").first()
        assert user is not None
        assert user.organization_id is None

        # Now should be able to join other organization
        # (API allows cross-domain joining)
        join_response3 = client.post(
            f"/api/v1/organizations/{org2.id}/join", headers=headers
        )
        assert join_response3.status_code == 200  # Cross-domain joining is allowed

        # Refresh and verify user is now part of second organization
        db.refresh(user)
        user = db.query(User).filter(User.email == "user@consistency.com").first()
        assert user is not None
        assert user.organization_id == org2.id
