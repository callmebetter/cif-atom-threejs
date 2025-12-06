import Database from 'better-sqlite3'

export abstract class BaseRepository {
  protected db: Database.Database

  constructor(database: Database.Database) {
    this.db = database
  }

  protected ensureConnected(): void {
    if (!this.db) {
      throw new Error('Database not connected')
    }
  }

  protected buildUpdateQuery(updates: Record<string, any>, tableName: string, whereCondition: string = 'id = ?'): { query: string; values: any[] } {
    const fields = []
    const values = []

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    }

    if (fields.length === 0) {
      return { query: '', values: [] }
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(updates.id)

    return {
      query: `UPDATE ${tableName} SET ${fields.join(', ')} WHERE ${whereCondition}`,
      values
    }
  }

  protected runUpdate(query: string, values: any[]): boolean {
    this.ensureConnected()
    const stmt = this.db.prepare(query)
    const result = stmt.run(...values)
    return result.changes > 0
  }

  protected runDelete(query: string, values: any[]): boolean {
    this.ensureConnected()
    const stmt = this.db.prepare(query)
    const result = stmt.run(...values)
    return result.changes > 0
  }
}