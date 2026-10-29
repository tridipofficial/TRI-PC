const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openSystem: (url) => ipcRenderer.invoke('system-open', url)
});
