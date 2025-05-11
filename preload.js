const { contextBridge, ipcRenderer } = require("electron")

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  startTracking: () => ipcRenderer.invoke("start-tracking"),
  stopTracking: () => ipcRenderer.invoke("stop-tracking"),
  getTrackingStatus: () => ipcRenderer.invoke("get-tracking-status"),
  getActivityData: (date) => ipcRenderer.invoke("get-activity-data", date),
  getAvailableDates: () => ipcRenderer.invoke("get-available-dates"),
  onUpdateStats: (callback) => ipcRenderer.on("update-stats", (_, data) => callback(data)),
})
