# 快速安装指南

## 🚀 推荐安装方式

### 方式一：一键安全安装（推荐）
```bash
npm run install:safe
```
或
```bash
pnpm run install:safe
```

这个命令会：
- 自动检测你的操作系统和包管理器
- 清理安装环境
- 安全安装依赖（跳过有问题的脚本）
- Windows 环境自动设置 `GYP_MSVS_VERSION=2019`
- 尝试多种重建方法
- 提供详细的状态报告

### 方式二：完整安装（包含原生模块重建）
```bash
npm run install:full
```
或
```bash
pnpm run install:full
```

### 方式三：项目完整设置
```bash
npm run setup:project
```
或
```bash
pnpm run setup:project
```

## 🔧 手动安装（如果自动安装失败）

### Windows 环境
```bash
# 1. 清理环境
pnpm store prune

# 2. 安装依赖（忽略脚本）
pnpm install --ignore-scripts --ignore-engines

# 3. 设置环境变量并重建
set GYP_MSVS_VERSION=2019 && pnpm dlx electron-rebuild --force
```

### macOS/Linux 环境
```bash
# 1. 清理缓存
pnpm store prune

# 2. 安装依赖
pnpm install --ignore-scripts --ignore-engines

# 3. 重建原生模块
pnpm dlx electron-rebuild --force
```

## ⚠️ 常见问题

### 问题：Visual Studio Build Tools 缺失
**解决方案：**
1. 安装 Visual Studio Build Tools
2. 或使用预编译版本：`pnpm install better-sqlite3 --build-from-source=false`
3. 应用会自动降级到 JSON 存储方案

### 问题：权限错误
**解决方案：**
```bash
# Windows (以管理员身份运行 PowerShell)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# macOS/Linux
chmod +x scripts/safe-install.js
```

### 问题：网络连接问题
**解决方案：**
```bash
# 使用国内镜像
npm config set registry https://registry.npmmirror.com
pnpm config set registry https://registry.npmmirror.com
```

## 🎯 安装验证

安装完成后，运行以下命令验证：
```bash
npm run dev
```

如果看到应用启动，说明安装成功！

## 📋 脚本说明

| 脚本命令 | 功能 | 推荐使用场景 |
|---------|------|-------------|
| `install:safe` | 安全安装依赖 | 首次安装、环境不确定 |
| `install:full` | 完整安装+重建 | 需要原生模块性能 |
| `setup:project` | 项目完整设置 | 新项目克隆后 |
| `rebuild:native` | 重建原生模块 | 更新 Electron 版本后 |
| `rebuild:native:windows` | Windows 专用重建 | Windows 环境原生模块问题 |

## 💡 最佳实践

1. **首次使用**：`npm run install:safe`
2. **开发环境**：`npm run setup:project`
3. **CI/CD**：`npm run install:full`
4. **故障排除**：查看 `docs/TROUBLESHOOTING.md`

## 🆘 获取帮助

如果遇到问题：
1. 查看 `docs/TROUBLESHOOTING.md`
2. 运行 `npm run install:safe -- --help`
3. 检查 `docs/BETTER_SQLITE3_ALTERNATIVES.md`