import Database from 'better-sqlite3'
import { BaseRepository } from './BaseRepository'
import { ProjectRecord, CreateProjectData } from '../types'

export class ProjectsRepository extends BaseRepository {
  public createProject(project: CreateProjectData): number {
    this.ensureConnected()

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
    this.ensureConnected()

    const stmt = this.db.prepare(`
      SELECT * FROM projects WHERE id = ?
    `)

    return stmt.get(id) as ProjectRecord || null
  }

  public getAllProjects(): ProjectRecord[] {
    this.ensureConnected()

    const stmt = this.db.prepare(`
      SELECT * FROM projects ORDER BY updated_at DESC
    `)

    return stmt.all() as ProjectRecord[]
  }

  public updateProject(id: number, updates: Partial<ProjectRecord>): boolean {
    const { query, values } = this.buildUpdateQuery({ ...updates, id }, 'projects')

    if (!query) return false

    return this.runUpdate(query, values)
  }

  public deleteProject(id: number): boolean {
    this.ensureConnected()

    const stmt = this.db.prepare(`
      DELETE FROM projects WHERE id = ?
    `)

    const result = stmt.run(id)
    return result.changes > 0
  }

  public getProjectCount(): number {
    this.ensureConnected()

    const result = this.db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number }
    return result.count
  }
}