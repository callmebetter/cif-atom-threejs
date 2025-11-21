import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setupIpcHandlers } from './ipc-handlers.js'
import assert from 'node:assert'
import fs from 'node:fs'
import { net } from 'electron'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

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
console.log('===> process.env.DIST ', process.env.DIST);

assert(fs.existsSync(process.env.DIST), 'Renderer process directory not found')
assert(fs.existsSync(join(__dirname, '../preload', 'index.js')), 'Preload script not found')

let win: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: process.env.VITE_PUBLIC ? join(process.env.VITE_PUBLIC, 'electron-vite.svg') : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload', 'index.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true
  })

  // Load the app
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  const devUrl = `http://localhost:5173`
  if (isDev) {
    // Use dynamic port from environment variable or default to 3000
    
    console.log('===> process.env.ELECTRON_RENDERER_URL ', process.env.ELECTRON_RENDERER_URL);
    
    // Check if the development server is available before loading
    if (process.env.ELECTRON_RENDERER_URL) {
      net.request({
        url: process.env.ELECTRON_RENDERER_URL,
        method: 'HEAD'
      }).on('response', () => {
        win.loadURL(process.env.ELECTRON_RENDERER_URL)
      }).on('error', (error) => {
        console.error('Failed to connect to development server:', error)
        // Fallback to local URL
        win.loadURL(devUrl)
      }).end()
    } else {
      win.loadURL(devUrl)
    }
    
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