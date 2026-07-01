// Preload script — runs in the renderer process with Node access.
// For now we just expose a minimal API; the game itself is pure web.

const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  platform: process.platform,
})
