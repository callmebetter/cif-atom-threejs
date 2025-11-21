#!/usr/bin/env node

/**
 * Development Script for Image-Mesh
 * Handles development environment setup and processes
 *
 * Improvements Summary:
 * 1. Consolidated process starting logic into `startProcess` and `waitForPortAndStartElectron`.
 * 2. Removed redundant `startElectronOnly` function.
 * 3. Improved error handling for `package.json` reading.
 * 4. Refined process exit handling (SIGINT).
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const VITE_FALLBACK_PORT = '5173'; // Standard Vite dev port for better predictability
const VITE_TIMEOUT_MS = 10000; // Increased timeout for slow environment initialization (10 seconds)

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description, options = {}) {
  log(`\n🔧 ${description}`, 'cyan');
  log(`Command: ${command}`, 'yellow');

  try {
    execSync(command, {
      stdio: 'inherit',
      encoding: 'utf8',
      ...options
    });
    log(`✅ ${description} completed successfully`, 'green');
  } catch (error) {
    log(`❌ ${description} failed`, 'red');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

function getPackageJson() {
  try {
    return JSON.parse(fs.readFileSync('package.json', 'utf8'));
  } catch (error) {
    log('❌ Could not read or parse package.json', 'red');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

function checkDevPrerequisites() {
  log('\n📋 Checking development prerequisites...', 'cyan');

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion < 16) {
    log(`❌ Node.js version ${nodeVersion} is too old. Requires v16 or higher`, 'red');
    process.exit(1);
  }

  log(`✅ Node.js version: ${nodeVersion}`, 'green');

  // Check if package.json exists (Handled implicitly by getPackageJson)
  getPackageJson();

  // Check if node_modules exists
  if (!fs.existsSync('node_modules')) {
    log('⚠️  node_modules not found. Installing dependencies...', 'yellow');
    runCommand('npm install --ignore-scripts', 'Install dependencies');
  }

  log('✅ Development environment ready', 'green');
}

/**
 * Spawns a child process and handles its output.
 */
function startProcess(command, args, name, color, env = {}) {
  const processInstance = spawn(command, args, {
    stdio: 'pipe',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env }
  });

  processInstance.stdout.on('data', (data) => {
    const output = data.toString();
    // Only log external process output if it's not the critical port info
    if (name !== 'Vite' || !output.includes('http://')) {
      process.stdout.write(`${colors[color]}[${name}]${colors.reset} ${output}`);
    }
  });

  processInstance.stderr.on('data', (data) => {
    process.stderr.write(`${colors.red}[${name} Error]${colors.reset} ${data}`);
  });

  processInstance.on('error', (err) => {
    log(`❌ Failed to start ${name} process: ${err.message}`, 'red');
    process.exit(1);
  });

  return processInstance;
}

/**
 * Starts Vite, listens for the port, and then starts Electron.
 */
function waitForPortAndStartElectron() {
  log('\n🚀 Starting development servers...', 'cyan');

  let vitePort = null;
  let electronProcess = null;

  // 1. Start Vite dev server
  const viteProcess = startProcess('npm', ['run', 'dev:vite'], 'Vite', 'blue');

  const timeout = setTimeout(() => {
    if (!vitePort) {
      log(`❌ Failed to detect Vite port within ${VITE_TIMEOUT_MS / 1000}s. Using fallback port ${VITE_FALLBACK_PORT}. Check Vite config.`, 'red');
      startElectron(VITE_FALLBACK_PORT, viteProcess);
    }
  }, VITE_TIMEOUT_MS);

  viteProcess.stdout.on('data', (data) => {
    const output = data.toString();
    let logged = false; // Flag to check if we printed output

    // The stable signal often includes the 'ready' or 'Local' keyword.
    const portMatch = output.match(/Local:\s*http:\/\/localhost:(\d+)/) ||
                      output.match(/http:\/\/[^:]+:(\d+)/);

    // CRITICAL: Only proceed if we have a port AND Electron hasn't started yet.
    if (portMatch && !vitePort) {
      vitePort = portMatch[1];
      clearTimeout(timeout); 
      log(`\n🌐 Vite server running on port: ${vitePort}`, 'green');

      // 3. Start Electron once we have the port
      electronProcess = startElectron(vitePort, viteProcess);
      logged = true;

    } else if (vitePort) {
        // Once the port is found, log all subsequent output
        process.stdout.write(`${colors.blue}[Vite]${colors.reset} ${output}`);
        logged = true;
    } 
    
    // If the port is not found yet, and we didn't log,
    // suppress the intermediate 'Port XXXX is in use' logs to avoid spam
    // and wait for the final ready message.

  });

  // 4. Setup SIGINT handling for graceful shutdown
  process.on('SIGINT', () => {
    log('\n🛑 Shutting down development servers...', 'yellow');
    if (viteProcess) viteProcess.kill('SIGINT');
    if (electronProcess) electronProcess.kill('SIGINT');
    process.exit(0);
  });
}

/**
 * Starts the Electron process linked to the given Vite port.
 */
function startElectron(vitePort, viteProcess) {
  log('\n⚡ Starting Electron...', 'cyan');
  log(`🔗 Connecting to Vite on port: ${vitePort}`, 'cyan');

  // Set environment variable for the port
  const env = { VITE_PORT: vitePort };

  // Use the project's defined script for better context/reproducibility
  const electronProcess = startProcess('npm', ['run', 'dev:electron'], 'Electron', 'magenta', env);

  electronProcess.on('close', (code) => {
    if (code !== 0) {
      log(`❌ Electron process exited with code ${code}`, 'red');
    }
    // Clean up Vite if Electron exits
    if (viteProcess) viteProcess.kill('SIGINT');
    process.exit(code || 0);
  });

  return electronProcess;
}

function setupDatabase() {
  log('\n🗄️  Setting up development database...', 'cyan');

  const dbPath = 'data/image-mesh.db';
  const dbDir = path.dirname(dbPath);

  // Create data directory if it doesn't exist
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    log(`✅ Created directory: ${dbDir}`, 'green');
  }

  // Database creation note
  if (!fs.existsSync(dbPath)) {
    log('📝 Database file not found. It will be created/initialized on first application run.', 'yellow');
  } else {
    log('✅ Database file already exists.', 'green');
  }
}

function runTests() {
  const packageJson = getPackageJson();

  if (packageJson.scripts && packageJson.scripts.test) {
    runCommand('npm test', 'Run tests');
  } else {
    log('⚠️  No `test` script found in package.json', 'yellow');
  }
}

function runLinting() {
  log('\n🔍 Running linting...', 'cyan');

  const packageJson = getPackageJson();

  if (packageJson.scripts && packageJson.scripts.lint) {
    runCommand('npm run lint', 'Run linting');
  } else {
    log('⚠️  No `lint` script found in package.json', 'yellow');
  }
}

function showDevInfo() {
  log('\n📊 Development Information:', 'cyan');

  const packageJson = getPackageJson();

  log(`📦 Application: ${packageJson.name}`, 'blue');
  log(`🏷️  Version: ${packageJson.version}`, 'blue');
  log(`📝 Description: ${packageJson.description}`, 'blue');
  log(`👤 Author: ${packageJson.author}`, 'blue');

  log('\n🔗 Development Servers:', 'blue');
  log(`🌐 Vite Dev Server: http://localhost:[dynamic-port] (Fallback: ${VITE_FALLBACK_PORT})`, 'green');
  log('⚡ Electron App: Native window', 'green');

  log('\n🛠️  Available Commands:', 'blue');
  log('setup    - Check prerequisites and set up DB folder', 'yellow');
  log('start    - Start Vite and Electron (default)', 'yellow');
  log('test     - Run tests', 'yellow');
  log('lint     - Run linting', 'yellow');
  log('check    - Run tests and linting', 'yellow');
  log('info     - Show development information', 'yellow');
  log('clean    - Clean npm cache, remove node_modules and package-lock.json (use npm run clean)', 'yellow');
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'start';

  log('🚀 Image-Mesh Development Script', 'bright');
  log('====================================', 'bright');

  switch (command) {
    case 'setup':
      checkDevPrerequisites();
      setupDatabase();
      showDevInfo();
      log('\n🎉 Development environment setup completed!', 'green');
      break;

    case 'start':
    case 'electron': // 'electron' command now uses the same logic for consistency
      checkDevPrerequisites();
      setupDatabase();
      waitForPortAndStartElectron();
      break;

    case 'test':
      checkDevPrerequisites();
      runTests();
      break;

    case 'lint':
      checkDevPrerequisites();
      runLinting();
      break;

    case 'check':
      checkDevPrerequisites();
      runTests();
      runLinting();
      log('\n✅ All checks passed!', 'green');
      break;

    case 'info':
      showDevInfo();
      break;

    default:
      log(`❌ Unknown command: ${command}`, 'red');
      log('Available commands: setup, start, test, lint, check, info', 'yellow');
      process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log(`\n❌ Uncaught error: ${error.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`\n❌ Unhandled rejection: ${reason}`, 'red');
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  checkDevPrerequisites,
  setupDatabase,
  waitForPortAndStartElectron,
  runTests,
  runLinting
};