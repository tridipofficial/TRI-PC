const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openSystem: (url) => ipcRenderer.invoke('system-open', url),
  openApplication: (appName, appCmd) => ipcRenderer.invoke('desktop-open-application', { appName, appCmd }),
  sendHudUpdate: (data) => ipcRenderer.send('hud-update', data),
  onHudUpdate: (callback) => ipcRenderer.on('hud-update-event', callback)
});
