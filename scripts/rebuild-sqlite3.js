#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n' + '='.repeat(80));
console.log('🔧 SQLite3 Electron Rebuild Script');
console.log('='.repeat(80));

console.log('\n📋 操作概述:');
console.log('   此脚本将重新构建 SQLite3 原生模块以兼容当前的 Electron 环境。');
console.log('   这将确保 SQLite3 在 Electron 应用中正常工作。');

console.log('\n⚠️  潜在影响:');
console.log('   • 将重新编译 SQLite3 原生模块');
console.log('   • 可能需要几分钟时间完成');
console.log('   • 将设置 GYP_MSVS_VERSION=2019 环境变量');
console.log('   • 使用强制重建模式 (--force)');

console.log('\n🔧 将要执行的命令:');
console.log('   set GYP_MSVS_VERSION=2019 && pnpm dlx electron-rebuild --force');

console.log('\n' + '-'.repeat(80));

rl.question('❓ 确认要继续执行吗？ (Y/N): ', (answer) => {
  if (answer.trim().toLowerCase() !== 'y' && answer.trim().toLowerCase() !== 'yes') {
    console.log('\n❌ 操作已取消。');
    rl.close();
    process.exit(0);
  }

  console.log('\n✅ 开始执行 SQLite3 重建操作...\n');
  
  // 设置环境变量并执行命令
  const env = { ...process.env, GYP_MSVS_VERSION: '2019' };
  
  const child = spawn('pnpm', ['dlx', 'electron-rebuild', '--force'], {
    env: env,
    stdio: 'inherit',
    shell: true
  });

  child.on('error', (error) => {
    console.error('\n❌ 执行错误:', error.message);
    console.error('   请确保已安装 pnpm 并且项目依赖正确配置。');
    rl.close();
    process.exit(1);
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ SQLite3 重建操作成功完成！');
      console.log('   现在可以正常使用 SQLite3 模块了。');
    } else {
      console.error(`\n❌ SQLite3 重建操作失败，退出码: ${code}`);
      console.error('   请检查错误信息并尝试手动执行以下命令:');
      console.error('   set GYP_MSVS_VERSION=2019 && pnpm dlx electron-rebuild --force');
      process.exit(1);
    }
    rl.close();
  });
});