#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class AdvancedElectronMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      enableLogging: true,
      logFile: path.join(__dirname, '..', 'logs', 'electron-monitor.log'),
      errorKeywords: [
        /Error/i, /Exception/i, /Failed/i, /Cannot/i, /Undefined/i,
        /ReferenceError/i, /TypeError/i, /SyntaxError/i, /RangeError/i,
        /MODULE_NOT_FOUND/i, /EADDRINUSE/i, /EACCES/i, /EPERM/i
      ],
      warningKeywords: [
        /Warning/i, /Deprecated/i, /pending/i, /unhandled/i, /DEP/i
      ],
      ...options
    };
   // 初始化统计
    this.stats = {
      startTime: Date.now(),
      error: [],
      warning: [],
      info: [],
      debug: []
    };
    
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.options.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  analyzeOutput(text) {
    const analysis = {
      level: 'info',
      category: 'general',
      severity: 'low',
      suggestions: []
    };

    const content = text.toString();

    // 检测错误级别
    for (const keyword of this.options.errorKeywords) {
      if (keyword.test(content)) {
        analysis.level = 'error';
        analysis.severity = 'high';
        break;
      }
    }

    if (analysis.level === 'info') {
      for (const keyword of this.options.warningKeywords) {
        if (keyword.test(content)) {
          analysis.level = 'warning';
          analysis.severity = 'medium';
          break;
        }
      }
    }

    // 分类错误类型
    if (content.includes('MODULE_NOT_FOUND') || content.includes('Cannot find module')) {
      analysis.category = 'module';
      analysis.suggestions.push('运行 npm install 安装缺失依赖');
      analysis.suggestions.push('检查 package.json 中的依赖配置');
    } else if (content.includes('EADDRINUSE')) {
      analysis.category = 'network';
      analysis.suggestions.push('检查端口占用情况');
      analysis.suggestions.push('尝试更换其他端口');
    } else if (content.includes('EACCES') || content.includes('EPERM')) {
      analysis.category = 'permission';
      analysis.suggestions.push('检查文件/目录权限');
      analysis.suggestions.push('以管理员权限运行');
    } else if (content.includes('TypeError')) {
      analysis.category = 'type';
      analysis.suggestions.push('检查变量类型');
      analysis.suggestions.push('验证函数参数');
    } else if (content.includes('ReferenceError')) {
      analysis.category = 'reference';
      analysis.suggestions.push('检查变量声明');
      analysis.suggestions.push('验证作用域');
    }

    return analysis;
  }

  formatMessage(prefix, content, analysis) {
    const colors = {
      reset: '\x1b[0m',
      red: '\x1b[31m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      bright: '\x1b[1m'
    };

    const levelColors = {
      error: 'red',
      warning: 'yellow',
      info: 'magenta'
    };

    const color = levelColors[analysis.level] || 'magenta';
    const timestamp = new Date().toLocaleTimeString();
    
    let message = `${colors[color]}${prefix}${colors.reset} ${content}`;
    
    if (analysis.level !== 'info') {
      message += `\n${colors.cyan}└─ 类别: ${analysis.category} | 严重程度: ${analysis.severity}${colors.reset}`;
      
      if (analysis.suggestions.length > 0) {
        message += `\n${colors.yellow}└─ 建议: ${analysis.suggestions.join(', ')}${colors.reset}`;
      }
    }

    return message;
  }

  logToFile(level, content, analysis) {
    if (!this.options.enableLogging) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      category: analysis.category,
      severity: analysis.severity,
      content: content.toString().trim(),
      suggestions: analysis.suggestions
    };

    fs.appendFileSync(this.options.logFile, JSON.stringify(logEntry) + '\n');
  }

  handleOutput(data, stream = 'stdout') {
    const content = data.toString();
    const analysis = this.analyzeOutput(content);
    const prefix = stream === 'stderr' ? '[Electron Error]' : '[Electron]';
    
    // 更新统计
    this.stats[`${analysis.level}Count`]++;
    this.stats[analysis.level].push({
      timestamp: Date.now(),
      content: content.trim(),
      analysis
    });

    // 输出到控制台
    console.log(this.formatMessage(prefix, content, analysis));

    // 记录到文件
    this.logToFile(analysis.level, content, analysis);

    // 发出事件
    this.emit('output', {
      stream,
      content,
      analysis,
      stats: this.stats
    });

    // 特殊处理严重错误
    if (analysis.severity === 'high') {
      this.emit('critical-error', {
        content,
        analysis,
        timestamp: Date.now()
      });
    }
  }

  startMonitoring(command, args = [], options = {}) {
    console.log('🔍 启动高级 Electron 监控器...', 'cyan');
    console.log(`📝 日志文件: ${this.options.logFile}`, 'blue');
    console.log(`⚡ 执行命令: ${command} ${args.join(' ')}`, 'cyan');

    // 清空日志文件
    if (fs.existsSync(this.options.logFile)) {
      fs.unlinkSync(this.options.logFile);
    }

    const childProcess = spawn(command, args, {
      stdio: 'pipe',
      shell: true,  // 在 Windows 上需要 shell 来找到 npm
      env: { ...process.env },
      ...options
    });

    // 监听输出
    childProcess.stdout.on('data', (data) => {
      this.handleOutput(data, 'stdout');
    });

    childProcess.stderr.on('data', (data) => {
      this.handleOutput(data, 'stderr');
    });

    // 监听进程事件
    childProcess.on('close', (code) => {
      console.log(`\n🔚 进程退出，代码: ${code}`, code === 0 ? 'green' : 'red');
      this.generateReport();
      this.emit('close', { code, stats: this.stats });
    });

    childProcess.on('error', (error) => {
      console.log(`❌ 进程错误: ${error.message}`, 'red');
      this.emit('process-error', error);
    });

    return childProcess;
  }

  generateReport() {
    const runtime = Math.floor((Date.now() - this.stats.startTime) / 1000);
    const minutes = Math.floor(runtime / 60);
    const seconds = runtime % 60;
    const errorCount = this.stats.error?.length || 0;
    const warningCount = this.stats.warning?.length || 0;
    const infoCount = this.stats.info?.length || 0;

    console.log('\n' + '='.repeat(60), 'cyan');
    console.log('📊 Electron 监控报告', 'cyan');
    console.log('='.repeat(60), 'cyan');
    console.log(`⏱️  运行时间: ${minutes}分${seconds}秒`, 'blue');
    console.log(`❌ 错误数量: ${errorCount}`, errorCount > 0 ? 'red' : 'green');
    console.log(`⚠️  警告数量: ${warningCount}`, warningCount > 0 ? 'yellow' : 'green');
    console.log(`ℹ️  信息数量: ${infoCount}`, 'blue');
    console.log(`📝 详细日志: ${this.options.logFile}`, 'blue');

    // 错误分类统计
    const errorCategories = {};
    if (this.stats.error) {
      this.stats.error.forEach(error => {
        const category = error.analysis.category;
        errorCategories[category] = (errorCategories[category] || 0) + 1;
      });
    }

    if (Object.keys(errorCategories).length > 0) {
      console.log('\n📈 错误分类统计:', 'yellow');
      Object.entries(errorCategories).forEach(([category, count]) => {
        console.log(`  • ${category}: ${count}`, 'yellow');
      });
    }

    // 最新错误
    if (this.stats.error && this.stats.error.length > 0) {
      console.log('\n🔍 最新错误:', 'red');
      const latestError = this.stats.error[this.stats.error.length - 1];
      console.log(`  ${latestError.content.substring(0, 100)}...`, 'red');
    }

    // 显示最近的警告
    if (this.stats.warning && this.stats.warning.length > 0) {
      console.log('\n⚠️  最近警告:', 'yellow');
      this.stats.warning.slice(-3).forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.content}`, 'yellow');
      });
    }

    console.log('='.repeat(60), 'cyan');
  }

  getStats() {
    return { ...this.stats };
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const monitor = new AdvancedElectronMonitor();
  
  // 监听关键错误
  monitor.on('critical-error', (data) => {
    console.log('\n🚨 检测到关键错误!', 'red');
    console.log(`错误内容: ${data.content}`, 'red');
    console.log(`建议: ${data.analysis.suggestions.join(', ')}`, 'yellow');
  });

  // 启动监控
const args = process.argv.slice(2);
let command, commandArgs;

if (args.length > 0) {
  command = 'npm';
  commandArgs = ['run', 'dev:electron', '--', ...args];
} else {
  command = 'npm';
  commandArgs = ['run', 'dev:electron'];
}

const electronProcess = monitor.startMonitoring(command, commandArgs);

  // 处理 Ctrl+C
  electronProcess.on('SIGINT', () => {
    console.log('\n🛑 正在关闭监控器...', 'yellow');
    electronProcess.kill('SIGINT');
    setTimeout(() => {
      monitor.generateReport();
      process.exit(0);
    }, 1000);
  });
}

module.exports = AdvancedElectronMonitor;