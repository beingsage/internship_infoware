const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const { windowManager } = require('node-window-manager');
const ioHook = require('iohook');

// Path to store activity logs
const logFilePath = path.join(app.getPath('userData'), 'activity_log.json');

// Ensure log file exists
if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, JSON.stringify([]));
}

// Load or initialize activity log
let activityLog = [];
try {
  activityLog = JSON.parse(fs.readFileSync(logFilePath));
} catch (err) {
  console.error('Error reading log file:', err);
}

// Function to save activity to file
function saveActivity(activity) {
  activityLog.push(activity);
  fs.writeFileSync(logFilePath, JSON.stringify(activityLog, null, 2));
}

// Track mouse clicks
function trackClicks() {
  ioHook.on('mousedown', (event) => {
    const activity = {
      type: 'click',
      x: event.x,
      y: event.y,
      button: event.button,
      timestamp: new Date().toISOString(),
    };
    saveActivity(activity);
  });
}

// Track scrolls
function trackScrolls() {
  ioHook.on('mousewheel', (event) => {
    const activity = {
      type: 'scroll',
      direction: event.direction,
      amount: event.amount,
      timestamp: new Date().toISOString(),
    };
    saveActivity(activity);
  });
}

// Track keyboard activity
function trackKeyboard() {
  ioHook.on('keydown', (event) => {
    const activity = {
      type: 'keyboard',
      keycode: event.keycode,
      timestamp: new Date().toISOString(),
    };
    saveActivity(activity);
  });
}

// Track active applications and browser windows
function trackActiveWindows() {
  setInterval(() => {
    const activeWindow = windowManager.getActiveWindow();
    const windowInfo = {
      title: activeWindow.getTitle(),
      processId: activeWindow.processId,
      path: activeWindow.path,
      timestamp: new Date().toISOString(),
    };
    saveActivity({ type: 'window', ...windowInfo });
  }, 2000); // Check every 2 seconds
}

// Create main window
function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile('index.html');

  // Start tracking
  ioHook.start();
  trackClicks();
  trackScrolls();
  trackKeyboard();
  trackActiveWindows();
}

// App setup
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  ioHook.stop();
  if (process.platform !== 'darwin') app.quit();
});