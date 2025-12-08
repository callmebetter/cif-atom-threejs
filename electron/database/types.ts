// CIF Database Types for the Normalized Schema

// Basic project and analysis types
export interface ProjectRecord {
  id?: number;
  name: string;
  description?: string;
  cif_file_path?: string;
  tif_file_path?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: string;
}

export interface AnalysisRecord {
  id?: number;
  project_id: number;
  analysis_type: "cif" | "tif" | "component";
  analysis_data: string;
  created_at?: string;
  notes?: string;
}

export interface SettingsRecord {
  id?: number;
  key: string;
  value: string;
  updated_at?: string;
}

export interface DatabaseStats {
  projectsCount: number;
  analysisRecordsCount: number;
  databaseSize: number;
}

// Old types for backward compatibility during development
export interface CifRecord {
  id: number;
  file_name: string;
  file_path: string;
  parsed_atoms: string;
  parsed_lattice: string;
  space_group?: string;
  parse_status: ParseStatus;
  parse_error?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCifData {
  file_name: string;
  file_path: string;
  parsed_atoms: string;
  parsed_lattice: string;
  space_group?: string;
  parse_status: ParseStatus;
  parse_error?: string;
}

export type ParseStatus = "success" | "failed" | "partial";
export type AnalysisType = "cif" | "tif" | "component";

export interface CreateProjectData {
  name: string;
  description?: string;
  cif_file_path?: string;
  tif_file_path?: string;
  metadata?: string;
}

export interface CreateAnalysisData {
  project_id: number;
  analysis_type: AnalysisType;
  analysis_data: string;
  notes?: string;
}

export interface CifInfo {
  id?: number;
  file_name: string;
  file_path: string;
  file_size?: number;
  checksum?: string;
  parse_status: "success" | "failed" | "partial";
  parse_error?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CifLattice {
  id?: number;
  cif_id: number;
  a: number;
  b: number;
  c: number;
  alpha: number;
  beta: number;
  gamma: number;
  cell_volume?: number;
  space_group?: string;
  space_group_number?: number;
  crystal_system?: string;
}

export interface CifSymmetryOp {
  id?: number;
  cif_id: number;
  operation_index: number;
  rotation_matrix: number[][]; // 3x3 matrix
  translation_vector: number[]; // 3D vector [x, y, z]
}

export interface CifAtom {
  id?: number;
  cif_id: number;
  atom_id: number;
  label: string;
  element_symbol: string;
  x: number;
  y: number;
  z: number;
  occupancy?: number;
  u_iso_or_equiv?: number;
  adp_type?: "Uiso" | "Uani" | "Uij" | "Ueq";
}

export interface CifElement {
  id?: number;
  cif_id: number;
  element_symbol: string;
  count: number;
  atomic_weight?: number;
}

export interface CifBond {
  id?: number;
  cif_id: number;
  atom1_id: number;
  atom2_id: number;
  bond_length: number;
  bond_order?: number;
}

export interface CifMetadata {
  id?: number;
  cif_id: number;
  key: string;
  value: string;
  data_type: "string" | "number" | "boolean" | "array";
}

// Combined types for easier use
export interface CompleteCifData {
  info: CifInfo;
  lattice?: CifLattice;
  atoms: CifAtom[];
  elements: CifElement[];
  symmetry_ops?: CifSymmetryOp[];
  bonds?: CifBond[];
  metadata: CifMetadata[];
}

// Query result types
export interface CifWithDetails {
  info: CifInfo;
  lattice?: CifLattice;
  atom_count: number;
  element_count: number;
  bond_count?: number;
  has_symmetry_ops: boolean;
}

// Database query options
export interface CifQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: "file_name" | "created_at" | "parse_status";
  sortOrder?: "ASC" | "DESC";
  filterStatus?: ("success" | "failed" | "partial")[];
  elementFilter?: string[];
  hasElements?: boolean;
}

// Insert data structure for creating new CIF records
export interface CifInsertData {
  info: Omit<CifInfo, "id" | "created_at" | "updated_at">;
  lattice?: Omit<CifLattice, "id" | "cif_id">;
  atoms?: Omit<CifAtom, "id" | "cif_id">[];
  symmetry_ops?: Omit<CifSymmetryOp, "id" | "cif_id">[];
  bonds?: Omit<CifBond, "id" | "cif_id">[];
  metadata?: Omit<CifMetadata, "id" | "cif_id">[];
}
