export interface ProjectRecord {
  id?: number
  name: string
  description?: string
  cif_file_path?: string
  tif_file_path?: string
  created_at: string
  updated_at: string
  metadata?: string // JSON string for additional metadata
}

export interface AnalysisRecord {
  id?: number
  project_id: number
  analysis_type: 'cif' | 'tif' | 'component'
  analysis_data: string // JSON string
  created_at: string
  notes?: string
}

export interface SettingsRecord {
  id?: number
  key: string
  value: string
  updated_at: string
}

export interface CifRecord {
  id?: number
  file_name: string
  file_path: string
  parsed_atoms: string // JSON string of atoms array
  parsed_lattice: string // JSON string of lattice parameters
  space_group?: string
  parse_status: 'success' | 'failed' | 'partial'
  parse_error?: string
  created_at: string
  updated_at: string
}

export interface DatabaseStats {
  projectsCount: number
  analysisRecordsCount: number
  databaseSize: number
}

export type AnalysisType = 'cif' | 'tif' | 'component'
export type ParseStatus = 'success' | 'failed' | 'partial'

export interface CreateProjectData {
  name: string
  description?: string
  cif_file_path?: string
  tif_file_path?: string
  metadata?: string
}

export interface CreateAnalysisData {
  project_id: number
  analysis_type: AnalysisType
  analysis_data: string
  notes?: string
}

export interface CreateCifData {
  file_name: string
  file_path: string
  parsed_atoms: string
  parsed_lattice: string
  space_group?: string
  parse_status: ParseStatus
  parse_error?: string
}