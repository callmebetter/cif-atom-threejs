# better-sqlite3 替代方案分析

## 为什么 better-sqlite3 这么麻烦？

### 1. 原生模块的本质问题
`better-sqlite3` 是一个原生 Node.js 模块，它需要：

- **编译时依赖**: 需要针对特定 Node.js 版本和操作系统架构编译
- **构建工具**: 依赖 `node-gyp` 和 C++ 编译器（如 Visual Studio Build Tools）
- **Electron 兼容性**: 需要为 Electron 的 Node.js 版本重新编译
- **二进制兼容性**: 不同操作系统（Windows/macOS/Linux）需要不同的二进制文件

### 2. Electron 环境的特殊性
```
Node.js 版本不匹配 → 原生模块编译失败 → 应用无法启动
```

- Electron 内置的 Node.js 版本可能与系统 Node.js 版本不同
- 原生模块必须针对 Electron 的 Node.js ABI（应用程序二进制接口）编译
- 每次更新 Electron 版本都可能需要重新编译所有原生模块

### 3. 开发环境的复杂性
- **Windows**: 需要 Visual Studio Build Tools
- **macOS**: 需要 Xcode Command Line Tools  
- **Linux**: 需要 build-essential 工具链
- **Python**: node-gyp 需要 Python 2.7 或 3.x

## 替代方案对比

### 方案一：使用 sqlite3（另一个原生模块）

**优点**:
- 更成熟，社区支持更好
- 文档更完善
- 异步 API（适合某些场景）

**缺点**:
- 仍然是原生模块，有相同的编译问题
- 性能不如 better-sqlite3
- API 设计相对老旧

```typescript
// sqlite3 使用示例
import sqlite3 from 'sqlite3'

const db = new sqlite3.Database('database.db')
db.run("CREATE TABLE users (...)", (err) => {
  if (err) console.error(err)
})
```

### 方案二：使用 lowdb + JSON 文件

**优点**:
- 纯 JavaScript，无原生依赖
- 零配置，开箱即用
- 适合小到中等规模数据

**缺点**:
- 性能限制（不适合大数据量）
- 并发写入需要额外处理
- 不支持复杂查询

```typescript
// lowdb 使用示例
import { Low, JSONFile } from 'lowdb'

interface Data {
  projects: ProjectRecord[]
  analysis: AnalysisRecord[]
}

const adapter = new JSONFile<Data>('db.json')
const db = new Low<Data>(adapter)

await db.read()
db.data ||= { projects: [], analysis: [] }
```

### 方案三：使用 Dexie.js（IndexedDB 包装器）

**优点**:
- 纯 JavaScript，基于浏览器 IndexedDB
- 现代化的 Promise API
- 良好的 TypeScript 支持

**缺点**:
- 主要为浏览器环境设计
- Electron 渲染进程中可用，但主进程不可用
- 数据存储在用户目录，不如 SQLite 灵活

```typescript
// Dexie 使用示例
import Dexie from 'dexie'

class MyDatabase extends Dexie {
  projects!: Table<ProjectRecord>
  analysis!: Table<AnalysisRecord>

  constructor() {
    super('CrystallographyDB')
    this.version(1).stores({
      projects: '++id, name, created_at',
      analysis: '++id, project_id, analysis_type, created_at'
    })
  }
}

const db = new MyDatabase()
```

### 方案四：使用 Prisma + SQLite

**优点**:
- 现代化的 ORM
- 类型安全的数据库操作
- 自动生成类型定义
- 优秀的开发体验

**缺点**:
- 仍然需要 SQLite 驱动（可能是原生模块）
- 学习曲线较陡
- 项目体积较大

```typescript
// Prisma 使用示例
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const project = await prisma.project.create({
  data: {
    name: '新项目',
    description: '项目描述'
  }
})
```

### 方案五：使用 electron-store + 自定义序列化

**优点**:
- 专为 Electron 设计
- 简单易用
- 支持加密
- 跨平台一致性

**缺点**:
- 不是真正的数据库
- 查询能力有限
- 大数据量性能问题

```typescript
// electron-store 使用示例
import Store from 'electron-store'

interface StoreData {
  projects: Record<string, ProjectRecord>
  analysis: AnalysisRecord[]
}

const store = new Store<StoreData>({
  defaults: {
    projects: {},
    analysis: []
  }
})

// 存储数据
store.set(`projects.${projectId}`, projectData)
```

### 方案六：使用 nedb（纯 JavaScript 数据库）

**优点**:
- MongoDB 兼容的 API
- 纯 JavaScript 实现
- 适合中小型应用
- 支持索引

**缺点**:
- 项目维护不活跃
- 性能不如 SQLite
- 不支持复杂事务

```typescript
// nedb 使用示例
import Datastore from 'nedb'

const db = new Datastore({ filename: 'database.db', autoload: true })

const project = {
  name: '新项目',
  created_at: new Date()
}

db.insert(project, (err, newDoc) => {
  if (err) console.error(err)
  console.log('插入成功:', newDoc)
})
```

## 推荐方案

### 当前项目最佳选择：优化 better-sqlite3 方案

考虑到项目的实际需求和现有代码结构，我建议继续使用 `better-sqlite3` 但采用以下优化策略：

#### 1. 预编译二进制分发
```json
// package.json
{
  "scripts": {
    "postinstall": "electron-builder install-app-deps",
    "rebuild:native": "electron-rebuild --force",
    "install:dev": "npm install --ignore-scripts && npm run rebuild:native"
  },
  "dependencies": {
    "better-sqlite3": "^12.4.1"
  }
}
```

#### 2. 构建时优化
```javascript
// scripts/build-native.js
const { execSync } = require('child_process')
const { platform } = require('os')

console.log('Rebuilding native modules for production...')

try {
  execSync('electron-rebuild --force', { stdio: 'inherit' })
  console.log('Native modules rebuilt successfully')
} catch (error) {
  console.error('Failed to rebuild native modules:', error)
  process.exit(1)
}
```

#### 3. 运行时降级处理
```typescript
// electron/database-fallback.ts
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

export class FallbackDatabaseManager {
  private useJsonFallback: boolean = false
  private jsonDbPath: string

  constructor() {
    const userDataPath = app.getPath('userData')
    this.jsonDbPath = path.join(userDataPath, 'fallback-db.json')
    
    try {
      // 尝试导入 better-sqlite3
      require('better-sqlite3')
    } catch (error) {
      console.warn('better-sqlite3 not available, using JSON fallback')
      this.useJsonFallback = true
    }
  }

  private getJsonData() {
    if (!fs.existsSync(this.jsonDbPath)) {
      return { projects: [], analysis: [], settings: [] }
    }
    return JSON.parse(fs.readFileSync(this.jsonDbPath, 'utf8'))
  }

  private saveJsonData(data: any) {
    fs.writeFileSync(this.jsonDbPath, JSON.stringify(data, null, 2))
  }

  public createProject(project: Omit<ProjectRecord, 'id' | 'created_at' | 'updated_at'>): number {
    if (this.useJsonFallback) {
      const data = this.getJsonData()
      const newProject = {
        ...project,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      data.projects.push(newProject)
      this.saveJsonData(data)
      return newProject.id
    } else {
      // 使用原来的 better-sqlite3 逻辑
      return this.createProjectWithSQLite(project)
    }
  }
}
```

### 中期方案：迁移到 Prisma + SQLite

如果原生模块问题持续存在，可以考虑迁移到 Prisma：

#### 1. 安装 Prisma
```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider sqlite
```

#### 2. 创建 Prisma schema
```prisma
// prisma/schema.prisma
model Project {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  description String?
  cifFilePath String?  @map("cif_file_path")
  tifFilePath String?  @map("tif_file_path")
  metadata    String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  analyses    Analysis[]
  
  @@map("projects")
}

model Analysis {
  id           Int      @id @default(autoincrement())
  projectId    Int      @map("project_id")
  analysisType String   @map("analysis_type")
  analysisData String   @map("analysis_data")
  notes        String?
  createdAt    DateTime @default(now()) @map("created_at")
  
  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@map("analysis_records")
}
```

#### 3. 数据库服务重构
```typescript
// services/prismaDatabaseService.ts
import { PrismaClient } from '@prisma/client'

export class PrismaDatabaseService {
  private prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient()
  }

  async createProject(data: Omit<ProjectRecord, 'id' | 'created_at' | 'updated_at'>) {
    return await this.prisma.project.create({
      data
    })
  }

  async getProject(id: number) {
    return await this.prisma.project.findUnique({
      where: { id },
      include: { analyses: true }
    })
  }

  async getAllProjects() {
    return await this.prisma.project.findMany({
      orderBy: { updatedAt: 'desc' }
    })
  }
}
```

### 长期方案：考虑云数据库或本地文件存储

对于大型部署或特殊需求，可以考虑：

1. **云数据库**: Supabase, Firebase, PlanetScale
2. **本地文件存储**: JSON + 文件系统
3. **混合方案**: 本地缓存 + 云同步

## 实施建议

### 立即实施（解决当前问题）
1. **完善构建脚本**: 添加原生模块重建流程
2. **添加降级处理**: 实现更好的错误处理
3. **文档完善**: 更新安装和部署文档

### 短期优化（1-2个月）
1. **评估 Prisma**: 创建 PoC 验证可行性
2. **性能测试**: 对比不同方案的性能
3. **迁移计划**: 制定详细的迁移时间表

### 长期规划（3-6个月）
1. **技术选型**: 根据项目发展选择最佳方案
2. **渐进迁移**: 分步骤迁移到新的数据库方案
3. **向后兼容**: 确保数据迁移的平滑过渡

## 总结

`better-sqlite3` 的复杂性主要源于其原生模块的特性，在 Electron 环境中这种复杂性被放大。虽然存在多种替代方案，但每种方案都有其权衡：

- **better-sqlite3**: 性能最佳但配置复杂
- **lowdb/nedb**: 简单易用但功能有限
- **Prisma**: 现代化但仍有原生依赖
- **IndexedDB**: 浏览器友好但主进程不可用

对于当前项目，建议采用**优化现有 better-sqlite3 方案 + 降级处理**的策略，同时评估 Prisma 作为中期替代方案。这样既能解决当前问题，又为未来发展保留了选择空间。