#!/usr/bin/env node

import net from 'net';

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`❌ Port ${port} is already in use`);
        console.log(`   Run 'lsof -i :${port}' to see what's using it`);
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      console.log(`✅ Port ${port} is available`);
      resolve(true);
    });
    
    server.listen(port);
  });
}

async function main() {
  console.log('Checking required ports...\n');
  
  const apiPortFree = await checkPort(3000);
  const clientPortFree = await checkPort(5173);
  
  if (!apiPortFree || !clientPortFree) {
    console.log('\n⚠️  Please free up the ports before starting dev servers');
    console.log('You can kill processes using: pkill -f "uvicorn" or pkill -f "vite"');
    process.exit(1);
  }
  
  console.log('\n✅ All ports are available!');
}

main();