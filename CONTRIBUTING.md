# Contributing to PyCraft

Follow these instructions to configure your local development environment, conform to the code conventions, and submit changes.

---

## Development Setup

### 1. Requirements
Ensure you have Node.js (v18 or higher) and npm installed.

### 2. Local Setup
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Start Development Server
Start the local server:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

> [!NOTE]
> PyCraft relies on `SharedArrayBuffer` for real-time console input. The browser console will print errors if the server does not serve cross-origin isolation headers. These are configured by default in [vite.config.js](file:///c:/Users/owais/OneDrive/Desktop/python%20compiler/vite.config.js).

---

## Codebase Architecture

Key files and utilities to check before modifying components:

* [src/workers/pyodide.worker.js](file:///c:/Users/owais/OneDrive/Desktop/python%20compiler/src/workers/pyodide.worker.js): Background Web Worker executing Pyodide WASM and managing pip packages.
* [src/hooks/usePyodide.js](file:///c:/Users/owais/OneDrive/Desktop/python%20compiler/src/hooks/usePyodide.js): State machine interfacing with the runner worker. Manages output streams and writes inputs into the SharedArrayBuffer.
* [src/hooks/useFileSystem.js](file:///c:/Users/owais/OneDrive/Desktop/python%20compiler/src/hooks/useFileSystem.js): Manages VFS file nodes, debounces disk operations, and handles open/active tabs.
* [src/utils/db.js](file:///c:/Users/owais/OneDrive/Desktop/python%20compiler/src/utils/db.js): IndexedDB schema definition and query methods. Includes a LocalStorage fallback.

---

## Implementation Guidelines

To maintain application performance and stability:

### 1. Database Writes & Debouncing
Do not execute disk writes on every keystroke. File editing must be debounced (800ms) inside React hooks, then flushed immediately when the user executes a script or navigates away.

### 2. Thread Safety
Keep the main UI thread responsive. All heavy execution, Pyodide initialization, and package installations must run inside the Web Worker.

### 3. File System Integrity
When updating directories:
* Reject names containing forbidden operating system characters: `\`, `/`, `:`, `*`, `?`, `"`, `<`, `>`, `|`.
* Verify that files created in the same parent directory do not share duplicate names.

---

## Submission Process

1. Create a feature branch off of the `main` branch.
2. Ensure your changes compile without warnings by running:
   ```bash
   npm run build
   ```
3. Test your changes manually (verify interactive inputs, PIP packages, settings reset, and backup exports).
4. Commit your changes with clear messages and open a pull request.
