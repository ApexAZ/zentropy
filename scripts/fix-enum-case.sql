-- Database Migration: Fix Enum Case Consistency
-- This script converts all database enum values to lowercase to match Python enum values
-- Run with: docker exec zentropy_db psql -U dev_user -d zentropy -f /path/to/fix-enum-case.sql

BEGIN;

-- 1. Fix authprovider enum: LOCAL -> local, GOOGLE -> google
-- First remove default to avoid casting issues
ALTER TABLE users ALTER COLUMN auth_provider DROP DEFAULT;

ALTER TYPE authprovider RENAME TO authprovider_old;
CREATE TYPE authprovider AS ENUM ('local', 'google');

-- Update users table to use new enum
ALTER TABLE users 
    ALTER COLUMN auth_provider TYPE authprovider 
    USING CASE 
        WHEN auth_provider::text = 'LOCAL' THEN 'local'::authprovider
        WHEN auth_provider::text = 'GOOGLE' THEN 'google'::authprovider
        ELSE 'local'::authprovider
    END;

-- Drop old enum
DROP TYPE authprovider_old;

-- 2. Fix userrole enum: Convert all to lowercase with underscores
-- First remove default to avoid casting issues
ALTER TABLE users ALTER COLUMN role DROP DEFAULT;

ALTER TYPE userrole RENAME TO userrole_old;
CREATE TYPE userrole AS ENUM (
    'basic_user', 
    'admin', 
    'team_lead', 
    'project_administrator', 
    'project_lead', 
    'stakeholder'
);

-- Update users table to use new enum
ALTER TABLE users 
    ALTER COLUMN role TYPE userrole 
    USING CASE 
        WHEN role::text = 'BASIC_USER' THEN 'basic_user'::userrole
        WHEN role::text = 'ADMIN' THEN 'admin'::userrole
        WHEN role::text = 'TEAM_LEAD' THEN 'team_lead'::userrole
        WHEN role::text = 'PROJECT_ADMINISTRATOR' THEN 'project_administrator'::userrole
        WHEN role::text = 'PROJECT_LEAD' THEN 'project_lead'::userrole
        WHEN role::text = 'STAKEHOLDER' THEN 'stakeholder'::userrole
        ELSE 'basic_user'::userrole
    END;

-- Drop old enum
DROP TYPE userrole_old;

-- 3. Fix teamrole enum: Convert all to lowercase with underscores
-- First remove defaults to avoid casting issues
ALTER TABLE team_memberships ALTER COLUMN role DROP DEFAULT;
ALTER TABLE team_invitations ALTER COLUMN role DROP DEFAULT;

ALTER TYPE teamrole RENAME TO teamrole_old;
CREATE TYPE teamrole AS ENUM ('member', 'lead', 'admin', 'team_administrator');

-- Update team_memberships table to use new enum
ALTER TABLE team_memberships 
    ALTER COLUMN role TYPE teamrole 
    USING CASE 
        WHEN role::text = 'MEMBER' THEN 'member'::teamrole
        WHEN role::text = 'LEAD' THEN 'lead'::teamrole
        WHEN role::text = 'ADMIN' THEN 'admin'::teamrole
        WHEN role::text = 'TEAM_ADMINISTRATOR' THEN 'team_administrator'::teamrole
        ELSE 'member'::teamrole
    END;

-- Update team_invitations table to use new enum
ALTER TABLE team_invitations 
    ALTER COLUMN role TYPE teamrole 
    USING CASE 
        WHEN role::text = 'MEMBER' THEN 'member'::teamrole
        WHEN role::text = 'LEAD' THEN 'lead'::teamrole
        WHEN role::text = 'ADMIN' THEN 'admin'::teamrole
        WHEN role::text = 'TEAM_ADMINISTRATOR' THEN 'team_administrator'::teamrole
        ELSE 'member'::teamrole
    END;

-- Drop old enum
DROP TYPE teamrole_old;

-- 4. Fix invitationstatus enum: Convert all to lowercase
-- First remove default to avoid casting issues
ALTER TABLE team_invitations ALTER COLUMN status DROP DEFAULT;

ALTER TYPE invitationstatus RENAME TO invitationstatus_old;
CREATE TYPE invitationstatus AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- Update team_invitations table to use new enum
ALTER TABLE team_invitations 
    ALTER COLUMN status TYPE invitationstatus 
    USING CASE 
        WHEN status::text = 'PENDING' THEN 'pending'::invitationstatus
        WHEN status::text = 'ACCEPTED' THEN 'accepted'::invitationstatus
        WHEN status::text = 'DECLINED' THEN 'declined'::invitationstatus
        WHEN status::text = 'EXPIRED' THEN 'expired'::invitationstatus
        ELSE 'pending'::invitationstatus
    END;

-- Drop old enum
DROP TYPE invitationstatus_old;

-- 5. registrationtype is already correct (email, google_oauth) - no changes needed

-- Update default values to match new enum case
ALTER TABLE users ALTER COLUMN auth_provider SET DEFAULT 'local';
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'basic_user';
ALTER TABLE team_memberships ALTER COLUMN role SET DEFAULT 'member';
ALTER TABLE team_invitations ALTER COLUMN role SET DEFAULT 'member';
ALTER TABLE team_invitations ALTER COLUMN status SET DEFAULT 'pending';

COMMIT;

-- Verification queries
SELECT 'authprovider' as enum_type, unnest(enum_range(NULL::authprovider))::text as value
UNION ALL
SELECT 'userrole', unnest(enum_range(NULL::userrole))::text
UNION ALL
SELECT 'teamrole', unnest(enum_range(NULL::teamrole))::text
UNION ALL
SELECT 'invitationstatus', unnest(enum_range(NULL::invitationstatus))::text
UNION ALL
SELECT 'registrationtype', unnest(enum_range(NULL::registrationtype))::text
ORDER BY enum_type, value;