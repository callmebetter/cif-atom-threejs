import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { DatabaseSchema } from './schema'
import {
  ProjectsRepository,
  AnalysisRepository,
  SettingsRepository,
  CifRepository
} from './repositories'
import { DatabaseStats } from './types'

class DatabaseManager {
  private db: Database.Database | null = null
  private dbPath: string

  // Repository instances
  public projects: ProjectsRepository
  public analysis: AnalysisRepository
  public settings: SettingsRepository
  public cif: CifRepository

  constructor() {
    const userDataPath = app.getPath('userData')
    const dbDir = path.join(userDataPath, 'database')

    // 确保数据库目录存在
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    this.dbPath = path.join(dbDir, 'crystallography.db')

    // Initialize repositories (they will be fully initialized after connection)
    this.projects = new ProjectsRepository(null as any)
    this.analysis = new AnalysisRepository(null as any)
    this.settings = new SettingsRepository(null as any)
    this.cif = new CifRepository(null as any)
  }

  public connect(): void {
    try {
      this.db = new Database(this.dbPath)
      this.db.pragma('journal_mode = WAL')
      this.db.pragma('foreign_keys = ON')

      // Initialize database schema
      DatabaseSchema.initializeTables(this.db)

      // Initialize repositories with the connected database
      this.projects = new ProjectsRepository(this.db)
      this.analysis = new AnalysisRepository(this.db)
      this.settings = new SettingsRepository(this.db)
      this.cif = new CifRepository(this.db)

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

  public isConnected(): boolean {
    return this.db !== null
  }

  private ensureConnected(): void {
    if (!this.db) {
      throw new Error('Database not connected')
    }
  }

  // 数据库维护操作
  public backup(backupPath: string): void {
    this.ensureConnected()

    try {
      // 使用 better-sqlite3 的同步备份方法
      const source = this.db!
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

  public getDatabaseStats(): DatabaseStats {
    this.ensureConnected()

    const projectsCount = this.projects.getProjectCount()
    const analysisRecordsCount = this.analysis.getAnalysisRecordsCount()

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
    this.ensureConnected()
    this.db!.exec('VACUUM')
    console.log('Database vacuumed')
  }

  public getDatabasePath(): string {
    return this.dbPath
  }

  // Transaction support
  public transaction<T>(fn: () => T): T {
    this.ensureConnected()
    const tx = this.db!.transaction(fn)
    return tx()
  }

  // Convenience methods for backward compatibility
  public createProject(project: any) {
    return this.projects.createProject(project)
  }

  public getProject(id: number) {
    return this.projects.getProject(id)
  }

  public getAllProjects() {
    return this.projects.getAllProjects()
  }

  public updateProject(id: number, updates: any) {
    return this.projects.updateProject(id, updates)
  }

  public deleteProject(id: number) {
    return this.projects.deleteProject(id)
  }

  public createAnalysisRecord(analysis: any) {
    return this.analysis.createAnalysisRecord(analysis)
  }

  public getAnalysisRecords(projectId: number, analysisType?: any) {
    return this.analysis.getAnalysisRecords(projectId, analysisType)
  }

  public deleteAnalysisRecord(id: number) {
    return this.analysis.deleteAnalysisRecord(id)
  }

  public getSetting(key: string) {
    return this.settings.getSetting(key)
  }

  public setSetting(key: string, value: string) {
    return this.settings.setSetting(key, value)
  }

  public getAllSettings() {
    return this.settings.getAllSettings()
  }

  public createCifRecord(record: any) {
    return this.cif.createCifRecord(record)
  }

  public getCifRecord(id: number) {
    return this.cif.getCifRecord(id)
  }

  public getCifRecords() {
    return this.cif.getCifRecords()
  }

  public updateCifRecord(id: number, updates: any) {
    return this.cif.updateCifRecord(id, updates)
  }

  public deleteCifRecord(id: number) {
    return this.cif.deleteCifRecord(id)
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

export { DatabaseManager }
export default DatabaseManager