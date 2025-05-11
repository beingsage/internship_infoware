import { Chart } from "@/components/ui/chart"
// Import dayjs
const dayjs = require("dayjs")
const relativeTime = require("dayjs/plugin/relativeTime")
dayjs.extend(relativeTime)

// DOM Elements
const toggleTrackingBtn = document.getElementById("toggleTracking")
const toggleThemeBtn = document.getElementById("toggleTheme")
const dateSelector = document.getElementById("dateSelector")
const clickCount = document.getElementById("clickCount")
const keystrokeCount = document.getElementById("keystrokeCount")
const scrollCount = document.getElementById("scrollCount")
const appDetails = document.getElementById("appDetails")
const activityLog = document.getElementById("activityLog")

// Charts
let activityChart = null
let appUsageChart = null

// Initialize the app
async function init() {
  // Check system theme preference
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.classList.add("dark")
  }

  // Set up theme toggle
  toggleThemeBtn.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark")
  })

  // Check tracking status
  const isTracking = await window.electronAPI.getTrackingStatus()
  updateTrackingButton(isTracking)

  // Set up tracking toggle
  toggleTrackingBtn.addEventListener("click", async () => {
    const isTracking = toggleTrackingBtn.textContent.includes("Start")

    if (isTracking) {
      await window.electronAPI.startTracking()
    } else {
      await window.electronAPI.stopTracking()
    }

    updateTrackingButton(!isTracking)
  })

  // Load available dates
  const dates = await window.electronAPI.getAvailableDates()
  populateDateSelector(dates)

  // Set up date selector
  dateSelector.addEventListener("change", loadActivityData)

  // Set up stats update listener
  window.electronAPI.onUpdateStats((data) => {
    updateStats(data)
  })

  // Initialize charts
  initCharts()

  // Load initial data
  await loadActivityData()
}

// Update tracking button state
function updateTrackingButton(isTracking) {
  if (isTracking) {
    toggleTrackingBtn.textContent = "Stop Tracking"
    toggleTrackingBtn.classList.remove("bg-blue-500")
    toggleTrackingBtn.classList.add("bg-red-500")
  } else {
    toggleTrackingBtn.textContent = "Start Tracking"
    toggleTrackingBtn.classList.remove("bg-red-500")
    toggleTrackingBtn.classList.add("bg-blue-500")
  }
}

// Populate date selector with available dates
function populateDateSelector(dates) {
  // Clear existing options except "Today"
  while (dateSelector.options.length > 1) {
    dateSelector.remove(1)
  }

  // Add available dates
  dates.forEach((date) => {
    const option = document.createElement("option")
    option.value = date
    option.textContent = formatDate(date)
    dateSelector.appendChild(option)
  })
}

// Format date for display
function formatDate(dateStr) {
  const date = dayjs(dateStr)
  const today = dayjs().format("YYYY-MM-DD")
  const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD")

  if (dateStr === today) {
    return "Today"
  } else if (dateStr === yesterday) {
    return "Yesterday"
  } else {
    return date.format("MMMM D, YYYY")
  }
}

// Load activity data for selected date
async function loadActivityData() {
  const selectedDate = dateSelector.value === "today" ? null : dateSelector.value
  const data = await window.electronAPI.getActivityData(selectedDate)

  if (data) {
    updateStats(data)
    updateCharts(data)
  } else {
    resetStats()
  }
}

// Update stats display
function updateStats(data) {
  // Update counters
  clickCount.textContent = data.clicks.toLocaleString()
  keystrokeCount.textContent = data.keystrokes.toLocaleString()
  scrollCount.textContent = data.scrolls.toLocaleString()

  // Update application details
  updateApplicationDetails(data.applications)

  // Update activity log
  updateActivityLog(data.activities)

  // Update charts
  updateCharts(data)
}

// Reset stats display
function resetStats() {
  clickCount.textContent = "0"
  keystrokeCount.textContent = "0"
  scrollCount.textContent = "0"

  appDetails.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No application data available</p>'
  activityLog.innerHTML =
    '<tr><td colspan="3" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No activity data available</td></tr>'

  // Reset charts
  if (activityChart) {
    activityChart.data.labels = []
    activityChart.data.datasets.forEach((dataset) => {
      dataset.data = []
    })
    activityChart.update()
  }

  if (appUsageChart) {
    appUsageChart.data.labels = []
    appUsageChart.data.datasets[0].data = []
    appUsageChart.update()
  }
}

// Update application details
function updateApplicationDetails(applications) {
  if (!applications || Object.keys(applications).length === 0) {
    appDetails.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No application data available</p>'
    return
  }

  // Sort applications by time spent
  const sortedApps = Object.entries(applications).sort(([, a], [, b]) => b.timeSpent - a.timeSpent)

  let html = ""

  sortedApps.forEach(([appName, appData]) => {
    const timeSpent = formatTimeSpent(appData.timeSpent)

    html += `
      <div class="border border-gray-200 dark:border-gray-700 rounded-md p-4">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-medium">${appName}</h3>
          <span class="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">${timeSpent}</span>
        </div>
        
        <div class="space-y-2">
    `

    // Sort windows by time spent
    const sortedWindows = Object.entries(appData.windows || {})
      .sort(([, a], [, b]) => b.timeSpent - a.timeSpent)
      .slice(0, 5) // Show only top 5 windows

    if (sortedWindows.length > 0) {
      sortedWindows.forEach(([windowTitle, windowData]) => {
        const windowTime = formatTimeSpent(windowData.timeSpent)
        html += `
          <div class="flex justify-between text-sm">
            <span class="text-gray-600 dark:text-gray-400 truncate max-w-md">${windowTitle}</span>
            <span>${windowTime}</span>
          </div>
        `
      })
    } else {
      html += `<p class="text-sm text-gray-500 dark:text-gray-400">No window data available</p>`
    }

    html += `
        </div>
      </div>
    `
  })

  appDetails.innerHTML = html
}

// Update activity log
function updateActivityLog(activities) {
  if (!activities || activities.length === 0) {
    activityLog.innerHTML =
      '<tr><td colspan="3" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No activity data available</td></tr>'
    return
  }

  // Sort activities by timestamp (newest first)
  const sortedActivities = [...activities].sort((a, b) => b.timestamp - a.timestamp)

  let html = ""

  sortedActivities.slice(0, 50).forEach((activity) => {
    const time = dayjs(activity.timestamp).format("HH:mm:ss")
    let activityType = ""
    let details = ""

    switch (activity.type) {
      case "click":
        activityType = "Mouse Click"
        break
      case "scroll":
        activityType = "Mouse Scroll"
        break
      case "keystroke":
        activityType = "Keystroke"
        break
      case "window_focus":
        activityType = "Window Focus"
        details = `${activity.details.application} - ${activity.details.window}`
        break
      default:
        activityType = activity.type
    }

    html += `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
        <td class="px-6 py-4 whitespace-nowrap text-sm">${time}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm">${activityType}</td>
        <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">${details}</td>
      </tr>
    `
  })

  activityLog.innerHTML = html
}

// Format time spent
function formatTimeSpent(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000)

  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) {
    return `${minutes}m ${seconds % 60}s`
  }

  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

// Initialize charts
function initCharts() {
  // Activity chart
  const activityCtx = document.getElementById("activityChart").getContext("2d")
  activityChart = new Chart(activityCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Clicks",
          data: [],
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.1,
        },
        {
          label: "Keystrokes",
          data: [],
          borderColor: "rgb(16, 185, 129)",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.1,
        },
        {
          label: "Scrolls",
          data: [],
          borderColor: "rgb(139, 92, 246)",
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
        },
      },
    },
  })

  // App usage chart
  const appUsageCtx = document.getElementById("appUsageChart").getContext("2d")
  appUsageChart = new Chart(appUsageCtx, {
    type: "doughnut",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [
            "rgba(59, 130, 246, 0.8)",
            "rgba(16, 185, 129, 0.8)",
            "rgba(139, 92, 246, 0.8)",
            "rgba(249, 115, 22, 0.8)",
            "rgba(236, 72, 153, 0.8)",
            "rgba(6, 182, 212, 0.8)",
            "rgba(245, 158, 11, 0.8)",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
        },
      },
    },
  })
}

// Update charts with new data
function updateCharts(data) {
  // Update activity chart
  if (data.activities && data.activities.length > 0) {
    // Group activities by hour
    const hourlyData = {}

    data.activities.forEach((activity) => {
      const hour = dayjs(activity.timestamp).format("HH:00")

      if (!hourlyData[hour]) {
        hourlyData[hour] = { clicks: 0, keystrokes: 0, scrolls: 0 }
      }

      if (activity.type === "click") {
        hourlyData[hour].clicks++
      } else if (activity.type === "keystroke") {
        hourlyData[hour].keystrokes++
      } else if (activity.type === "scroll") {
        hourlyData[hour].scrolls++
      }
    })

    // Sort hours
    const sortedHours = Object.keys(hourlyData).sort()

    // Update chart data
    activityChart.data.labels = sortedHours
    activityChart.data.datasets[0].data = sortedHours.map((hour) => hourlyData[hour].clicks)
    activityChart.data.datasets[1].data = sortedHours.map((hour) => hourlyData[hour].keystrokes)
    activityChart.data.datasets[2].data = sortedHours.map((hour) => hourlyData[hour].scrolls)
    activityChart.update()
  }

  // Update app usage chart
  if (data.applications && Object.keys(data.applications).length > 0) {
    // Sort applications by time spent
    const sortedApps = Object.entries(data.applications)
      .sort(([, a], [, b]) => b.timeSpent - a.timeSpent)
      .slice(0, 7) // Show only top 7 apps

    // Update chart data
    appUsageChart.data.labels = sortedApps.map(([appName]) => appName)
    appUsageChart.data.datasets[0].data = sortedApps.map(([, appData]) => appData.timeSpent / 1000)
    appUsageChart.update()
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener("DOMContentLoaded", init)
