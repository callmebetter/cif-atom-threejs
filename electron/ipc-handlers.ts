import { ipcMain, dialog, app } from 'electron'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { getDatabaseManager } from '@backend/database'

export function setupIpcHandlers(): void {
  // Initialize database
  const db = getDatabaseManager()
  
  try {
    db.connect()
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }

  // File selection handler
  ipcMain.handle('select-file', async (_, options) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: options.properties || ['openFile'],
        filters: options.filters || [
          { name: 'Supported Files', extensions: ['cif', 'tif', 'tiff', 'zip'] },
          { name: 'CIF Files', extensions: ['cif'] },
          { name: 'TIF Files', extensions: ['tif', 'tiff'] },
          { name: 'ZIP Files', extensions: ['zip'] }
        ]
      })

      return {
        success: !result.canceled,
        files: result.canceled ? undefined : result.filePaths,
        error: result.canceled ? 'User cancelled selection' : undefined
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  })

  // File reading handler
  ipcMain.handle('read-file', async (_, filePath: string) => {
    try {
      const data = await readFile(filePath)
      return { success: true, data: data.buffer }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // File saving handler
  ipcMain.handle('save-file', async (_, fileName: string, data: ArrayBuffer) => {
    try {
      const appDataPath = app.getPath('userData')
      const dataDir = join(appDataPath, 'data')
      const filePath = join(dataDir, fileName)
      
      if (!existsSync(dataDir)) {
        await mkdir(dataDir, { recursive: true })
      }
      
      await writeFile(filePath, new Uint8Array(data))
      return { success: true, filePath }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // App data initialization handler
  ipcMain.handle('init-app-data', async () => {
    try {
      const appDataPath = app.getPath('userData')
      const dataDir = join(appDataPath, 'data')
      const uploadsDir = join(dataDir, 'uploads')
      const processedDir = join(dataDir, 'processed')
      const databaseDir = join(dataDir, 'database')

      const directories = [dataDir, uploadsDir, processedDir, databaseDir]
      
      for (const dir of directories) {
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true })
        }
      }
      
      return { 
        success: true, 
        paths: { 
          appData: appDataPath,
          uploads: uploadsDir, 
          processed: processedDir,
          database: databaseDir
        } 
      }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Platform info handler
  ipcMain.handle('get-platform-info', async () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      electronVersion: process.versions.electron
    }
  })

  // Database handlers
  
  // Project handlers
  ipcMain.handle('db:create-project', async (_, project) => {
    try {
      const projectId = db.createProject(project)
      return { success: true, projectId }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('db:get-project', async (_, id: number) => {
    try {
      const project = db.getProject(id)
      return { success: true, project }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('db:get-all-projects', async () => {
    try {
      const projects = db.getAllProjects()
      return { success: true, projects }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('db:update-project', async (_, id: number, updates) => {
    try {
      const success = db.updateProject(id, updates)
      return { success }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('db:delete-project', async (_, id: number) => {
    try {
      const success = db.deleteProject(id)
      return { success }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Analysis record handlers
  ipcMain.handle('db:create-analysis-record', async (_, analysis) => {
    try {
      const recordId = db.createAnalysisRecord(analysis)
      return { success: true, recordId }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('db:get-analysis-records', async (_, projectId: number, analysisType?: number) => {
    try {
      const records = db.getAnalysisRecords(projectId, analysisType)
      return { success: true, records }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('db:delete-analysis-record', async (_, id: number) => {
    try {
      const success = db.deleteAnalysisRecord(id)
      return { success }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Settings handlers
  ipcMain.handle('db:get-setting', async (_, key: string) => {
    try {
      const value = db.getSetting(key)
      return { success: true, value }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('db:set-setting', async (_, key: string, value: string) => {
    try {
      db.setSetting(key, value)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('db:get-all-settings', async () => {
    try {
      const settings = db.getAllSettings()
      return { success: true, settings }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Database maintenance handlers
  ipcMain.handle('db:get-stats', async () => {
    try {
      const stats = db.getDatabaseStats()
      return { success: true, stats }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('db:backup', async (_, backupPath: string) => {
    try {
      db.backup(backupPath)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('db:vacuum', async () => {
    try {
      db.vacuum()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Cleanup on app quit
  app.on('before-quit', () => {
    try {
      db.disconnect()
    } catch (error) {
      console.error('Error disconnecting database:', error)
    }
  })
}