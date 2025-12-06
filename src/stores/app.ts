import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ProjectRecord, AnalysisRecord, SettingsRecord, DatabaseStats } from '../types/electron'
import databaseService from '../services/databaseService'

export interface AppDataPaths {
  appData: string
  uploads: string
  processed: string
  database: string
}

export interface FileInfo {
  id: string
  name: string
  type: 'cif' | 'tif' | 'zip'
  size: number
  path: string
  uploadTime: Date
  processed?: boolean
}

export const useAppStore = defineStore('app', () => {
  // App state
  const statusText = ref('就绪')
  const fileCount = ref(0)
  const appDataPaths = ref<AppDataPaths | null>(null)
  const loadedFiles = ref<FileInfo[]>([])
  const currentFile = ref<FileInfo | null>(null)
  const currentFileContent = ref<string | ArrayBuffer | null>(null)
  const isLoading = ref(false)

  // Database state
  const projects = ref<ProjectRecord[]>([])
  const currentProject = ref<ProjectRecord | null>(null)
  const analysisRecords = ref<AnalysisRecord[]>([])
  const settings = ref<SettingsRecord[]>([])
  const databaseStats = ref<DatabaseStats | null>(null)
  const cifData = ref<unknown>(null)

  // Actions
  const setStatus = (status: string) => {
    statusText.value = status
  }

  const setAppDataPaths = (paths: AppDataPaths) => {
    appDataPaths.value = paths
  }

  const addFile = (fileInfo: FileInfo) => {
    loadedFiles.value.push(fileInfo)
    fileCount.value = loadedFiles.value.length
  }

  const removeFile = (fileId: string) => {
    const index = loadedFiles.value.findIndex(f => f.id === fileId)
    if (index > -1) {
      loadedFiles.value.splice(index, 1)
      fileCount.value = loadedFiles.value.length
      if (currentFile.value?.id === fileId) {
        currentFile.value = null
      }
    }
  }

  const setCurrentFile = (file: FileInfo | null) => {
    currentFile.value = file
  }

  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  const updateFileStatus = (fileId: string, processed: boolean) => {
    const file = loadedFiles.value.find(f => f.id === fileId)
    if (file) {
      file.processed = processed
    }
  }

  const clearFiles = () => {
    loadedFiles.value = []
    fileCount.value = 0
    currentFile.value = null
  }

  // Database actions
  const loadProjects = async () => {
    try {
      projects.value = await databaseService.getAllProjects()
    } catch (error) {
      console.error('Failed to load projects:', error)
      throw error
    }
  }

  const createProject = async (projectData: {
    name: string
    description?: string
    cif_file_path: string
    tif_file_path?: string
  }) => {
    try {
      const project = await databaseService.createProject(projectData)
      projects.value.push(project)
      return project
    } catch (error) {
      console.error('Failed to create project:', error)
      throw error
    }
  }

  const updateProject = async (id: number, updates: Partial<ProjectRecord>) => {
    try {
      const project = await databaseService.updateProject(id, updates)
      const index = projects.value.findIndex(p => p.id === id)
      if (index > -1) {
        projects.value[index] = project
      }
      if (currentProject.value?.id === id) {
        currentProject.value = project
      }
      return project
    } catch (error) {
      console.error('Failed to update project:', error)
      throw error
    }
  }

  const deleteProject = async (id: number) => {
    try {
      await databaseService.deleteProject(id)
      projects.value = projects.value.filter(p => p.id !== id)
      if (currentProject.value?.id === id) {
        currentProject.value = null
      }
    } catch (error) {
      console.error('Failed to delete project:', error)
      throw error
    }
  }

  const setCurrentProject = (project: ProjectRecord | null) => {
    currentProject.value = project
  }

  const loadAnalysisRecords = async (projectId?: number, analysisType?: string) => {
    try {
      analysisRecords.value = await databaseService.getAnalysisRecords(projectId, analysisType)
    } catch (error) {
      console.error('Failed to load analysis records:', error)
      throw error
    }
  }

  const createAnalysisRecord = async (analysisData: {
    project_id: number
    analysis_type: string
    parameters: string
    result_path?: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    error_message?: string
  }) => {
    try {
      const record = await databaseService.createAnalysisRecord(analysisData)
      analysisRecords.value.push(record)
      return record
    } catch (error) {
      console.error('Failed to create analysis record:', error)
      throw error
    }
  }

  const loadSettings = async () => {
    try {
      settings.value = await databaseService.getAllSettings()
    } catch (error) {
      console.error('Failed to load settings:', error)
      throw error
    }
  }

  const getSetting = async (key: string): Promise<string | null> => {
    try {
      return await databaseService.getSetting(key)
    } catch (error) {
      console.error('Failed to get setting:', error)
      throw error
    }
  }

  const setSetting = async (key: string, value: string) => {
    try {
      await databaseService.setSetting(key, value)
      await loadSettings() // Reload settings
    } catch (error) {
      console.error('Failed to set setting:', error)
      throw error
    }
  }

  const loadDatabaseStats = async () => {
    try {
      databaseStats.value = await databaseService.getStats()
    } catch (error) {
      console.error('Failed to load database stats:', error)
      throw error
    }
  }

  const setCifData = (data: any) => {
    cifData.value = data
  }

  const getCurrentCifData = () => {
    return cifData.value
  }

  const setCurrentFileContent = (content: string | ArrayBuffer | null) => {
    currentFileContent.value = content
  }

  const clearCurrentFileContent = () => {
    currentFileContent.value = null
  }

  return {
    // State
    statusText,
    fileCount,
    appDataPaths,
    loadedFiles,
    currentFile,
    currentFileContent,
    isLoading,
    projects,
    currentProject,
    analysisRecords,
    settings,
    databaseStats,
    cifData,
    
    // Actions
    setStatus,
    setAppDataPaths,
    addFile,
    removeFile,
    setCurrentFile,
    setLoading,
    updateFileStatus,
    clearFiles,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    loadAnalysisRecords,
    createAnalysisRecord,
    loadSettings,
    getSetting,
    setSetting,
    loadDatabaseStats,
    setCifData,
    getCurrentCifData,
    setCurrentFileContent,
    clearCurrentFileContent
  }
})