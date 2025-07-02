#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const readline = require('readline');

console.log('🚀 Starting Zentropy development environment...\n');

// Color codes
const colors = {
  api: '\x1b[33m',     // yellow
  client: '\x1b[36m',  // cyan
  db: '\x1b[32m',      // green
  reset: '\x1b[0m'
};

// Utility functions
function checkPort(port) {
  try {
    execSync(`lsof -i :${port}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkDockerContainer(containerName) {
  try {
    const result = execSync(`docker ps --filter "name=${containerName}" --format "{{.Names}}"`, { encoding: 'utf8' });
    return result.trim() === containerName;
  } catch {
    return false;
  }
}

function checkDatabaseReady() {
  try {
    execSync('docker exec zentropy_db pg_isready -U dev_user -d zentropy', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Service management
let apiProc = null;
let clientProc = null;

// Cleanup function
function cleanup() {
  console.log('\n👋 Shutting down...');
  if (apiProc) apiProc.kill();
  if (clientProc) clientProc.kill();
  // Database is left running (managed by Docker)
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start services
async function startServices() {
  // 1. Check and start database
  console.log(`${colors.db}[DATABASE]${colors.reset} Checking database...`);
  
  if (checkDockerContainer('zentropy_db')) {
    console.log(`${colors.db}[DATABASE]${colors.reset} ✅ Container already running`);
    
    if (checkDatabaseReady()) {
      console.log(`${colors.db}[DATABASE]${colors.reset} ✅ Database ready`);
    } else {
      console.log(`${colors.db}[DATABASE]${colors.reset} ⏳ Waiting for database to be ready...`);
      // Wait for database to be ready
      let attempts = 0;
      while (!checkDatabaseReady() && attempts < 15) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      if (checkDatabaseReady()) {
        console.log(`${colors.db}[DATABASE]${colors.reset} ✅ Database ready`);
      } else {
        console.log(`${colors.db}[DATABASE]${colors.reset} ❌ Database not ready after 15 seconds`);
        process.exit(1);
      }
    }
  } else {
    console.log(`${colors.db}[DATABASE]${colors.reset} 🚀 Starting database container...`);
    try {
      execSync('docker-compose up -d', { stdio: 'pipe' });
      console.log(`${colors.db}[DATABASE]${colors.reset} ✅ Container started`);
      
      // Wait for database to be ready
      console.log(`${colors.db}[DATABASE]${colors.reset} ⏳ Waiting for database initialization...`);
      let attempts = 0;
      while (!checkDatabaseReady() && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      if (checkDatabaseReady()) {
        console.log(`${colors.db}[DATABASE]${colors.reset} ✅ Database ready`);
      } else {
        console.log(`${colors.db}[DATABASE]${colors.reset} ❌ Database failed to start`);
        process.exit(1);
      }
    } catch (error) {
      console.log(`${colors.db}[DATABASE]${colors.reset} ❌ Failed to start database:`, error.message);
      process.exit(1);
    }
  }

  // Wait 15 seconds before starting API
  console.log(`${colors.db}[DATABASE]${colors.reset} ⏳ Waiting 15 seconds before starting API...`);
  await new Promise(resolve => setTimeout(resolve, 15000));

  // 2. Check and start API
  console.log(`\n${colors.api}[API]${colors.reset} Checking API server...`);
  
  if (checkPort(3000)) {
    console.log(`${colors.api}[API]${colors.reset} ✅ Already running on port 3000`);
  } else {
    console.log(`${colors.api}[API]${colors.reset} 🚀 Starting API server...`);
    
    apiProc = spawn('python3', ['-m', 'uvicorn', 'api.main:app', '--host', '127.0.0.1', '--port', '3000', '--reload'], {
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    // Handle API output
    const apiRl = readline.createInterface({ input: apiProc.stdout });
    apiRl.on('line', (line) => {
      console.log(`${colors.api}[API]${colors.reset} ${line}`);
    });

    const apiErrRl = readline.createInterface({ input: apiProc.stderr });
    apiErrRl.on('line', (line) => {
      console.error(`${colors.api}[API]${colors.reset} ${line}`);
    });

    apiProc.on('exit', (code) => {
      console.log(`\n❌ API server exited with code ${code}`);
      cleanup();
    });

    // Wait for API to be ready
    console.log(`${colors.api}[API]${colors.reset} ⏳ Waiting for API startup...`);
    let apiAttempts = 0;
    while (!checkPort(3000) && apiAttempts < 15) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      apiAttempts++;
    }
    
    if (checkPort(3000)) {
      console.log(`${colors.api}[API]${colors.reset} ✅ API server ready on port 3000`);
    } else {
      console.log(`${colors.api}[API]${colors.reset} ❌ API server failed to start`);
      cleanup();
      return;
    }
  }

  // Wait 15 seconds before starting client
  console.log(`${colors.api}[API]${colors.reset} ⏳ Waiting 15 seconds before starting client...`);
  await new Promise(resolve => setTimeout(resolve, 15000));

  // 3. Check and start client
  console.log(`\n${colors.client}[CLIENT]${colors.reset} Checking client server...`);
  
  if (checkPort(5173)) {
    console.log(`${colors.client}[CLIENT]${colors.reset} ✅ Already running on port 5173`);
  } else {
    console.log(`${colors.client}[CLIENT]${colors.reset} 🚀 Starting client server...`);
    
    clientProc = spawn('npm', ['run', 'dev:client'], {
      shell: true
    });

    // Handle client output
    const clientRl = readline.createInterface({ input: clientProc.stdout });
    clientRl.on('line', (line) => {
      console.log(`${colors.client}[CLIENT]${colors.reset} ${line}`);
    });

    const clientErrRl = readline.createInterface({ input: clientProc.stderr });
    clientErrRl.on('line', (line) => {
      console.error(`${colors.client}[CLIENT]${colors.reset} ${line}`);
    });

    clientProc.on('exit', (code) => {
      console.log(`\n❌ Client server exited with code ${code}`);
      cleanup();
    });

    // Wait for client to be ready
    console.log(`${colors.client}[CLIENT]${colors.reset} ⏳ Waiting for client startup...`);
    let clientAttempts = 0;
    while (!checkPort(5173) && clientAttempts < 15) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      clientAttempts++;
    }
    
    if (checkPort(5173)) {
      console.log(`${colors.client}[CLIENT]${colors.reset} ✅ Client server ready on port 5173`);
    } else {
      console.log(`${colors.client}[CLIENT]${colors.reset} ❌ Client server failed to start`);
      cleanup();
      return;
    }
  }

  // Final status
  console.log('\n🎉 All services are running!');
  console.log(`   📊 Frontend: http://localhost:5173`);
  console.log(`   🔌 API: http://localhost:3000`);
  console.log(`   📚 API Docs: http://localhost:3000/docs`);
  console.log('\n   Press Ctrl+C to stop all services\n');
}

// Start the process
startServices().catch(error => {
  console.error('❌ Startup failed:', error);
  cleanup();
});

// Keep the process alive
process.stdin.resume();