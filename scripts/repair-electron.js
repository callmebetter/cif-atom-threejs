#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n' + '='.repeat(80));
console.log('🔧 Electron & SQLite3 完整修复脚本');
console.log('='.repeat(80));

console.log('\n📋 诊断结果:');
console.log('   ❌ Electron dist 文件夹缺失');
console.log('   ❌ SQLite3 原生模块可能需要重新构建');
console.log('   🔧 需要重新安装 Electron 和相关依赖');

console.log('\n⚠️  潜在影响:');
console.log('   • 将删除并重新安装 Electron');
console.log('   • 将重新构建 SQLite3 原生模块');
console.log('   • 可能需要下载大量数据 (约 100MB+)');
console.log('   • 整个过程可能需要 5-10 分钟');

console.log('\n🔧 将要执行的步骤:');
console.log('   1. 删除损坏的 Electron 安装');
console.log('   2. 清理相关缓存');
console.log('   3. 重新安装 Electron');
console.log('   4. 重新构建 SQLite3 原生模块');

console.log('\n' + '-'.repeat(80));

rl.question('❓ 确认要开始修复吗？ (Y/N): ', (answer) => {
  if (answer.trim().toLowerCase() !== 'y' && answer.trim().toLowerCase() !== 'yes') {
    console.log('\n❌ 操作已取消。');
    rl.close();
    process.exit(0);
  }

  console.log('\n✅ 开始修复过程...\n');
  
  const steps = [
    {
      name: '删除 Electron 安装',
      command: 'pnpm',
      args: ['remove', 'electron'],
      description: '移除损坏的 Electron 安装'
    },
    {
      name: '清理 pnpm 缓存',
      command: 'pnpm',
      args: ['store', 'prune'],
      description: '清理 pnpm 存储缓存'
    },
    {
      name: '重新安装 Electron',
      command: 'pnpm',
      args: ['add', '-D', 'electron@28.3.3'],
      description: '重新安装 Electron'
    },
    {
      name: '安装应用依赖',
      command: 'pnpm',
      args: ['run', 'postinstall'],
      description: '安装 Electron 应用依赖'
    },
    {
      name: '重新构建 SQLite3',
      command: 'pnpm',
      args: ['dlx', 'electron-rebuild', '--force'],
      env: { ...process.env, GYP_MSVS_VERSION: '2019' },
      description: '重新构建 SQLite3 原生模块'
    }
  ];

  let currentStep = 0;

  function executeStep() {
    if (currentStep >= steps.length) {
      console.log('\n' + '='.repeat(80));
      console.log('🎉 修复完成！');
      console.log('='.repeat(80));
      console.log('\n✅ 所有步骤已成功完成：');
      steps.forEach((step, index) => {
        console.log(`   ${index + 1}. ✅ ${step.name}`);
      });
      console.log('\n🚀 现在可以正常运行应用了：');
      console.log('   npm run dev');
      console.log('   或');
      console.log('   pnpm run dev');
      console.log('\n' + '='.repeat(80));
      rl.close();
      return;
    }

    const step = steps[currentStep];
    console.log(`\n📦 步骤 ${currentStep + 1}/${steps.length}: ${step.name}`);
    console.log(`   ${step.description}`);
    console.log('   执行命令: ' + step.command + ' ' + step.args.join(' '));

    const child = spawn(step.command, step.args, {
      stdio: 'inherit',
      shell: true,
      env: step.env || process.env
    });

    child.on('error', (error) => {
      console.error(`\n❌ 步骤 "${step.name}" 执行失败:`, error.message);
      console.error('   请检查网络连接和 pnpm 安装。');
      rl.close();
      process.exit(1);
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ 步骤 "${step.name}" 完成`);
        currentStep++;
        executeStep();
      } else {
        console.error(`\n❌ 步骤 "${step.name}" 失败，退出码: ${code}`);
        console.error('   请检查错误信息并手动修复。');
        console.error('   可以尝试手动执行: ' + step.command + ' ' + step.args.join(' '));
        rl.close();
        process.exit(1);
      }
    });
  }

  executeStep();
});