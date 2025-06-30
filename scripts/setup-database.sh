#!/bin/bash
# Database Setup Script for Zentropy
# Sets up the zentropy database with full schema and migrations

set -e

echo "🗄️  Setting up Zentropy database..."

# Check if Docker container is running
if ! docker ps | grep -q zentropy_db; then
    echo "📦 Starting database container..."
    docker-compose up -d
    echo "⏳ Waiting for database to be ready..."
    sleep 5
fi

# Wait for database to be ready
echo "🔍 Checking database connection..."
until docker exec zentropy_db pg_isready -U dev_user -d postgres > /dev/null 2>&1; do
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 2
done

# Create database if it doesn't exist
echo "🏗️  Creating zentropy database..."
docker exec zentropy_db psql -U dev_user -d postgres -c "SELECT 1 FROM pg_database WHERE datname = 'zentropy'" | grep -q 1 || \
docker exec zentropy_db psql -U dev_user -d postgres -c "CREATE DATABASE zentropy;"

# Copy schema files to container
echo "📄 Copying schema files to container..."
docker cp src/database/init.sql zentropy_db:/tmp/init.sql
docker cp src/database/migrations/ zentropy_db:/tmp/

# Initialize base schema
echo "🏗️  Initializing base schema..."
docker exec zentropy_db psql -U dev_user -d zentropy -f /tmp/init.sql

# Apply migrations in order
echo "🔄 Applying database migrations..."
docker exec zentropy_db psql -U dev_user -d zentropy -f /tmp/migrations/001-add-basic-user-role.sql
docker exec zentropy_db psql -U dev_user -d zentropy -f /tmp/migrations/002-add-team-membership-roles.sql
docker exec zentropy_db psql -U dev_user -d zentropy -f /tmp/migrations/003-add-team-invitations-table.sql

# Verify setup
echo "✅ Verifying database setup..."
TABLE_COUNT=$(docker exec zentropy_db psql -U dev_user -d zentropy -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

if [ "$TABLE_COUNT" -eq "8" ]; then
    echo "🎉 Database setup complete! Found $TABLE_COUNT tables:"
    docker exec zentropy_db psql -U dev_user -d zentropy -c "\dt"
else
    echo "❌ Database setup failed! Expected 8 tables, found $TABLE_COUNT"
    exit 1
fi

echo ""
echo "🎯 Database setup successful!"
echo "   Database: zentropy"
echo "   Host: localhost:5432"
echo "   User: dev_user"
echo "   Tables: 8 (users, teams, team_memberships, team_invitations, sessions, password_history, calendar_entries, sprints)"