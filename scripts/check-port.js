#!/usr/bin/env node

const net = require('net');
const { execSync } = require('child_process');

const PORT = 3000;

function checkPort() {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(PORT, () => {
      server.close(() => {
        console.log(`✅ Port ${PORT} is available`);
        resolve(true);
      });
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`🚨 Port ${PORT} is in use - checking for existing processes...`);
        
        try {
          // Check what's using the port
          const result = execSync(`ss -tlnp | grep :${PORT}`, { encoding: 'utf8' });
          console.log('Process using port:', result.trim());
        } catch (e) {
          // Port might have been freed already
        }
        
        try {
          console.log('🔧 Killing existing server processes...');
          
          // Try multiple kill strategies
          try {
            execSync('pkill -f "node dist/server"', { stdio: 'pipe' });
          } catch (e) {}
          
          try {
            execSync('pkill -f "MainThread"', { stdio: 'pipe' });
          } catch (e) {}
          
          try {
            execSync('pkill -f "index.js"', { stdio: 'pipe' });
          } catch (e) {}
          
          // Force kill if necessary
          try {
            execSync('pkill -9 -f "node.*3000"', { stdio: 'pipe' });
          } catch (e) {}
          
          // Wait a moment for processes to die
          setTimeout(() => {
            console.log('✅ Process cleanup complete');
            resolve(false);
          }, 3000);
          
        } catch (killError) {
          console.log('⚠️  Could not kill processes:', killError.message);
          resolve(false);
        }
      } else {
        console.log('❌ Unexpected error checking port:', err.message);
        resolve(false);
      }
    });
  });
}

// Run the check
checkPort().then((portWasAvailable) => {
  if (portWasAvailable) {
    process.exit(0);
  } else {
    // Port was in use but we attempted cleanup
    console.log(`🔄 Port ${PORT} should now be available for server startup`);
    process.exit(0);
  }
}).catch((error) => {
  console.error('❌ Error checking port:', error.message);
  process.exit(1);
});