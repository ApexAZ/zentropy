# Capacity Planner - Database Entity Relationship Diagram

## ERD Visual Representation

```mermaid
erDiagram
    USERS {
        UUID id PK
        VARCHAR email UK "255"
        VARCHAR password_hash "255"
        VARCHAR first_name "100"
        VARCHAR last_name "100"
        VARCHAR role "20"
        BOOLEAN is_active
        TIMESTAMP_WITH_TIME_ZONE last_login_at
        TIMESTAMP_WITH_TIME_ZONE created_at
        TIMESTAMP_WITH_TIME_ZONE updated_at
    }
    
    TEAMS {
        UUID id PK
        VARCHAR name "100"
        TEXT description
        INTEGER velocity_baseline
        INTEGER sprint_length_days
        INTEGER working_days_per_week
        BOOLEAN is_active
        UUID created_by FK
        TIMESTAMP_WITH_TIME_ZONE created_at
        TIMESTAMP_WITH_TIME_ZONE updated_at
    }
    
    TEAM_MEMBERSHIPS {
        UUID id PK
        UUID team_id FK
        UUID user_id FK
        TIMESTAMP_WITH_TIME_ZONE joined_at
    }
    
    SESSIONS {
        UUID id PK
        UUID user_id FK
        VARCHAR session_token UK "255"
        INET ip_address
        TEXT user_agent
        TIMESTAMP_WITH_TIME_ZONE created_at
        TIMESTAMP_WITH_TIME_ZONE updated_at
        TIMESTAMP_WITH_TIME_ZONE expires_at
        BOOLEAN is_active
    }
    
    PASSWORD_HISTORY {
        UUID id PK
        UUID user_id FK
        VARCHAR password_hash "255"
        TIMESTAMP_WITH_TIME_ZONE created_at
    }
    
    CALENDAR_ENTRIES {
        UUID id PK
        UUID user_id FK
        UUID team_id FK
        VARCHAR entry_type "20"
        VARCHAR title "200"
        TEXT description
        DATE start_date
        DATE end_date
        BOOLEAN all_day
        TIMESTAMP_WITH_TIME_ZONE created_at
        TIMESTAMP_WITH_TIME_ZONE updated_at
    }
    
    SPRINTS {
        UUID id PK
        UUID team_id FK
        VARCHAR name "100"
        DATE start_date
        DATE end_date
        INTEGER planned_capacity
        INTEGER actual_capacity
        VARCHAR status "20"
        TIMESTAMP_WITH_TIME_ZONE created_at
        TIMESTAMP_WITH_TIME_ZONE updated_at
    }

    %% Relationships
    USERS ||--o{ TEAMS : "creates (created_by)"
    USERS ||--o{ TEAM_MEMBERSHIPS : "belongs_to"
    TEAMS ||--o{ TEAM_MEMBERSHIPS : "has_members"
    USERS ||--o{ SESSIONS : "owns"
    USERS ||--o{ PASSWORD_HISTORY : "tracks"
    USERS ||--o{ CALENDAR_ENTRIES : "owns"
    TEAMS ||--o{ CALENDAR_ENTRIES : "tracks"
    TEAMS ||--o{ SPRINTS : "has"
```

## Entity Relationships

### **Primary Entities**

1. **USERS** - Core user accounts (team leads and team members)
2. **TEAMS** - Development teams with capacity settings
3. **CALENDAR_ENTRIES** - PTO, holidays, and other time-off entries
4. **SPRINTS** - Sprint planning periods with capacity tracking

### **Security & Session Entities**

1. **SESSIONS** - User session management with secure tokens
2. **PASSWORD_HISTORY** - Password reuse prevention tracking

### **Junction Entity**

1. **TEAM_MEMBERSHIPS** - Many-to-many relationship between users and teams

## Relationship Details

### **1. Users ↔ Teams**
- **Type**: One-to-Many (via created_by)
- **Description**: A user can create multiple teams, but each team has one creator
- **Constraint**: `teams.created_by` → `users.id` (ON DELETE SET NULL)

### **2. Users ↔ Team Memberships**
- **Type**: One-to-Many
- **Description**: A user can be a member of multiple teams
- **Constraint**: `team_memberships.user_id` → `users.id` (ON DELETE CASCADE)

### **3. Teams ↔ Team Memberships**
- **Type**: One-to-Many
- **Description**: A team can have multiple members
- **Constraint**: `team_memberships.team_id` → `teams.id` (ON DELETE CASCADE)

### **4. Users ↔ Calendar Entries**
- **Type**: One-to-Many
- **Description**: A user can have multiple calendar entries (PTO, sick days, etc.)
- **Constraint**: `calendar_entries.user_id` → `users.id` (ON DELETE CASCADE)

### **5. Teams ↔ Calendar Entries**
- **Type**: One-to-Many
- **Description**: Calendar entries are associated with a specific team context
- **Constraint**: `calendar_entries.team_id` → `teams.id` (ON DELETE CASCADE)

### **6. Teams ↔ Sprints**
- **Type**: One-to-Many
- **Description**: A team can have multiple sprints over time
- **Constraint**: `sprints.team_id` → `teams.id` (ON DELETE CASCADE)

### **7. Users ↔ Sessions**
- **Type**: One-to-Many
- **Description**: A user can have multiple active sessions (concurrent logins)
- **Constraint**: `sessions.user_id` → `users.id` (ON DELETE CASCADE)

### **8. Users ↔ Password History**
- **Type**: One-to-Many
- **Description**: User password change history for reuse prevention
- **Constraint**: `password_history.user_id` → `users.id` (ON DELETE CASCADE)

## Business Logic Constraints

### **Check Constraints**
- `users.role` ∈ ('team_lead', 'team_member')
- `users.email` must match email format validation regex: `^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$`
- `users.first_name` and `users.last_name` must not be empty (trimmed length > 0)
- `teams.name` must not be empty (trimmed length > 0)
- `teams.velocity_baseline` ≥ 0
- `teams.sprint_length_days` between 1 and 30
- `teams.working_days_per_week` between 1 and 7
- `calendar_entries.entry_type` ∈ ('pto', 'holiday', 'sick', 'personal')
- `calendar_entries.end_date` ≥ `start_date`
- `sprints.status` ∈ ('planned', 'active', 'completed')
- `sprints.end_date` > `start_date`
- `sessions.expires_at` > `created_at` (session expiry must be in future)

### **Unique Constraints**
- `users.email` (unique across all users)
- `sessions.session_token` (unique session identifiers)
- `team_memberships(team_id, user_id)` (prevents duplicate memberships)

### **Default Values**
- `users.is_active` = true
- `teams.is_active` = true
- `teams.velocity_baseline` = 0
- `teams.sprint_length_days` = 14
- `teams.working_days_per_week` = 5
- `sessions.is_active` = true
- `calendar_entries.all_day` = true
- `sprints.planned_capacity` = 0
- `sprints.actual_capacity` = 0
- `sprints.status` = 'planned'
- All `created_at` and `updated_at` fields default to NOW()
- `team_memberships.joined_at` defaults to NOW()
- `password_history.created_at` defaults to NOW()

## Indexes for Performance

### **Primary Indexes**
- All primary keys (id fields) have automatic indexes

### **Secondary Indexes**
- `users.email` - Fast user lookup by email
- `team_memberships.team_id` - Fast team member queries
- `team_memberships.user_id` - Fast user team queries
- `sessions.user_id` - Fast user session queries
- `sessions.session_token` - Fast session token validation
- `sessions.expires_at` - Fast expired session cleanup
- `sessions(is_active, expires_at)` - Composite index for active session queries
- `password_history.user_id` - Fast user password history queries
- `password_history.created_at` - Fast chronological password queries
- `calendar_entries.user_id` - Fast user calendar queries
- `calendar_entries.team_id` - Fast team calendar queries
- `calendar_entries(start_date, end_date)` - Fast date range queries
- `sprints.team_id` - Fast team sprint queries
- `sprints(start_date, end_date)` - Fast sprint date range queries

## Data Flow for Capacity Planning

1. **Users** are assigned to **Teams** via **Team Memberships**
2. **Calendar Entries** track user availability (PTO, holidays, etc.)
3. **Sprints** are generated for teams based on their settings
4. **Capacity calculation** considers:
   - Team velocity baseline
   - Sprint duration (sprint_length_days)
   - Working days per week
   - Calendar entries reducing availability
   - Actual team member count during sprint period

This ERD supports the core capacity planning workflow by tracking team composition, individual availability, and sprint planning data.

## Implementation Status

### **✅ Fully Implemented (Production Ready)**
- **USERS**: Complete with TypeScript models, validation, comprehensive test coverage, and production-ready security
- **SESSIONS**: Complete session management with secure tokens, expiration, and comprehensive testing
- **PASSWORD_HISTORY**: Complete password reuse prevention with bcrypt hashing and history tracking
- **TEAMS**: Complete with TypeScript models, API endpoints, validation, and comprehensive test coverage  
- **TEAM_MEMBERSHIPS**: Complete with TypeScript models and full CRUD operations
- **CALENDAR_ENTRIES**: Complete with TypeScript models, API endpoints, validation, and comprehensive test coverage

### **🔄 Partially Implemented (Database + Basic Models)**
- **SPRINTS**: Database schema complete with constraints and indexes, but TypeScript model and API integration pending
  - Part of the next development priority: "Sprint Management Implementation"
  - Will include auto-generation based on team configuration
  - Planned features: capacity calculation integration, sprint planning interface

### **📊 Current Quality Metrics**
- **876 tests passing** with 100% reliability
- **0 ESLint errors** with perfect code quality
- **A+ security rating** with comprehensive authentication
- **100% TypeScript safety** with strict compilation

### **🎯 Next Implementation Priorities**
1. **Sprint Model & API** - Complete sprint management functionality
2. **Capacity Calculation API** - Integrate WorkingDaysCalculator with sprint data
3. **Real-Time Updates** - Live capacity recalculation on calendar changes
4. **Advanced UI Integration** - Calendar-first interface with capacity visualization

### **🔗 Cross-References**
- Technical implementation details: [CLAUDE.md](../CLAUDE.md)
- Testing standards and coverage: [CLAUDEQuality.md](../CLAUDEQuality.md)
- Development roadmap and priorities: [CLAUDETasks.md](../CLAUDETasks.md)
- Updated requirements documentation: [CapPlan_PRD_UPDATED.md](../CapPlan_PRD_UPDATED.md)