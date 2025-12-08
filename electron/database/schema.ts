import Database from "better-sqlite3";

export interface DefaultSetting {
  key: string;
  value: string;
}

export const DEFAULT_SETTINGS: DefaultSetting[] = [
  { key: "theme", value: "light" },
  { key: "language", value: "zh-CN" },
  { key: "auto_save", value: "true" },
  { key: "export_quality", value: "high" },
  { key: "default_atom_size", value: "1.0" },
  { key: "default_bond_thickness", value: "0.3" },
];

export class DatabaseSchema {
  static initializeTables(db: Database.Database): void {
    DatabaseSchema.createProjectsTable(db);
    DatabaseSchema.createAnalysisRecordsTable(db);
    DatabaseSchema.createSettingsTable(db);
    DatabaseSchema.createCifRecordsTable(db);
    DatabaseSchema.createIndexes(db);
    DatabaseSchema.insertDefaultSettings(db);
  }

  /**
   * Initialize tables with migration support
   * Use this method when updating from the old schema to the new normalized schema
   *
   * Example usage:
   * ```typescript
   * import Database from 'better-sqlite3'
   * import { migrateDatabase } from './migration'
   *
   * const db = new Database('path/to/database.db')
   *
   * // For new installations:
   * DatabaseSchema.initializeTables(db)
   *
   * // For upgrading from old schema:
   * migrateDatabase(db)
   * ```
   */

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
    `);
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
    `);
  }

  private static createSettingsTable(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private static createCifRecordsTable(db: Database.Database): void {
    // Create CIF info table for basic file information
    db.exec(`
      CREATE TABLE IF NOT EXISTS cif_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL UNIQUE,
        file_size INTEGER,
        checksum TEXT,
        parse_status TEXT NOT NULL CHECK (parse_status IN ('success', 'failed', 'partial')),
        parse_error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create lattice parameters table
    db.exec(`
      CREATE TABLE IF NOT EXISTS cif_lattice (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cif_id INTEGER NOT NULL,
        a REAL NOT NULL,
        b REAL NOT NULL,
        c REAL NOT NULL,
        alpha REAL NOT NULL,
        beta REAL NOT NULL,
        gamma REAL NOT NULL,
        cell_volume REAL,
        space_group TEXT,
        space_group_number INTEGER,
        crystal_system TEXT,
        FOREIGN KEY (cif_id) REFERENCES cif_info(id) ON DELETE CASCADE
      )
    `);

    // Create symmetry operations table
    db.exec(`
      CREATE TABLE IF NOT EXISTS cif_symmetry_ops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cif_id INTEGER NOT NULL,
        operation_index INTEGER NOT NULL,
        rotation_matrix TEXT NOT NULL, -- JSON string for 3x3 matrix
        translation_vector TEXT NOT NULL, -- JSON string for 3D vector
        FOREIGN KEY (cif_id) REFERENCES cif_info(id) ON DELETE CASCADE
      )
    `);

    // Create atoms table
    db.exec(`
      CREATE TABLE IF NOT EXISTS cif_atoms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cif_id INTEGER NOT NULL,
        atom_id INTEGER NOT NULL,
        label TEXT NOT NULL,
        element_symbol TEXT NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        z REAL NOT NULL,
        occupancy REAL DEFAULT 1.0,
        u_iso_or_equiv REAL,
        adp_type TEXT DEFAULT 'Uiso', -- Uiso, Uani, etc.
        FOREIGN KEY (cif_id) REFERENCES cif_info(id) ON DELETE CASCADE
      )
    `);

    // Create elements summary table
    db.exec(`
      CREATE TABLE IF NOT EXISTS cif_elements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cif_id INTEGER NOT NULL,
        element_symbol TEXT NOT NULL,
        count INTEGER NOT NULL,
        atomic_weight REAL,
        FOREIGN KEY (cif_id) REFERENCES cif_info(id) ON DELETE CASCADE
      )
    `);

    // Create bonds table
    db.exec(`
      CREATE TABLE IF NOT EXISTS cif_bonds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cif_id INTEGER NOT NULL,
        atom1_id INTEGER NOT NULL,
        atom2_id INTEGER NOT NULL,
        bond_length REAL NOT NULL,
        bond_order INTEGER DEFAULT 1,
        FOREIGN KEY (cif_id) REFERENCES cif_info(id) ON DELETE CASCADE,
        FOREIGN KEY (atom1_id) REFERENCES cif_atoms(id) ON DELETE CASCADE,
        FOREIGN KEY (atom2_id) REFERENCES cif_atoms(id) ON DELETE CASCADE
      )
    `);

    // Create additional metadata table
    db.exec(`
      CREATE TABLE IF NOT EXISTS cif_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cif_id INTEGER NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        data_type TEXT DEFAULT 'string', -- string, number, boolean, array
        FOREIGN KEY (cif_id) REFERENCES cif_info(id) ON DELETE CASCADE
      )
    `);
  }

  private static createIndexes(db: Database.Database): void {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
      CREATE INDEX IF NOT EXISTS idx_analysis_records_project_id ON analysis_records(project_id);
      CREATE INDEX IF NOT EXISTS idx_analysis_records_type ON analysis_records(analysis_type);
      CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
      -- CIF info table indexes
      CREATE INDEX IF NOT EXISTS idx_cif_info_file_name ON cif_info(file_name);
      CREATE INDEX IF NOT EXISTS idx_cif_info_parse_status ON cif_info(parse_status);
      CREATE INDEX IF NOT EXISTS idx_cif_info_created_at ON cif_info(created_at);

      -- CIF atoms table indexes
      CREATE INDEX IF NOT EXISTS idx_cif_atoms_cif_id ON cif_atoms(cif_id);
      CREATE INDEX IF NOT EXISTS idx_cif_atoms_element ON cif_atoms(element_symbol);
      CREATE INDEX IF NOT EXISTS idx_cif_atoms_label ON cif_atoms(label);

      -- CIF elements table indexes
      CREATE INDEX IF NOT EXISTS idx_cif_elements_cif_id ON cif_elements(cif_id);
      CREATE INDEX IF NOT EXISTS idx_cif_elements_symbol ON cif_elements(element_symbol);

      -- CIF lattice table indexes
      CREATE INDEX IF NOT EXISTS idx_cif_lattice_cif_id ON cif_lattice(cif_id);
      CREATE INDEX IF NOT EXISTS idx_cif_lattice_space_group ON cif_lattice(space_group);

      -- CIF symmetry operations table indexes
      CREATE INDEX IF NOT EXISTS idx_cif_symmetry_ops_cif_id ON cif_symmetry_ops(cif_id);

      -- CIF bonds table indexes
      CREATE INDEX IF NOT EXISTS idx_cif_bonds_cif_id ON cif_bonds(cif_id);
      CREATE INDEX IF NOT EXISTS idx_cif_bonds_atom1 ON cif_bonds(atom1_id);
      CREATE INDEX IF NOT EXISTS idx_cif_bonds_atom2 ON cif_bonds(atom2_id);

      -- CIF metadata table indexes
      CREATE INDEX IF NOT EXISTS idx_cif_metadata_cif_id ON cif_metadata(cif_id);
      CREATE INDEX IF NOT EXISTS idx_cif_metadata_key ON cif_metadata(key);

      -- Composite indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_cif_atoms_cif_element ON cif_atoms(cif_id, element_symbol);
      CREATE INDEX IF NOT EXISTS idx_cif_elements_cif_symbol ON cif_elements(cif_id, element_symbol);
      CREATE INDEX IF NOT EXISTS idx_cif_metadata_cif_key ON cif_metadata(cif_id, key);
    `);
  }

  private static insertDefaultSettings(db: Database.Database): void {
    const insertSetting = db.prepare(`
      INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
    `);

    const transaction = db.transaction(() => {
      for (const setting of DEFAULT_SETTINGS) {
        insertSetting.run(setting.key, setting.value);
      }
    });

    transaction();
  }
}
