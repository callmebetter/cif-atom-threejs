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
  getPlatformInfo: () => ipcRenderer.invoke('get-platform-info')
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI)