import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { setupIpcHandlers } from './ipc-handlers'

// The built directory structure
//
// ├─┬ dist
// │ └─┬ electron
// │   └─┬ main
// │     └── index.js
// ├─┬ dist
// │ └─┬ renderer
// │   └─┬ index.html
process.env.DIST = join(__dirname, '..')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(__dirname, '..', 'public')
  : process.env.DIST

let win: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: process.env.VITE_PUBLIC ? join(process.env.VITE_PUBLIC, 'electron-vite.svg') : undefined,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true
  })

  // Load the app
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  if (isDev) {
    const devUrl = 'http://localhost:5173'
    win.loadURL(devUrl)
    win.webContents.openDevTools()
  } else {
    const distPath = process.env.DIST || join(__dirname, '..')
    win.loadFile(join(distPath, 'index.html'))
  }

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
}

// App event listeners
app.whenReady().then(() => {
  setupIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})