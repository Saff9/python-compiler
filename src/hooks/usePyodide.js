import { useState, useEffect, useRef, useCallback } from 'react';

// Helper to extract clear details from standard Python tracebacks
function parsePythonError(errorMsg) {
  if (!errorMsg) return "❌ Execution failed.";
  
  const lineMatch = errorMsg.match(/File "<exec>", line (\d+)/) || errorMsg.match(/line (\d+)/);
  const lines = errorMsg.trim().split('\n');
  const lastLine = lines[lines.length - 1] || "RuntimeError";
  
  if (lineMatch) {
    return `💡 Debug Hint: ${lastLine} (Check line ${lineMatch[1]} in your active file)`;
  }
  return `💡 Debug Hint: ${lastLine}`;
}

export function usePyodide() {
  const [status, setStatus] = useState('uninitialized'); 
  const [isRunning, setIsRunning] = useState(false);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [output, setOutput] = useState([]); 
  const [installedPackages, setInstalledPackages] = useState([]);
  const [installingPackageName, setInstallingPackageName] = useState(null);

  const workerRef = useRef(null);
  const sharedBufferRef = useRef(null);
  const controlArrayRef = useRef(null);
  const dataArrayRef = useRef(null);
  const hasRestoredRef = useRef(false);

  // Initialize SharedArrayBuffer for blocking stdin synchronization
  if (typeof SharedArrayBuffer !== 'undefined' && !sharedBufferRef.current) {
    sharedBufferRef.current = new SharedArrayBuffer(16384); // 16KB buffer
    controlArrayRef.current = new Int32Array(sharedBufferRef.current, 0, 4);
    dataArrayRef.current = new Uint8Array(sharedBufferRef.current, 16);
  }

  const initWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    setIsRunning(false);
    setInstallingPackageName(null);
    hasRestoredRef.current = false;

    const worker = new Worker(
      new URL('../workers/pyodide.worker.js', import.meta.url)
    );

    if (sharedBufferRef.current) {
      worker.postMessage({ type: 'init_buffer', buffer: sharedBufferRef.current });
      if (controlArrayRef.current) {
        controlArrayRef.current[0] = 0; // Reset state to idle
        controlArrayRef.current[1] = 0; // Reset length
      }
    }

    worker.onmessage = (event) => {
      const { type, data, error, packageName, installed } = event.data;

      switch (type) {
        case 'status':
          setStatus(data);
          if (installed) setInstalledPackages(installed);
          break;
        case 'stdout':
          setOutput(prev => [...prev, { type: 'stdout', text: data }]);
          break;
        case 'stderr':
          setOutput(prev => [...prev, { type: 'stderr', text: data }]);
          break;
        case 'run_start':
          setIsRunning(true);
          setIsWaitingForInput(false);
          setOutput(prev => [...prev, { type: 'info', text: '>>> Running script...' }]);
          break;
        case 'run_end':
          setIsRunning(false);
          setIsWaitingForInput(false);
          if (data && data !== 'None') {
            setOutput(prev => [...prev, { type: 'stdout', text: data }]);
          }
          setOutput(prev => [...prev, { type: 'success', text: '>>> Program finished running.' }]);
          break;
        case 'run_error':
          setIsRunning(false);
          setIsWaitingForInput(false);
          const hint = parsePythonError(error);
          setOutput(prev => [
            ...prev, 
            { type: 'stderr', text: error },
            { type: 'warning', text: hint }
          ]);
          break;
        case 'stdin_request':
          setIsWaitingForInput(true);
          break;
        case 'install_start':
          setInstallingPackageName(packageName);
          setOutput(prev => [...prev, { type: 'info', text: `>>> Pip installing: ${packageName}...` }]);
          break;
        case 'install_success':
          setInstallingPackageName(null);
          setInstalledPackages(installed);
          try {
            localStorage.setItem('py_compiler_installed_packages', JSON.stringify(installed));
          } catch (e) {}
          setOutput(prev => [...prev, { type: 'success', text: `>>> Successfully installed package: ${packageName}` }]);
          break;
        case 'install_error':
          setInstallingPackageName(null);
          setOutput(prev => [...prev, { type: 'stderr', text: `>>> Pip Error: Failed to install package '${packageName}'.\nDetails: ${error}` }]);
          break;
        default:
          break;
      };
    };

    workerRef.current = worker;
  }, []);

  useEffect(() => {
    initWorker();
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [initWorker]);

  // Background auto-restorer for package libraries
  useEffect(() => {
    if (status === 'ready' && !hasRestoredRef.current && workerRef.current) {
      hasRestoredRef.current = true;
      try {
        const saved = localStorage.getItem('py_compiler_installed_packages');
        if (saved) {
          const list = JSON.parse(saved);
          if (Array.isArray(list) && list.length > 0) {
            list.forEach(pkg => {
              workerRef.current.postMessage({ type: 'install', packageName: pkg });
            });
          }
        }
      } catch (e) {
        console.warn("Failed to auto-restore modules:", e);
      }
    }
  }, [status]);

  const runCode = (code, files, stdin = '') => {
    if (status !== 'ready' || isRunning) return;
    workerRef.current.postMessage({ type: 'run', code, files, stdin });
  };

  const installPackage = (name) => {
    if (status !== 'ready' || installingPackageName) return;
    workerRef.current.postMessage({ type: 'install', packageName: name });
  };

  const stopExecution = () => {
    if (!isRunning) return;

    if (controlArrayRef.current) {
      controlArrayRef.current[0] = 2; // Cancel state
      Atomics.notify(controlArrayRef.current, 0, 1);
    }

    initWorker();
    setIsWaitingForInput(false);
    setOutput(prev => [...prev, { type: 'stderr', text: 'KeyboardInterrupt: Script execution terminated by user.' }]);
  };

  const submitInteractiveInput = (text) => {
    setIsWaitingForInput(false);
    const formattedText = text + '\n';

    // Echo user input to the output panel
    setOutput(prev => [...prev, { type: 'stdin_echo', text: text }]);

    if (controlArrayRef.current && dataArrayRef.current) {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(formattedText);
      dataArrayRef.current.set(bytes);
      controlArrayRef.current[1] = bytes.length;
      controlArrayRef.current[0] = 1; // Input ready
      Atomics.notify(controlArrayRef.current, 0, 1);
    }
  };

  const clearOutput = () => {
    setOutput([]);
  };

  return {
    status,
    isRunning,
    isWaitingForInput,
    output,
    installedPackages,
    installingPackageName,
    runCode,
    installPackage,
    stopExecution,
    submitInteractiveInput,
    clearOutput
  };
}
