const { app, BrowserWindow, ipcMain, session, shell, screen } = require('electron');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

function execPromise(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, { shell: 'cmd.exe', timeout: 10000, ...options }, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });
  });
}

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
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false
    }
  });

  hudWindow.setAlwaysOnTop(true, 'screen-saver');
  hudWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  hudWindow.setIgnoreMouseEvents(true, { forward: true });

  hudWindow.loadFile(path.join(__dirname, 'public', 'hud-overlay.html'));

  // HUD starts completely hidden until a live voice command is detected or action occurs
  hudWindow.once('ready-to-show', () => {
    // Keep hidden by default
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
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false
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
      const fs = require('fs');
      const os = require('os');
      const isYouTube = targetUrl.includes('youtube.com');
      const desktopYtLnk = path.join(os.homedir(), 'Desktop', 'YouTube.lnk');
      const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

      // 1. YouTube PWA / Signed-In Desktop App Priority
      if (isYouTube) {
        if ((targetUrl === 'https://www.youtube.com' || targetUrl === 'https://www.youtube.com/') && fs.existsSync(desktopYtLnk)) {
          await execPromise(`start "" "${desktopYtLnk}"`);
          return { success: true, url: targetUrl, method: 'desktop_yt_pwa' };
        }
        if (fs.existsSync(chromeExe)) {
          try {
            await execPromise(`start "" "${chromeExe}" "${targetUrl}"`);
            return { success: true, url: targetUrl, method: 'chrome_profile_6' };
          } catch (eProfile) {}
        }
      }

      // 2. Archer AI method: start chrome -> start msedge -> shell.openExternal fallback
      try {
        await execPromise(`start chrome "${targetUrl}"`);
        return { success: true, url: targetUrl, method: 'chrome' };
      } catch (e1) {
        try {
          await execPromise(`start msedge "${targetUrl}"`);
          return { success: true, url: targetUrl, method: 'msedge' };
        } catch (e2) {
          await shell.openExternal(targetUrl);
          return { success: true, url: targetUrl, method: 'openExternal' };
        }
      }
    } catch (e) {
      console.error('system-open failed:', e.message);
      return { success: false, error: e.message };
    }
  }
  return { success: false, error: 'No URL provided' };
});

// Universal Native Application Launcher (Archer AI Architecture)
ipcMain.handle('desktop-open-application', async (event, { appName, appCmd }) => {
  try {
    const cmd = appCmd || appName;
    if (!cmd) return { success: false, error: 'No command specified' };
    await execPromise(cmd);
    return { success: true, command: cmd };
  } catch (err) {
    console.error('[Desktop Manager Error]:', err.message);
    return { success: false, error: err.message };
  }
});

// HUD IPC Relay: Forwards HUD events from MainWindow to Floating HUD Window
ipcMain.on('hud-update', (event, data) => {
  if (!hudWindow || hudWindow.isDestroyed()) {
    createHudWindow();
  }
  try {
    if (hudWindow && !hudWindow.isDestroyed()) {
      if (data && (data.phase === 'hide' || data.action === 'hide')) {
        hudWindow.hide();
      } else if (!hudWindow.isVisible() && data && data.phase !== 'hide') {
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
