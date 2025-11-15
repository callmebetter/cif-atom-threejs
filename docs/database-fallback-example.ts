# better-sqlite3 降级处理快速实现

## 1. 创建降级数据库管理器

```typescript
// electron/database-fallback.ts
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

// 数据接口定义
interface ProjectRecord {
  id?: number
  name: string
  description?: string
  created_at: string
  updated_at: string
}

interface AnalysisRecord {
  id?: number
  project_id: number
  name: string
  description?: string
  created_at: string
  updated_at: string
}

interface SettingsRecord {
  key: string
  value: string
  updated_at: string
}

// 抽象基类
abstract class DatabaseManager {
  abstract createProject(project: Omit<ProjectRecord, 'id' | 'created_at' | 'updated_at'>): number
  abstract getProject(id: number): ProjectRecord | null
  abstract getAllProjects(): ProjectRecord[]
  abstract updateProject(id: number, project: Partial<ProjectRecord>): boolean
  abstract deleteProject(id: number): boolean
  
  abstract createAnalysis(analysis: Omit<AnalysisRecord, 'id' | 'created_at' | 'updated_at'>): number
  abstract getAnalysis(id: number): AnalysisRecord | null
  abstract getAnalysisByProject(projectId: number): AnalysisRecord[]
  abstract getAllAnalysis(): AnalysisRecord[]
  abstract updateAnalysis(id: number, analysis: Partial<AnalysisRecord>): boolean
  abstract deleteAnalysis(id: number): boolean
  
  abstract getSetting(key: string): string | null
  abstract setSetting(key: string, value: string): void
  abstract getAllSettings(): SettingsRecord[]
}

// SQLite 实现（原有逻辑）
class SQLiteDatabaseManager extends DatabaseManager {
  private db: any = null

  constructor() {
    super()
    this.connect()
  }

  private connect() {
    try {
      const Database = require('better-sqlite3')
      const userDataPath = app.getPath('userData')
      const dbPath = path.join(userDataPath, 'database', 'crystallography.db')
      
      // 确保数据库目录存在
      const dbDir = path.dirname(dbPath)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }
      
      this.db = new Database(dbPath)
      this.initTables()
      console.log('✓ SQLite 数据库连接成功')
    } catch (error) {
      console.error('SQLite 连接失败:', error)
      throw new Error('SQLite 不可用: ' + error.message)
    }
  }

  private initTables() {
    // 项目表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 分析记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS analysis_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `)

    // 设置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
      CREATE INDEX IF NOT EXISTS idx_analysis_project_id ON analysis_records(project_id);
      CREATE INDEX IF NOT EXISTS idx_analysis_updated_at ON analysis_records(updated_at);
    `)

    // 插入默认设置
    this.insertDefaultSettings()
  }

  private insertDefaultSettings() {
    const defaultSettings = [
      ['theme', 'light'],
      ['language', 'zh-CN'],
      ['auto_save', 'true'],
      ['backup_enabled', 'true'],
      ['last_project_id', '0']
    ]

    const stmt = this.db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
    defaultSettings.forEach(([key, value]) => {
      stmt.run(key, value)
    })
  }

  // 项目管理方法
  createProject(project: Omit<ProjectRecord, 'id' | 'created_at' | 'updated_at'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO projects (name, description) VALUES (?, ?)
    `)
    const result = stmt.run(project.name, project.description)
    return result.lastInsertRowid as number
  }

  getProject(id: number): ProjectRecord | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?')
    return stmt.get(id) as ProjectRecord || null
  }

  getAllProjects(): ProjectRecord[] {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY updated_at DESC')
    return stmt.all() as ProjectRecord[]
  }

  updateProject(id: number, project: Partial<ProjectRecord>): boolean {
    const fields = []
    const values = []
    
    if (project.name !== undefined) {
      fields.push('name = ?')
      values.push(project.name)
    }
    if (project.description !== undefined) {
      fields.push('description = ?')
      values.push(project.description)
    }
    
    if (fields.length === 0) return false
    
    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)
    
    const stmt = this.db.prepare(`
      UPDATE projects SET ${fields.join(', ')} WHERE id = ?
    `)
    const result = stmt.run(...values)
    return result.changes > 0
  }

  deleteProject(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  // 分析记录管理方法
  createAnalysis(analysis: Omit<AnalysisRecord, 'id' | 'created_at' | 'updated_at'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO analysis_records (project_id, name, description) VALUES (?, ?, ?)
    `)
    const result = stmt.run(analysis.project_id, analysis.name, analysis.description)
    return result.lastInsertRowid as number
  }

  getAnalysis(id: number): AnalysisRecord | null {
    const stmt = this.db.prepare('SELECT * FROM analysis_records WHERE id = ?')
    return stmt.get(id) as AnalysisRecord || null
  }

  getAnalysisByProject(projectId: number): AnalysisRecord[] {
    const stmt = this.db.prepare('SELECT * FROM analysis_records WHERE project_id = ? ORDER BY updated_at DESC')
    return stmt.all(projectId) as AnalysisRecord[]
  }

  getAllAnalysis(): AnalysisRecord[] {
    const stmt = this.db.prepare('SELECT * FROM analysis_records ORDER BY updated_at DESC')
    return stmt.all() as AnalysisRecord[]
  }

  updateAnalysis(id: number, analysis: Partial<AnalysisRecord>): boolean {
    const fields = []
    const values = []
    
    if (analysis.name !== undefined) {
      fields.push('name = ?')
      values.push(analysis.name)
    }
    if (analysis.description !== undefined) {
      fields.push('description = ?')
      values.push(analysis.description)
    }
    if (analysis.project_id !== undefined) {
      fields.push('project_id = ?')
      values.push(analysis.project_id)
    }
    
    if (fields.length === 0) return false
    
    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)
    
    const stmt = this.db.prepare(`
      UPDATE analysis_records SET ${fields.join(', ')} WHERE id = ?
    `)
    const result = stmt.run(...values)
    return result.changes > 0
  }

  deleteAnalysis(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM analysis_records WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  // 设置管理方法
  getSetting(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?')
    const result = stmt.get(key)
    return result ? result.value : null
  }

  setSetting(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `)
    stmt.run(key, value)
  }

  getAllSettings(): SettingsRecord[] {
    const stmt = this.db.prepare('SELECT * FROM settings ORDER BY key')
    return stmt.all() as SettingsRecord[]
  }
}

// JSON 降级实现
class JSONDatabaseManager extends DatabaseManager {
  private dataPath: string
  private data: {
    projects: ProjectRecord[]
    analysis_records: AnalysisRecord[]
    settings: SettingsRecord[]
  }

  constructor() {
    super()
    const userDataPath = app.getPath('userData')
    this.dataPath = path.join(userDataPath, 'fallback-db.json')
    this.loadData()
    console.log('✓ 使用 JSON 降级数据库')
  }

  private loadData() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const content = fs.readFileSync(this.dataPath, 'utf8')
        this.data = JSON.parse(content)
      } else {
        this.data = {
          projects: [],
          analysis_records: [],
          settings: []
        }
        this.insertDefaultSettings()
        this.saveData()
      }
    } catch (error) {
      console.error('读取 JSON 数据库失败:', error)
      this.data = {
        projects: [],
        analysis_records: [],
        settings: []
      }
      this.insertDefaultSettings()
    }
  }

  private saveData() {
    try {
      // 确保目录存在
      const dir = path.dirname(this.dataPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      
      fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2))
    } catch (error) {
      console.error('保存 JSON 数据库失败:', error)
    }
  }

  private insertDefaultSettings() {
    this.data.settings = [
      { key: 'theme', value: 'light', updated_at: new Date().toISOString() },
      { key: 'language', value: 'zh-CN', updated_at: new Date().toISOString() },
      { key: 'auto_save', value: 'true', updated_at: new Date().toISOString() },
      { key: 'backup_enabled', value: 'true', updated_at: new Date().toISOString() },
      { key: 'last_project_id', value: '0', updated_at: new Date().toISOString() }
    ]
  }

  // 项目管理方法
  createProject(project: Omit<ProjectRecord, 'id' | 'created_at' | 'updated_at'>): number {
    const newProject: ProjectRecord = {
      ...project,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    this.data.projects.push(newProject)
    this.saveData()
    return newProject.id!
  }

  getProject(id: number): ProjectRecord | null {
    return this.data.projects.find(p => p.id === id) || null
  }

  getAllProjects(): ProjectRecord[] {
    return [...this.data.projects].sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  }

  updateProject(id: number, project: Partial<ProjectRecord>): boolean {
    const index = this.data.projects.findIndex(p => p.id === id)
    if (index === -1) return false
    
    this.data.projects[index] = {
      ...this.data.projects[index],
      ...project,
      updated_at: new Date().toISOString()
    }
    this.saveData()
    return true
  }

  deleteProject(id: number): boolean {
    const index = this.data.projects.findIndex(p => p.id === id)
    if (index === -1) return false
    
    this.data.projects.splice(index, 1)
    // 同时删除相关的分析记录
    this.data.analysis_records = this.data.analysis_records.filter(a => a.project_id !== id)
    this.saveData()
    return true
  }

  // 分析记录管理方法
  createAnalysis(analysis: Omit<AnalysisRecord, 'id' | 'created_at' | 'updated_at'>): number {
    const newAnalysis: AnalysisRecord = {
      ...analysis,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    this.data.analysis_records.push(newAnalysis)
    this.saveData()
    return newAnalysis.id!
  }

  getAnalysis(id: number): AnalysisRecord | null {
    return this.data.analysis_records.find(a => a.id === id) || null
  }

  getAnalysisByProject(projectId: number): AnalysisRecord[] {
    return this.data.analysis_records
      .filter(a => a.project_id === projectId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }

  getAllAnalysis(): AnalysisRecord[] {
    return [...this.data.analysis_records].sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  }

  updateAnalysis(id: number, analysis: Partial<AnalysisRecord>): boolean {
    const index = this.data.analysis_records.findIndex(a => a.id === id)
    if (index === -1) return false
    
    this.data.analysis_records[index] = {
      ...this.data.analysis_records[index],
      ...analysis,
      updated_at: new Date().toISOString()
    }
    this.saveData()
    return true
  }

  deleteAnalysis(id: number): boolean {
    const index = this.data.analysis_records.findIndex(a => a.id === id)
    if (index === -1) return false
    
    this.data.analysis_records.splice(index, 1)
    this.saveData()
    return true
  }

  // 设置管理方法
  getSetting(key: string): string | null {
    const setting = this.data.settings.find(s => s.key === key)
    return setting ? setting.value : null
  }

  setSetting(key: string, value: string): void {
    const index = this.data.settings.findIndex(s => s.key === key)
    const setting: SettingsRecord = {
      key,
      value,
      updated_at: new Date().toISOString()
    }
    
    if (index === -1) {
      this.data.settings.push(setting)
    } else {
      this.data.settings[index] = setting
    }
    
    this.saveData()
  }

  getAllSettings(): SettingsRecord[] {
    return [...this.data.settings].sort((a, b) => a.key.localeCompare(b.key))
  }
}

// 工厂函数
export function createDatabaseManager(): DatabaseManager {
  try {
    // 尝试使用 SQLite
    return new SQLiteDatabaseManager()
  } catch (error) {
    console.warn('SQLite 不可用，使用 JSON 降级方案:', error.message)
    return new JSONDatabaseManager()
  }
}

// 导出单例
export const dbManager = createDatabaseManager()

// 导出类型
export type { ProjectRecord, AnalysisRecord, SettingsRecord, DatabaseManager }
```

## 2. 更新现有代码

```typescript
// electron/main.ts 或其他使用数据库的文件
import { dbManager } from './database-fallback'

// 替换原有的数据库导入
// import { dbManager } from './database'  // 旧版本
// import { dbManager } from './database-fallback'  // 新版本

// 使用方式保持不变
const projectId = dbManager.createProject({
  name: '测试项目',
  description: '这是一个测试项目'
})

const project = dbManager.getProject(projectId)
const allProjects = dbManager.getAllProjects()
```

## 3. 添加环境检测脚本

```javascript
// scripts/check-database.js
const { execSync } = require('child_process')

console.log('🔍 检查数据库环境...')

try {
  // 检查 better-sqlite3 是否可用
  execSync('node -e "require(\'better-sqlite3\')"', { stdio: 'ignore' })
  console.log('✅ better-sqlite3 可用')
  
  // 检查 Visual Studio Build Tools
  try {
    execSync('where cl', { stdio: 'ignore' })
    console.log('✅ Visual Studio Build Tools 可用')
  } catch (error) {
    console.log('⚠️  Visual Studio Build Tools 未找到')
  }
  
  console.log('🎉 数据库环境检查完成')
  process.exit(0)
  
} catch (error) {
  console.log('❌ better-sqlite3 不可用')
  console.log('💡 将使用 JSON 降级方案')
  console.log('')
  console.log('如需使用 SQLite，请安装以下组件：')
  console.log('1. Visual Studio Build Tools')
  console.log('2. Python 3')
  console.log('3. 运行: npm install --build-from-source')
  process.exit(1)
}
```

## 4. 更新 package.json 脚本

```json
{
  "scripts": {
    "check:db": "node scripts/check-database.js",
    "install:safe": "npm run check:db && npm install || npm install --ignore-scripts",
    "setup:dev": "npm run install:safe && npm run rebuild:native",
    "rebuild:native": "electron-rebuild --force || echo 'Native rebuild failed, using fallback'"
  }
}
```

## 5. 使用说明

1. **自动降级**: 代码会自动检测 better-sqlite3 是否可用，不可用时使用 JSON 方案
2. **数据兼容**: 两种方案使用相同的 API 接口，代码无需修改
3. **性能差异**: JSON 方案在大量数据时性能较差，但能保证基本功能
4. **迁移路径**: 后续可以无缝迁移到其他数据库方案

## 6. 测试验证

```bash
# 测试数据库环境
npm run check:db

# 安全安装
npm run install:safe

# 启动应用测试
npm run dev
```

这个实现提供了完整的降级机制，确保即使 better-sqlite3 安装失败，应用也能正常运行。