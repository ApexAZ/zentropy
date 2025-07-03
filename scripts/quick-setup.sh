#!/bin/bash

# Quick Setup Script for Zentropy Development Environment
# This script automates the setup process for new machines

set -e  # Exit on error

echo "🚀 Zentropy Quick Setup Script"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    print_status "Python installed: $PYTHON_VERSION"
else
    print_error "Python not found. Please install Python 3.11+"
    exit 1
fi

# Check Docker
if command -v docker &> /dev/null; then
    print_status "Docker installed"
    # Check if Docker is running
    if docker info &> /dev/null; then
        print_status "Docker is running"
    else
        print_error "Docker is not running. Please start Docker Desktop"
        exit 1
    fi
else
    print_error "Docker not found. Please install Docker Desktop"
    exit 1
fi

# Check Git
if command -v git &> /dev/null; then
    print_status "Git installed"
else
    print_error "Git not found. Please install Git"
    exit 1
fi

echo ""
echo "Installing dependencies..."

# Install npm dependencies
if [ -f "package.json" ]; then
    print_status "Installing npm dependencies..."
    npm install
else
    print_error "package.json not found. Are you in the project root?"
    exit 1
fi

# Install Python dependencies
if [ -f "requirements.txt" ]; then
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt
else
    print_error "requirements.txt not found"
    exit 1
fi

echo ""
echo "Setting up environment files..."

# Check for .env file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        print_warning ".env file not found. Creating from .env.example..."
        cp .env.example .env
        print_warning "Please edit .env with your actual values!"
        print_warning "Required: SESSION_SECRET and GOOGLE_CLIENT_ID"
    else
        print_error ".env.example not found"
        exit 1
    fi
else
    print_status ".env file exists"
fi

# Check for frontend .env.local file
if [ ! -f "src/client/.env.local" ]; then
    print_warning "src/client/.env.local not found"
    print_warning "Creating placeholder file..."
    mkdir -p src/client
    echo "VITE_GOOGLE_CLIENT_ID=your_google_client_id_here" > src/client/.env.local
    print_warning "Please edit src/client/.env.local with your Google Client ID!"
else
    print_status "src/client/.env.local exists"
fi

echo ""
echo "Setting up database..."

# Start PostgreSQL container
print_status "Starting PostgreSQL container..."
docker-compose up -d

# Wait for database to be ready
print_status "Waiting for database to initialize..."
sleep 5

# Check if database is accessible
if docker exec zentropy_db pg_isready -U dev_user -d zentropy &> /dev/null; then
    print_status "Database is ready"
else
    print_error "Database is not responding"
    echo "Trying to restart..."
    docker-compose down
    docker-compose up -d
    sleep 10
fi

# Run database setup
if [ -f "./scripts/setup-database.sh" ]; then
    print_status "Initializing database schema..."
    ./scripts/setup-database.sh
else
    print_error "setup-database.sh not found"
    exit 1
fi

echo ""
echo "Running verification tests..."

# Check if ports are available
print_status "Checking port availability..."
node scripts/check-ports.js

# Run tests
print_status "Running test suite..."
npm run test:pre-commit || print_warning "Some tests failed - this is expected on initial setup"

echo ""
echo "=============================="
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env with your SESSION_SECRET and GOOGLE_CLIENT_ID"
echo "2. Edit src/client/.env.local with your VITE_GOOGLE_CLIENT_ID"
echo "3. Run 'npm run dev' to start the development server"
echo ""
echo "For more information, see MULTIDEV.md"