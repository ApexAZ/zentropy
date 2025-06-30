-- Migration: Add role support to team_memberships table
-- This migration adds role-based permissions to team memberships

-- Add role column to team_memberships table
ALTER TABLE team_memberships 
ADD COLUMN role VARCHAR(20) DEFAULT 'team_member' 
CHECK (role IN ('basic_user', 'team_member', 'team_lead'));

-- Set existing memberships to team_member role
UPDATE team_memberships SET role = 'team_member' WHERE role IS NULL;

-- Make role column NOT NULL after setting defaults
ALTER TABLE team_memberships ALTER COLUMN role SET NOT NULL;

-- Add index for better query performance on role-based queries
CREATE INDEX idx_team_memberships_role ON team_memberships(role);
CREATE INDEX idx_team_memberships_team_user ON team_memberships(team_id, user_id);

-- Add created_at and updated_at columns for better audit trail
ALTER TABLE team_memberships 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records with current timestamp
UPDATE team_memberships 
SET created_at = NOW(), updated_at = NOW() 
WHERE created_at IS NULL;

-- Make audit columns NOT NULL
ALTER TABLE team_memberships 
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET NOT NULL;