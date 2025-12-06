import Database from 'better-sqlite3'
import { BaseRepository } from './BaseRepository'
import { AnalysisRecord, CreateAnalysisData, AnalysisType } from '../types'

export class AnalysisRepository extends BaseRepository {
  public createAnalysisRecord(analysis: CreateAnalysisData): number {
    this.ensureConnected()

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

  public getAnalysisRecords(projectId: number, analysisType?: AnalysisType): AnalysisRecord[] {
    this.ensureConnected()

    let query = `
      SELECT * FROM analysis_records WHERE project_id = ?
    `
    const params: any[] = [projectId]

    if (analysisType !== undefined) {
      query += ` AND analysis_type = ?`
      params.push(analysisType)
    }

    query += ` ORDER BY created_at DESC`

    const stmt = this.db.prepare(query)
    return stmt.all(...params) as AnalysisRecord[]
  }

  public getAnalysisRecord(id: number): AnalysisRecord | null {
    this.ensureConnected()

    const stmt = this.db.prepare(`
      SELECT * FROM analysis_records WHERE id = ?
    `)

    return stmt.get(id) as AnalysisRecord || null
  }

  public deleteAnalysisRecord(id: number): boolean {
    this.ensureConnected()

    const stmt = this.db.prepare(`
      DELETE FROM analysis_records WHERE id = ?
    `)

    const result = stmt.run(id)
    return result.changes > 0
  }

  public deleteAnalysisRecordsByProject(projectId: number): boolean {
    this.ensureConnected()

    const stmt = this.db.prepare(`
      DELETE FROM analysis_records WHERE project_id = ?
    `)

    const result = stmt.run(projectId)
    return result.changes > 0
  }

  public getAnalysisRecordsCount(): number {
    this.ensureConnected()

    const result = this.db.prepare('SELECT COUNT(*) as count FROM analysis_records').get() as { count: number }
    return result.count
  }
}