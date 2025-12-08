import Database from 'better-sqlite3'
import { DatabaseSchema } from './schema'

export class DatabaseMigration {
  static migrateFromOldSchema(db: Database.Database): void {
    // Check if old cif_records table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='cif_records'
    `).get() as { name?: string }

    if (!tableExists?.name) {
      console.log('No old cif_records table found - skipping migration')
      return
    }

    console.log('Starting migration from old cif_records table...')

    // Start transaction for migration
    const transaction = db.transaction(() => {
      // Get all existing CIF records
      const oldRecords = db.prepare(`
        SELECT * FROM cif_records
      `).all()

      console.log(`Found ${oldRecords.length} CIF records to migrate`)

      for (const record of oldRecords) {
        try {
          this.migrateSingleRecord(db, record as any)
        } catch (error) {
          console.error(`Failed to migrate record ${record.id}:`, error)
          // Continue with next record
        }
      }

      // After successful migration, drop old table
      console.log('Dropping old cif_records table...')
      db.exec('DROP TABLE IF EXISTS cif_records')
    })

    // Execute transaction
    try {
      transaction()
      console.log('Migration completed successfully')
    } catch (error) {
      console.error('Migration failed:', error)
      throw error
    }
  }

  private static migrateSingleRecord(db: Database.Database, record: any): void {
    // Insert into cif_info table
    const cifInfoInsert = db.prepare(`
      INSERT INTO cif_info (
        file_name, file_path, parse_status, parse_error, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)

    const cifInfoResult = cifInfoInsert.run(
      record.file_name,
      record.file_path,
      record.parse_status,
      record.parse_error,
      record.created_at,
      record.updated_at
    )

    const cifId = cifInfoResult.lastInsertRowid as number

    // Try to parse and migrate lattice data
    if (record.parsed_lattice) {
      try {
        const latticeData = JSON.parse(record.parsed_lattice)
        this.insertLatticeData(db, cifId, latticeData)
      } catch (error) {
        console.warn(`Failed to parse lattice data for record ${record.id}:`, error)
      }
    }

    // Try to parse and migrate atoms data
    if (record.parsed_atoms) {
      try {
        const atomsData = JSON.parse(record.parsed_atoms)
        this.insertAtomsData(db, cifId, atomsData)
      } catch (error) {
        console.warn(`Failed to parse atoms data for record ${record.id}:`, error)
      }
    }

    // Store space group if it exists in the old record
    if (record.space_group) {
      this.insertMetadata(db, cifId, 'original_space_group', record.space_group, 'string')
    }
  }

  private static insertLatticeData(db: Database.Database, cifId: number, latticeData: any): void {
    // Insert lattice parameters
    if (latticeData.parameters) {
      const latticeInsert = db.prepare(`
        INSERT INTO cif_lattice (
          cif_id, a, b, c, alpha, beta, gamma, cell_volume, space_group, space_group_number, crystal_system
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      latticeInsert.run(
        cifId,
        latticeData.parameters.a || 0,
        latticeData.parameters.b || 0,
        latticeData.parameters.c || 0,
        latticeData.parameters.alpha || 90,
        latticeData.parameters.beta || 90,
        latticeData.parameters.gamma || 90,
        latticeData.parameters.volume || null,
        latticeData.space_group?.symbol || null,
        latticeData.space_group?.number || null,
        latticeData.crystal_system || null
      )
    }

    // Insert symmetry operations if available
    if (latticeData.symmetry_ops && Array.isArray(latticeData.symmetry_ops)) {
      const symOpInsert = db.prepare(`
        INSERT INTO cif_symmetry_ops (
          cif_id, operation_index, rotation_matrix, translation_vector
        ) VALUES (?, ?, ?, ?)
      `)

      for (const [index, op] of latticeData.symmetry_ops.entries()) {
        symOpInsert.run(
          cifId,
          index,
          JSON.stringify(op.rotation_matrix || []),
          JSON.stringify(op.translation_vector || [])
        )
      }
    }
  }

  private static insertAtomsData(db: Database.Database, cifId: number, atomsData: any): void {
    if (!atomsData.atoms || !Array.isArray(atomsData.atoms)) {
      return
    }

    const atomInsert = db.prepare(`
      INSERT INTO cif_atoms (
        cif_id, atom_id, label, element_symbol, x, y, z, occupancy, u_iso_or_equiv, adp_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    // Track elements for summary
    const elementCounts: { [key: string]: number } = {}

    // Insert atoms
    for (const atom of atomsData.atoms) {
      atomInsert.run(
        cifId,
        atom.id || 0,
        atom.label || '',
        atom.element || '',
        atom.x || 0,
        atom.y || 0,
        atom.z || 0,
        atom.occupancy || 1.0,
        atom.u_iso || atom.u_eq || null,
        atom.adp_type || 'Uiso'
      )

      // Count elements
      const element = atom.element
      if (element) {
        elementCounts[element] = (elementCounts[element] || 0) + 1
      }
    }

    // Insert elements summary
    const elementInsert = db.prepare(`
      INSERT INTO cif_elements (
        cif_id, element_symbol, count
      ) VALUES (?, ?, ?)
    `)

    for (const [symbol, count] of Object.entries(elementCounts)) {
      elementInsert.run(cifId, symbol, count)
    }

    // Insert bonds if available
    if (atomsData.bonds && Array.isArray(atomsData.bonds)) {
      const bondInsert = db.prepare(`
        INSERT INTO cif_bonds (
          cif_id, atom1_id, atom2_id, bond_length, bond_order
        ) VALUES (?, ?, ?, ?, ?)
      `)

      // Get atom IDs mapping
      const atomIdMap = new Map<number, number>()
      const atoms = db.prepare(`
        SELECT id, atom_id FROM cif_atoms WHERE cif_id = ?
      `).all(cifId) as { id: number, atom_id: number }[]

      atoms.forEach(atom => {
        atomIdMap.set(atom.atom_id, atom.id)
      })

      for (const bond of atomsData.bonds) {
        const atom1DbId = atomIdMap.get(bond.atom1_id)
        const atom2DbId = atomIdMap.get(bond.atom2_id)

        if (atom1DbId && atom2DbId) {
          bondInsert.run(
            cifId,
            atom1DbId,
            atom2DbId,
            bond.length || 0,
            bond.order || 1
          )
        }
      }
    }
  }

  private static insertMetadata(
    db: Database.Database,
    cifId: number,
    key: string,
    value: any,
    dataType: 'string' | 'number' | 'boolean' | 'array' = 'string'
  ): void {
    const metadataInsert = db.prepare(`
      INSERT INTO cif_metadata (
        cif_id, key, value, data_type
      ) VALUES (?, ?, ?, ?)
    `)

    metadataInsert.run(
      cifId,
      key,
      typeof value === 'object' ? JSON.stringify(value) : String(value),
      dataType
    )
  }
}

// Migration function to be called when updating the database
export function migrateDatabase(db: Database.Database): void {
  try {
    // Create new tables
    DatabaseSchema.initializeTables(db)

    // Migrate data from old schema
    DatabaseMigration.migrateFromOldSchema(db)

    console.log('Database migration completed successfully')
  } catch (error) {
    console.error('Database migration failed:', error)
    throw error
  }
}
