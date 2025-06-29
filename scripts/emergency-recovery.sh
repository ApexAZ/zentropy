#!/bin/bash

echo "🚨 EMERGENCY SERVER RECOVERY PROCEDURE"
echo "======================================"

echo "1. Killing any hanging server processes..."
pkill -f "node dist/server" || true
pkill -f "MainThread" || true

echo "2. Checking and cleaning port 3000..."
node scripts/check-port.js
sleep 2

echo "3. Stopping Docker containers..."
docker-compose down

echo "4. Cleaning build artifacts..."
rm -rf dist/
rm -f .tsbuildinfo

echo "5. Restarting database..."
docker-compose up -d

echo "6. Waiting for database to be ready..."
sleep 5

echo "7. Clean rebuild..."
npm run build

echo "8. Testing minimal server startup..."
timeout 10s node dist/server/index.js &
SERVER_PID=$!
sleep 3

if curl -s http://localhost:3000/ > /dev/null; then
    echo "✅ Server recovery successful!"
    kill $SERVER_PID 2>/dev/null
else
    echo "❌ Server still not responding - check CLAUDETroubleshooting.md for next steps"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 Recovery complete! You can now run:"
echo "   npm run dev:full    # Normal development"
echo "   npm run dev:safe    # With 10s timeout safety"