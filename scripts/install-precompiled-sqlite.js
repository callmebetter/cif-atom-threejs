#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Installing precompiled SQLite3 solutions...\n');

async function installPrecompiledSQLite() {
  const steps = [
    {
      name: 'Remove existing SQLite3 packages',
      command: 'npm uninstall sqlite3 better-sqlite3',
      description: 'Removing current SQLite3 installations'
    },
    {
      name: 'Install better-sqlite3 with precompiled binaries',
      command: 'npm install better-sqlite3 --build-from-source=false',
      description: 'Installing better-sqlite3 with precompiled binaries'
    },
    {
      name: 'Install sqlite3 with precompiled binaries',
      command: 'npm install sqlite3 --build-from-source=false',
      description: 'Installing sqlite3 with precompiled binaries'
    },
    {
      name: 'Clear npm cache',
      command: 'npm cache clean --force',
      description: 'Clearing npm cache to ensure fresh installation'
    },
    {
      name: 'Verify installations',
      command: 'npm list sqlite3 better-sqlite3',
      description: 'Verifying SQLite3 packages are properly installed'
    }
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`\n${i + 1}. ${step.name}`);
    console.log(`   ${step.description}`);
    
    try {
      console.log('   Executing:', step.command);
      const result = execSync(step.command, { 
        encoding: 'utf8', 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      console.log('   ✅ Success');
      if (result.trim()) {
        console.log('   Output:', result.trim());
      }
    } catch (error) {
      console.error('   ❌ Error:', error.message);
      
      // If better-sqlite3 fails, try alternative approach
      if (step.name.includes('better-sqlite3')) {
        console.log('   🔄 Trying alternative approach for better-sqlite3...');
        try {
          const altCommand = 'npm install better-sqlite3 --target_platform=win32 --target_arch=x64';
          console.log('   Executing:', altCommand);
          const altResult = execSync(altCommand, { 
            encoding: 'utf8', 
            stdio: 'pipe',
            cwd: process.cwd()
          });
          console.log('   ✅ Alternative approach succeeded');
        } catch (altError) {
          console.error('   ❌ Alternative approach also failed:', altError.message);
        }
      }
    }
  }

  console.log('\n🎉 Precompiled SQLite3 installation process completed!');
  
  // Check if installations were successful
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    console.log('\n📋 Current SQLite3 dependencies:');
    if (packageJson.dependencies?.['better-sqlite3']) {
      console.log(`   ✅ better-sqlite3: ${packageJson.dependencies['better-sqlite3']}`);
    }
    if (packageJson.dependencies?.['sqlite3']) {
      console.log(`   ✅ sqlite3: ${packageJson.dependencies['sqlite3']}`);
    }
    
    // Test if modules can be loaded
    console.log('\n🧪 Testing module imports...');
    try {
      require('better-sqlite3');
      console.log('   ✅ better-sqlite3 module loaded successfully');
    } catch (e) {
      console.log('   ❌ better-sqlite3 module failed to load:', e.message);
    }
    
    try {
      require('sqlite3');
      console.log('   ✅ sqlite3 module loaded successfully');
    } catch (e) {
      console.log('   ❌ sqlite3 module failed to load:', e.message);
    }
    
  } catch (error) {
    console.error('Error checking installations:', error.message);
  }
}

// Additional configuration for package.json
function updatePackageJson() {
  console.log('\n📝 Updating package.json with precompiled configurations...');
  
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Add scripts for SQLite3 management
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    
    packageJson.scripts['sqlite:install'] = 'npm install better-sqlite3 sqlite3 --build-from-source=false';
    packageJson.scripts['sqlite:rebuild'] = 'npm rebuild better-sqlite3 sqlite3';
    packageJson.scripts['sqlite:check'] = 'node -e "try{require(\'better-sqlite3\');console.log(\'✅ better-sqlite3 OK\')}catch(e){console.log(\'❌ better-sqlite3:\',e.message)};try{require(\'sqlite3\');console.log(\'✅ sqlite3 OK\')}catch(e){console.log(\'❌ sqlite3:\',e.message)}"';
    
    // Add optional configurations for better precompiled binary support
    if (!packageJson.optionalDependencies) {
      packageJson.optionalDependencies = {};
    }
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('   ✅ package.json updated successfully');
    
  } catch (error) {
    console.error('   ❌ Failed to update package.json:', error.message);
  }
}

// Main execution
if (require.main === module) {
  updatePackageJson();
  installPrecompiledSQLite().catch(console.error);
}

module.exports = { installPrecompiledSQLite, updatePackageJson };