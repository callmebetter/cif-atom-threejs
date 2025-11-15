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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}