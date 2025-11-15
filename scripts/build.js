#!/usr/bin/env node

/**
 * Build Script for Image-Mesh
 * Handles the complete build and packaging process
 */

const { execSync, spawn } = require('child_process');
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

function checkPrerequisites() {
  log('\n📋 Checking prerequisites...', 'cyan');
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 16) {
    log(`❌ Node.js version ${nodeVersion} is too old. Requires v16 or higher`, 'red');
    process.exit(1);
  }
  
  log(`✅ Node.js version: ${nodeVersion}`, 'green');
  
  // Check if required files exist
  const requiredFiles = [
    'package.json',
    'vite.config.ts',
    'electron.vite.config.ts',
    'tsconfig.json'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      log(`❌ Required file not found: ${file}`, 'red');
      process.exit(1);
    }
  }
  
  log('✅ All required files found', 'green');
}

function cleanBuild() {
  log('\n🧹 Cleaning build directories...', 'cyan');
  
  const dirsToClean = ['dist', 'dist-electron', 'release'];
  
  for (const dir of dirsToClean) {
    if (fs.existsSync(dir)) {
      // Use cross-platform command
      const removeCommand = process.platform === 'win32' ? `rmdir /s /q ${dir}` : `rm -rf ${dir}`;
      runCommand(removeCommand, `Remove ${dir} directory`);
    }
  }
  
  log('✅ Build directories cleaned', 'green');
}

function installDependencies() {
  log('\n📦 Installing dependencies...', 'cyan');
  runCommand('npm ci', 'Install dependencies');
}

function buildFrontend() {
  log('\n🎨 Building frontend...', 'cyan');
  runCommand('npm run build:vite', 'Build Vue.js frontend');
  
  if (!fs.existsSync('dist/index.html')) {
    log('❌ Frontend build failed - dist/index.html not found', 'red');
    process.exit(1);
  }
  
  log('✅ Frontend built successfully', 'green');
}

function buildElectron() {
  log('\n⚡ Building Electron main process...', 'cyan');
  runCommand('npm run build:electron', 'Build Electron main process');
  
  if (!fs.existsSync('dist-electron/main.js')) {
    log('❌ Electron build failed - dist-electron/main.js not found', 'red');
    process.exit(1);
  }
  
  log('✅ Electron built successfully', 'green');
}

function createPackage() {
  log('\n📦 Creating application package...', 'cyan');
  runCommand('npm run build:dir', 'Create application package');
  
  log('✅ Package created successfully', 'green');
}

function buildDistribution() {
  log('\n🚀 Building distribution packages...', 'cyan');
  
  const platform = process.platform;
  let targetCommand = 'npm run dist';
  
  // Platform-specific builds
  switch (platform) {
    case 'win32':
      log('Building for Windows...', 'yellow');
      targetCommand = 'npm run build:win';
      break;
    case 'darwin':
      log('Building for macOS...', 'yellow');
      targetCommand = 'npm run build:mac';
      break;
    case 'linux':
      log('Building for Linux...', 'yellow');
      targetCommand = 'npm run build:linux';
      break;
    default:
      log(`Building for all platforms...`, 'yellow');
  }
  
  runCommand(targetCommand, 'Build distribution packages');
  
  // Check if release files were created
  if (fs.existsSync('release')) {
    const releaseFiles = fs.readdirSync('release');
    log(`📁 Release files created: ${releaseFiles.join(', ')}`, 'green');
  } else {
    log('⚠️  No release directory found', 'yellow');
  }
}

function showBuildInfo() {
  log('\n📊 Build Information:', 'cyan');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  log(`📦 Application: ${packageJson.name}`, 'blue');
  log(`🏷️  Version: ${packageJson.version}`, 'blue');
  log(`📝 Description: ${packageJson.description}`, 'blue');
  log(`👤 Author: ${packageJson.author}`, 'blue');
  log(`🔖 License: ${packageJson.license}`, 'blue');
  
  if (fs.existsSync('release')) {
    const releaseFiles = fs.readdirSync('release');
    const totalSize = releaseFiles.reduce((total, file) => {
      const filePath = path.join('release', file);
      if (fs.statSync(filePath).isFile()) {
        return total + fs.statSync(filePath).size;
      }
      return total;
    }, 0);
    
    log(`📁 Release files: ${releaseFiles.length}`, 'blue');
    log(`💾 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`, 'blue');
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  log('🚀 Image-Mesh Build Script', 'bright');
  log('================================', 'bright');
  
  switch (command) {
    case 'clean':
      cleanBuild();
      break;
      
    case 'dev':
      checkPrerequisites();
      installDependencies();
      log('\n🛠️  Development environment ready!', 'green');
      log('Run "npm run dev" to start development servers', 'yellow');
      break;
      
    case 'build':
      checkPrerequisites();
      cleanBuild();
      installDependencies();
      buildFrontend();
      buildElectron();
      createPackage();
      showBuildInfo();
      log('\n🎉 Build completed successfully!', 'green');
      break;
      
    case 'dist':
      checkPrerequisites();
      cleanBuild();
      installDependencies();
      buildFrontend();
      buildElectron();
      buildDistribution();
      showBuildInfo();
      log('\n🎉 Distribution build completed successfully!', 'green');
      break;
      
    case 'all':
    default:
      checkPrerequisites();
      cleanBuild();
      installDependencies();
      buildFrontend();
      buildElectron();
      createPackage();
      buildDistribution();
      showBuildInfo();
      log('\n🎉 Complete build process finished successfully!', 'green');
      break;
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
  checkPrerequisites,
  cleanBuild,
  installDependencies,
  buildFrontend,
  buildElectron,
  createPackage,
  buildDistribution
};