#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
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

class ElectronErrorDetector {
  constructor() {
    this.errorCount = 0;
    this.warningCount = 0;
    this.startTime = Date.now();
    this.logFile = path.join(__dirname, '..', 'logs', 'electron-errors.log');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  detectErrorLevel(output) {
    const text = output.toString();
    
    // 错误关键词
    const errorKeywords = [
      /Error/i,
      /Exception/i,
      /Failed/i,
      /Cannot/i,
      /Undefined/i,
      /ReferenceError/i,
      /TypeError/i,
      /SyntaxError/i,
      /RangeError/i
    ];

    // 警告关键词
    const warningKeywords = [
      /Warning/i,
      /Deprecated/i,
      /pending/i,
      /unhandled/i
    ];

    // 检测错误级别
    for (const keyword of errorKeywords) {
      if (keyword.test(text)) {
        return 'error';
      }
    }

    for (const keyword of warningKeywords) {
      if (keyword.test(text)) {
        return 'warning';
      }
    }

    return 'info';
  }

  formatTimestamp() {
    return new Date().toISOString();
  }

  logToFile(level, output) {
    const timestamp = this.formatTimestamp();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${output.toString().trim()}\n`;
    
    fs.appendFileSync(this.logFile, logEntry);
  }

  handleOutput(output, type = 'stdout') {
    const text = output.toString();
    const level = this.detectErrorLevel(text);
    
    // 统计
    if (level === 'error') {
      this.errorCount++;
    } else if (level === 'warning') {
      this.warningCount++;
    }

    // 控制台输出
    const prefix = type === 'stderr' ? '[Electron Error]' : '[Electron]';
    const color = level === 'error' ? 'red' : level === 'warning' ? 'yellow' : 'magenta';
    
    process.stdout.write(`${colors[color]}${prefix}${colors.reset} ${text}`);

    // 记录到文件
    this.logToFile(level, text);

    // 特殊错误处理
    if (level === 'error') {
      this.handleSpecialErrors(text);
    }
  }

  handleSpecialErrors(errorText) {
    const text = errorText.toString();

    // 检测常见错误类型
    if (text.includes('Module not found')) {
      log('\n🔍 检测到模块缺失错误，建议检查依赖安装', 'yellow');
    } else if (text.includes('EADDRINUSE')) {
      log('\n🔍 检测到端口占用错误，尝试更换端口', 'yellow');
    } else if (text.includes('Permission denied')) {
      log('\n🔍 检测到权限错误，建议检查文件权限', 'yellow');
    } else if (text.includes('Cannot find module')) {
      log('\n🔍 检测到模块找不到错误，建议运行 npm install', 'yellow');
    }
  }

  generateReport() {
    const runtime = Math.floor((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(runtime / 60);
    const seconds = runtime % 60;

    log('\n' + '='.repeat(50), 'cyan');
    log('📊 Electron 运行时错误检测报告', 'cyan');
    log('='.repeat(50), 'cyan');
    log(`⏱️  运行时间: ${minutes}分${seconds}秒`, 'blue');
    log(`❌ 错误数量: ${this.errorCount}`, this.errorCount > 0 ? 'red' : 'green');
    log(`⚠️  警告数量: ${this.warningCount}`, this.warningCount > 0 ? 'yellow' : 'green');
    log(`📝 详细日志: ${this.logFile}`, 'blue');
    
    if (this.errorCount === 0 && this.warningCount === 0) {
      log('✅ 运行良好，未检测到错误或警告', 'green');
    } else {
      log('⚠️  检测到问题，请查看详细日志', 'yellow');
    }
    
    log('='.repeat(50), 'cyan');
  }

  startElectron(args = []) {
    log('🚀 启动 Electron 错误检测器...', 'cyan');
    log(`📝 日志文件: ${this.logFile}`, 'blue');
    log('⚡ 启动 Electron 进程...', 'cyan');

    // 清空日志文件
    if (fs.existsSync(this.logFile)) {
      fs.unlinkSync(this.logFile);
    }

    const electronProcess = spawn('npx', ['electron', '.', ...args], {
      stdio: 'pipe',
      shell: true,
      env: { ...process.env }
    });

    // 监听标准输出
    electronProcess.stdout.on('data', (data) => {
      this.handleOutput(data, 'stdout');
    });

    // 监听错误输出
    electronProcess.stderr.on('data', (data) => {
      this.handleOutput(data, 'stderr');
    });

    // 监听进程退出
    electronProcess.on('close', (code) => {
      log(`\n🔚 Electron 进程退出，代码: ${code}`, code === 0 ? 'green' : 'red');
      this.generateReport();
      process.exit(code);
    });

    // 监听进程错误
    electronProcess.on('error', (error) => {
      log(`❌ Electron 进程错误: ${error.message}`, 'red');
      this.logToFile('error', `Process Error: ${error.message}`);
      process.exit(1);
    });

    // 处理 Ctrl+C
    process.on('SIGINT', () => {
      log('\n🛑 正在关闭 Electron 进程...', 'yellow');
      electronProcess.kill('SIGINT');
      setTimeout(() => {
        this.generateReport();
        process.exit(0);
      }, 1000);
    });

    return electronProcess;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const detector = new ElectronErrorDetector();
  const args = process.argv.slice(2);
  detector.startElectron(args);
}

module.exports = ElectronErrorDetector;