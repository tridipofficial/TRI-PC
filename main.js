const { app, BrowserWindow, ipcMain, session, shell, screen } = require('electron');
const path = require('path');
const http = require('http');

// Suppress Chromium speech upload pipe logs and verbose Chromium errors
app.commandLine.appendSwitch('disable-features', 'SpeechRecognition');
app.commandLine.appendSwitch('log-level', '3');

let mainWindow = null;
let hudWindow = null;

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

function createHudWindow() {
  if (hudWindow && !hudWindow.isDestroyed()) return hudWindow;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  const hudW = 440;
  const hudH = 110;
  const hudX = Math.round((screenWidth - hudW) / 2);
  const hudY = 24;

  hudWindow = new BrowserWindow({
    x: hudX,
    y: hudY,
    width: hudW,
    height: hudH,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  hudWindow.setAlwaysOnTop(true, 'screen-saver');
  hudWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  hudWindow.loadFile(path.join(__dirname, 'public', 'hud-overlay.html'));

  hudWindow.once('ready-to-show', () => {
    hudWindow.show();
  });

  hudWindow.on('closed', () => {
    hudWindow = null;
  });

  return hudWindow;
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
    if (hudWindow && !hudWindow.isDestroyed()) {
      hudWindow.close();
      hudWindow = null;
    }
  });

  // Create the floating HUD Overlay
  createHudWindow();
}

// Universal System Open Handler (Archer AI Architecture)
ipcMain.handle('system-open', async (event, targetUrl) => {
  if (targetUrl) {
    try {
      await shell.openExternal(targetUrl);
      return { success: true, url: targetUrl };
    } catch (e) {
      console.error('shell.openExternal failed:', e.message);
      return { success: false, error: e.message };
    }
  }
  return { success: false, error: 'No URL provided' };
});

// HUD IPC Relay: Forwards HUD events from MainWindow to Floating HUD Window
ipcMain.on('hud-update', (event, data) => {
  if (!hudWindow || hudWindow.isDestroyed()) {
    createHudWindow();
  }
  try {
    if (hudWindow && !hudWindow.isDestroyed()) {
      if (!hudWindow.isVisible() && data && data.phase !== 'hide') {
        hudWindow.show();
      }
      hudWindow.webContents.send('hud-update-event', data);
    }
  } catch (err) {
    console.warn('[HUD Relay Error]:', err.message);
  }
});

app.whenReady().then(() => {
  // Auto-approve media permissions (Microphone) for Neural Voice STT
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      return callback(true);
    }
    callback(true);
  });
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return true;
  });

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
