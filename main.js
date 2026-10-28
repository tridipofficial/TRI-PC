const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;
let youtubeWindow = null;

// Ensure server.js is running
function ensureServerRunning() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:3456/', (res) => {
      resolve();
    });
    req.on('error', () => {
      console.log('Starting internal server.js...');
      try {
        require('./server.js');
        setTimeout(resolve, 800);
      } catch (e) {
        console.error('Server start error:', e);
        resolve();
      }
    });
  });
}

async function createMainWindow() {
  await ensureServerRunning();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1050,
    minHeight: 720,
    title: 'TRI AI - JARVIS Holographic Command Center',
    backgroundColor: '#05070d',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL('http://127.0.0.1:3456');

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (youtubeWindow && !youtubeWindow.isDestroyed()) {
      youtubeWindow.close();
    }
  });
}

// IPC Handlers for Native Desktop YouTube Automation
ipcMain.handle('youtube-open', async (event, url) => {
  const targetUrl = url || 'https://www.youtube.com';
  if (!youtubeWindow || youtubeWindow.isDestroyed()) {
    youtubeWindow = new BrowserWindow({
      width: 1240,
      height: 780,
      title: 'YouTube',
      backgroundColor: '#0f0f0f',
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    youtubeWindow.loadURL(targetUrl);
  } else {
    youtubeWindow.loadURL(targetUrl);
    youtubeWindow.show();
    youtubeWindow.focus();
  }
  return { success: true };
});

ipcMain.handle('youtube-close', async () => {
  if (youtubeWindow && !youtubeWindow.isDestroyed()) {
    youtubeWindow.close();
    youtubeWindow = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
  }
  return { success: true };
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
