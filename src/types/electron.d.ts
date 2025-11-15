// Database interfaces
export interface ProjectRecord {
  id: number
  name: string
  description?: string
  cif_file_path: string
  tif_file_path?: string
  created_at: string
  updated_at: string
}

export interface AnalysisRecord {
  id: number
  project_id: number
  analysis_type: string
  parameters: string
  result_path?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  error_message?: string
  created_at: string
  completed_at?: string
}

export interface SettingsRecord {
  key: string
  value: string
  updated_at: string
}

export interface DatabaseStats {
  totalProjects: number
  totalAnalyses: number
  pendingAnalyses: number
  completedAnalyses: number
  failedAnalyses: number
  databaseSize: number
}

export interface ElectronAPI {
  // File operations
  selectFile(options: {
    filters?: Array<{ name: string; extensions: string[] }>
    properties?: string[]
  }): Promise<{
    success: boolean
    files?: string[]
    error?: string
  }>

  readFile(filePath: string): Promise<{
    success: boolean
    data?: ArrayBuffer
    error?: string
  }>

  saveFile(fileName: string, data: ArrayBuffer): Promise<{
    success: boolean
    filePath?: string
    error?: string
  }>

  // App data management
  initAppData(): Promise<{
    success: boolean
    paths?: {
      appData: string
      uploads: string
      processed: string
      database: string
    }
    error?: string
  }>

  // Python integration (if needed in future)
  runPythonScript?(scriptPath: string, args?: string[]): Promise<{
    success: boolean
    output?: string
    error?: string
  }>

  // System info
  getPlatformInfo(): Promise<{
    platform: string
    arch: string
    version: string
  }>

  // Database operations
  database: {
    // Project operations
    createProject(project: Omit<ProjectRecord, 'id' | 'created_at' | 'updated_at'>): Promise<{
      success: boolean
      project?: ProjectRecord
      error?: string
    }>
    getProject(id: number): Promise<{
      success: boolean
      project?: ProjectRecord
      error?: string
    }>
    getAllProjects(): Promise<{
      success: boolean
      projects?: ProjectRecord[]
      error?: string
    }>
    updateProject(id: number, updates: Partial<ProjectRecord>): Promise<{
      success: boolean
      project?: ProjectRecord
      error?: string
    }>
    deleteProject(id: number): Promise<{
      success: boolean
      error?: string
    }>

    // Analysis record operations
    createAnalysisRecord(analysis: Omit<AnalysisRecord, 'id' | 'created_at' | 'completed_at'>): Promise<{
      success: boolean
      analysis?: AnalysisRecord
      error?: string
    }>
    getAnalysisRecords(projectId?: number, analysisType?: string): Promise<{
      success: boolean
      records?: AnalysisRecord[]
      error?: string
    }>
    deleteAnalysisRecord(id: number): Promise<{
      success: boolean
      error?: string
    }>

    // Settings operations
    getSetting(key: string): Promise<{
      success: boolean
      value?: string
      error?: string
    }>
    setSetting(key: string, value: string): Promise<{
      success: boolean
      setting?: SettingsRecord
      error?: string
    }>
    getAllSettings(): Promise<{
      success: boolean
      settings?: SettingsRecord[]
      error?: string
    }>

    // Database maintenance
    getStats(): Promise<{
      success: boolean
      stats?: DatabaseStats
      error?: string
    }>
    backup(backupPath: string): Promise<{
      success: boolean
      error?: string
    }>
    vacuum(): Promise<{
      success: boolean
      error?: string
    }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}