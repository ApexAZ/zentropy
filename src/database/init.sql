-- Capacity Planner Database Schema
-- Created: 2025-06-27

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('team_lead', 'team_member')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    velocity_baseline INTEGER DEFAULT 0,
    sprint_length_days INTEGER DEFAULT 14,
    working_days_per_week INTEGER DEFAULT 5,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team memberships table (many-to-many relationship)
CREATE TABLE team_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Calendar entries table (PTO, holidays, etc.)
CREATE TABLE calendar_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    entry_type VARCHAR(20) CHECK (entry_type IN ('pto', 'holiday', 'sick', 'personal')) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    all_day BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- Sprints table (auto-generated based on team settings)
CREATE TABLE sprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    planned_capacity INTEGER DEFAULT 0,
    actual_capacity INTEGER DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('planned', 'active', 'completed')) DEFAULT 'planned',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (end_date > start_date)
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_team_memberships_team_id ON team_memberships(team_id);
CREATE INDEX idx_team_memberships_user_id ON team_memberships(user_id);
CREATE INDEX idx_calendar_entries_user_id ON calendar_entries(user_id);
CREATE INDEX idx_calendar_entries_team_id ON calendar_entries(team_id);
CREATE INDEX idx_calendar_entries_dates ON calendar_entries(start_date, end_date);
CREATE INDEX idx_sprints_team_id ON sprints(team_id);
CREATE INDEX idx_sprints_dates ON sprints(start_date, end_date);

-- Insert sample data for development
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('teamlead@example.com', '$2b$10$dummy.hash.for.development', 'John', 'Smith', 'team_lead'),
('developer1@example.com', '$2b$10$dummy.hash.for.development', 'Jane', 'Doe', 'team_member'),
('developer2@example.com', '$2b$10$dummy.hash.for.development', 'Bob', 'Johnson', 'team_member');