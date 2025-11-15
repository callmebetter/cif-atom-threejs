#!/usr/bin/env node

/**
 * Development Script for Image-Mesh
 * Handles development environment setup and processes
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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description, options = {}) {
  log(`\n🔧 ${description}`, 'cyan');
  log(`Command: ${command}`, 'yellow');
  
  try {
    const result = execSync(command, {
      stdio: 'inherit',
      encoding: 'utf8',
      ...options
    });
    log(`✅ ${description} completed successfully`, 'green');
    return result;
  } catch (error) {
    log(`❌ ${description} failed`, 'red');
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
  
  // Check if package.json exists
  if (!fs.existsSync('package.json')) {
    log('❌ package.json not found', 'red');
    process.exit(1);
  }
  
  // Check if node_modules exists
  if (!fs.existsSync('node_modules')) {
    log('⚠️  node_modules not found. Installing dependencies...', 'yellow');
    runCommand('npm install', 'Install dependencies');
  }
  
  log('✅ Development environment ready', 'green');
}

function startDevelopment() {
  log('\n🚀 Starting development servers...', 'cyan');
  
  let vitePort = null;
  let electronStarted = false;
  
  // Start Vite dev server
  const viteProcess = spawn('npm', ['run', 'dev:vite'], {
    stdio: 'pipe',
    shell: true
  });
  
  viteProcess.stdout.on('data', (data) => {
      const output = data.toString();
      
      // Extract port from Vite output - more flexible regex
      const portMatch = output.match(/Local:\s*http:\/\/localhost:(\d+)/) || 
                         output.match(/localhost:(\d+)/);
      if (portMatch && !vitePort) {
        vitePort = portMatch[1];
        log(`🌐 Vite server running on port: ${vitePort}`, 'green');
        
        // Start Electron once we have the port
        if (!electronStarted) {
          electronStarted = true;
          startElectron(vitePort, viteProcess);
        }
      } else if (output.includes('ready')) {
        log(`🌐 Vite server: ${output.trim()}`, 'green');
      } else {
        process.stdout.write(`${colors.blue}[Vite]${colors.reset} ${output}`);
      }
    });
  
  viteProcess.stderr.on('data', (data) => {
    process.stderr.write(`${colors.red}[Vite Error]${colors.reset} ${data}`);
  });
  
  // Fallback: if no port detected after 5 seconds, start Electron anyway
  setTimeout(() => {
    if (!electronStarted) {
      log('⚠️  Could not detect Vite port, using default...', 'yellow');
      electronStarted = true;
      startElectron('3000', viteProcess); // Use the configured port
    }
  }, 5000);
}

function startElectron(vitePort, viteProcess) {
  log('\n⚡ Starting Electron...', 'cyan');
  log(`🔗 Connecting to Vite on port: ${vitePort}`, 'cyan');
  
  // Set environment variable for the port
  const env = { ...process.env, VITE_PORT: vitePort };
  
  const electronProcess = spawn('npm', ['run', 'dev:electron'], {
    stdio: 'pipe',
    shell: true,
    env
  });
  
  electronProcess.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(`${colors.magenta}[Electron]${colors.reset} ${output}`);
  });
  
  electronProcess.stderr.on('data', (data) => {
    process.stderr.write(`${colors.red}[Electron Error]${colors.reset} ${data}`);
  });
  
  electronProcess.on('close', (code) => {
    if (code !== 0) {
      log(`❌ Electron process exited with code ${code}`, 'red');
    }
    process.exit(code);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    log('\n🛑 Shutting down development servers...', 'yellow');
    viteProcess.kill('SIGINT');
    electronProcess.kill('SIGINT');
    process.exit(0);
  });
}

function setupDatabase() {
  log('\n🗄️  Setting up development database...', 'cyan');
  
  const dbPath = 'data/image-mesh.db';
  const dbDir = path.dirname(dbPath);
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    log(`✅ Created directory: ${dbDir}`, 'green');
  }
  
  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    log('📝 Creating new database...', 'yellow');
    // The database will be created automatically when the app starts
    log('✅ Database will be created on first run', 'green');
  } else {
    log('✅ Database already exists', 'green');
  }
}

function startElectronOnly() {
  log('\n⚡ Starting Electron with dynamic port detection...', 'cyan');
  
  // First, start Vite to get the port
  const viteProcess = spawn('npm', ['run', 'dev:vite'], {
    stdio: 'pipe',
    shell: true
  });
  
  let vitePort = null;
  
  viteProcess.stdout.on('data', (data) => {
    const output = data.toString();
    
    // Extract port from Vite output - more flexible regex
    const portMatch = output.match(/Local:\s*http:\/\/localhost:(\d+)/) || 
                       output.match(/localhost:(\d+)/);
    if (portMatch && !vitePort) {
      vitePort = portMatch[1];
      log(`🌐 Vite server detected on port: ${vitePort}`, 'green');
      
      // Start Electron with the detected port
      const env = { ...process.env, VITE_PORT: vitePort };
      const electronProcess = spawn('npx', ['electron', '.'], {
        stdio: 'pipe',
        shell: true,
        env
      });
      
      electronProcess.stdout.on('data', (data) => {
        const output = data.toString();
        process.stdout.write(`${colors.magenta}[Electron]${colors.reset} ${output}`);
      });
      
      electronProcess.stderr.on('data', (data) => {
        process.stderr.write(`${colors.red}[Electron Error]${colors.reset} ${data}`);
      });
      
      electronProcess.on('close', (code) => {
        if (code !== 0) {
          log(`❌ Electron process exited with code ${code}`, 'red');
        }
        viteProcess.kill('SIGINT');
        process.exit(code);
      });
      
      // Handle process termination
      process.on('SIGINT', () => {
        log('\n🛑 Shutting down servers...', 'yellow');
        viteProcess.kill('SIGINT');
        electronProcess.kill('SIGINT');
        process.exit(0);
      });
    } else {
      process.stdout.write(`${colors.blue}[Vite]${colors.reset} ${output}`);
    }
  });
  
  viteProcess.stderr.on('data', (data) => {
    process.stderr.write(`${colors.red}[Vite Error]${colors.reset} ${data}`);
  });
  
  // Fallback timeout
  setTimeout(() => {
    if (!vitePort) {
      log('⚠️  Could not detect Vite port, using default...', 'yellow');
      const electronProcess = spawn('npx', ['electron', '.'], {
        stdio: 'pipe',
        shell: true
      });
      
      electronProcess.stdout.on('data', (data) => {
        const output = data.toString();
        process.stdout.write(`${colors.magenta}[Electron]${colors.reset} ${output}`);
      });
      
      electronProcess.stderr.on('data', (data) => {
        process.stderr.write(`${colors.red}[Electron Error]${colors.reset} ${data}`);
      });
      
      electronProcess.on('close', (code) => {
        if (code !== 0) {
          log(`❌ Electron process exited with code ${code}`, 'red');
        }
        viteProcess.kill('SIGINT');
        process.exit(code);
      });
    }
  }, 5000);
}

function runTests() {
  
  // Check if test script exists
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (packageJson.scripts.test) {
    runCommand('npm test', 'Run tests');
  } else {
    log('⚠️  No test script found in package.json', 'yellow');
  }
}

function runLinting() {
  log('\n🔍 Running linting...', 'cyan');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (packageJson.scripts.lint) {
    runCommand('npm run lint', 'Run linting');
  } else {
    log('⚠️  No lint script found in package.json', 'yellow');
  }
}

function showDevInfo() {
  log('\n📊 Development Information:', 'cyan');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  log(`📦 Application: ${packageJson.name}`, 'blue');
  log(`🏷️  Version: ${packageJson.version}`, 'blue');
  log(`📝 Description: ${packageJson.description}`, 'blue');
  log(`👤 Author: ${packageJson.author}`, 'blue');
  
  log('\n🔗 Development URLs:', 'blue');
  log('🌐 Vite Dev Server: http://localhost:[dynamic-port]', 'green');
  log('⚡ Electron App: Native window', 'green');
  
  log('\n🛠️  Available Commands:', 'blue');
  log('npm run dev        - Start development servers', 'yellow');
  log('npm run dev:vite   - Start Vite dev server only', 'yellow');
  log('npm run dev:electron - Start Electron with dynamic port detection', 'yellow');
  log('npm run test       - Run tests', 'yellow');
  log('npm run lint       - Run linting', 'yellow');
  log('npm run build      - Build for production', 'yellow');
  log('npm run dist       - Build distribution packages', 'yellow');
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
      checkDevPrerequisites();
      setupDatabase();
      startDevelopment();
      break;
      
    case 'electron':
      checkDevPrerequisites();
      setupDatabase();
      startElectronOnly();
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
      log('Available commands: setup, start, electron, test, lint, check, info', 'yellow');
      process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log(`❌ Uncaught error: ${error.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled rejection: ${reason}`, 'red');
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  checkDevPrerequisites,
  setupDatabase,
  startDevelopment,
  runTests,
  runLinting
};