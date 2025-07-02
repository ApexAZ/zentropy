#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🛑 Stopping Zentropy development environment...\n');

// Kill servers
try {
  execSync('pkill -f uvicorn', { stdio: 'ignore' });
  console.log('✅ API server stopped');
} catch (e) {
  console.log('ℹ️  API server was not running');
}

try {
  execSync('pkill -f vite', { stdio: 'ignore' });
  console.log('✅ Client server stopped');
} catch (e) {
  console.log('ℹ️  Client server was not running');
}

// Stop database
try {
  execSync('docker-compose down', { stdio: 'pipe' });
  console.log('✅ Database stopped');
} catch (e) {
  console.log('ℹ️  Database was not running');
}

console.log('\n👋 All services stopped');