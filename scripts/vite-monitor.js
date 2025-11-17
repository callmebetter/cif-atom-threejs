#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ViteMonitor {
  constructor() {
    this.startTime = new Date();
    this.errors = [];
    this.warnings = [];
    this.serverInfo = {};
    this.logFile = path.join(__dirname, '../vite-monitor.log');
    this.isRunning = false;
    this.childProcess = null;
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type}] ${message}\n`;

    console.log(logEntry.trim());
    fs.appendFileSync(this.logFile, logEntry);
  }

  startMonitor() {
    this.log('🚀 Starting Vite Development Server Monitor...', 'START');
    this.log(`⏰ Monitor started at: ${this.startTime.toISOString()}`, 'INFO');
    this.log(`📝 Log file: ${this.logFile}`, 'INFO');

    // Start the Vite dev server
    this.childProcess = spawn('npm', ['run', 'dev:vite'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
      cwd: process.cwd()
    });

    this.isRunning = true;

    // Monitor stdout
    this.childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      this.processOutput(output, 'STDOUT');
    });

    // Monitor stderr
    this.childProcess.stderr.on('data', (data) => {
      const output = data.toString();
      this.processOutput(output, 'STDERR');
    });

    // Handle process exit
    this.childProcess.on('close', (code) => {
      this.isRunning = false;
      this.log(`🛑 Process exited with code: ${code}`, 'EXIT');
      this.generateSummary();
    });

    // Handle process errors
    this.childProcess.on('error', (error) => {
      this.log(`❌ Process error: ${error.message}`, 'ERROR');
      this.errors.push({
        type: 'PROCESS_ERROR',
        message: error.message,
        timestamp: new Date()
      });
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('🛑 Received SIGINT, shutting down gracefully...', 'SHUTDOWN');
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      this.log('🛑 Received SIGTERM, shutting down gracefully...', 'SHUTDOWN');
      this.shutdown();
    });
  }

  processOutput(output, source) {
    const lines = output.split('\n').filter(line => line.trim());

    lines.forEach(line => {
      // Remove ANSI color codes for cleaner logging
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');

      // Check for server information
      this.checkServerInfo(cleanLine);

      // Check for errors
      this.checkForErrors(cleanLine, source);

      // Check for warnings
      this.checkForWarnings(cleanLine, source);

      // Log the output
      this.log(`[${source}] ${cleanLine}`, source === 'STDERR' ? 'WARN' : 'OUTPUT');
    });
  }

  checkServerInfo(line) {
    // Check for local server URL
    const localMatch = line.match(/Local:\s+(http:\/\/localhost:\d+)/);
    if (localMatch) {
      this.serverInfo.localUrl = localMatch[1];
      this.log(`🌐 Local server: ${this.serverInfo.localUrl}`, 'SERVER');
    }

    // Check for network URLs
    const networkMatches = line.match(/Network:\s+(http:\/\/[\d.]+:\d+)/g);
    if (networkMatches) {
      this.serverInfo.networkUrls = networkMatches;
      this.log(`🌐 Network URLs: ${networkMatches.join(', ')}`, 'SERVER');
    }

    // Check for port info
    const portMatch = line.match(/port[:\s]+(\d+)/);
    if (portMatch) {
      this.serverInfo.port = parseInt(portMatch[1]);
      this.log(`🔌 Port: ${this.serverInfo.port}`, 'SERVER');
    }

    // Check for ready time
    const readyMatch = line.match(/ready in\s+(\d+)ms/);
    if (readyMatch) {
      this.serverInfo.readyTime = parseInt(readyMatch[1]);
      this.log(`⚡ Ready in: ${this.serverInfo.readyTime}ms`, 'SERVER');
    }
  }

  checkForErrors(line, source) {
    const errorPatterns = [
      /error/i,
      /failed/i,
      /cannot resolve/i,
      /module not found/i,
      /syntax error/i,
      /type error/i,
      /build failed/i,
      /Compilation failed/i
    ];

    const hasError = errorPatterns.some(pattern => pattern.test(line));

    if (hasError) {
      const error = {
        type: 'ERROR',
        message: line,
        source,
        timestamp: new Date(),
        isImportError: line.includes('import') || line.includes('resolve'),
        isBuildError: line.includes('build') || line.includes('compilation')
      };

      this.errors.push(error);
      this.log(`🚨 ERROR DETECTED: ${line}`, 'ERROR');

      // Beep sound for error notification (Windows)
      if (process.platform === 'win32') {
        process.stdout.write('\x07');
      }
    }
  }

  checkForWarnings(line, source) {
    const warningPatterns = [
      /warning/i,
      /deprecated/i,
      /warn/i
    ];

    const hasWarning = warningPatterns.some(pattern => pattern.test(line));

    if (hasWarning) {
      const warning = {
        type: 'WARNING',
        message: line,
        source,
        timestamp: new Date()
      };

      this.warnings.push(warning);
      this.log(`⚠️  WARNING: ${line}`, 'WARNING');
    }
  }

  generateSummary() {
    const runtime = Date.now() - this.startTime.getTime();
    const summary = {
      runtime: runtime,
      serverInfo: this.serverInfo,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
        status: this.errors.length === 0 ? 'SUCCESS' : 'FAILED'
      }
    };

    this.log('\n📊 MONITOR SUMMARY', 'SUMMARY');
    this.log('=' .repeat(50), 'SUMMARY');
    this.log(`⏱️  Runtime: ${Math.round(runtime / 1000)}s`, 'SUMMARY');
    this.log(`🌐 Server: ${this.serverInfo.localUrl || 'Not detected'}`, 'SUMMARY');
    this.log(`🚨 Errors: ${summary.summary.totalErrors}`, 'SUMMARY');
    this.log(`⚠️  Warnings: ${summary.summary.totalWarnings}`, 'SUMMARY');
    this.log(`📈 Status: ${summary.summary.status}`, 'SUMMARY');

    if (this.errors.length > 0) {
      this.log('\n🚨 ERRORS FOUND:', 'SUMMARY');
      this.errors.forEach((error, index) => {
        this.log(`${index + 1}. [${error.source}] ${error.message}`, 'ERROR');
      });
    }

    // Save summary to file
    const summaryFile = this.logFile.replace('.log', '-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    this.log(`📁 Summary saved to: ${summaryFile}`, 'SUMMARY');
  }

  shutdown() {
    if (this.childProcess) {
      this.childProcess.kill('SIGTERM');
    }
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
}

// Main execution
if (require.main === module) {
  const monitor = new ViteMonitor();

  // Display help if requested
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Vite Development Server Monitor

Usage: node scripts/vite-monitor.js [options]

Options:
  --help, -h     Show this help message

Description:
  Monitors the npm run dev:vite command and tracks:
  - Server startup information
  - Errors and warnings
  - Import resolution issues
  - Build failures
  - Performance metrics

Logs are saved to vite-monitor.log in the project root.
    `);
    process.exit(0);
  }

  // Start monitoring
  monitor.startMonitor();
}

module.exports = ViteMonitor;