/* eslint-disable no-restricted-globals */

// Import Pyodide from CDN
importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js");

let pyodide = null;
let micropip = null;
let installedPackages = [];
let stdinQueue = [];

// SharedArrayBuffer variables for interactive stdin
let sharedBuffer = null;
let controlArray = null;
let dataArray = null;

async function initPyodide() {
  try {
    postMessage({ type: 'status', data: 'loading' });
    
    // Load pyodide with stdout, stderr and stdin hooks
    pyodide = await loadPyodide({
      stdout: (text) => {
        postMessage({ type: 'stdout', data: text });
      },
      stderr: (text) => {
        postMessage({ type: 'stderr', data: text });
      }
    });

    // Configure standard input hook
    pyodide.setStdin({
      stdin: () => {
        // If SharedArrayBuffer is available, block and wait for user input
        if (controlArray && dataArray) {
          postMessage({ type: 'stdin_request' });
          
          // Wait on controlArray[0] to change from 0 (idle)
          Atomics.wait(controlArray, 0, 0);
          
          if (controlArray[0] === 2) {
            // Cancelled
            controlArray[0] = 0;
            return "\n";
          }
          
          const len = controlArray[1];
          const tempBytes = new Uint8Array(len);
          tempBytes.set(dataArray.subarray(0, len));
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(tempBytes);
          
          controlArray[0] = 0; // reset
          return text;
        }

        if (stdinQueue.length > 0) {
          return stdinQueue.shift();
        }
        return "\n"; // Default newline if queue exhausted
      }
    });

    postMessage({ type: 'status', data: 'loading_micropip' });
    
    // Load micropip for package management
    await pyodide.loadPackage("micropip");
    micropip = pyodide.pyimport("micropip");
    
    // Register global prompt printer
    self.printPrompt = (text) => {
      postMessage({ type: 'stdout', data: text });
    };

    // Patch input() to send prompts immediately
    await pyodide.runPythonAsync(`
import builtins
import js

builtins.original_input = builtins.input

def custom_input(prompt=""):
    if prompt:
        js.printPrompt(str(prompt))
    return builtins.original_input()

builtins.input = custom_input
    `);
    
    postMessage({ type: 'status', data: 'ready', installed: installedPackages });
  } catch (error) {
    postMessage({ type: 'status', data: 'error', error: error.message });
  }
}

// Reconstruct path for a node from parentId links
function getNodePath(nodeId, files) {
  const node = files[nodeId];
  if (!node || nodeId === 'root' || !node.parentId) return '';
  
  const parentPath = getNodePath(node.parentId, files);
  return parentPath ? `${parentPath}/${node.name}` : node.name;
}

// Recursively delete directory in Pyodide FS
function deleteFolderRecursive(path) {
  try {
    if (pyodide.FS.analyzePath(path).exists) {
      const entries = pyodide.FS.readdir(path);
      entries.forEach(name => {
        if (name === '.' || name === '..') return;
        const childPath = `${path}/${name}`;
        const stat = pyodide.FS.stat(childPath);
        if (pyodide.FS.isDir(stat.mode)) {
          deleteFolderRecursive(childPath);
        } else {
          pyodide.FS.unlink(childPath);
        }
      });
      pyodide.FS.rmdir(path);
    }
  } catch (e) {
    console.warn("Failed to recursively delete " + path, e);
  }
}

// Clear contents of a directory without deleting the directory itself
function clearFolderContents(path) {
  try {
    if (pyodide.FS.analyzePath(path).exists) {
      const entries = pyodide.FS.readdir(path);
      entries.forEach(name => {
        if (name === '.' || name === '..') return;
        const childPath = `${path}/${name}`;
        const stat = pyodide.FS.stat(childPath);
        if (pyodide.FS.isDir(stat.mode)) {
          deleteFolderRecursive(childPath);
        } else {
          pyodide.FS.unlink(childPath);
        }
      });
    }
  } catch (e) {
    console.warn("Failed to clear contents of directory " + path, e);
  }
}

// Sync VFS to Pyodide MemFS
function syncFileSystem(files) {
  if (!pyodide) return;

  clearFolderContents('/workspace');

  try {
    if (!pyodide.FS.analyzePath('/workspace').exists) {
      pyodide.FS.mkdir('/workspace');
    }
  } catch (e) {
    console.error("Failed to create /workspace folder", e);
    return;
  }

  const nodes = Object.values(files);
  
  const folders = nodes
    .filter(n => n.type === 'dir' && n.id !== 'root')
    .map(n => ({ ...n, path: getNodePath(n.id, files) }))
    .sort((a, b) => a.path.split('/').length - b.path.split('/').length);

  const fileNodes = nodes
    .filter(n => n.type === 'file')
    .map(n => ({ ...n, path: getNodePath(n.id, files) }));

  // Create directories
  folders.forEach(f => {
    try {
      const fullPath = '/workspace/' + f.path;
      if (!pyodide.FS.analyzePath(fullPath).exists) {
        pyodide.FS.mkdir(fullPath);
      }
    } catch (e) {
      console.warn("Failed to create dir: " + f.path, e);
    }
  });

  // Write files
  fileNodes.forEach(f => {
    try {
      const fullPath = '/workspace/' + f.path;
      
      const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
      if (dirPath && !pyodide.FS.analyzePath(dirPath).exists) {
        pyodide.FS.mkdirTree(dirPath);
      }

      pyodide.FS.writeFile(fullPath, f.content || '');
    } catch (e) {
      console.warn("Failed to write file: " + f.path, e);
    }
  });

  try {
    pyodide.FS.chdir('/workspace');
  } catch (e) {
    console.error("Failed to change cwd to /workspace", e);
  }
}

// Execute Pyodide message actions
self.onmessage = async (event) => {
  const { type, code, files, packageName, stdin } = event.data;

  if (type === 'init_buffer') {
    sharedBuffer = event.data.buffer;
    controlArray = new Int32Array(sharedBuffer, 0, 4);
    dataArray = new Uint8Array(sharedBuffer, 16);
    return;
  }

  if (type === 'init') {
    if (!pyodide) {
      await initPyodide();
    } else {
      postMessage({ type: 'status', data: 'ready', installed: installedPackages });
    }
    return;
  }

  if (!pyodide) {
    postMessage({ type: 'error', data: 'Pyodide is not initialized yet.' });
    return;
  }

  if (type === 'run') {
    try {
      // Load inputs into the stdin queue (split by newline and append newline character)
      if (stdin !== undefined) {
        stdinQueue = stdin ? stdin.split('\n').map(line => line + '\n') : [];
      } else {
        stdinQueue = [];
      }

      if (files) {
        syncFileSystem(files);
      }

      postMessage({ type: 'run_start' });
      
      const result = await pyodide.runPythonAsync(code);
      
      postMessage({ 
        type: 'run_end', 
        result: result !== undefined ? String(result) : null 
      });
    } catch (error) {
      postMessage({ type: 'run_error', error: error.message });
    }
  }

  else if (type === 'install') {
    try {
      postMessage({ type: 'install_start', packageName });
      
      await micropip.install(packageName);
      
      if (!installedPackages.includes(packageName)) {
        installedPackages.push(packageName);
      }
      
      postMessage({ 
        type: 'install_success', 
        packageName, 
        installed: installedPackages 
      });
    } catch (error) {
      postMessage({ 
        type: 'install_error', 
        packageName, 
        error: error.message 
      });
    }
  }
};

// Auto initialize
initPyodide();
