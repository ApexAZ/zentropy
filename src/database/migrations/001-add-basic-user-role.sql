-- Migration: Add basic_user role to users table
-- Created: 2025-06-29
-- Purpose: Implement principle of least privilege by adding basic_user as default role

-- Step 1: Drop existing role constraint
ALTER TABLE users DROP CONSTRAINT users_role_check;

-- Step 2: Add new role constraint including basic_user
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('basic_user', 'team_member', 'team_lead'));

-- Step 3: Update default role for new registrations
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'basic_user';

-- Step 4: Add comment for documentation
COMMENT ON COLUMN users.role IS 'User role: basic_user (default, limited access), team_member (team access), team_lead (full team management)';