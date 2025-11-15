import { defineStore } from 'pinia'
import { ref } from 'vue'

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
  const isLoading = ref(false)

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

  return {
    // State
    statusText,
    fileCount,
    appDataPaths,
    loadedFiles,
    currentFile,
    isLoading,
    
    // Actions
    setStatus,
    setAppDataPaths,
    addFile,
    removeFile,
    setCurrentFile,
    setLoading,
    updateFileStatus,
    clearFiles
  }
})