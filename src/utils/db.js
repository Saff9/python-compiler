const DB_NAME = 'PyCraftVFS_DB';
const DB_VERSION = 2; // Bump version to add indexes
const STORE_NAME = 'workspace_files';

let dbFailed = false;

export function openDatabase() {
  return new Promise((resolve, reject) => {
    if (dbFailed) {
      reject(new Error("IndexedDB is marked as failed."));
      return;
    }
    if (!window.indexedDB) {
      dbFailed = true;
      reject(new Error("IndexedDB is not supported by your browser/device."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      let store;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      } else {
        store = event.currentTarget.transaction.objectStore(STORE_NAME);
      }

      // Add indexes for efficient queries if they don't exist
      if (!store.indexNames.contains('parentId')) {
        store.createIndex('parentId', 'parentId', { unique: false });
      }
      if (!store.indexNames.contains('name')) {
        store.createIndex('name', 'name', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.warn("IndexedDB initialization error:", event.target.error);
      dbFailed = true;
      reject(event.target.error);
    };
  });
}

// LocalStorage Fallback Helpers
function getLSFiles() {
  try {
    const data = localStorage.getItem('pycraft_vfs_backup');
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

function saveLSFiles(files) {
  try {
    localStorage.setItem('pycraft_vfs_backup', JSON.stringify(files));
  } catch (e) {
    console.error("LocalStorage fallback write failed:", e);
  }
}

export function saveFileToDB(file) {
  return openDatabase()
    .then(db => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(file);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    })
    .catch(err => {
      console.warn("IndexedDB saveFileToDB failed, falling back to LocalStorage:", err);
      const files = getLSFiles();
      files[file.id] = file;
      saveLSFiles(files);
      return Promise.resolve();
    });
}

export function getAllFilesFromDB() {
  return openDatabase()
    .then(db => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    })
    .catch(err => {
      console.warn("IndexedDB getAllFilesFromDB failed, falling back to LocalStorage:", err);
      const files = getLSFiles();
      return Promise.resolve(Object.values(files));
    });
}

export function deleteFileFromDB(id) {
  return openDatabase()
    .then(db => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    })
    .catch(err => {
      console.warn("IndexedDB deleteFileFromDB failed, falling back to LocalStorage:", err);
      const files = getLSFiles();
      delete files[id];
      saveLSFiles(files);
      return Promise.resolve();
    });
}

export function clearDatabase() {
  return openDatabase()
    .then(db => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    })
    .catch(err => {
      console.warn("IndexedDB clearDatabase failed, falling back to LocalStorage:", err);
      try {
        localStorage.removeItem('pycraft_vfs_backup');
      } catch (e) {}
      return Promise.resolve();
    });
}
