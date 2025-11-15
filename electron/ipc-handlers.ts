import { ipcMain, dialog, app } from 'electron'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

export function setupIpcHandlers(): void {
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
}