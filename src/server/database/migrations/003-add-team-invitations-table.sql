-- Migration: Add team_invitations table for invitation-based membership
-- This migration creates the table to support invitation workflows

-- Create team_invitations table
CREATE TABLE team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    invited_email VARCHAR(320) NOT NULL, -- RFC 5321 max email length
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('basic_user', 'team_member', 'team_lead')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    token VARCHAR(64) NOT NULL UNIQUE, -- Cryptographic token for invitation link
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX idx_team_invitations_invited_email ON team_invitations(invited_email);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);
CREATE INDEX idx_team_invitations_expires_at ON team_invitations(expires_at);
CREATE INDEX idx_team_invitations_invited_by ON team_invitations(invited_by);

-- Add composite index for common queries
CREATE INDEX idx_team_invitations_team_email ON team_invitations(team_id, invited_email);
CREATE INDEX idx_team_invitations_status_expires ON team_invitations(status, expires_at);

-- Add comments for documentation
COMMENT ON TABLE team_invitations IS 'Stores team invitations sent to users for joining teams';
COMMENT ON COLUMN team_invitations.id IS 'Unique identifier for the invitation';
COMMENT ON COLUMN team_invitations.team_id IS 'ID of the team the user is invited to join';
COMMENT ON COLUMN team_invitations.invited_email IS 'Email address of the invited user';
COMMENT ON COLUMN team_invitations.invited_by IS 'ID of the user who sent the invitation';
COMMENT ON COLUMN team_invitations.role IS 'Role the user will have when they join the team';
COMMENT ON COLUMN team_invitations.status IS 'Current status of the invitation';
COMMENT ON COLUMN team_invitations.token IS 'Secure token used for invitation acceptance/decline';
COMMENT ON COLUMN team_invitations.expires_at IS 'When the invitation expires and becomes invalid';
COMMENT ON COLUMN team_invitations.created_at IS 'When the invitation was created';
COMMENT ON COLUMN team_invitations.updated_at IS 'When the invitation was last updated';

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_team_invitations_updated_at
    BEFORE UPDATE ON team_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_team_invitations_updated_at();