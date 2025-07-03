# Multi-Machine Development Guide for Zentropy

This guide ensures seamless development across multiple machines (desktop and laptop) using Git for code synchronization and documented procedures for environment-specific configurations.

## Table of Contents
1. [Quick Setup Checklist](#quick-setup-checklist)
2. [Initial Setup on New Machine](#initial-setup-on-new-machine)
3. [Daily Synchronization Workflow](#daily-synchronization-workflow)
4. [Environment Variables](#environment-variables)
5. [Database Management](#database-management)
6. [VS Code Configuration](#vs-code-configuration)
7. [Troubleshooting](#troubleshooting)
8. [Emergency Recovery](#emergency-recovery)

## Quick Setup Checklist

### Prerequisites
- [ ] Docker Desktop installed and running
- [ ] Node.js 18+ installed
- [ ] Python 3.11+ installed
- [ ] Git configured with your GitHub credentials
- [ ] VS Code with Claude Code extension installed
- [ ] Access to password manager with environment variables

### Setup Steps
1. [ ] Clone repository
2. [ ] Create environment files (`.env` and `src/client/.env.local`)
3. [ ] Install dependencies (`npm run install:all`)
4. [ ] Start database (`docker-compose up -d`)
5. [ ] Initialize database (`./scripts/setup-database.sh`)
6. [ ] Run tests (`npm run test`)
7. [ ] Start development server (`npm run dev`)

## Initial Setup on New Machine

### 1. Clone Repository
```bash
# Create directory structure
mkdir -p ~/repos/claude-code
cd ~/repos/claude-code

# Clone the repository
git clone https://github.com/ApexAZ/zentropy.git
cd zentropy
```

### 2. Create Environment Files

#### Backend Environment (.env)
Create `.env` in the project root:
```bash
cp .env.example .env
```

Edit `.env` with values from your password manager:
```
# Database Configuration (Docker defaults)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zentropy
DB_USER=dev_user
DB_PASSWORD=dev_password

# Server Configuration
PORT=3000
NODE_ENV=development

# Session Configuration
SESSION_SECRET=[your-secure-session-secret]

# Google OAuth Configuration
GOOGLE_CLIENT_ID=[your-google-oauth-client-id].apps.googleusercontent.com
```

#### Frontend Environment (src/client/.env.local)
Create `src/client/.env.local`:
```bash
echo "VITE_GOOGLE_CLIENT_ID=[your-google-oauth-client-id].apps.googleusercontent.com" > src/client/.env.local
```

**IMPORTANT**: The frontend `.env.local` MUST be in the `src/client/` directory, not the project root!

### 3. Install Dependencies
```bash
# Install all dependencies (npm + Python)
npm run install:all

# Or separately:
npm install
pip install -r requirements.txt
```

### 4. Database Setup
```bash
# Start PostgreSQL container
docker-compose up -d

# Wait a few seconds for database to initialize
sleep 5

# Run database setup script
./scripts/setup-database.sh
```

### 5. Verify Installation
```bash
# Check if all services are available
npm run dev:check

# Run all tests
npm run test

# Run quality checks
npm run quality
```

## Daily Synchronization Workflow

### Starting Work (On Any Machine)

1. **Pull Latest Changes**
   ```bash
   git pull origin main
   ```

2. **Check for Dependency Updates**
   ```bash
   # If package.json was updated
   git diff HEAD~1 package.json && npm install
   
   # If requirements.txt was updated
   git diff HEAD~1 requirements.txt && pip install -r requirements.txt
   ```

3. **Start Services**
   ```bash
   # Ensure Docker is running, then:
   docker-compose up -d
   
   # Start development servers
   npm run dev
   ```

### During Development

- Make regular commits with descriptive messages
- Run tests frequently: `npm run test`
- Check code quality before commits: `npm run quality`

### Ending Work

1. **Ensure Clean Working Directory**
   ```bash
   # Check status
   git status
   
   # Run quality checks
   npm run quality
   
   # Commit all changes
   git add .
   git commit -m "Description of changes"
   ```

2. **Push to Remote**
   ```bash
   git push origin main
   ```

3. **Stop Services (Optional)**
   ```bash
   npm run stop
   ```

## Environment Variables

### Security Best Practices
- **NEVER** commit `.env` or `.env.local` files
- Store all secrets in a password manager
- Use different secrets for production

### Required Variables

#### Backend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| DB_HOST | Database host | localhost |
| DB_PORT | Database port | 5432 |
| DB_NAME | Database name | zentropy |
| DB_USER | Database user | dev_user |
| DB_PASSWORD | Database password | dev_password |
| SESSION_SECRET | Express session secret | [32+ character random string] |
| GOOGLE_CLIENT_ID | Google OAuth client ID | [your-id].apps.googleusercontent.com |
| PORT | API server port | 3000 |
| NODE_ENV | Environment | development |

#### Frontend (src/client/.env.local)
| Variable | Description | Example |
|----------|-------------|---------|
| VITE_GOOGLE_CLIENT_ID | Google OAuth client ID | [your-id].apps.googleusercontent.com |

### Adding New Environment Variables

1. Add to `.env.example` with placeholder
2. Update this documentation
3. Notify team members to update their local files

## Database Management

### Schema Synchronization
Database schema is managed through SQLAlchemy models and initialization scripts.

```bash
# Re-initialize database (WARNING: Deletes all data)
./scripts/setup-database.sh

# Check current schema
docker exec zentropy_db psql -U dev_user -d zentropy -c "\dt"
```

### Test Data
- Document any shared test accounts in `CLAUDETestAccounts.md`
- Each developer maintains their own test data
- Production data should NEVER be used locally

### Database Backups
```bash
# Backup database
docker exec zentropy_db pg_dump -U dev_user zentropy > backup.sql

# Restore database
docker exec -i zentropy_db psql -U dev_user zentropy < backup.sql
```

## VS Code Configuration

### Recommended Extensions
Extensions are defined in `.vscode/extensions.json`:
- Claude Code for VS Code
- Python
- Pylance
- ESLint
- Prettier
- GitLens
- Thunder Client

### Workspace Settings
Project-specific settings can be shared via `.vscode/settings.json` (currently gitignored).

### Settings Sync
Use VS Code's built-in Settings Sync to keep your personal preferences synchronized across machines.

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the ports
npm run dev:check

# Or manually:
lsof -i :3000 -i :5173 -i :5432

# Kill processes if needed
kill -9 [PID]
```

#### Database Connection Failed
```bash
# Check if Docker container is running
docker ps | grep zentropy_db

# Restart container
docker-compose down
docker-compose up -d
```

#### Module Not Found Errors
```bash
# For Python
pip install -r requirements.txt

# For Node.js
npm install
```

#### Environment Variable Issues
- Verify `.env` is in project root
- Verify `.env.local` is in `src/client/` directory
- Restart development servers after changing env files

### Machine-Specific Issues

#### WSL2 (Windows)
- Ensure Docker Desktop is set to use WSL2 backend
- Clone repository within WSL2 filesystem for better performance
- Use WSL2 terminal for all commands

#### macOS
- Grant terminal permissions for file access if prompted
- Use Homebrew for installing prerequisites

## Emergency Recovery

### Quick Recovery Script
```bash
#!/bin/bash
# Save as scripts/quick-recovery.sh

echo "🚀 Starting Zentropy Quick Recovery..."

# Pull latest code
git pull origin main

# Install dependencies
npm run install:all

# Start database
docker-compose up -d
sleep 5

# Initialize database
./scripts/setup-database.sh

# Run tests to verify
npm run test

echo "✅ Recovery complete! Run 'npm run dev' to start developing."
```

### Complete Reset
If all else fails:
```bash
# Stop all services
npm run stop
docker-compose down -v  # -v removes volumes

# Clean everything
rm -rf node_modules
rm -rf __pycache__
rm -rf .pytest_cache
rm -rf dist

# Start fresh
npm run install:all
docker-compose up -d
./scripts/setup-database.sh
```

## Best Practices

1. **Always Pull Before Starting**: Prevents merge conflicts
2. **Commit Frequently**: Easier to track changes and resolve conflicts
3. **Run Tests Before Pushing**: Ensures code quality
4. **Document Environment Changes**: Update this guide and `.env.example`
5. **Use Descriptive Commit Messages**: Helps track work across machines

## Maintenance

This document should be updated whenever:
- New environment variables are added
- Setup procedures change
- New machine-specific issues are discovered
- Better synchronization methods are found

Last updated: 2025-07-03