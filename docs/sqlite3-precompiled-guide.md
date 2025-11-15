# Precompiled SQLite3 Installation Guide

## 概述

本指南提供安装预编译SQLite3库的完整解决方案，避免原生编译的复杂性。

## 当前项目SQLite3使用情况

你的项目同时使用了两个SQLite3库：
- `better-sqlite3@12.4.1` - 在主进程中使用（推荐）
- `sqlite3@5.1.6` - 可能用于其他功能

## 推荐方案

### 方案1：仅使用 better-sqlite3（推荐）

`better-sqlite3` 是更现代的选择，提供更好的性能和更简单的安装过程。

```bash
# 卸载现有SQLite3库
npm uninstall sqlite3

# 重新安装better-sqlite3（使用预编译二进制）
npm install better-sqlite3 --build-from-source=false
```

### 方案2：使用预编译版本的 sqlite3

如果必须使用 `sqlite3`，可以通过以下方式获取预编译版本：

```bash
# 卸载并重新安装sqlite3（使用预编译二进制）
npm uninstall sqlite3
npm install sqlite3 --build-from-source=false
```

## 自动安装脚本

我已为你创建了自动化安装脚本：

```bash
# 运行预编译SQLite3安装脚本
node scripts/install-precompiled-sqlite.js
```

## 手动安装步骤

### 1. 环境准备

```bash
# 清理npm缓存
npm cache clean --force

# 删除现有的node_modules（可选但推荐）
rm -rf node_modules
```

### 2. 安装预编译版本

```bash
# 方法1：使用 --build-from-source=false 标志
npm install better-sqlite3 --build-from-source=false

# 方法2：设置环境变量
set npm_config_build_from_source=false
npm install better-sqlite3 sqlite3

# 方法3：使用 .npmrc 配置
echo "build_from_source=false" >> .npmrc
npm install
```

### 3. 验证安装

```bash
# 检查安装状态
npm run sqlite:check

# 或手动测试
node -e "console.log(require('better-sqlite3').VERSION)"
```

## 配置文件优化

### package.json 脚本

```json
{
  "scripts": {
    "sqlite:install": "npm install better-sqlite3 sqlite3 --build-from-source=false",
    "sqlite:rebuild": "npm rebuild better-sqlite3 sqlite3",
    "sqlite:check": "node -e \"try{require('better-sqlite3');console.log('✅ better-sqlite3 OK')}catch(e){console.log('❌ better-sqlite3:',e.message)};try{require('sqlite3');console.log('✅ sqlite3 OK')}catch(e){console.log('❌ sqlite3:',e.message)}\""
  }
}
```

### .npmrc 配置

```ini
# 强制使用预编译二进制
build_from_source=false

# 针对特定包的配置
# better_sqlite3_build_from_source=false
# sqlite3_build_from_source=false
```

## 故障排除

### 常见问题

1. **预编译二进制不可用**
   ```bash
   # 尝试指定目标平台
   npm install better-sqlite3 --target_platform=win32 --target_arch=x64
   ```

2. **Python或Visual Studio构建工具缺失**
   ```bash
   # 使用预编译版本避免编译
   npm config set build_from_source false
   ```

3. **网络问题**
   ```bash
   # 使用国内镜像
   npm config set registry https://registry.npmmirror.com/
   npm install better-sqlite3 --build-from-source=false
   ```

### 验证脚本

创建验证脚本来测试安装：

```javascript
// test-sqlite.js
const sqliteTest = () => {
  try {
    const Database = require('better-sqlite3');
    const db = new Database(':memory:');
    console.log('✅ better-sqlite3 工作正常');
    console.log('版本:', Database.VERSION);
    db.close();
  } catch (error) {
    console.error('❌ better-sqlite3 测试失败:', error.message);
  }
  
  try {
    const sqlite3 = require('sqlite3');
    console.log('✅ sqlite3 模块加载成功');
  } catch (error) {
    console.error('❌ sqlite3 测试失败:', error.message);
  }
};

sqliteTest();
```

## 推荐的最终配置

基于你的项目需求，建议：

1. **保留 `better-sqlite3`** - 主要数据库操作
2. **移除 `sqlite3`** - 除非有特殊需求
3. **使用预编译版本** - 避免编译问题

```bash
# 最终推荐配置
npm uninstall sqlite3
npm install better-sqlite3 --build-from-source=false
```

## 性能对比

| 特性 | better-sqlite3 | sqlite3 |
|------|----------------|---------|
| API类型 | 同步 | 异步 |
| 性能 | 更高 | 良好 |
| 安装难度 | 较简单 | 较复杂 |
| 预编译支持 | 优秀 | 良好 |

## 后续维护

1. **定期更新**：`npm update better-sqlite3`
2. **版本锁定**：在package.json中指定确切版本
3. **CI/CD配置**：确保构建环境也使用预编译版本

这个方案应该能解决你的SQLite3安装问题，避免原生编译的复杂性。