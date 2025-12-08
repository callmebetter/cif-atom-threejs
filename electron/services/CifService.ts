import fs from "fs";
import crypto from "crypto";
import { NormalizedCifRepository } from "../database/repositories/NormalizedCifRepository";
import { CifData } from "../../src/utils/cifParserV1";
import {
  CifInsertData,
  CifInfo,
  CifLattice,
  CifAtom,
  CifElement,
  CifBond,
  CifMetadata,
  ParseStatus,
} from "../database/types";

export class CifService {
  constructor(private cifRepo: NormalizedCifRepository) {}

  /**
   * Save a CIF file to the database
   */
  async saveCifFile(filePath: string, cifContent?: string): Promise<number> {
    try {
      // Read file content if not provided
      if (!cifContent) {
        cifContent = fs.readFileSync(filePath, "utf-8");
      }

      // Parse the CIF content
      const { CifParser } = await import("../../src/utils/cifParserV1");
      const parsedData = CifParser.parse(
        cifContent,
        filePath.split(/[/\\]/).pop(),
      );

      // Convert to database format
      const insertData = this.convertToInsertData(parsedData, filePath);

      // Save to database
      return this.cifRepo.createCompleteCifRecord(insertData);
    } catch (error) {
      console.error("Error saving CIF file:", error);

      // Save with error status
      try {
        const fileInfo = fs.statSync(filePath);
        const checksum = crypto
          .createHash("md5")
          .update(fs.readFileSync(filePath))
          .digest("hex");

        const insertData: CifInsertData = {
          info: {
            file_name: filePath.split(/[/\\]/).pop() || "unknown.cif",
            file_path: filePath,
            file_size: fileInfo.size,
            checksum,
            parse_status: "failed",
            parse_error: error instanceof Error ? error.message : String(error),
          },
        };

        return this.cifRepo.createCompleteCifRecord(insertData);
      } catch (saveError) {
        console.error("Failed to save error record:", saveError);
        throw saveError;
      }
    }
  }

  /**
   * Get CIF data with all related information
   */
  async getCifData(id: number) {
    return this.cifRepo.getCompleteCifData(id);
  }

  /**
   * Query CIF records with options
   */
  async queryCifRecords(
    options: Parameters<NormalizedCifRepository["queryCifRecords"]>[0] = {},
  ) {
    return this.cifRepo.queryCifRecords(options);
  }

  /**
   * Delete a CIF record
   */
  async deleteCifRecord(id: number): Promise<boolean> {
    return this.cifRepo.deleteCifRecord(id);
  }

  /**
   * Convert parsed CIF data to database insert format
   */
  private convertToInsertData(
    parsedData: CifData,
    filePath: string,
    parseStatus: ParseStatus = "success",
    parseError?: string,
  ): CifInsertData {
    // Basic file info
    const fileInfo = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const checksum = crypto.createHash("md5").update(fileBuffer).digest("hex");

    // CIF info
    const info: Omit<CifInfo, "id" | "created_at" | "updated_at"> = {
      file_name:
        parsedData.filename ||
        filePath.split("\\").pop() ||
        filePath.split("/").pop() ||
        "unknown.cif",
      file_path: filePath,
      file_size: fileInfo.size,
      checksum,
      parse_status: parseStatus,
      parse_error: parseError,
    };

    // Lattice data
    let lattice: Omit<CifLattice, "id" | "cif_id"> | undefined;
    if (parsedData.cell_parameters) {
      lattice = {
        a: parsedData.cell_parameters.a,
        b: parsedData.cell_parameters.b,
        c: parsedData.cell_parameters.c,
        alpha: parsedData.cell_parameters.alpha,
        beta: parsedData.cell_parameters.beta,
        gamma: parsedData.cell_parameters.gamma,
        cell_volume: parsedData.cell_parameters.volume,
        space_group: parsedData.symmetry?.space_group_name_hm,
        space_group_number: undefined, // Would need additional parsing
        crystal_system: parsedData.crystal_system,
      };
    }

    // Convert atoms
    const atoms: Omit<CifAtom, "id" | "cif_id">[] = parsedData.atoms.map(
      (atom, index: number) => ({
        atom_id: index + 1,
        label: atom.label || `${atom.element}${index + 1}`,
        element_symbol: atom.element,
        x: atom.x,
        y: atom.y,
        z: atom.z,
        occupancy: atom.occupancy,
        u_iso_or_equiv: atom.thermal_factor,
        adp_type: atom.thermal_factor ? "Uiso" : undefined,
      }),
    );

    // Calculate element summary
    const elementCounts: { [key: string]: number } = {};
    atoms.forEach((atom) => {
      elementCounts[atom.element_symbol] =
        (elementCounts[atom.element_symbol] || 0) + 1;
    });

    const elements: Omit<CifElement, "id" | "cif_id">[] = Object.entries(
      elementCounts,
    ).map(([symbol, count]) => ({
      element_symbol: symbol,
      count,
      atomic_weight: this.getAtomicWeight(symbol),
    }));

    // Calculate bonds
    const bonds: Omit<CifBond, "id" | "cif_id">[] = this.calculateBonds(
      parsedData.atoms,
      parsedData.cell_parameters,
    );

    // Metadata
    const metadata: Omit<CifMetadata, "id" | "cif_id">[] = [];

    if (parsedData.title) {
      metadata.push({
        key: "title",
        value: parsedData.title,
        data_type: "string",
      });
    }

    if (parsedData.chemical_formula_sum) {
      metadata.push({
        key: "chemical_formula_sum",
        value: parsedData.chemical_formula_sum,
        data_type: "string",
      });
    }

    if (parsedData.chemical_formula_moiety) {
      metadata.push({
        key: "chemical_formula_moiety",
        value: parsedData.chemical_formula_moiety,
        data_type: "string",
      });
    }

    if (parsedData.chemical_name) {
      metadata.push({
        key: "chemical_name",
        value: parsedData.chemical_name,
        data_type: "string",
      });
    }

    if (parsedData.symmetry?.symmetry_equiv_pos_as_xyz) {
      metadata.push({
        key: "symmetry_equiv_positions",
        value: JSON.stringify(parsedData.symmetry.symmetry_equiv_pos_as_xyz),
        data_type: "array",
      });
    }

    if (
      parsedData.metadata?.warnings &&
      parsedData.metadata.warnings.length > 0
    ) {
      metadata.push({
        key: "parse_warnings",
        value: JSON.stringify(parsedData.metadata.warnings),
        data_type: "array",
      });
    }

    return {
      info,
      lattice,
      atoms,
      elements,
      bonds: bonds.length > 0 ? bonds : undefined,
      metadata: metadata.length > 0 ? metadata : undefined,
    };
  }

  /**
   * Get atomic weight for an element
   */
  private getAtomicWeight(element: string): number {
    const weights: { [key: string]: number } = {
      H: 1.008,
      He: 4.003,
      Li: 6.941,
      Be: 9.012,
      B: 10.81,
      C: 12.011,
      N: 14.007,
      O: 15.999,
      F: 18.998,
      Ne: 20.18,
      Na: 22.99,
      Mg: 24.305,
      Al: 26.982,
      Si: 28.086,
      P: 30.974,
      S: 32.065,
      Cl: 35.453,
      Ar: 39.948,
      K: 39.098,
      Ca: 40.078,
      Sc: 44.956,
      Ti: 47.867,
      V: 50.942,
      Cr: 51.996,
      Mn: 54.938,
      Fe: 55.845,
      Co: 58.933,
      Ni: 58.693,
      Cu: 63.546,
      Zn: 65.38,
      Ga: 69.723,
      Ge: 72.64,
      As: 74.922,
      Se: 78.96,
      Br: 79.904,
      Kr: 83.798,
      Rb: 85.468,
      Sr: 87.62,
      Y: 88.906,
      Zr: 91.224,
      Nb: 92.906,
      Mo: 95.95,
      Tc: 98,
      Ru: 101.07,
      Rh: 102.91,
      Pd: 106.42,
      Ag: 107.87,
      Cd: 112.41,
      In: 114.82,
      Sn: 118.71,
      Sb: 121.76,
      Te: 127.6,
      I: 126.9,
      Xe: 131.29,
      Cs: 132.91,
      Ba: 137.33,
      La: 138.91,
      Ce: 140.12,
      Pr: 140.91,
      Nd: 144.24,
      Pm: 145,
      Sm: 150.36,
      Eu: 151.96,
      Gd: 157.25,
      Tb: 158.93,
      Dy: 162.5,
      Ho: 164.93,
      Er: 167.26,
      Tm: 168.93,
      Yb: 173.05,
      Lu: 174.97,
      Hf: 178.49,
      Ta: 180.95,
      W: 183.84,
      Re: 186.21,
      Os: 190.23,
      Ir: 192.22,
      Pt: 195.08,
      Au: 196.97,
      Hg: 200.59,
      Tl: 204.38,
      Pb: 207.2,
      Bi: 208.98,
      Po: 209,
      At: 210,
      Rn: 222,
      Fr: 223,
      Ra: 226,
      Ac: 227,
      Th: 232.04,
      Pa: 231.04,
      U: 238.03,
      Np: 237,
      Pu: 244,
      Am: 243,
      Cm: 247,
      Bk: 247,
      Cf: 251,
      Es: 252,
      Fm: 257,
      Md: 258,
      No: 259,
      Lr: 262,
      Rf: 267,
      Db: 268,
      Sg: 271,
      Bh: 270,
      Hs: 277,
      Mt: 278,
      Ds: 281,
      Rg: 282,
      Cn: 285,
      Fl: 289,
      Lv: 293,
    };
    return weights[element] || 0;
  }

  /**
   * Calculate bond distances between atoms
   */
  private calculateBonds(
    atoms: any[],
    lattice?: any,
    maxDistance: number = 2.5,
  ): Omit<CifBond, "id" | "cif_id">[] {
    const bonds: Omit<CifBond, "id" | "cif_id">[] = [];

    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const atom1 = atoms[i];
        const atom2 = atoms[j];

        // Calculate distance
        let dx = atom1.x - atom2.x;
        let dy = atom1.y - atom2.y;
        let dz = atom1.z - atom2.z;

        // Apply periodic boundary conditions if lattice is available
        if (lattice) {
          dx = dx - Math.round(dx);
          dy = dy - Math.round(dy);
          dz = dz - Math.round(dz);
        }

        // Convert to Cartesian coordinates if lattice is available
        let distance: number;
        if (lattice) {
          const cart1 = this.fractionalToCartesian(
            atom1.x,
            atom1.y,
            atom1.z,
            lattice,
          );
          const cart2 = this.fractionalToCartesian(
            atom2.x,
            atom2.y,
            atom2.z,
            lattice,
          );
          const dx_cart = cart1.x - cart2.x;
          const dy_cart = cart1.y - cart2.y;
          const dz_cart = cart1.z - cart2.z;
          distance = Math.sqrt(
            dx_cart * dx_cart + dy_cart * dy_cart + dz_cart * dz_cart,
          );
        } else {
          distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        }

        // Check if atoms are close enough to be bonded
        const maxBondDistance =
          maxDistance *
          (this.getCovalentRadius(atom1.element) +
            this.getCovalentRadius(atom2.element));

        if (distance < maxBondDistance) {
          // Determine bond order (simplified)
          let order = 1;
          if (
            atom1.element === "C" &&
            atom2.element === "C" &&
            distance < 1.35
          ) {
            order = distance < 1.2 ? 3 : 2;
          } else if (
            atom1.element === "C" &&
            atom2.element === "O" &&
            distance < 1.25
          ) {
            order = 2;
          } else if (
            atom1.element === "C" &&
            atom2.element === "N" &&
            distance < 1.3
          ) {
            order = distance < 1.15 ? 3 : 2;
          }

          bonds.push({
            atom1_id: i + 1, // Using 1-based indexing
            atom2_id: j + 1,
            bond_length: Math.round(distance * 1000) / 1000,
            bond_order: order,
          });
        }
      }
    }

    return bonds;
  }

  /**
   * Convert fractional coordinates to Cartesian
   */
  private fractionalToCartesian(
    x: number,
    y: number,
    z: number,
    lattice: any,
  ): { x: number; y: number; z: number } {
    const { a, b, c, alpha, beta, gamma } = lattice;
    const alphaRad = (alpha * Math.PI) / 180;
    const betaRad = (beta * Math.PI) / 180;
    const gammaRad = (gamma * Math.PI) / 180;

    const cos_alpha = Math.cos(alphaRad);
    const cos_beta = Math.cos(betaRad);
    const cos_gamma = Math.cos(gammaRad);
    const sin_gamma = Math.sin(gammaRad);

    const volume = Math.sqrt(
      1 -
        cos_alpha * cos_alpha -
        cos_beta * cos_beta -
        cos_gamma * cos_gamma +
        2 * cos_alpha * cos_beta * cos_gamma,
    );

    const cart_x = a * x + b * y * cos_gamma + c * z * cos_beta;
    const cart_y =
      b * y * sin_gamma +
      (c * z * (cos_alpha - cos_beta * cos_gamma)) / sin_gamma;
    const cart_z = (c * z * volume) / sin_gamma;

    return { x: cart_x, y: cart_y, z: cart_z };
  }

  /**
   * Get covalent radius for an element
   */
  private getCovalentRadius(element: string): number {
    const radii: { [key: string]: number } = {
      H: 0.31,
      He: 0.28,
      Li: 1.28,
      Be: 0.96,
      B: 0.85,
      C: 0.76,
      N: 0.71,
      O: 0.66,
      F: 0.57,
      Ne: 0.58,
      Na: 1.66,
      Mg: 1.41,
      Al: 1.21,
      Si: 1.11,
      P: 1.07,
      S: 1.05,
      Cl: 1.02,
      Ar: 1.06,
      K: 2.03,
      Ca: 1.76,
      Sc: 1.7,
      Ti: 1.6,
      V: 1.53,
      Cr: 1.39,
      Mn: 1.5,
      Fe: 1.26,
      Co: 1.25,
      Ni: 1.24,
      Cu: 1.32,
      Zn: 1.22,
      Ga: 1.22,
      Ge: 1.2,
      As: 1.19,
      Se: 1.2,
      Br: 1.2,
      Kr: 1.16,
      Rb: 2.2,
      Sr: 1.95,
      Y: 1.9,
      Zr: 1.75,
      Nb: 1.64,
      Mo: 1.54,
      Tc: 1.47,
      Ru: 1.46,
      Rh: 1.42,
      Pd: 1.39,
      Ag: 1.45,
      Cd: 1.44,
      In: 1.42,
      Sn: 1.39,
      Sb: 1.39,
      Te: 1.38,
      I: 1.39,
      Xe: 1.4,
      Cs: 2.44,
      Ba: 2.15,
      La: 1.87,
      Ce: 1.85,
      Pr: 1.82,
      Nd: 1.81,
      Pm: 1.8,
      Sm: 1.8,
      Eu: 1.99,
      Gd: 1.79,
      Tb: 1.76,
      Dy: 1.75,
      Ho: 1.74,
      Er: 1.73,
      Tm: 1.72,
      Yb: 1.94,
      Lu: 1.72,
      Hf: 1.58,
      Ta: 1.46,
      W: 1.46,
      Re: 1.46,
      Os: 1.44,
      Ir: 1.41,
      Pt: 1.36,
      Au: 1.36,
      Hg: 1.32,
      Tl: 1.45,
      Pb: 1.46,
      Bi: 1.48,
      Po: 1.4,
      At: 1.5,
      Rn: 1.5,
    };
    return radii[element] || 1.0;
  }

  /**
   * Generate a chemical structure summary
   */
  generateStructureSummary(data: CifInsertData): string {
    const parts: string[] = [];

    // Add element composition
    if (data.elements && data.elements.length > 0) {
      const formula = data.elements
        .map((e) => `${e.element_symbol}${e.count > 1 ? e.count : ""}`)
        .join("");
      parts.push(`Formula: ${formula}`);
    }

    // Add crystal system
    if (data.lattice?.crystal_system) {
      parts.push(`Crystal: ${data.lattice.crystal_system}`);
    }

    // Add space group
    if (data.lattice?.space_group) {
      parts.push(`Space Group: ${data.lattice.space_group}`);
    }

    // Add atom count
    if (data.atoms) {
      parts.push(`${data.atoms.length} atoms`);
    }

    // Add cell parameters
    if (data.lattice) {
      const { a, b, c, alpha, beta, gamma } = data.lattice;
      parts.push(
        `Cell: ${a.toFixed(2)}×${b.toFixed(2)}×${c.toFixed(2)} Å, ${alpha.toFixed(1)}°, ${beta.toFixed(1)}°, ${gamma.toFixed(1)}°`,
      );

      if (data.lattice.cell_volume) {
        parts.push(`Volume: ${data.lattice.cell_volume.toFixed(2)} Å³`);
      }
    }

    return parts.join(" | ");
  }
}
