const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openSystem: (url) => ipcRenderer.invoke('system-open', url),
  sendHudUpdate: (data) => ipcRenderer.send('hud-update', data),
  onHudUpdate: (callback) => ipcRenderer.on('hud-update-event', callback)
});
