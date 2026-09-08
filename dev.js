const { spawn, execSync } = require('child_process');
const path = require('path');
const readline = require('readline');

const BACKEND_DIR = path.resolve(__dirname, 'backend');
const FRONTEND_DIR = path.resolve(__dirname, 'frontend');

console.log('=====================================================');
console.log('  Ferð Travel Platform — Concurrent Dev Runner');
console.log('');
console.log('  Frontend: http://localhost:3000');
console.log('  Backend:  http://localhost:4000 (Express.js)');
console.log('');
console.log('  Press Ctrl+C to stop both services');
console.log('=====================================================\n');

function attachLogger(child, prefix, colorCode = '\x1b[36m') {
  const reset = '\x1b[0m';
  const prefixStr = `${colorCode}${prefix}${reset}`;

  if (child.stdout) {
    const rlOut = readline.createInterface({ input: child.stdout });
    rlOut.on('line', line => {
      console.log(`${prefixStr} ${line}`);
    });
  }

  if (child.stderr) {
    const rlErr = readline.createInterface({ input: child.stderr });
    rlErr.on('line', line => {
      console.error(`${colorCode}${prefix} [ERR]${reset} ${line}`);
    });
  }
}

// Spawn Backend on Port 4000
const backendProcess = spawn('node', ['server.js'], {
  cwd: BACKEND_DIR,
  env: {
    ...process.env,
    PORT: '4000'
  },
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});
attachLogger(backendProcess, '[Backend :4000]', '\x1b[34m'); // Blue

// Spawn Frontend on Port 3000
const frontendProcess = spawn('node', ['server.js'], {
  cwd: FRONTEND_DIR,
  env: {
    ...process.env,
    PORT: '3000',
    BACKEND_PORT: '4000'
  },
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});
attachLogger(frontendProcess, '[Frontend :3000]', '\x1b[32m'); // Green

// Graceful Cleanup Handler
let isCleaningUp = false;
function cleanup() {
  if (isCleaningUp) return;
  isCleaningUp = true;

  console.log('\n[Dev Runner] Shutting down Ferð backend and frontend servers...');

  const killTree = (pid) => {
    if (!pid) return;
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${pid} /T /F 2>nul`);
      } else {
        process.kill(-pid, 'SIGKILL');
      }
    } catch (e) {
      // Process might have already exited
    }
  };

  if (backendProcess && backendProcess.pid) {
    killTree(backendProcess.pid);
  }
  if (frontendProcess && frontendProcess.pid) {
    killTree(frontendProcess.pid);
  }

  console.log('[Dev Runner] Services successfully stopped.');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

backendProcess.on('exit', (code) => {
  if (!isCleaningUp && code !== 0) {
    console.error(`[Backend :4000] Exited with code ${code}`);
  }
});

frontendProcess.on('exit', (code) => {
  if (!isCleaningUp && code !== 0) {
    console.error(`[Frontend :3000] Exited with code ${code}`);
  }
});
