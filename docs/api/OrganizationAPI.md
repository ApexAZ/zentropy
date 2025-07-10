# Organization API Documentation

## Overview

The Organization API provides endpoints for managing organizations in the Zentropy just-in-time organization system. This system allows users to register without requiring immediate organization assignment, deferring organization decisions to project creation time for a frictionless user experience.

## Key Features

- **Just-in-Time Organization Assignment**: Users can start with personal projects and be automatically assigned to organizations when creating team projects
- **Domain-Based Discovery**: Automatic organization suggestions based on email domains
- **Flexible Organization Scopes**: Personal, shared, and enterprise organization types
- **Capacity Management**: Configurable user limits per organization
- **Progressive Collaboration**: Seamless transition from personal to team to organization workflows

## Authentication

All endpoints require authentication using JWT tokens in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### 1. Domain Checking

#### `GET /api/v1/organizations/check-domain`

Check if an organization exists for a given email domain and provide workflow suggestions.

**Parameters:**
- `email` (string, required): Email address to check domain for

**Response:**
```json
{
  "domain": "example.com",
  "domain_found": true,
  "organization": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Example Corp",
    "domain": "example.com",
    "short_name": "EXAMPLE",
    "scope": "shared",
    "max_users": 100
  },
  "suggestion": {
    "action": "join",
    "can_join": true,
    "message": "Organization 'Example Corp' found for domain 'example.com'. You can request to join."
  }
}
```

**Possible Actions:**
- `join`: Organization exists, user can join
- `create`: No organization found, user can create one
- `personal`: Personal email domain detected, suggest personal projects

---

### 2. Organization Management

#### `POST /api/v1/organizations/`

Create a new organization.

**Request Body:**
```json
{
  "name": "My Organization",
  "domain": "myorg.com",
  "short_name": "MYORG",
  "scope": "shared",
  "max_users": 50
}
```

**Organization Scopes:**
- `personal`: Single-user workspace (max_users: 1)
- `shared`: Team collaboration workspace (configurable max_users)
- `enterprise`: Large organization workspace (unlimited users, admin-only creation)

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "My Organization",
  "domain": "myorg.com",
  "short_name": "MYORG",
  "scope": "shared",
  "max_users": 50,
  "created_by": "456e7890-e89b-12d3-a456-426614174000",
  "created_at": "2025-01-10T17:00:00Z",
  "updated_at": "2025-01-10T17:00:00Z"
}
```

**Validation Rules:**
- Organization name must be unique
- Domain must be unique (if provided)
- Enterprise scope requires admin privileges
- Personal scope automatically sets max_users to 1

---

#### `GET /api/v1/organizations/`

List organizations with pagination and filtering.

**Parameters:**
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 50, max: 100): Items per page
- `scope` (string, optional): Filter by organization scope
- `domain` (string, optional): Filter by domain (partial match)

**Response:**
```json
{
  "organizations": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Example Corp",
      "domain": "example.com",
      "short_name": "EXAMPLE",
      "scope": "shared",
      "max_users": 100,
      "created_by": "456e7890-e89b-12d3-a456-426614174000",
      "created_at": "2025-01-10T17:00:00Z",
      "updated_at": "2025-01-10T17:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "total_pages": 1
}
```

---

#### `GET /api/v1/organizations/{organization_id}`

Get details of a specific organization.

**Parameters:**
- `organization_id` (UUID, required): Organization ID

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Example Corp",
  "domain": "example.com",
  "short_name": "EXAMPLE",
  "scope": "shared",
  "max_users": 100,
  "current_user_count": 25,
  "created_by": "456e7890-e89b-12d3-a456-426614174000",
  "created_at": "2025-01-10T17:00:00Z",
  "updated_at": "2025-01-10T17:00:00Z"
}
```

---

#### `PUT /api/v1/organizations/{organization_id}`

Update an organization (creator only).

**Parameters:**
- `organization_id` (UUID, required): Organization ID

**Request Body:**
```json
{
  "name": "Updated Organization Name",
  "max_users": 75
}
```

**Response:** Same as GET organization response with updated fields.

---

#### `DELETE /api/v1/organizations/{organization_id}`

Delete an organization (creator only, requires no active members).

**Parameters:**
- `organization_id` (UUID, required): Organization ID

**Response:**
```json
{
  "message": "Organization 'Example Corp' deleted successfully"
}
```

---

### 3. Organization Membership

#### `POST /api/v1/organizations/{organization_id}/join`

Join an organization.

**Parameters:**
- `organization_id` (UUID, required): Organization ID

**Business Rules:**
- User must not already be in an organization
- Organization must have available capacity
- Auto-approval for just-in-time workflow

**Response:**
```json
{
  "message": "Successfully joined organization 'Example Corp'",
  "status": "approved",
  "organization_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

---

#### `POST /api/v1/organizations/{organization_id}/leave`

Leave an organization.

**Parameters:**
- `organization_id` (UUID, required): Organization ID

**Business Rules:**
- User must be a member of the organization
- Creator cannot leave if they are the sole member
- All user's organization-scoped projects remain but become inaccessible

**Response:**
```json
{
  "message": "Successfully left organization 'Example Corp'"
}
```

---

## Integration with Project Creation

The organization system integrates seamlessly with project creation through the just-in-time assignment workflow:

### Personal Projects
Users can create personal projects without any organization assignment:

```json
{
  "name": "My Personal Project",
  "description": "A personal project",
  "visibility": "personal",
  "status": "active"
}
```

### Team Projects with Just-in-Time Assignment
When creating a team project, users can specify an organization ID. If they're not a member, they'll be automatically assigned (if capacity allows):

```json
{
  "name": "Team Project",
  "description": "A collaborative project",
  "organization_id": "123e4567-e89b-12d3-a456-426614174000",
  "visibility": "team",
  "status": "active"
}
```

**Just-in-Time Assignment Process:**
1. User attempts to create team/organization project
2. System checks if user has organization assignment
3. If no assignment and capacity allows, user is automatically assigned
4. Project is created within the organization context
5. User gains access to organization collaboration features

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "detail": "Organization has reached maximum capacity"
}
```

#### 403 Forbidden
```json
{
  "detail": "Only admins can create enterprise organizations"
}
```

#### 404 Not Found
```json
{
  "detail": "Organization not found"
}
```

#### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "name"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### Organization-Specific Errors

- **Capacity Exceeded**: `"Organization has reached maximum capacity"`
- **Already Member**: `"You are already a member of this organization"`
- **Already Assigned**: `"You are already assigned to another organization"`
- **Domain Conflict**: `"Organization with domain 'example.com' already exists"`
- **Name Conflict**: `"Organization with name 'Example Corp' already exists"`
- **Sole Creator**: `"Cannot leave organization as sole creator. Delete the organization or transfer ownership first."`

## Data Models

### Organization
```typescript
interface Organization {
  id: string;
  name: string;
  domain?: string;
  short_name: string;
  scope: 'personal' | 'shared' | 'enterprise';
  max_users?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

### Domain Check Response
```typescript
interface DomainCheckResponse {
  domain: string;
  domain_found: boolean;
  organization?: Organization;
  suggestion: {
    action: 'join' | 'create' | 'personal';
    can_join: boolean;
    message: string;
  };
}
```

### Join Organization Response
```typescript
interface JoinOrganizationResponse {
  message: string;
  status: 'approved' | 'pending';
  organization_id: string;
}
```

## Workflow Examples

### 1. New User Registration and Project Creation

```bash
# 1. User registers (no organization required)
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "terms_agreement": true
}

# 2. User creates personal project initially
POST /api/v1/projects/
{
  "name": "Personal Notes",
  "visibility": "personal",
  "status": "active"
}

# 3. Later, user wants to collaborate - check domain
GET /api/v1/organizations/check-domain?email=user@example.com

# 4. If organization exists, join it
POST /api/v1/organizations/{org_id}/join

# 5. Create team project (now has organization context)
POST /api/v1/projects/
{
  "name": "Team Collaboration",
  "organization_id": "{org_id}",
  "visibility": "team",
  "status": "active"
}
```

### 2. Organization Creator Workflow

```bash
# 1. Create organization
POST /api/v1/organizations/
{
  "name": "Startup Inc",
  "domain": "startup.com",
  "short_name": "STARTUP",
  "scope": "shared",
  "max_users": 25
}

# 2. Invite team members (they use join endpoint)
# Team members use: POST /api/v1/organizations/{org_id}/join

# 3. Create organization-wide projects
POST /api/v1/projects/
{
  "name": "Company Roadmap",
  "organization_id": "{org_id}",
  "visibility": "organization",
  "status": "active"
}
```

### 3. Just-in-Time Assignment via Project Creation

```bash
# User tries to create team project in organization they're not a member of
POST /api/v1/projects/
{
  "name": "Collaboration Project",
  "organization_id": "123e4567-e89b-12d3-a456-426614174000",
  "visibility": "team",
  "status": "active"
}

# System automatically:
# 1. Checks organization capacity
# 2. Assigns user to organization
# 3. Creates project
# 4. Returns success with project details
```

## Rate Limiting

Organization endpoints implement rate limiting to prevent abuse:

- **Domain checking**: 10 requests per minute per user
- **Organization creation**: 3 requests per hour per user
- **Join/leave operations**: 5 requests per minute per user

## Security Considerations

1. **Input Validation**: All inputs are validated using Pydantic schemas
2. **Authorization**: Role-based access control for enterprise features
3. **Capacity Enforcement**: Strict limits prevent organization overflow
4. **Domain Validation**: Prevents duplicate domain registrations
5. **Creator Protection**: Special rules for organization creators

## Testing

The organization system includes comprehensive test coverage:

- **Unit Tests**: 76+ tests covering all model functionality
- **API Integration Tests**: 50+ tests covering endpoint behavior
- **Service Layer Tests**: 81+ tests covering business logic
- **Edge Case Tests**: 15+ tests covering error scenarios and boundaries
- **End-to-End Tests**: 13+ tests covering complete user workflows

Total test coverage: 235+ tests ensuring system reliability and correctness.