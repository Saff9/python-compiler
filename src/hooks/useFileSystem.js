import { useState, useEffect, useRef } from 'react';
import { 
  saveFileToDB, getAllFilesFromDB, 
  deleteFileFromDB, clearDatabase 
} from '../utils/db';

const OPEN_FILES_KEY = 'py_compiler_open_files';
const ACTIVE_FILE_KEY = 'py_compiler_active_file';

const DEFAULT_FILES = {
  'root': { id: 'root', name: 'Root', type: 'dir', parentId: null },
  '1': { 
    id: '1', 
    name: 'main.py', 
    type: 'file', 
    parentId: 'root', 
    content: `# Welcome to PyCraft - A Mobile Python Compiler & IDE!
# Write Python code here and click the "Run" button.

print("Initializing Python runner...")

import math

def calculate_circle_area(radius):
    if radius < 0:
        return "Error: Radius cannot be negative"
    return math.pi * (radius ** 2)

r = 5
area = calculate_circle_area(r)
print(f"The area of a circle with radius {r} is {area:.4f}")

print("\\nTesting a loop:")
for i in range(1, 4):
    print(f"  Step {i}: Square of {i} is {i**2}")

print("\\nTry installing external packages like 'sympy' in the Packages tab!")
` 
  },
  '2': { id: '2', name: 'utils', type: 'dir', parentId: 'root' },
  '3': { 
    id: '3', 
    name: 'math_helper.py', 
    type: 'file', 
    parentId: '2', 
    content: `def fibonacci(n):
    """Generate Fibonacci sequence up to n terms"""
    seq = [0, 1]
    while len(seq) < n:
      seq.append(seq[-1] + seq[-2])
    return seq[:n]
` 
  },
  '4': {
    id: '4',
    name: 'package_test.py',
    type: 'file',
    parentId: 'root',
    content: `# Package Demo File
# Note: Ensure you install sympy in the Package Manager first!

try:
    import sympy
    print("Sympy loaded successfully!")
    x = sympy.Symbol('x')
    expr = sympy.integrate(sympy.sin(x), x)
    print("Integration of sin(x) w.r.t x is:")
    print(" ->", expr)
except ImportError:
    print("Sympy is not installed.")
    print("Please go to the 'Packages' tab (pip icon) in the sidebar.")
    print("Search and install 'sympy', then run this file again!")
`
  }
};

export function useFileSystem() {
  const [files, setFiles] = useState({});
  const [isVFSLoaded, setIsVFSLoaded] = useState(false);
  const pendingSavesRef = useRef({});
  const filesRef = useRef(files);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      Object.entries(pendingSavesRef.current).forEach(([id, timeoutId]) => {
        clearTimeout(timeoutId);
        const file = filesRef.current[id];
        if (file) {
          saveFileToDB(file).catch(err => console.error("Unmount flush save error:", err));
        }
      });
    };
  }, []);

  const [openFileIds, setOpenFileIds] = useState(() => {
    try {
      const saved = localStorage.getItem(OPEN_FILES_KEY);
      return saved ? JSON.parse(saved) : ['1'];
    } catch (e) {
      return ['1'];
    }
  });

  const [activeFileId, setActiveFileId] = useState(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_FILE_KEY);
      return saved && saved !== 'null' ? saved : '1';
    } catch (e) {
      return '1';
    }
  });

  // 1. Initial Load from IndexedDB
  useEffect(() => {
    getAllFilesFromDB()
      .then(dbFiles => {
        if (dbFiles.length === 0) {
          // Initialize DB with defaults
          const initialFiles = { ...DEFAULT_FILES };
          const savePromises = Object.values(initialFiles).map(node => saveFileToDB(node));
          
          Promise.all(savePromises)
            .then(() => {
              setFiles(initialFiles);
              setIsVFSLoaded(true);
            })
            .catch(err => {
              console.error("Failed to initialize default VFS values inside IndexedDB:", err);
              // Fallback to local memory
              setFiles(initialFiles);
              setIsVFSLoaded(true);
            });
        } else {
          // Construct files map
          const filesMap = {};
          dbFiles.forEach(node => {
            filesMap[node.id] = node;
          });
          setFiles(filesMap);
          setIsVFSLoaded(true);
        }
      })
      .catch(err => {
        console.error("Failed to open IndexedDB workspace. Using DEFAULT_FILES fallback:", err);
        setFiles(DEFAULT_FILES);
        setIsVFSLoaded(true);
      });
  }, []);

  // Save open tabs to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(OPEN_FILES_KEY, JSON.stringify(openFileIds));
    } catch (e) {}
  }, [openFileIds]);

  // Save active tab to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_FILE_KEY, activeFileId || 'null');
    } catch (e) {}
  }, [activeFileId]);

  const createFile = (name, parentId = 'root', type = 'file') => {
    const id = Date.now().toString();
    const newFile = {
      id,
      name,
      type,
      parentId,
      ...(type === 'file' ? { content: '' } : {})
    };

    setFiles(prev => ({
      ...prev,
      [id]: newFile
    }));

    // Async save to IndexedDB
    saveFileToDB(newFile).catch(err => console.error("IDB save error:", err));

    if (type === 'file') {
      openFile(id);
    }
    return id;
  };

  const renameNode = (id, newName) => {
    if (id === 'root') return;
    setFiles(prev => {
      if (!prev[id]) return prev;
      const updatedNode = { ...prev[id], name: newName };
      
      // Async save
      saveFileToDB(updatedNode).catch(err => console.error("IDB rename save error:", err));
      
      return {
        ...prev,
        [id]: updatedNode
      };
    });
  };

  const deleteNode = (id) => {
    if (id === 'root' || id === '1') return; // Protect root and main.py

    setFiles(prev => {
      const copy = { ...prev };
      
      const getDescendants = (nodeId) => {
        let list = [nodeId];
        Object.values(copy).forEach(node => {
          if (node.parentId === nodeId) {
            list = [...list, ...getDescendants(node.id)];
          }
        });
        return list;
      };

      const idsToDelete = getDescendants(id);
      
      // Delete from open tabs
      setOpenFileIds(prevOpen => {
        const filtered = prevOpen.filter(oid => !idsToDelete.includes(oid));
        
        if (idsToDelete.includes(activeFileId)) {
          setActiveFileId(filtered.length > 0 ? filtered[0] : null);
        }
        return filtered;
      });

      // Async delete from IndexedDB
      idsToDelete.forEach(dId => {
        delete copy[dId];
        deleteFileFromDB(dId).catch(err => console.error("IDB delete error:", err));
      });

      return copy;
    });
  };

  const updateFileContent = (id, content) => {
    setFiles(prev => {
      if (!prev[id] || prev[id].type !== 'file') return prev;
      const updatedFile = { ...prev[id], content };
      
      // Debounce saving to IndexedDB/LocalStorage
      if (pendingSavesRef.current[id]) {
        clearTimeout(pendingSavesRef.current[id]);
      }
      
      pendingSavesRef.current[id] = setTimeout(() => {
        saveFileToDB(updatedFile).catch(err => console.error("IDB content update error:", err));
        delete pendingSavesRef.current[id];
      }, 800);
      
      return {
        ...prev,
        [id]: updatedFile
      };
    });
  };

  const saveActiveFileImmediately = (id) => {
    if (!id || !pendingSavesRef.current[id]) return Promise.resolve();
    
    clearTimeout(pendingSavesRef.current[id]);
    delete pendingSavesRef.current[id];
    
    const file = filesRef.current[id];
    if (file && file.type === 'file') {
      return saveFileToDB(file);
    }
    return Promise.resolve();
  };

  const openFile = (id) => {
    if (!files[id] || files[id].type !== 'file') return;
    
    setOpenFileIds(prev => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
    
    setActiveFileId(id);
  };

  const closeFile = (id) => {
    setOpenFileIds(prev => {
      const filtered = prev.filter(oid => oid !== id);
      
      if (activeFileId === id) {
        setActiveFileId(filtered.length > 0 ? filtered[filtered.length - 1] : null);
      }
      
      return filtered;
    });
  };

  const forceResetVFS = () => {
    return clearDatabase().then(() => {
      localStorage.removeItem(OPEN_FILES_KEY);
      localStorage.removeItem(ACTIVE_FILE_KEY);
      localStorage.removeItem('py_compiler_installed_packages');
      window.location.reload();
    });
  };

  return {
    files,
    isVFSLoaded,
    openFileIds,
    activeFileId,
    setActiveFileId,
    createFile,
    renameNode,
    deleteNode,
    updateFileContent,
    saveActiveFileImmediately,
    openFile,
    closeFile,
    forceResetVFS
  };
}
