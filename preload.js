const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openYouTube: (url) => ipcRenderer.invoke('youtube-open', url),
  closeYouTube: () => ipcRenderer.invoke('youtube-close')
});
