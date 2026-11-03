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

// Floating HUD Window Disabled per TRIDIP Sir's instruction (clean, unobstructed workspace)
function createHudWindow() {
  return null;
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

  // Floating HUD Overlay permanently disabled per TRIDIP Sir's instruction
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

// Return to Assistant Home Screen Handler (Closes opened browser/tab & Brings TRI AI to Foreground)
ipcMain.handle('desktop-focus-home', async () => {
  try {
    let hwndVal = '0';
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const hwndBuf = mainWindow.getNativeWindowHandle();
        hwndVal = (process.arch === 'x64' ? hwndBuf.readBigInt64LE(0) : hwndBuf.readInt32LE(0)).toString();
      }
    } catch (eHwnd) {}

    const psScript = `
Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class WinSwitcher {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
    [DllImport("user32.dll")]
    public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    public const int VK_CONTROL = 0x11;
    public const int VK_W = 0x57;
    public const uint KEYEVENTF_KEYUP = 0x0002;
    public const int SW_RESTORE = 9;

    public static void CloseActiveTab() {
      keybd_event((byte)VK_CONTROL, 0, 0, 0);
      keybd_event((byte)VK_W, 0, 0, 0);
      keybd_event((byte)VK_W, 0, KEYEVENTF_KEYUP, 0);
      keybd_event((byte)VK_CONTROL, 0, KEYEVENTF_KEYUP, 0);
    }

    public static void BringToFront(long hwndVal) {
      IntPtr handle = new IntPtr(hwndVal);
      ShowWindow(handle, SW_RESTORE);
      SwitchToThisWindow(handle, true);
      SetForegroundWindow(handle);
    }
  }
"@
[WinSwitcher]::CloseActiveTab()
Start-Sleep -Milliseconds 200
Get-Process chrome, msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -match 'YouTube|Google|Search|ক্রিকেট|গান' } | ForEach-Object { $_.CloseMainWindow() }
${hwndVal !== '0' ? `[WinSwitcher]::BringToFront(${hwndVal})` : ''}
(New-Object -ComObject WScript.Shell).AppActivate('TRI AI - Iron Man / JARVIS Holographic Command Center')
`;

    try {
      await execPromise(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/"/g, '\\"')}"`);
    } catch (ePs) {
      console.warn('[desktop-focus-home powershell warn]:', ePs.message);
    }

    // Electron level restore, bring to front, and focus
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      mainWindow.focus();
      mainWindow.moveTop();
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(false);
        }
      }, 1200);
      return { success: true };
    }
    return { success: false, error: 'Main window not available' };
  } catch (err) {
    console.error('[desktop-focus-home error]:', err.message);
    return { success: false, error: err.message };
  }
});

// HUD IPC Relay disabled per user request
ipcMain.on('hud-update', () => {
  // No-op: HUD window is completely deactivated
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
