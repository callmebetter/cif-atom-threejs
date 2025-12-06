import Database from 'better-sqlite3'
import { BaseRepository } from './BaseRepository'
import { CifRecord, CreateCifData, ParseStatus } from '../types'

export class CifRepository extends BaseRepository {
  public createCifRecord(record: CreateCifData): number {
    this.ensureConnected()

    const stmt = this.db.prepare(`
      INSERT INTO cif_records
      (file_name, file_path, parsed_atoms, parsed_lattice, space_group, parse_status, parse_error)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      record.file_name,
      record.file_path,
      record.parsed_atoms,
      record.parsed_lattice,
      record.space_group || null,
      record.parse_status,
      record.parse_error || null
    )

    return result.lastInsertRowid as number
  }

  public getCifRecord(id: number): CifRecord | null {
    this.ensureConnected()

    const stmt = this.db.prepare(`
      SELECT * FROM cif_records WHERE id = ?
    `)

    return stmt.get(id) as CifRecord || null
  }

  public getCifRecords(): CifRecord[] {
    this.ensureConnected()

    const stmt = this.db.prepare(`
      SELECT * FROM cif_records ORDER BY created_at DESC
    `)

    return stmt.all() as CifRecord[]
  }

  public getCifRecordsByStatus(parseStatus: ParseStatus): CifRecord[] {
    this.ensureConnected()

    const stmt = this.db.prepare(`
      SELECT * FROM cif_records WHERE parse_status = ? ORDER BY created_at DESC
    `)

    return stmt.all(parseStatus) as CifRecord[]
  }

  public getCifRecordByFileName(fileName: string): CifRecord | null {
    this.ensureConnected()

    const stmt = this.db.prepare(`
      SELECT * FROM cif_records WHERE file_name = ? ORDER BY created_at DESC LIMIT 1
    `)

    return stmt.get(fileName) as CifRecord || null
  }

  public updateCifRecord(id: number, updates: Partial<CifRecord>): boolean {
    const { query, values } = this.buildUpdateQuery({ ...updates, id }, 'cif_records')

    if (!query) return false

    return this.runUpdate(query, values)
  }

  public deleteCifRecord(id: number): boolean {
    this.ensureConnected()

    const stmt = this.db.prepare(`
      DELETE FROM cif_records WHERE id = ?
    `)

    const result = stmt.run(id)
    return result.changes > 0
  }

  public getCifRecordsCount(): number {
    this.ensureConnected()

    const result = this.db.prepare('SELECT COUNT(*) as count FROM cif_records').get() as { count: number }
    return result.count
  }
}