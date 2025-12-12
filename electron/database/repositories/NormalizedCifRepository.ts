import Database from "better-sqlite3";
import { BaseRepository } from "./BaseRepository";
import {
  CifInfo,
  CifLattice,
  CifAtom,
  CifElement,
  CifBond,
  CifSymmetryOp,
  CifMetadata,
  CifInsertData,
  CifWithDetails,
  CifQueryOptions,
  CompleteCifData,
  ParseStatus,
} from "../types";

export class NormalizedCifRepository extends BaseRepository {
  // Create a complete CIF record with all related data
  public createCompleteCifRecord(data: CifInsertData): number {
    this.ensureConnected();

    const transaction = this.db.transaction(() => {
      // Insert CIF info
      const cifInfoStmt = this.db.prepare(`
        INSERT INTO cif_info (
          file_name, file_path, file_size, checksum, parse_status, parse_error
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      const infoResult = cifInfoStmt.run(
        data.info.file_name,
        data.info.file_path,
        data.info.file_size || null,
        data.info.checksum || null,
        data.info.parse_status,
        data.info.parse_error || null,
      );

      const cifId = infoResult.lastInsertRowid as number;

      // Insert lattice if provided
      if (data.lattice) {
        const latticeStmt = this.db.prepare(`
          INSERT INTO cif_lattice (
            cif_id, a, b, c, alpha, beta, gamma, cell_volume,
            space_group, space_group_number, crystal_system
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        latticeStmt.run(
          cifId,
          data.lattice.a,
          data.lattice.b,
          data.lattice.c,
          data.lattice.alpha,
          data.lattice.beta,
          data.lattice.gamma,
          data.lattice.cell_volume || null,
          data.lattice.space_group || null,
          data.lattice.space_group_number || null,
          data.lattice.crystal_system || null,
        );
      }

      // Insert atoms if provided
      if (data.atoms && data.atoms.length > 0) {
        const atomStmt = this.db.prepare(`
          INSERT INTO cif_atoms (
            cif_id, atom_id, label, element_symbol, x, y, z,
            occupancy, u_iso_or_equiv, adp_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const atom of data.atoms) {
          atomStmt.run(
            cifId,
            atom.atom_id,
            atom.label,
            atom.element_symbol,
            atom.x,
            atom.y,
            atom.z,
            atom.occupancy || 1.0,
            atom.u_iso_or_equiv || null,
            atom.adp_type || "Uiso",
          );
        }

        // Calculate and insert elements summary
        this.updateElementsSummary(cifId);
      }

      // Insert symmetry operations if provided
      if (data.symmetry_ops && data.symmetry_ops.length > 0) {
        const symOpStmt = this.db.prepare(`
          INSERT INTO cif_symmetry_ops (
            cif_id, operation_index, rotation_matrix, translation_vector
          ) VALUES (?, ?, ?, ?)
        `);

        for (const op of data.symmetry_ops) {
          symOpStmt.run(
            cifId,
            op.operation_index,
            JSON.stringify(op.rotation_matrix),
            JSON.stringify(op.translation_vector),
          );
        }
      }

      // Insert bonds if provided
      if (data.bonds && data.bonds.length > 0) {
        const bondStmt = this.db.prepare(`
          INSERT INTO cif_bonds (
            cif_id, atom1_id, atom2_id, bond_length, bond_order
          ) VALUES (?, ?, ?, ?, ?)
        `);

        for (const bond of data.bonds) {
          bondStmt.run(
            cifId,
            bond.atom1_id,
            bond.atom2_id,
            bond.bond_length,
            bond.bond_order || 1,
          );
        }
      }

      // Insert metadata if provided
      if (data.metadata && data.metadata.length > 0) {
        const metadataStmt = this.db.prepare(`
          INSERT INTO cif_metadata (
            cif_id, key, value, data_type
          ) VALUES (?, ?, ?, ?)
        `);

        for (const meta of data.metadata) {
          metadataStmt.run(
            cifId,
            meta.key,
            meta.value,
            meta.data_type || "string",
          );
        }
      }

      return cifId;
    });

    return transaction();
  }

  // Get CIF info by ID
  public getCifInfo(id: number): CifInfo | null {
    this.ensureConnected();

    const stmt = this.db.prepare(`
      SELECT * FROM cif_info WHERE id = ?
    `);

    return (stmt.get(id) as CifInfo) || null;
  }

  // Get complete CIF data with all related information
  public getCompleteCifData(id: number): CompleteCifData | null {
    this.ensureConnected();

    const info = this.getCifInfo(id);
    if (!info) return null;

    // Get lattice data
    const lattice =
      (this.db
        .prepare(
          `
      SELECT * FROM cif_lattice WHERE cif_id = ?
    `,
        )
        .get(id) as CifLattice) || undefined;

    // Get atoms
    const atoms = this.db
      .prepare(
        `
      SELECT * FROM cif_atoms WHERE cif_id = ? ORDER BY atom_id
    `,
      )
      .all(id) as CifAtom[];

    // Get elements summary
    const elements = this.db
      .prepare(
        `
      SELECT * FROM cif_elements WHERE cif_id = ? ORDER BY element_symbol
    `,
      )
      .all(id) as CifElement[];

    // Get symmetry operations
    const symmetry_ops = this.db
      .prepare(
        `
      SELECT * FROM cif_symmetry_ops WHERE cif_id = ? ORDER BY operation_index
    `,
      )
      .all(id) as CifSymmetryOp[];

    // Convert JSON strings back to arrays/objects
    symmetry_ops.forEach((op) => {
      op.rotation_matrix = JSON.parse(op.rotation_matrix as any);
      op.translation_vector = JSON.parse(op.translation_vector as any);
    });

    // Get bonds
    const bonds = this.db
      .prepare(
        `
      SELECT * FROM cif_bonds WHERE cif_id = ?
    `,
      )
      .all(id) as CifBond[];

    // Get metadata
    const metadata = this.db
      .prepare(
        `
      SELECT * FROM cif_metadata WHERE cif_id = ?
    `,
      )
      .all(id) as CifMetadata[];

    return {
      info,
      lattice,
      atoms,
      elements,
      symmetry_ops: symmetry_ops.length > 0 ? symmetry_ops : undefined,
      bonds: bonds.length > 0 ? bonds : undefined,
      metadata,
    };
  }

  // Query CIF records with options
  public queryCifRecords(options: CifQueryOptions = {}): CifWithDetails[] {
    this.ensureConnected();

    let query = `
      SELECT
        ci.*,
        cl.a, cl.b, cl.c, cl.alpha, cl.beta, cl.gamma,
        cl.space_group, cl.crystal_system,
        COUNT(DISTINCT ca.id) as atom_count,
        COUNT(DISTINCT ce.id) as element_count,
        COUNT(DISTINCT cb.id) as bond_count,
        COUNT(DISTINCT cso.id) > 0 as has_symmetry_ops
      FROM cif_info ci
      LEFT JOIN cif_lattice cl ON ci.id = cl.cif_id
      LEFT JOIN cif_atoms ca ON ci.id = ca.cif_id
      LEFT JOIN cif_elements ce ON ci.id = ce.cif_id
      LEFT JOIN cif_bonds cb ON ci.id = cb.cif_id
      LEFT JOIN cif_symmetry_ops cso ON ci.id = cso.cif_id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    // Filter by status
    if (options.filterStatus && options.filterStatus.length > 0) {
      conditions.push(
        `ci.parse_status IN (${options.filterStatus.map(() => "?").join(",")})`,
      );
      params.push(...options.filterStatus);
    }

    // Filter by elements
    if (options.elementFilter && options.elementFilter.length > 0) {
      query += `
        INNER JOIN cif_elements ce_filter ON ci.id = ce_filter.cif_id
        WHERE ce_filter.element_symbol IN (${options.elementFilter.map(() => "?").join(",")})
      `;
      params.push(...options.elementFilter);
    }

    // Add conditions
    if (conditions.length > 0) {
      query +=
        conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";
    }

    query += " GROUP BY ci.id";

    // Sorting
    const sortField = options.sortBy || "created_at";
    const sortOrder = options.sortOrder || "DESC";
    query += ` ORDER BY ci.${sortField} ${sortOrder}`;

    // Pagination
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
      if (options.offset) {
        query += ` OFFSET ${options.offset}`;
      }
    }

    const results = this.db.prepare(query).all(...params) as any[];

    // Transform results
    return results.map((row) => ({
      info: {
        id: row.id,
        file_name: row.file_name,
        file_path: row.file_path,
        file_size: row.file_size,
        checksum: row.checksum,
        parse_status: row.parse_status,
        parse_error: row.parse_error,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      lattice: row.a
        ? {
            a: row.a,
            b: row.b,
            c: row.c,
            alpha: row.alpha,
            beta: row.beta,
            gamma: row.gamma,
            space_group: row.space_group,
            crystal_system: row.crystal_system,
          }
        : undefined,
      atom_count: row.atom_count,
      element_count: row.element_count,
      bond_count: row.bond_count || 0,
      has_symmetry_ops: Boolean(row.has_symmetry_ops),
    }));
  }

  // Get CIF record by filename
  public getCifByFileName(fileName: string): CifWithDetails | null {
    const results = this.queryCifRecords({
      limit: 1,
      filterByFilename: fileName,
    });
    return results.length > 0 ? results[0] : null;
  }

  // Update CIF info
  public updateCifInfo(id: number, updates: Partial<CifInfo>): boolean {
    const { query, values } = this.buildUpdateQuery(
      { ...updates, id },
      "cif_info",
    );

    if (!query) return false;

    return this.runUpdate(query, values);
  }

  // Delete CIF record and all related data
  public deleteCifRecord(id: number): boolean {
    this.ensureConnected();

    const stmt = this.db.prepare(`
      DELETE FROM cif_info WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Get CIF records count by status
  public getCifCountByStatus(status?: ParseStatus): number {
    this.ensureConnected();

    if (status) {
      const result = this.db
        .prepare(
          `
        SELECT COUNT(*) as count FROM cif_info WHERE parse_status = ?
      `,
        )
        .get(status) as { count: number };
      return result.count;
    } else {
      const result = this.db
        .prepare(
          `
        SELECT COUNT(*) as count FROM cif_info
      `,
        )
        .get() as { count: number };
      return result.count;
    }
  }

  // Helper method to update elements summary
  private updateElementsSummary(cifId: number): void {
    // Clear existing elements
    this.db.prepare("DELETE FROM cif_elements WHERE cif_id = ?").run(cifId);

    // Calculate element counts from atoms
    const elements = this.db
      .prepare(
        `
      SELECT element_symbol, COUNT(*) as count
      FROM cif_atoms
      WHERE cif_id = ?
      GROUP BY element_symbol
      ORDER BY element_symbol
    `,
      )
      .all(cifId) as { element_symbol: string; count: number }[];

    // Insert new element counts
    const insertStmt = this.db.prepare(`
      INSERT INTO cif_elements (cif_id, element_symbol, count)
      VALUES (?, ?, ?)
    `);

    for (const element of elements) {
      insertStmt.run(cifId, element.element_symbol, element.count);
    }
  }

  // Utility method to get all unique elements in the database
  public getAllUniqueElements(): string[] {
    this.ensureConnected();

    const result = this.db
      .prepare(
        `
      SELECT DISTINCT element_symbol FROM cif_elements ORDER BY element_symbol
    `,
      )
      .all() as { element_symbol: string }[];

    return result.map((r) => r.element_symbol);
  }

  // Query CIF records with pagination and filtering
  public queryCifRecordsPaginated(
    options: CifQueryOptions & { search?: string } = {},
  ): { results: CifWithDetails[]; total: number } {
    this.ensureConnected();

    // Build WHERE conditions for both count and data queries
    const conditions: string[] = [];
    const params: any[] = [];

    // Filter by status
    if (options.filterStatus && options.filterStatus.length > 0) {
      conditions.push(
        `ci.parse_status IN (${options.filterStatus.map(() => "?").join(",")})`,
      );
      params.push(...options.filterStatus);
    }

    // Filter by filename
    if (options.search) {
      conditions.push(`ci.file_name LIKE ?`);
      params.push(`%${options.search}%`);
    }

    // Build WHERE clause
    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT ci.id) as total
      FROM cif_info ci
    `;

    // Add element filter if needed
    if (options.elementFilter && options.elementFilter.length > 0) {
      countQuery += `
        INNER JOIN cif_elements ce_filter ON ci.id = ce_filter.cif_id
      `;
      if (whereClause) {
        countQuery += ` AND ce_filter.element_symbol IN (${options.elementFilter.map(() => "?").join(",")})`;
        params.push(...options.elementFilter);
      } else {
        countQuery += ` WHERE ce_filter.element_symbol IN (${options.elementFilter.map(() => "?").join(",")})`;
        params.push(...options.elementFilter);
      }
    }

    countQuery += whereClause;
    const countResult = this.db.prepare(countQuery).get(...params) as {
      total: number;
    };
    const total = countResult.total;

    // Build data query
    let query = `
      SELECT
        ci.*,
        cl.a, cl.b, cl.c, cl.alpha, cl.beta, cl.gamma,
        cl.space_group, cl.crystal_system,
        cl.cell_volume,
        COUNT(DISTINCT ca.id) as atom_count,
        COUNT(DISTINCT ce.id) as element_count,
        COUNT(DISTINCT cb.id) as bond_count,
        COUNT(DISTINCT cso.id) > 0 as has_symmetry_ops
      FROM cif_info ci
      LEFT JOIN cif_lattice cl ON ci.id = cl.cif_id
      LEFT JOIN cif_atoms ca ON ci.id = ca.cif_id
      LEFT JOIN cif_elements ce ON ci.id = ce.cif_id
      LEFT JOIN cif_bonds cb ON ci.id = cb.cif_id
      LEFT JOIN cif_symmetry_ops cso ON ci.id = cso.cif_id
    `;

    // Add element filter for data query
    const dataParams: any[] = [];
    if (options.elementFilter && options.elementFilter.length > 0) {
      query += `
        INNER JOIN (
          SELECT cif_id FROM cif_elements
          WHERE element_symbol IN (${options.elementFilter.map(() => "?").join(",")})
          GROUP BY cif_id
          HAVING COUNT(DISTINCT element_symbol) = ?
        ) ce_match ON ci.id = ce_match.cif_id
      `;
      dataParams.push(...options.elementFilter, options.elementFilter.length);
    }

    // Add other conditions
    if (conditions.length > 0) {
      const dataConditions = conditions.map((c) => {
        // Replace parameters with placeholders
        return c.replace(/\?/g, () => "?");
      });
      query += ` WHERE ${dataConditions.join(" AND ")}`;
      dataParams.push(...params);
    }

    query += " GROUP BY ci.id";

    // Sorting
    const sortField = options.sortBy || "created_at";
    const sortOrder = options.sortOrder || "DESC";
    query += ` ORDER BY ci.${sortField} ${sortOrder}`;

    // Pagination
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
      if (options.offset) {
        query += ` OFFSET ${options.offset}`;
      }
    }

    const results = this.db.prepare(query).all(...dataParams) as any[];

    // Transform results
    const transformedResults = results.map((row) => {
      // Parse elements and get element details
      const elements = [];
      if (row.element_count > 0) {
        // Get detailed element information
        const elementDetails = this.db
          .prepare(
            `
          SELECT element_symbol, count
          FROM cif_elements
          WHERE cif_id = ?
          ORDER BY element_symbol
        `,
          )
          .all(row.id) as { element_symbol: string; count: number }[];

        elements.push(...elementDetails);
      }

      return {
        info: {
          id: row.id,
          file_name: row.file_name,
          file_path: row.file_path,
          file_size: row.file_size,
          checksum: row.checksum,
          parse_status: row.parse_status,
          parse_error: row.parse_error,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
        lattice: row.a
          ? {
              a: row.a,
              b: row.b,
              c: row.c,
              alpha: row.alpha,
              beta: row.beta,
              gamma: row.gamma,
              space_group: row.space_group,
              crystal_system: row.crystal_system,
              cell_volume: row.cell_volume,
            }
          : undefined,
        elements,
        atom_count: row.atom_count,
        element_count: row.element_count,
        bond_count: row.bond_count || 0,
        has_symmetry_ops: Boolean(row.has_symmetry_ops),
      };
    });

    return {
      results: transformedResults,
      total,
    };
  }

  // Method to find similar structures based on composition
  public findSimilarByComposition(
    elementSymbols: string[],
    limit: number = 10,
  ): CifWithDetails[] {
    this.ensureConnected();

    const placeholders = elementSymbols.map(() => "?").join(",");

    const query = `
      SELECT
        ci.*,
        COUNT(DISTINCT ce.element_symbol) as match_count,
        COUNT(DISTINCT ca.id) as atom_count
      FROM cif_info ci
      INNER JOIN cif_elements ce ON ci.id = ce.cif_id
      LEFT JOIN cif_atoms ca ON ci.id = ca.cif_id
      WHERE ce.element_symbol IN (${placeholders})
      AND ci.parse_status = 'success'
      GROUP BY ci.id
      HAVING match_count = ?
      ORDER BY ci.created_at DESC
      LIMIT ?
    `;

    const results = this.db
      .prepare(query)
      .all(...elementSymbols, elementSymbols.length, limit) as any[];

    // Convert to CifWithDetails format
    return results.map((row) => ({
      info: {
        id: row.id,
        file_name: row.file_name,
        file_path: row.file_path,
        file_size: row.file_size,
        checksum: row.checksum,
        parse_status: row.parse_status,
        parse_error: row.parse_error,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      atom_count: row.atom_count,
      element_count: row.match_count,
      has_symmetry_ops: false, // Would need additional query
    }));
  }
}
