#!/usr/bin/env node

/**
 * 安全安装脚本
 * 解决 better-sqlite3 在 Windows 环境下的安装问题
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 开始安全安装流程...\n')

// 检测操作系统
const isWindows = process.platform === 'win32'
const isMac = process.platform === 'darwin'
const isLinux = process.platform === 'linux'

console.log(`📋 检测到操作系统: ${process.platform}`)

// 检测包管理器
let packageManager = 'npm'
if (fs.existsSync('pnpm-lock.yaml')) {
  packageManager = 'pnpm'
} else if (fs.existsSync('yarn.lock')) {
  packageManager = 'yarn'
}

console.log(`📦 检测到包管理器: ${packageManager}\n`)

// 执行命令的辅助函数
function runCommand(command, description, ignoreError = false) {
  console.log(`⏳ ${description}...`)
  try {
    execSync(command, { stdio: 'inherit', shell: true })
    console.log(`✅ ${description}完成\n`)
    return true
  } catch (error) {
    if (ignoreError) {
      console.log(`⚠️  ${description}失败，但继续执行\n`)
      return false
    } else {
      console.log(`❌ ${description}失败\n`)
      throw error
    }
  }
}

// 检查 better-sqlite3 是否可用
function checkBetterSQLite3() {
  console.log('🔍 检查 better-sqlite3 状态...')
  try {
    execSync('node -e "require(\'better-sqlite3\')"', { stdio: 'ignore' })
    console.log('✅ better-sqlite3 可用\n')
    return true
  } catch (error) {
    console.log('❌ better-sqlite3 不可用\n')
    return false
  }
}

// 主要安装流程
async function main() {
  try {
    // 步骤1: 清理环境
    console.log('🧹 清理安装环境...')
    if (isWindows) {
      runCommand('pnpm store prune || npm cache clean --force', '清理包管理器缓存', true)
    } else {
      runCommand(`${packageManager} cache clean --force`, '清理包管理器缓存', true)
    }

    // 步骤2: 安装依赖（忽略脚本）
    console.log('📦 安装项目依赖...')
    const installCommand = packageManager === 'pnpm' 
      ? 'pnpm install --ignore-scripts --ignore-engines'
      : packageManager === 'yarn'
      ? 'yarn install --ignore-scripts --ignore-engines'
      : 'npm install --ignore-scripts --ignore-engines'
    
    runCommand(installCommand, '安装依赖包')

    // 步骤3: Windows 特殊处理
    if (isWindows) {
      console.log('🪟 Windows 环境特殊处理...')
      
      // 设置环境变量并重建
      const rebuildCommand = packageManager === 'pnpm'
        ? 'set GYP_MSVS_VERSION=2019 && pnpm dlx electron-rebuild --force'
        : 'set GYP_MSVS_VERSION=2019 && npx electron-rebuild --force'
      
      const success = runCommand(rebuildCommand, '重建原生模块', true)
      
      // 如果失败，尝试其他方法
      if (!success) {
        console.log('🔄 尝试备用重建方法...')
        
        // 方法1: 使用 --build-from-source=false
        runCommand(
          `${packageManager === 'pnpm' ? 'pnpm' : 'npm'} install better-sqlite3 --build-from-source=false`,
          '使用预编译 better-sqlite3',
          true
        )
        
        // 方法2: 尝试不同的 VS 版本
        const vsVersions = ['2022', '2019', '2017']
        for (const version of vsVersions) {
          const cmd = `set GYP_MSVS_VERSION=${version} && ${packageManager === 'pnpm' ? 'pnpm dlx' : 'npx'} electron-rebuild --force`
          if (runCommand(cmd, `尝试 VS ${version} 重建`, true)) {
            break
          }
        }
      }
    } else {
      // macOS/Linux 处理
      console.log(`🍎 ${isMac ? 'macOS' : 'Linux'} 环境处理...`)
      
      const rebuildCommand = packageManager === 'pnpm'
        ? 'pnpm dlx electron-rebuild --force'
        : 'npx electron-rebuild --force'
      
      runCommand(rebuildCommand, '重建原生模块', true)
    }

    // 步骤4: 最终检查
    console.log('🔍 最终检查...')
    const isSQLiteAvailable = checkBetterSQLite3()
    
    if (isSQLiteAvailable) {
      console.log('🎉 安装成功！better-sqlite3 可用')
    } else {
      console.log('⚠️  better-sqlite3 不可用，但应用仍可使用 JSON 降级方案运行')
      console.log('💡 如需完整功能，请安装 Visual Studio Build Tools')
    }

    // 步骤5: 提供下一步建议
    console.log('\n📋 下一步操作:')
    console.log('1. 运行开发环境: npm run dev 或 pnpm dev')
    console.log('2. 构建应用: npm run build 或 pnpm build')
    
    if (!isSQLiteAvailable) {
      console.log('\n🔧 可选优化:')
      console.log('- 安装 Visual Studio Build Tools 以获得更好的性能')
      console.log('- 或使用 JSON 降级方案（自动启用）')
    }

  } catch (error) {
    console.error('\n❌ 安装过程中出现错误:')
    console.error(error.message)
    
    console.log('\n🆘 故障排除建议:')
    console.log('1. 确保网络连接正常')
    console.log('2. 尝试清理缓存后重新安装')
    console.log('3. 检查 Node.js 版本是否兼容')
    console.log('4. Windows 用户请安装 Visual Studio Build Tools')
    
    process.exit(1)
  }
}

// 显示帮助信息
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
安全安装脚本 - 解决 better-sqlite3 安装问题

用法:
  node scripts/safe-install.js

选项:
  --help, -h    显示帮助信息

功能:
  - 自动检测操作系统和包管理器
  - 清理安装环境
  - 安全安装依赖（忽略问题脚本）
  - Windows 环境特殊处理
  - 多种重建方法尝试
  - 最终状态检查
  - 详细的故障排除建议

支持的包管理器:
  - npm
  - pnpm
  - yarn

支持的平台:
  - Windows
  - macOS
  - Linux
`)
  process.exit(0)
}

// 运行主程序
main()