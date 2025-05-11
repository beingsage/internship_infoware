# Activity Tracker

Activity Tracker is a desktop application built with Electron that monitors and logs user interactions with their computer. It captures mouse clicks, scroll events, keyboard inputs, and information about the active application window.

## Features

-   **Mouse Click Tracking:** Logs coordinates (x, y), button used, and timestamp for each click.
-   **Mouse Scroll Tracking:** Logs scroll direction, amount, and timestamp.
-   **Keyboard Activity Tracking:** Logs keycode and timestamp for each key press.
-   **Active Window Tracking:** Periodically logs the title, process ID, and path of the currently active application window.
-   **Local Data Storage:** All activity data is stored in a JSON file (`activity_log.json`) in the application's user data directory.

## Technologies Used

-   [Electron](https://www.electronjs.org/)
-   [Node.js](https://nodejs.org/)
-   [iohook](https://github.com/wilix-team/iohook) - For global keyboard and mouse event listening.
-   [node-window-manager](https://github.com/sential/node-window-manager) - For accessing active window information.

## Setup and Installation

### Prerequisites

-   Node.js and npm (or yarn) installed on your system.

### Steps

1.  **Clone the repository (if applicable):**
    ```bash
    git clone <your-repository-url>
    cd activity-tracker
    ```

2.  **Install dependencies:**
    Open a terminal in the project's root directory and run:
    ```bash
    npm install
    ```
    This will install Electron and other necessary packages listed in `package.json`.

## Running the Application

To start the Activity Tracker application, run the following command in the project's root directory:

```bash
npm start
```

This will launch the Electron application, and it will begin tracking activities as configured in `main.js`.

## How It Works

The application's core logic resides in `main.js`.

1.  **Initialization:**
    -   When the Electron app is ready, it creates a main browser window (`index.html`).
    -   It initializes `iohook` to capture global input events.
    -   It ensures an `activity_log.json` file exists in the user's application data path. Existing logs are loaded, or a new empty log array is created.

2.  **Event Tracking:**
    -   **Mouse Clicks (`trackClicks`):** `iohook` listens for `mousedown` events. When a click occurs, its details (coordinates, button, timestamp) are captured.
    -   **Mouse Scrolls (`trackScrolls`):** `iohook` listens for `mousewheel` events. Scroll direction, amount, and timestamp are logged.
    -   **Keyboard Input (`trackKeyboard`):** `iohook` listens for `keydown` events. The keycode and timestamp are logged.
    -   **Active Window (`trackActiveWindows`):** `node-window-manager` is used to periodically (every 2 seconds by default) fetch details of the currently active window (title, process ID, path).

3.  **Data Storage (`saveActivity`):**
    -   All tracked events are formatted into a JSON object with a `type` (e.g., 'click', 'scroll', 'keyboard', 'window') and relevant data, including a timestamp.
    -   This activity object is pushed into an in-memory array (`activityLog`).
    -   The entire `activityLog` array is then written to `activity_log.json`, overwriting the file with the updated log.

4.  **User Interface (Renderer Process):**
    -   `index.html` (not provided in snippets) serves as the main UI.
    -   `preload.js` exposes an API (`electronAPI`) to the renderer process using `contextBridge`. This allows the UI to safely interact with the main process for actions like starting/stopping tracking, getting tracking status, and fetching activity data for display.

## Project Structure Overview

```
.
├── main.js             # Main Electron process, core logic, event tracking
├── index.html          # Main HTML file for the UI (renderer process)
├── preload.js          # Script to bridge main and renderer processes securely
├── package.json        # Project metadata and dependencies
└── activity_log.json   # (Generated in user data directory) Stores tracked activity
```

## Potential Future Enhancements

-   Data visualization within the application.
-   More detailed analytics and reporting.
-   User-configurable settings for tracking (e.g., what to track, tracking intervals).
-   Secure data storage options.
-   Exporting data in different formats (e.g., CSV).