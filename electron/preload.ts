import { contextBridge, ipcRenderer } from "electron";
import type { ElectronAPI } from "../src/types/electron.d.ts";

// Updated electronAPI with unified invoke method
const electronAPI: ElectronAPI = {
  // Dialog operations
  dialog: {
    showOpenDialog: (options) =>
      ipcRenderer.invoke("dialog:showOpenDialog", options),
  },

  // Unified invoke method
  invoke: (channel, args) => ipcRenderer.invoke(channel, args),

  // Backward compatibility methods
  selectFile: (options) => ipcRenderer.invoke("select-file", options),
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  saveFile: (fileName, data) => ipcRenderer.invoke("save-file", fileName, data),
  initAppData: () => ipcRenderer.invoke("init-app-data"),
  getPlatformInfo: () => ipcRenderer.invoke("get-platform-info"),

  // Database operations
  database: {
    // Project operations
    createProject: (project) =>
      ipcRenderer.invoke("db:create-project", project),
    getProject: (id) => ipcRenderer.invoke("db:get-project", id),
    getAllProjects: () => ipcRenderer.invoke("db:get-all-projects"),
    updateProject: (id, updates) =>
      ipcRenderer.invoke("db:update-project", id, updates),
    deleteProject: (id) => ipcRenderer.invoke("db:delete-project", id),

    // Analysis record operations
    createAnalysisRecord: (analysis) =>
      ipcRenderer.invoke("db:create-analysis-record", analysis),
    getAnalysisRecords: (projectId, analysisType) =>
      ipcRenderer.invoke("db:get-analysis-records", projectId, analysisType),
    deleteAnalysisRecord: (id) =>
      ipcRenderer.invoke("db:delete-analysis-record", id),

    // CIF record operations (old - deprecated)
    createCifRecord: (record) =>
      ipcRenderer.invoke("db:create-cif-record", record),
    getCifRecord: (id) => ipcRenderer.invoke("db:get-cif-record", id),
    getCifRecords: () => ipcRenderer.invoke("db:get-cif-records"),
    updateCifRecord: (id, updates) =>
      ipcRenderer.invoke("db:update-cif-record", id, updates),
    deleteCifRecord: (id) => ipcRenderer.invoke("db:delete-cif-record", id),

    // New CIF operations using normalized schema
    cif: {
      save: (filePath: string, cifContent?: string) =>
        ipcRenderer.invoke("cif:save", filePath, cifContent),
      getComplete: (id: number) => ipcRenderer.invoke("cif:get-complete", id),
      query: (options?: any) => ipcRenderer.invoke("cif:query", options),
      delete: (id: number) => ipcRenderer.invoke("cif:delete", id),
      getSummary: (id: number) => ipcRenderer.invoke("cif:get-summary", id),
    },

    // Settings operations
    getSetting: (key) => ipcRenderer.invoke("db:get-setting", key),
    setSetting: (key, value) =>
      ipcRenderer.invoke("db:set-setting", key, value),
    getAllSettings: () => ipcRenderer.invoke("db:get-all-settings"),

    // Database maintenance
    getStats: () => ipcRenderer.invoke("db:get-stats"),
    backup: (backupPath) => ipcRenderer.invoke("db:backup", backupPath),
    vacuum: () => ipcRenderer.invoke("db:vacuum"),
    getDatabasePath: () => ipcRenderer.invoke("db:get-database-path"),
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld("electronAPI", electronAPI);
