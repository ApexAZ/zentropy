#!/usr/bin/env node

/**
 * ⚠️ WARNING: MANUAL USER SCRIPT ONLY
 * 
 * This script spawns long-running development servers and CANNOT be executed by Claude Code
 * due to timeout limitations with persistent processes.
 * 
 * USAGE:
 * - Run manually in terminal: `npm run dev` or `node scripts/dev-startup.js`
 * - Claude Code users: Start servers manually in separate terminal windows
 * 
 * For Claude Code compatibility, use individual commands:
 * - `npm run dev:database` (start PostgreSQL)
 * - `npm run dev:api` (start Python FastAPI) 
 * - `npm run dev:client` (start React/Vite)
 */

import { spawn } from 'child_process';
import { execSync } from 'child_process';

console.log('🚀 Starting Zentropy development environment...');
console.log('⚠️  NOTE: This is a long-running process - Claude Code cannot execute this script\n');

// Function to run a command and capture output
function runCommand(command) {
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    return false;
  }
}

// Check if ports are available
console.log('🔍 Checking port availability...');
if (!runCommand('node scripts/check-ports.js')) {
  console.log('❌ Port check failed. Please free up ports 3000 and 5173');
  process.exit(1);
}

// Start database
console.log('📦 Starting database services...');
if (!runCommand('docker-compose up -d')) {
  console.log('❌ Failed to start database services');
  process.exit(1);
}

// Wait for database to be ready
console.log('⏳ Waiting for database to be ready...');
let retries = 10;
while (retries > 0) {
  try {
    execSync('docker exec zentropy_db pg_isready -U dev_user -d zentropy', { stdio: 'ignore' });
    console.log('✅ Database is ready');
    break;
  } catch {
    retries--;
    if (retries === 0) {
      console.log('❌ Database failed to start within 20 seconds');
      process.exit(1);
    }
    console.log(`⏳ Database starting... (${retries} retries left)`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Start API server
console.log('🔧 Starting API server...');
const apiServer = spawn('python3', ['-m', 'uvicorn', 'api.main:app', '--host', '127.0.0.1', '--port', '3000', '--reload'], {
  stdio: 'inherit',
  detached: true
});

// Wait a moment for API to start
await new Promise(resolve => setTimeout(resolve, 3000));

// Start client server
console.log('⚛️  Starting React client...');
const clientServer = spawn('npx', ['vite', 'dev', '--port', '5173'], {
  cwd: 'src/client',
  stdio: 'inherit',
  detached: true
});

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping development servers...');
  
  // Kill processes
  try {
    execSync('pkill -f uvicorn', { stdio: 'ignore' });
    execSync('pkill -f vite', { stdio: 'ignore' });
  } catch (e) {
    // Ignore errors - processes might already be stopped
  }
  
  process.exit(0);
});

console.log('\n🎉 Development environment started!');
console.log('📝 API server: http://localhost:3000');
console.log('🌐 React client: http://localhost:5173');
console.log('📚 API docs: http://localhost:3000/docs');
console.log('\n💡 Press Ctrl+C to stop all servers');

// Keep the process alive
setInterval(() => {}, 1000);