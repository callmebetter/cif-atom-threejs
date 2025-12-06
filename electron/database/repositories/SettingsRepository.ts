import Database from 'better-sqlite3'
import { BaseRepository } from './BaseRepository'
import { SettingsRecord } from '../types'

export class SettingsRepository extends BaseRepository {
  public getSetting(key: string): string | null {
    this.ensureConnected()

    const stmt = this.db.prepare(`
      SELECT value FROM settings WHERE key = ?
    `)

    const result = stmt.get(key) as SettingsRecord | undefined
    return result ? result.value : null
  }

  public setSetting(key: string, value: string): void {
    this.ensureConnected()

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `)

    stmt.run(key, value)
  }

  public getAllSettings(): Record<string, string> {
    this.ensureConnected()

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

  public deleteSetting(key: string): boolean {
    this.ensureConnected()

    const stmt = this.db.prepare(`
      DELETE FROM settings WHERE key = ?
    `)

    const result = stmt.run(key)
    return result.changes > 0
  }

  public hasSetting(key: string): boolean {
    this.ensureConnected()

    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM settings WHERE key = ?
    `)

    const result = stmt.get(key) as { count: number }
    return result.count > 0
  }
}