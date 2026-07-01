// Electron main process for AETHERIA
// Loads the built Next.js standalone server and opens it in a desktop window.

const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let mainWindow = null
let nextServer = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'AETHERIA',
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // Enable WebGL + GPU acceleration for the 3D game
      webgl: true,
      experimentalFeatures: true,
    },
  })

  // Remove the default menu bar for a cleaner game look
  Menu.setApplicationMenu(null)

  // Load the Next.js app (server started below)
  mainWindow.loadURL('http://localhost:3000')

  // Open DevTools in development
  if (process.env.ELECTRON_DEV === '1') {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    // In production, run the built standalone server
    // In dev, run next dev
    const isDev = process.env.ELECTRON_DEV === '1'
    const standaloneServer = path.join(__dirname, '..', '.next', 'standalone', 'server.js')

    if (isDev) {
      nextServer = spawn('npx', ['next', 'dev', '-p', '3000'], {
        cwd: path.join(__dirname, '..'),
        shell: true,
        stdio: 'pipe',
      })
    } else {
      // Production: run the standalone server
      nextServer = spawn('node', [standaloneServer], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
        stdio: 'pipe',
      })
    }

    nextServer.stdout.on('data', (data) => {
      const msg = data.toString()
      console.log('[next]', msg)
      if (msg.includes('Ready') || msg.includes('ready') || msg.includes('3000')) {
        resolve()
      }
    })

    nextServer.stderr.on('data', (data) => {
      console.error('[next:err]', data.toString())
    })

    nextServer.on('error', (err) => {
      console.error('Failed to start Next.js server:', err)
      reject(err)
    })

    // Give the server time to start, then resolve anyway
    setTimeout(resolve, 5000)
  })
}

app.whenReady().then(async () => {
  await startNextServer()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill()
    nextServer = null
  }
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill()
    nextServer = null
  }
})
