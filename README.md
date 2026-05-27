# PyCraft: Offline Python IDE & Compiler

[![Build Android APK](https://github.com/Saff9/python-compiler/actions/workflows/build-apk.yml/badge.svg)](https://github.com/Saff9/python-compiler/actions/workflows/build-apk.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-blue.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)
[![Platform: Capacitor/Android](https://img.shields.io/badge/Platform-Capacitor%2FAndroid-blueviolet)](https://capacitorjs.com)

PyCraft is a high-performance, client-side Python Integrated Development Environment (IDE) and compiler built on React, Monaco Editor, and Pyodide WebAssembly. Designed as a progressive, offline-first web app, it can be compiled directly into a native Android APK using Capacitor.

---

## Key Features

- **Interactive Console Input (stdin)**: Pauses python execution in real-time when prompting for input (`input()`) utilizing a `SharedArrayBuffer` and `Atomics` sync bridge between the main UI and Web Worker.
- **Robust IndexedDB VFS**: A virtual file explorer backed by IndexedDB with parent directory and name indexing. Includes debounced saves (800ms) to reduce disk I/O, auto-saving flushes on run/shortcuts, and fallback persistence to LocalStorage.
- **Monaco Autocomplete & Snippets**: Features custom auto-completion lists for Python built-ins alongside coding snippets (functions, classes, loops, try-except blocks) to accelerate coding on mobile viewports.
- **Full-Text Grep Search**: Search sidebar filters files by name or scans files for full-text content matches, showing line-number snippets (`L12: print(data)`). Clicking on a snippet routes you to the file.
- **Auto-Restoring PIP Manager**: Search and install pure Python modules via `micropip`. PyCraft automatically saves your installed modules list to local storage and re-installs them in the background whenever the app starts or the worker restarts.
- **Starter Templates**: Load templated scripts (Interactive Input, Fibonacci Loops, Sympy Integration) directly from the Welcome Screen with a single tap.
- **Gamified Statistics**: Tracks daily coding streaks, experience points (XP) for coding milestones, skills levels, and renders a Duolingo/Mimo style stats card.
- **Backup & Portability**: Export your complete file database as a single `.json` backup file, or import workspace files to restore your workspace on different devices.

---

## Architecture

```
                                  +-----------------------------------------+
                                  |               Main Thread               |
                                  |                                         |
                                  |   [UI Shell]     [Monaco Code Editor]   |
                                  |   [VFS State]    [Terminal Logs UI]     |
                                  +--------------------+--------------------+
                                                       |
                                            postMessage / Atomics
                                                       |
                                  +--------------------+--------------------+
                                  |          Background Web Worker          |
                                  |                                         |
                                  |   [Pyodide WASM]   [micropip installer] |
                                  |   [Workspace FS]   [stdin blocker]      |
                                  +-----------------------------------------+
```

### Shared Memory Synchronization
To prevent blocking the browser's UI thread while Python awaits user keyboard inputs, PyCraft utilizes a `SharedArrayBuffer` synchronization bridge:
1. When Python hits an `input()` call in the worker, it executes `Atomics.wait()` on a control array, placing the worker thread to sleep.
2. The UI receives a message, renders an input prompt directly inside the console line list, and focuses the input cursor.
3. Once the user submits input, the main thread writes the text to the shared buffer and executes `Atomics.notify()`.
4. The worker wakes up instantly, decodes the text, and returns it to the active Python frame.

---

## Local Development Setup

### Prerequisites
- Node.js (v18+)
- npm

### 1. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 2. Launch Development Server
```bash
npm run dev
```
*Note: Vite is configured to automatically serve `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers, enabling `SharedArrayBuffer` support in your browser for local previews.*

### 3. Build Production Bundle
```bash
npm run build
```
Vite will compile the code and output static web assets into `/dist`.

---

## Mobile Compilation (Android APK)

PyCraft is pre-configured to build native Android packages via Capacitor.

### Local APK Build
1. Build the static assets:
   ```bash
   npm run build
   ```
2. Sync assets with Capacitor:
   ```bash
   npx cap sync
   ```
3. Compile and launch the Android project inside Android Studio:
   ```bash
   npx cap open android
   ```
4. Build the Gradle project to produce the final `app-debug.apk`.

### Automated GitHub Actions Workflow
The project includes a GitHub Actions configuration under `.github/workflows/build-apk.yml`. Pushing commits to your repository automatically triggers the build workflow which compiles, packages, and exposes the Android debug APK as an artifact.
