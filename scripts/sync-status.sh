#!/bin/bash

# Sync Status Script - Check if local environment is in sync with remote
# Useful for verifying machine synchronization status

set -e

echo "🔍 Zentropy Sync Status Check"
echo "============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check Git status
echo "Git Repository Status:"
echo "---------------------"

# Fetch latest from remote without merging
git fetch origin main --quiet

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
print_info "Current branch: $CURRENT_BRANCH"

# Check if working directory is clean
if [ -z "$(git status --porcelain)" ]; then
    print_status "Working directory is clean"
else
    print_warning "You have uncommitted changes:"
    git status --short
fi

# Check if up to date with remote
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
BASE=$(git merge-base HEAD origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    print_status "Branch is up to date with origin/main"
elif [ "$LOCAL" = "$BASE" ]; then
    print_warning "Branch is behind origin/main"
    BEHIND=$(git rev-list --count HEAD..origin/main)
    echo "  You are $BEHIND commits behind"
elif [ "$REMOTE" = "$BASE" ]; then
    print_warning "Branch is ahead of origin/main"
    AHEAD=$(git rev-list --count origin/main..HEAD)
    echo "  You are $AHEAD commits ahead"
else
    print_error "Branch has diverged from origin/main"
    echo "  You may need to merge or rebase"
fi

# Check last commit info
echo ""
echo "Last local commit:"
git log -1 --pretty=format:"  %h - %s (%cr) <%an>" --abbrev-commit
echo ""

# Check environment files
echo ""
echo "Environment Files:"
echo "-----------------"

if [ -f ".env" ]; then
    print_status ".env file exists"
    # Count number of configured variables
    ENV_VARS=$(grep -E "^[A-Z_]+=" .env | wc -l)
    print_info "$ENV_VARS environment variables configured"
else
    print_error ".env file missing - copy from .env.example"
fi

if [ -f "src/client/.env.local" ]; then
    print_status "src/client/.env.local exists"
else
    print_error "src/client/.env.local missing - required for frontend OAuth"
fi

# Check dependencies
echo ""
echo "Dependencies Status:"
echo "-------------------"

# Check if node_modules exists and is recent
if [ -d "node_modules" ]; then
    # Get last modified time of package.json and node_modules
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        PKG_TIME=$(stat -f %m package.json)
        MODULES_TIME=$(stat -f %m node_modules)
    else
        # Linux
        PKG_TIME=$(stat -c %Y package.json)
        MODULES_TIME=$(stat -c %Y node_modules)
    fi
    
    if [ "$PKG_TIME" -gt "$MODULES_TIME" ]; then
        print_warning "package.json is newer than node_modules - run 'npm install'"
    else
        print_status "Node modules up to date"
    fi
else
    print_error "node_modules directory missing - run 'npm install'"
fi

# Check Python packages (basic check)
if command -v pip &> /dev/null; then
    MISSING_PKGS=0
    while IFS= read -r package; do
        # Extract package name (before any version specifier)
        PKG_NAME=$(echo "$package" | sed 's/[<>=].*//')
        if [ ! -z "$PKG_NAME" ]; then
            if ! pip show "$PKG_NAME" &> /dev/null; then
                ((MISSING_PKGS++))
            fi
        fi
    done < requirements.txt
    
    if [ "$MISSING_PKGS" -eq 0 ]; then
        print_status "Python packages installed"
    else
        print_warning "$MISSING_PKGS Python packages missing - run 'pip install -r requirements.txt'"
    fi
fi

# Check Docker status
echo ""
echo "Docker Status:"
echo "-------------"

if docker ps | grep -q zentropy_db; then
    print_status "PostgreSQL container is running"
    
    # Check if database is accessible
    if docker exec zentropy_db pg_isready -U dev_user -d zentropy &> /dev/null; then
        print_status "Database is accessible"
    else
        print_error "Database is not responding"
    fi
else
    print_warning "PostgreSQL container is not running - run 'docker-compose up -d'"
fi

# Check port availability
echo ""
echo "Port Availability:"
echo "-----------------"

check_port() {
    local port=$1
    local service=$2
    if lsof -i ":$port" &> /dev/null; then
        print_warning "Port $port ($service) is in use"
    else
        print_status "Port $port ($service) is available"
    fi
}

check_port 3000 "API Server"
check_port 5173 "Vite Dev Server"
check_port 5432 "PostgreSQL"

# Summary
echo ""
echo "============================="
echo "Summary:"

# Determine overall status
SYNC_STATUS="GOOD"
if [ "$LOCAL" != "$REMOTE" ]; then
    SYNC_STATUS="NEEDS_SYNC"
fi
if [ ! -f ".env" ] || [ ! -f "src/client/.env.local" ]; then
    SYNC_STATUS="NEEDS_CONFIG"
fi

case $SYNC_STATUS in
    "GOOD")
        echo -e "${GREEN}✓ Environment is ready for development${NC}"
        echo "Run 'npm run dev' to start developing"
        ;;
    "NEEDS_SYNC")
        echo -e "${YELLOW}⚠ Git repository needs synchronization${NC}"
        echo "Run 'git pull' to update or 'git push' to share your changes"
        ;;
    "NEEDS_CONFIG")
        echo -e "${RED}✗ Environment configuration needed${NC}"
        echo "Configure missing .env files before starting development"
        ;;
esac

echo ""