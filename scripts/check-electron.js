#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(60));
console.log('🔍 Electron 安装状态检查');
console.log('='.repeat(60));

const electronPath = path.join('node_modules', '.pnpm', 'electron@28.3.3', 'node_modules', 'electron');
const distPath = path.join(electronPath, 'dist');
const indexPath = path.join(electronPath, 'index.js');

console.log('\n📂 检查路径:');
console.log(`   Electron 安装路径: ${electronPath}`);
console.log(`   Electron 路径存在: ${fs.existsSync(electronPath) ? '✅' : '❌'}`);
console.log(`   index.js 存在: ${fs.existsSync(indexPath) ? '✅' : '❌'}`);
console.log(`   dist 文件夹存在: ${fs.existsSync(distPath) ? '✅' : '❌'}`);

if (fs.existsSync(distPath)) {
  try {
    const files = fs.readdirSync(distPath);
    console.log(`   dist 内容: ${files.length} 个文件/文件夹`);
    
    const electronExe = files.find(f => f.startsWith('electron') && (f.endsWith('.exe') || !f.includes('.')));
    if (electronExe) {
      console.log(`   Electron 可执行文件: ✅ ${electronExe}`);
    } else {
      console.log('   Electron 可执行文件: ❌ 未找到');
    }
  } catch (err) {
    console.log(`   dist 内容检查失败: ❌ ${err.message}`);
  }
}

console.log('\n' + '-'.repeat(60));

if (fs.existsSync(electronPath) && fs.existsSync(distPath)) {
  console.log('✅ Electron 安装状态: 正常');
  console.log('\n💡 如果仍然遇到问题，请运行:');
  console.log('   npm run repair:electron');
} else {
  console.log('❌ Electron 安装状态: 异常');
  console.log('\n🔧 建议运行修复脚本:');
  console.log('   npm run repair:electron');
}

console.log('\n' + '='.repeat(60));