import { contextBridge, ipcRenderer } from 'electron'
import { ElectronAPI } from '../src/types/electron'

const electronAPI: ElectronAPI = {
  // File operations
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (fileName, data) => ipcRenderer.invoke('save-file', fileName, data),

  // App data management
  initAppData: () => ipcRenderer.invoke('init-app-data'),

  // System info
  getPlatformInfo: () => ipcRenderer.invoke('get-platform-info'),

  // Database operations
  database: {
    // Project operations
    createProject: (project) => ipcRenderer.invoke('db:create-project', project),
    getProject: (id) => ipcRenderer.invoke('db:get-project', id),
    getAllProjects: () => ipcRenderer.invoke('db:get-all-projects'),
    updateProject: (id, updates) => ipcRenderer.invoke('db:update-project', id, updates),
    deleteProject: (id) => ipcRenderer.invoke('db:delete-project', id),

    // Analysis record operations
    createAnalysisRecord: (analysis) => ipcRenderer.invoke('db:create-analysis-record', analysis),
    getAnalysisRecords: (projectId, analysisType) => ipcRenderer.invoke('db:get-analysis-records', projectId, analysisType),
    deleteAnalysisRecord: (id) => ipcRenderer.invoke('db:delete-analysis-record', id),

    // Settings operations
    getSetting: (key) => ipcRenderer.invoke('db:get-setting', key),
    setSetting: (key, value) => ipcRenderer.invoke('db:set-setting', key, value),
    getAllSettings: () => ipcRenderer.invoke('db:get-all-settings'),

    // Database maintenance
    getStats: () => ipcRenderer.invoke('db:get-stats'),
    backup: (backupPath) => ipcRenderer.invoke('db:backup', backupPath),
    vacuum: () => ipcRenderer.invoke('db:vacuum')
  }
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI)