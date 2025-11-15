import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

export interface ProjectRecord {
  id?: number
  name: string
  description?: string
  cif_file_path?: string
  tif_file_path?: string
  created_at: string
  updated_at: string
  metadata?: string // JSON string for additional metadata
}

export interface AnalysisRecord {
  id?: number
  project_id: number
  analysis_type: 'cif' | 'tif' | 'component'
  analysis_data: string // JSON string
  created_at: string
  notes?: string
}

export interface SettingsRecord {
  id?: number
  key: string
  value: string
  updated_at: string
}

class DatabaseManager {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    const userDataPath = app.getPath('userData')
    const dbDir = path.join(userDataPath, 'database')
    
    // 确保数据库目录存在
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    
    this.dbPath = path.join(dbDir, 'crystallography.db')
  }

  public connect(): void {
    try {
      this.db = new Database(this.dbPath)
      this.db.pragma('journal_mode = WAL')
      this.db.pragma('foreign_keys = ON')
      this.initTables()
      console.log('Database connected successfully')
    } catch (error) {
      console.error('Failed to connect to database:', error)
      throw error
    }
  }

  public disconnect(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      console.log('Database disconnected')
    }
  }

  private initTables(): void {
    if (!this.db) throw new Error('Database not connected')

    // 创建项目表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        cif_file_path TEXT,
        tif_file_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      )
    `)

    // 创建分析记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS analysis_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        analysis_type TEXT NOT NULL CHECK (analysis_type IN ('cif', 'tif', 'component')),
        analysis_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `)

    // 创建设置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
      CREATE INDEX IF NOT EXISTS idx_analysis_records_project_id ON analysis_records(project_id);
      CREATE INDEX IF NOT EXISTS idx_analysis_records_type ON analysis_records(analysis_type);
      CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
    `)

    // 插入默认设置
    this.insertDefaultSettings()
  }

  private insertDefaultSettings(): void {
    if (!this.db) throw new Error('Database not connected')

    const defaultSettings = [
      { key: 'theme', value: 'light' },
      { key: 'language', value: 'zh-CN' },
      { key: 'auto_save', value: 'true' },
      { key: 'export_quality', value: 'high' },
      { key: 'default_atom_size', value: '1.0' },
      { key: 'default_bond_thickness', value: '0.3' }
    ]

    const insertSetting = this.db.prepare(`
      INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
    `)

    const transaction = this.db.transaction(() => {
      for (const setting of defaultSettings) {
        insertSetting.run(setting.key, setting.value)
      }
    })

    transaction()
  }

  // 项目相关操作
  public createProject(project: Omit<ProjectRecord, 'id' | 'created_at' | 'updated_at'>): number {
    if (!this.db) throw new Error('Database not connected')

    const stmt = this.db.prepare(`
      INSERT INTO projects (name, description, cif_file_path, tif_file_path, metadata)
      VALUES (?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      project.name,
      project.description || null,
      project.cif_file_path || null,
      project.tif_file_path || null,
      project.metadata || null
    )

    return result.lastInsertRowid as number
  }

  public getProject(id: number): ProjectRecord | null {
    if (!this.db) throw new Error('Database not connected')

    const stmt = this.db.prepare(`
      SELECT * FROM projects WHERE id = ?
    `)

    return stmt.get(id) as ProjectRecord || null
  }

  public getAllProjects(): ProjectRecord[] {
    if (!this.db) throw new Error('Database not connected')

    const stmt = this.db.prepare(`
      SELECT * FROM projects ORDER BY updated_at DESC
    `)

    return stmt.all() as ProjectRecord[]
  }

  public updateProject(id: number, updates: Partial<ProjectRecord>): boolean {
    if (!this.db) throw new Error('Database not connected')

    const fields = []
    const values = []

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && value !== undefined) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
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

  public deleteProject(id: number): boolean {
    if (!this.db) throw new Error('Database not connected')

    const stmt = this.db.prepare(`
      DELETE FROM projects WHERE id = ?
    `)

    const result = stmt.run(id)
    return result.changes > 0
  }

  // 分析记录相关操作
  public createAnalysisRecord(analysis: Omit<AnalysisRecord, 'id' | 'created_at'>): number {
    if (!this.db) throw new Error('Database not connected')

    const stmt = this.db.prepare(`
      INSERT INTO analysis_records (project_id, analysis_type, analysis_data, notes)
      VALUES (?, ?, ?, ?)
    `)

    const result = stmt.run(
      analysis.project_id,
      analysis.analysis_type,
      analysis.analysis_data,
      analysis.notes || null
    )

    return result.lastInsertRowid as number
  }

  public getAnalysisRecords(projectId: number, analysisType?: number): AnalysisRecord[] {
    if (!this.db) throw new Error('Database not connected')

    let query = `
      SELECT * FROM analysis_records WHERE project_id = ?
    `
    const params = [projectId]

    if (analysisType !== undefined) {
      query += ` AND analysis_type = ?`
      params.push(analysisType)
    }

    query += ` ORDER BY created_at DESC`

    const stmt = this.db.prepare(query)
    return stmt.all(...params) as AnalysisRecord[]
  }

  public deleteAnalysisRecord(id: number): boolean {
    if (!this.db) throw new Error('Database not connected')

    const stmt = this.db.prepare(`
      DELETE FROM analysis_records WHERE id = ?
    `)

    const result = stmt.run(id)
    return result.changes > 0
  }

  // 设置相关操作
  public getSetting(key: string): string | null {
    if (!this.db) throw new Error('Database not connected')

    const stmt = this.db.prepare(`
      SELECT value FROM settings WHERE key = ?
    `)

    const result = stmt.get(key) as SettingsRecord | undefined
    return result ? result.value : null
  }

  public setSetting(key: string, value: string): void {
    if (!this.db) throw new Error('Database not connected')

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `)

    stmt.run(key, value)
  }

  public getAllSettings(): Record<string, string> {
    if (!this.db) throw new Error('Database not connected')

    const stmt = this.db.prepare(`
      SELECT key, value FROM settings
    `)

    const records = stmt.all() as SettingsRecord[]
    const settings: Record<string, string> = {}

    for (const record of records) {
      settings[record.key] = record.value
    }

    return settings
  }

  // 数据库维护操作
  public backup(backupPath: string): void {
    if (!this.db) throw new Error('Database not connected')

    try {
      // 使用 better-sqlite3 的同步备份方法
      const source = this.db
      const target = new Database(backupPath)
      
      // 复制数据库
      target.exec(`
        ATTACH DATABASE '${source.name}' AS source;
        BEGIN;
        SELECT sql FROM source.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';
      `)
      
      // 获取所有表并复制数据
      const tables = source.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as any[]
      
      for (const table of tables) {
        const data = source.prepare(`SELECT * FROM ${table.name}`).all()
        if (data.length > 0) {
          const insert = target.prepare(`INSERT INTO ${table.name} SELECT * FROM source.${table.name}`)
          insert.run()
        }
      }
      
      target.exec('COMMIT; DETACH DATABASE source;')
      target.close()
      
      console.log(`Database backed up to: ${backupPath}`)
    } catch (error) {
      console.error('Backup failed:', error)
      throw error
    }
  }

  public getDatabaseStats(): {
    projectsCount: number
    analysisRecordsCount: number
    databaseSize: number
  } {
    if (!this.db) throw new Error('Database not connected')

    const projectsCount = (this.db.prepare('SELECT COUNT(*) as count FROM projects').get() as any).count
    const analysisRecordsCount = (this.db.prepare('SELECT COUNT(*) as count FROM analysis_records').get() as any).count

    let databaseSize = 0
    try {
      const stats = fs.statSync(this.dbPath)
      databaseSize = stats.size
    } catch (error) {
      console.warn('Failed to get database size:', error)
    }

    return {
      projectsCount,
      analysisRecordsCount,
      databaseSize
    }
  }

  public vacuum(): void {
    if (!this.db) throw new Error('Database not connected')

    this.db.exec('VACUUM')
    console.log('Database vacuumed')
  }
}

// 单例模式
let databaseManager: DatabaseManager | null = null

export function getDatabaseManager(): DatabaseManager {
  if (!databaseManager) {
    databaseManager = new DatabaseManager()
  }
  return databaseManager
}

export default DatabaseManager