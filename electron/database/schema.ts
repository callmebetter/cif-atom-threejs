import Database from 'better-sqlite3'

export interface DefaultSetting {
  key: string
  value: string
}

export const DEFAULT_SETTINGS: DefaultSetting[] = [
  { key: 'theme', value: 'light' },
  { key: 'language', value: 'zh-CN' },
  { key: 'auto_save', value: 'true' },
  { key: 'export_quality', value: 'high' },
  { key: 'default_atom_size', value: '1.0' },
  { key: 'default_bond_thickness', value: '0.3' }
]

export class DatabaseSchema {
  static initializeTables(db: Database.Database): void {
    DatabaseSchema.createProjectsTable(db)
    DatabaseSchema.createAnalysisRecordsTable(db)
    DatabaseSchema.createSettingsTable(db)
    DatabaseSchema.createCifRecordsTable(db)
    DatabaseSchema.createIndexes(db)
    DatabaseSchema.insertDefaultSettings(db)
  }

  private static createProjectsTable(db: Database.Database): void {
    db.exec(`
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
  }

  private static createAnalysisRecordsTable(db: Database.Database): void {
    db.exec(`
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
  }

  private static createSettingsTable(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  private static createCifRecordsTable(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS cif_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        parsed_atoms TEXT NOT NULL,
        parsed_lattice TEXT NOT NULL,
        space_group TEXT,
        parse_status TEXT NOT NULL CHECK (parse_status IN ('success', 'failed', 'partial')),
        parse_error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  private static createIndexes(db: Database.Database): void {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
      CREATE INDEX IF NOT EXISTS idx_analysis_records_project_id ON analysis_records(project_id);
      CREATE INDEX IF NOT EXISTS idx_analysis_records_type ON analysis_records(analysis_type);
      CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
      CREATE INDEX IF NOT EXISTS idx_cif_records_file_name ON cif_records(file_name);
      CREATE INDEX IF NOT EXISTS idx_cif_records_parse_status ON cif_records(parse_status);
    `)
  }

  private static insertDefaultSettings(db: Database.Database): void {
    const insertSetting = db.prepare(`
      INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
    `)

    const transaction = db.transaction(() => {
      for (const setting of DEFAULT_SETTINGS) {
        insertSetting.run(setting.key, setting.value)
      }
    })

    transaction()
  }
}