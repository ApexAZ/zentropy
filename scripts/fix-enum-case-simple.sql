-- Simplified Database Migration: Fix Enum Case Consistency
-- This script updates enum values directly without recreating types

BEGIN;

-- Step 1: Drop all check constraints that reference the old enum values
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_provider_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE team_memberships DROP CONSTRAINT IF EXISTS team_memberships_role_check;
ALTER TABLE team_invitations DROP CONSTRAINT IF EXISTS team_invitations_role_check;
ALTER TABLE team_invitations DROP CONSTRAINT IF EXISTS team_invitations_status_check;

-- Step 2: Update the actual data to match our target lowercase values
-- authprovider: LOCAL -> local, GOOGLE -> google
UPDATE users SET auth_provider = 'local' WHERE auth_provider = 'LOCAL';
UPDATE users SET auth_provider = 'google' WHERE auth_provider = 'GOOGLE';

-- userrole: all to lowercase with underscores
UPDATE users SET role = 'basic_user' WHERE role = 'BASIC_USER';
UPDATE users SET role = 'admin' WHERE role = 'ADMIN';
UPDATE users SET role = 'team_lead' WHERE role = 'TEAM_LEAD';
UPDATE users SET role = 'project_administrator' WHERE role = 'PROJECT_ADMINISTRATOR';
UPDATE users SET role = 'project_lead' WHERE role = 'PROJECT_LEAD';
UPDATE users SET role = 'stakeholder' WHERE role = 'STAKEHOLDER';

-- teamrole: all to lowercase with underscores
UPDATE team_memberships SET role = 'member' WHERE role = 'MEMBER';
UPDATE team_memberships SET role = 'lead' WHERE role = 'LEAD';
UPDATE team_memberships SET role = 'admin' WHERE role = 'ADMIN';
UPDATE team_memberships SET role = 'team_administrator' WHERE role = 'TEAM_ADMINISTRATOR';

UPDATE team_invitations SET role = 'member' WHERE role = 'MEMBER';
UPDATE team_invitations SET role = 'lead' WHERE role = 'LEAD';
UPDATE team_invitations SET role = 'admin' WHERE role = 'ADMIN';
UPDATE team_invitations SET role = 'team_administrator' WHERE role = 'TEAM_ADMINISTRATOR';

-- invitationstatus: all to lowercase
UPDATE team_invitations SET status = 'pending' WHERE status = 'PENDING';
UPDATE team_invitations SET status = 'accepted' WHERE status = 'ACCEPTED';
UPDATE team_invitations SET status = 'declined' WHERE status = 'DECLINED';
UPDATE team_invitations SET status = 'expired' WHERE status = 'EXPIRED';

-- Step 3: Update the enum types to have only lowercase values
-- Drop and recreate enum types with correct values
DROP TYPE IF EXISTS authprovider CASCADE;
CREATE TYPE authprovider AS ENUM ('local', 'google');

DROP TYPE IF EXISTS userrole CASCADE;
CREATE TYPE userrole AS ENUM ('basic_user', 'admin', 'team_lead', 'project_administrator', 'project_lead', 'stakeholder');

DROP TYPE IF EXISTS teamrole CASCADE;
CREATE TYPE teamrole AS ENUM ('member', 'lead', 'admin', 'team_administrator');

DROP TYPE IF EXISTS invitationstatus CASCADE;
CREATE TYPE invitationstatus AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- registrationtype is already correct

-- Step 4: Recreate the columns with the new enum types
ALTER TABLE users ALTER COLUMN auth_provider TYPE authprovider USING auth_provider::authprovider;
ALTER TABLE users ALTER COLUMN role TYPE userrole USING role::userrole;
ALTER TABLE team_memberships ALTER COLUMN role TYPE teamrole USING role::teamrole;
ALTER TABLE team_invitations ALTER COLUMN role TYPE teamrole USING role::teamrole;
ALTER TABLE team_invitations ALTER COLUMN status TYPE invitationstatus USING status::invitationstatus;

-- Step 5: Set proper defaults
ALTER TABLE users ALTER COLUMN auth_provider SET DEFAULT 'local';
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'basic_user';
ALTER TABLE team_memberships ALTER COLUMN role SET DEFAULT 'member';
ALTER TABLE team_invitations ALTER COLUMN role SET DEFAULT 'member';
ALTER TABLE team_invitations ALTER COLUMN status SET DEFAULT 'pending';

-- Step 6: Recreate check constraints with correct values (optional, but good for extra validation)
ALTER TABLE users ADD CONSTRAINT users_auth_provider_check 
    CHECK (auth_provider IN ('local', 'google'));

ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('basic_user', 'admin', 'team_lead', 'project_administrator', 'project_lead', 'stakeholder'));

COMMIT;

-- Verification: Show all enum values are now lowercase
SELECT 'After migration - all enum values:' as status;
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