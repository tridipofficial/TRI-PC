const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openSystem: (url) => ipcRenderer.invoke('system-open', url),
  openYouTube: (url) => ipcRenderer.invoke('system-open', url),
  clickYouTubeIndex: (index, url) => ipcRenderer.invoke('desktop-youtube-click-index', { index, url }),
  openApplication: (appName, appCmd) => ipcRenderer.invoke('desktop-open-application', { appName, appCmd }),
  focusHome: () => ipcRenderer.invoke('desktop-focus-home'),
  sendHudUpdate: (data) => ipcRenderer.send('hud-update', data),
  onHudUpdate: (callback) => ipcRenderer.on('hud-update-event', callback)
});
