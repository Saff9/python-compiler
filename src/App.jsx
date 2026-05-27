import React, { useState, useEffect, useRef } from 'react';
import { useFileSystem } from './hooks/useFileSystem';
import { usePyodide } from './hooks/usePyodide';
import Sidebar from './components/Sidebar';
import FileExplorer from './components/FileExplorer';
import Editor from './components/Editor';
import Terminal from './components/Terminal';
import PackageManager from './components/PackageManager';
import Settings from './components/Settings';
import { 
  Play, Square, Terminal as TerminalIcon, 
  Files as FilesIcon, Package as PackageIcon, 
  Settings as SettingsIcon, X as XIcon,
  EllipsisVertical, Plus, FolderPlus, Download, Upload
} from 'lucide-react';
import { AVATAR_MAP } from './utils/avatars';
import { saveFileToDB } from './utils/db';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('py_compiler_session');
      return saved ? JSON.parse(saved) : { username: 'Guest Coder', avatar: 'terminal' };
    } catch (e) {
      return { username: 'Guest Coder', avatar: 'terminal' };
    }
  });

  const [activeTab, setActiveTab] = useState('files');
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Custom Settings
  const [editorTheme, setEditorTheme] = useState(() => {
    try {
      return localStorage.getItem('py_compiler_theme') || 'vs-dark';
    } catch (e) {
      return 'vs-dark';
    }
  });
  const [fontSize, setFontSize] = useState(() => {
    try {
      return parseInt(localStorage.getItem('py_compiler_fontsize') || '14', 10);
    } catch (e) {
      return 14;
    }
  });
  const [accentColor, setAccentColor] = useState(() => {
    try {
      return localStorage.getItem('py_compiler_accent') || '#6366f1';
    } catch (e) {
      return '#6366f1';
    }
  });

  const [stdin, setStdin] = useState('');

  // Modal displays
  const [showPackagesModal, setShowPackagesModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const [toast, setToast] = useState(null);

  // Terminal height & mobile overlay states
  const [terminalHeight, setTerminalHeight] = useState(180);
  const [isDraggingTerminal, setIsDraggingTerminal] = useState(false);
  const [mobileConsoleActive, setMobileConsoleActive] = useState(false);

  // Gamification states
  const [xp, setXp] = useState(() => {
    try {
      return parseInt(localStorage.getItem('py_compiler_xp') || '0', 10);
    } catch (e) {
      return 0;
    }
  });
  const [streak, setStreak] = useState(() => {
    try {
      return parseInt(localStorage.getItem('py_compiler_streak') || '1', 10);
    } catch (e) {
      return 1;
    }
  });
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);

  // Load custom hooks
  const fs = useFileSystem();
  const py = usePyodide();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  // Keyboard Shortcuts Trigger (Ctrl+S / Ctrl+Enter)
  useEffect(() => {
    const handleShortcuts = (e) => {
      // Ctrl + Enter to Run
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      }
      // Ctrl + S to Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        fs.saveActiveFileImmediately(fs.activeFileId)
          .then(() => {
            showToast("Workspace synced to database!");
          })
          .catch(err => {
            console.error("Save error:", err);
            showToast("Failed to save workspace files.", "error");
          });
      }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [fs.activeFileId, py.status, py.isRunning, stdin]);

  // Watch execution output for successful runs to award XP
  const wasRunningRef = useRef(false);
  useEffect(() => {
    if (wasRunningRef.current && !py.isRunning) {
      const hasError = py.output.some(
        line => line.type === 'stderr' && !line.text.includes('KeyboardInterrupt')
      );

      if (!hasError) {
        setXp(prev => {
          const next = prev + 10;
          try { localStorage.setItem('py_compiler_xp', String(next)); } catch (e) {}
          return next;
        });
        showToast("Execution success! +10 XP");

        try {
          const lastRunStr = localStorage.getItem('py_compiler_last_run_date');
          const today = new Date().toDateString();
          if (lastRunStr !== today) {
            localStorage.setItem('py_compiler_last_run_date', today);
            setStreak(prev => {
              let next = prev;
              if (lastRunStr) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                if (lastRunStr === yesterday.toDateString()) {
                  next = prev + 1;
                } else {
                  next = 1;
                }
              } else {
                next = 1;
              }
              localStorage.setItem('py_compiler_streak', String(next));
              return next;
            });
          }
        } catch (e) {}
      } else {
        showToast("Execution failed with errors.", "error");
      }
    }
    wasRunningRef.current = py.isRunning;
  }, [py.isRunning, py.output]);

  // Award XP when package count increases
  const prevPackagesCountRef = useRef(py.installedPackages.length);
  useEffect(() => {
    if (py.installedPackages.length > prevPackagesCountRef.current) {
      setXp(prev => {
        const next = prev + 15;
        try { localStorage.setItem('py_compiler_xp', String(next)); } catch (e) {}
        return next;
      });
      showToast("Library installed! +15 XP");
    }
    prevPackagesCountRef.current = py.installedPackages.length;
  }, [py.installedPackages]);

  // Level & XP calculations
  const level = Math.floor(xp / 100) + 1;
  const progressPercent = xp % 100;

  // Level Up Modal Trigger
  const prevLevelRef = useRef(level);
  useEffect(() => {
    if (level > prevLevelRef.current) {
      setShowLevelUpModal(true);
    }
    prevLevelRef.current = level;
  }, [level]);

  // Sync Accent theme colors to custom properties
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', accentColor);
    document.documentElement.style.setProperty('--shadow-glow', `0 0 30px ${accentColor}40`);
    try {
      localStorage.setItem('py_compiler_accent', accentColor);
    } catch (e) {}
  }, [accentColor]);

  // Keep theme synced on document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', editorTheme === 'vs-dark' ? 'dark' : 'light');
    try {
      localStorage.setItem('py_compiler_theme', editorTheme);
    } catch (e) {}
  }, [editorTheme]);

  useEffect(() => {
    try {
      localStorage.setItem('py_compiler_fontsize', String(fontSize));
    } catch (e) {}
  }, [fontSize]);

  // Close drop menus on clicking outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowKebabMenu(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Adjust collapse status on small mobile screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDownloadActiveFile = () => {
    const activeFile = fs.files[fs.activeFileId];
    if (!activeFile) {
      showToast("No active file open.", "error");
      return;
    }
    try {
      const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = activeFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${activeFile.name}`);
    } catch (e) {
      showToast("Download failed.", "error");
    }
  };

  const handleExportWorkspace = () => {
    try {
      const exportData = {
        version: 1,
        timestamp: Date.now(),
        files: fs.files
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pycraft_workspace_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Workspace backup exported!");
    } catch (e) {
      showToast("Export failed.", "error");
    }
  };

  const handleImportWorkspace = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (!imported || typeof imported.files !== 'object') {
          throw new Error("Invalid backup file format.");
        }

        if (window.confirm("CAUTION: Importing backup will OVERWRITE your current workspace files. Do you want to continue?")) {
          // Import files into DB
          const savePromises = Object.values(imported.files).map(node => saveFileToDB(node));
          await Promise.all(savePromises);

          showToast("Workspace imported! Reloading...");
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        }
      } catch (err) {
        alert("Failed to import workspace backup: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input selection
  };

  const handleRunCode = () => {
    if (!fs.activeFileId || !fs.files[fs.activeFileId]) return;
    
    if (window.innerWidth <= 768) {
      setMobileConsoleActive(true);
    }

    // Flush any pending debounced updates to DB before running
    fs.saveActiveFileImmediately(fs.activeFileId);

    const code = fs.files[fs.activeFileId].content;
    py.runCode(code, fs.files, stdin);
  };

  // Terminal drag-to-resize drag listeners
  const startResizeTerminal = (mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    setIsDraggingTerminal(true);
    const startHeight = terminalHeight;
    const startY = mouseDownEvent.clientY;

    const doDrag = (mouseMoveEvent) => {
      const deltaY = mouseMoveEvent.clientY - startY;
      const newHeight = startHeight - deltaY;
      if (newHeight >= 60 && newHeight <= 600) {
        setTerminalHeight(newHeight);
      }
    };

    const stopDrag = () => {
      setIsDraggingTerminal(false);
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const startTouchResizeTerminal = (touchStartEvent) => {
    setIsDraggingTerminal(true);
    const startHeight = terminalHeight;
    const startY = touchStartEvent.touches[0].clientY;

    const doTouchDrag = (touchMoveEvent) => {
      const deltaY = touchMoveEvent.touches[0].clientY - startY;
      const newHeight = startHeight - deltaY;
      if (newHeight >= 60 && newHeight <= 500) {
        setTerminalHeight(newHeight);
      }
    };

    const stopTouchDrag = () => {
      setIsDraggingTerminal(false);
      document.removeEventListener('touchmove', doTouchDrag);
      document.removeEventListener('touchend', stopTouchDrag);
    };

    document.addEventListener('touchmove', doTouchDrag);
    document.addEventListener('touchend', stopTouchDrag);
  };

  const activeFile = fs.files[fs.activeFileId];

  // 2. Lifecycle check: show frosted spinner if IndexedDB is loading workspace files
  if (!fs.isVFSLoaded) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0f172a',
        color: '#cbd5e1',
        gap: '16px'
      }}>
        <div className="loader-small" style={{ width: '32px', height: '32px', borderThickness: '3px' }}></div>
        <span style={{ fontSize: '14px', fontWeight: 600 }}>Loading PyCraft Workspace...</span>
      </div>
    );
  }

  // Render modal forms
  const renderPanelContent = () => {
    switch (activeTab) {
      case 'files':
        return (
          <FileExplorer
            files={fs.files}
            activeFileId={fs.activeFileId}
            createFile={(name, pId, type) => {
              const id = fs.createFile(name, pId, type);
              if (type === 'file') {
                setXp(prev => {
                  const next = prev + 5;
                  try { localStorage.setItem('py_compiler_xp', String(next)); } catch (e) {}
                  return next;
                });
                showToast("File created! +5 XP");
              }
              return id;
            }}
            renameNode={fs.renameNode}
            deleteNode={fs.deleteNode}
            openFile={fs.openFile}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      {/* Ambient drifting background bubbles */}
      <div className="bg-glow-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      {/* Main Header */}
      <header className="app-header">
        <div className="header-logo" onClick={() => setIsCollapsed(!isCollapsed)}>
          <TerminalIcon size={20} />
          <h2>PyCraft</h2>
        </div>

        {/* Gamified stats bar (Mimo style) */}
        <div className="header-gamified-stats">
          <div className="stat-badge streak" title="Daily coding streak">
            <span>🔥</span>
            <span>{streak}d</span>
          </div>
          <div className="stat-badge xp" title="Experience Points">
            <span>⚡</span>
            <span>{xp} XP</span>
          </div>
          <div className="stat-badge level" title="PyCraft Level">
            <span>🏆</span>
            <span>Lv. {level}</span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="header-actions">
          {/* Run / Stop / Loading Code Execution Button */}
          {(() => {
            if (py.status === 'uninitialized' || py.status === 'loading' || py.status === 'loading_micropip') {
              return (
                <button className="btn btn-primary" disabled style={{ opacity: 0.7, padding: '6px 14px' }}>
                  <div className="loader-small" style={{ marginRight: '6px' }}></div>
                  Loading...
                </button>
              );
            }
            if (py.status === 'error') {
              return (
                <button className="btn btn-secondary" disabled style={{ padding: '6px 12px', borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' }}>
                  Engine Error
                </button>
              );
            }
            if (py.isRunning) {
              return (
                <button className="btn btn-secondary" onClick={py.stopExecution} style={{ padding: '6px 12px', borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' }}>
                  <Square size={14} fill="var(--accent-rose)" />
                  Stop
                </button>
              );
            }
            return (
              <button 
                className="btn btn-primary" 
                onClick={handleRunCode}
                disabled={!activeFile}
                style={{ padding: '6px 16px', opacity: !activeFile ? 0.6 : 1 }}
              >
                <Play size={14} fill="#ffffff" />
                Run
              </button>
            );
          })()}

          {/* User profile identifier */}
          <div className="user-profile-badge" onClick={() => setShowSettingsModal(true)}>
            <span className="user-avatar-mini">
              {(() => {
                const Icon = AVATAR_MAP[user.avatar] || AVATAR_MAP.user;
                return <Icon size={12} />;
              })()}
            </span>
            <span className="desktop-only">{user.username}</span>
          </div>

          {/* Three-Dots Menu trigger dropdown */}
          <div className="header-dropdown-trigger">
            <button 
              className="btn-icon" 
              onClick={(e) => {
                e.stopPropagation();
                setShowKebabMenu(!showKebabMenu);
              }}
              style={{ width: '32px', height: '32px' }}
            >
              <EllipsisVertical size={18} />
            </button>

            {showKebabMenu && (
              <div className="header-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                <button className="dropdown-item" onClick={() => { setIsCollapsed(!isCollapsed); setShowKebabMenu(false); }}>
                  <FilesIcon size={16} />
                  <span>Toggle File Explorer</span>
                </button>
                <button className="dropdown-item" onClick={() => { setShowPackagesModal(true); setShowKebabMenu(false); }}>
                  <PackageIcon size={16} />
                  <span>Install PIP Packages...</span>
                </button>
                <button className="dropdown-item" onClick={() => { setShowSettingsModal(true); setShowKebabMenu(false); }}>
                  <SettingsIcon size={16} />
                  <span>IDE Settings...</span>
                </button>
                <button className="dropdown-item" onClick={() => { py.clearOutput(); setShowKebabMenu(false); }}>
                  <TerminalIcon size={16} />
                  <span>Clear Terminal Outputs</span>
                </button>
                
                <div className="dropdown-divider"></div>
                {activeFile && (
                  <button className="dropdown-item" onClick={() => { handleDownloadActiveFile(); setShowKebabMenu(false); }}>
                    <Download size={16} />
                    <span>Download Active File</span>
                  </button>
                )}
                <button className="dropdown-item" onClick={() => { handleExportWorkspace(); setShowKebabMenu(false); }}>
                  <Download size={16} />
                  <span>Export Workspace Backup</span>
                </button>
                <button className="dropdown-item" onClick={() => { document.getElementById('import-workspace-file').click(); setShowKebabMenu(false); }}>
                  <Upload size={16} />
                  <span>Import Workspace Backup</span>
                </button>

                <div className="dropdown-divider"></div>
                <button className="dropdown-item danger" onClick={() => { fs.forceResetVFS(); setShowKebabMenu(false); }}>
                  <XIcon size={16} />
                  <span>Reset Project VFS</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mimo Style Progress Bar under Header */}
      <div className="xp-progress-bar-container">
        <div className="xp-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Workspace Panel Layout */}
      <div className="workspace-layout">
        {/* Slim Activity Bar (VS Code style activity triggers) */}
        <div className="activity-bar">
          <button 
            className={`btn-icon ${!isCollapsed ? 'active' : ''}`}
            onClick={() => setIsCollapsed(!isCollapsed)}
            title="Toggle File Explorer"
          >
            <FilesIcon size={20} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="btn-icon" onClick={() => setShowPackagesModal(true)} title="Install PIP Packages">
              <PackageIcon size={20} />
            </button>
            <button className="btn-icon" onClick={() => setShowSettingsModal(true)} title="IDE Settings">
              <SettingsIcon size={20} />
            </button>
          </div>
        </div>

        {/* Workspace drawer panel (EXCLUSIVELY handles File Explorer tree like VS Code) */}
        <div className={`workspace-panel ${isCollapsed ? 'collapsed' : ''}`}>
          <div className="mobile-panel-header">
            <button 
              className="btn-icon" 
              onClick={() => setIsCollapsed(true)} 
              title="Close Explorer"
              style={{ width: '32px', height: '32px' }}
            >
              <XIcon size={18} />
            </button>
          </div>
          <div className="panel-header">
            <h3>Files</h3>
          </div>
          <div className="panel-content">
            {renderPanelContent()}
          </div>
        </div>

        {/* Editor & Terminal container */}
        <div className="main-content">
          <div className="editor-container">
            {/* Editor Tab strip */}
            {fs.openFileIds.length > 0 && (
              <div className="editor-tabs">
                {fs.openFileIds.map((id) => {
                  const node = fs.files[id];
                  if (!node) return null;
                  return (
                    <div
                      key={id}
                      className={`editor-tab ${fs.activeFileId === id ? 'active' : ''}`}
                      onClick={() => fs.setActiveFileId(id)}
                    >
                      <span>{node.name}</span>
                      <button
                        className="editor-tab-close"
                        onClick={(e) => {
                          e.stopPropagation();
                          fs.closeFile(id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Editor Area / Welcome Screen Tab (VS Code Get Started feel) */}
            <div className="editor-area glass-panel">
              {activeFile ? (
                <Editor
                  fileId={activeFile.id}
                  content={activeFile.content}
                  onChange={(newContent) => fs.updateFileContent(activeFile.id, newContent)}
                  theme={editorTheme}
                  fontSize={fontSize}
                />
              ) : (
                <div className="welcome-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '20px', overflowY: 'auto', padding: '24px' }}>
                  <div className="welcome-logo" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <TerminalIcon size={48} style={{ color: 'var(--accent-primary)', filter: 'drop-shadow(0 0 10px var(--accent-primary))' }} />
                    <h1 style={{ fontSize: '24px', fontWeight: 800 }}>PyCraft Compiler</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '360px', lineHeight: 1.5 }}>
                      A professional, gamified client-side compiler environment running Python inside WebAssembly.
                    </p>
                  </div>
                  
                  {/* Gamified Dashboard Card (Mimo style) */}
                  <div className="welcome-dashboard glass-panel" style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    width: '100%',
                    maxWidth: '360px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'rgba(255,255,255,0.01)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>CODER DASHBOARD</span>
                      <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 800 }}>Level {level}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <div style={{ fontSize: '32px' }}>🏆</div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          <span>XP progress</span>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{progressPercent} / 100 XP</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${progressPercent}%`, background: 'var(--accent-primary)', boxShadow: '0 0 8px var(--accent-primary)' }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px dashed var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>🔥 {streak} Days</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Coding Streak</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>⚡ {xp} XP</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total Experience</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="welcome-actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', width: '100%', maxWidth: '360px' }}>
                    <div className="welcome-action-card" onClick={() => fs.createFile('untitled.py', 'root', 'file')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all var(--transition-fast)' }}>
                      <Plus size={16} />
                      <span style={{ fontSize: '11px', fontWeight: 600 }}>New script</span>
                    </div>
                    <div className="welcome-action-card" onClick={() => setIsCollapsed(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all var(--transition-fast)' }}>
                      <FilesIcon size={16} />
                      <span style={{ fontSize: '11px', fontWeight: 600 }}>Open files</span>
                    </div>
                    <div className="welcome-action-card" onClick={() => document.getElementById('import-workspace-file').click()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all var(--transition-fast)' }}>
                      <Upload size={16} />
                      <span style={{ fontSize: '11px', fontWeight: 600 }}>Import VFS</span>
                    </div>
                  </div>

                  {/* Starter Templates Section */}
                  <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)', letterSpacing: '0.05em', textAlign: 'left' }}>STARTER TEMPLATES</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {[
                        {
                          name: 'Interactive Input Demo',
                          filename: 'input_demo.py',
                          icon: '⚡',
                          content: '# Interactive Input Demo\nname = input("Enter your name: ")\nage = input("Enter your age: ")\nprint(f"\\nHello {name}! You are {age} years old.")\nprint("Interactive console input is fully operational! ⚡")\n'
                        },
                        {
                          name: 'Algorithms (Fibonacci)',
                          filename: 'fibonacci.py',
                          icon: '🔢',
                          content: '# Fibonacci Generator Loop\ndef fib(n):\n    a, b = 0, 1\n    result = []\n    for _ in range(n):\n        result.append(a)\n        a, b = b, a + b\n    return result\n\nterms = 10\nprint(f"First {terms} terms of Fibonacci:")\nprint(fib(terms))\n'
                        },
                        {
                          name: 'Scientific integration (Sympy)',
                          filename: 'sympy_test.py',
                          icon: '📐',
                          content: '# Sympy Integration Demo\n# Note: install \'sympy\' in the Packages tab first!\ntry:\n    import sympy as sp\n    x = sp.Symbol(\'x\')\n    expr = sp.integrate(sp.sin(x), x)\n    print("Integral of sin(x) w.r.t x is:")\n    print(" ->", expr)\nexcept ImportError:\n    print("Sympy not installed. Install it via Packages.")\n'
                        }
                      ].map((tmpl, idx) => (
                        <div 
                          key={idx}
                          onClick={() => {
                            const existing = Object.values(fs.files).find(f => f.name.toLowerCase() === tmpl.filename.toLowerCase() && f.parentId === 'root');
                            if (existing) {
                              fs.openFile(existing.id);
                              showToast(`Opened existing ${tmpl.filename}`);
                            } else {
                              const newId = fs.createFile(tmpl.filename, 'root', 'file');
                              fs.updateFileContent(newId, tmpl.content);
                              showToast(`Created ${tmpl.filename}!`);
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                            fontSize: '12px'
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>{tmpl.icon}</span>
                          <div style={{ flex: 1, textAlign: 'left' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tmpl.name}</div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{tmpl.filename}</div>
                          </div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Load &rarr;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RESIZABLE Terminal Console Splitter handle */}
          <div 
            className={`terminal-splitter ${isDraggingTerminal ? 'dragging' : ''}`}
            onMouseDown={startResizeTerminal}
            onTouchStart={startTouchResizeTerminal}
          />

          {/* Terminal output console (Overlay styled on mobile active console runs) */}
          <div 
            style={{ height: `${terminalHeight}px` }} 
            className={`terminal-panel ${mobileConsoleActive ? 'mobile-active' : ''}`}
          >
            <Terminal
              output={py.output}
              clearOutput={py.clearOutput}
              isRunning={py.isRunning}
              showClose={mobileConsoleActive}
              onClose={() => setMobileConsoleActive(false)}
              stdin={stdin}
              setStdin={setStdin}
              isWaitingForInput={py.isWaitingForInput}
              submitInteractiveInput={py.submitInteractiveInput}
            />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Visible only on mobile screens) */}
      <div className="mobile-nav-bar">
        <button 
          className={`mobile-nav-item ${!isCollapsed && !mobileConsoleActive ? 'active' : ''}`}
          onClick={() => {
            setIsCollapsed(false);
            setMobileConsoleActive(false);
          }}
        >
          <FilesIcon size={20} />
          <span>Explorer</span>
        </button>

        <button 
          className={`mobile-nav-item ${mobileConsoleActive ? 'active' : ''}`}
          onClick={() => {
            setMobileConsoleActive(!mobileConsoleActive);
            setIsCollapsed(true);
          }}
        >
          <TerminalIcon size={20} />
          <span>Console</span>
        </button>

        <button 
          className="mobile-nav-item"
          onClick={() => {
            setShowPackagesModal(true);
            setMobileConsoleActive(false);
          }}
        >
          <PackageIcon size={20} />
          <span>Packages</span>
        </button>

        <button 
          className="mobile-nav-item"
          onClick={() => {
            setShowSettingsModal(true);
            setMobileConsoleActive(false);
          }}
        >
          <SettingsIcon size={20} />
          <span>Settings</span>
        </button>
      </div>

      {/* --- PIP PACKAGE MANAGER MODAL DIALOG --- */}
      {showPackagesModal && (
        <div className="modal-overlay" onClick={() => setShowPackagesModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Pip Packages</h3>
              <button className="btn-icon" onClick={() => setShowPackagesModal(false)}>
                <XIcon size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
              <PackageManager
                installedPackages={py.installedPackages}
                installingPackageName={py.installingPackageName}
                installPackage={py.installPackage}
                status={py.status}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- SETTINGS MODAL DIALOG --- */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Workspace Preferences</h3>
              <button className="btn-icon" onClick={() => setShowSettingsModal(false)}>
                <XIcon size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
              <Settings
                user={user}
                setUser={setUser}
                editorTheme={editorTheme}
                setEditorTheme={setEditorTheme}
                fontSize={fontSize}
                setFontSize={setFontSize}
                accentColor={accentColor}
                setAccentColor={setAccentColor}
                forceResetVFS={fs.forceResetVFS}
              />
            </div>
          </div>
        </div>
      )}

      {/* Celebratory Confetti Level-Up Modal */}
      {showLevelUpModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-card level-up-animation" style={{ textAlign: 'center', maxWidth: '380px', padding: '32px' }}>
            <div style={{ fontSize: '56px', marginBottom: '10px' }}>🏆</div>
            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: 800,
              background: 'linear-gradient(135deg, var(--color-level), #00e5ff)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              marginBottom: '10px'
            }}>
              Level Up!
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
              Awesome coding! You reached <strong>Level {level}</strong>. Your Python skills are leveling up fast! Keep exploring.
            </p>
            <button className="btn btn-primary" style={{ width: '100%', animation: 'none' }} onClick={() => setShowLevelUpModal(false)}>
              Continue Coder Path
            </button>
          </div>
        </div>
      )}

      {/* Toast Alert Banner */}
      {toast && (
        <div 
          style={{
            position: 'fixed',
            bottom: '76px',
            right: '24px',
            background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(15, 23, 42, 0.95)',
            border: toast.type === 'error' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(99, 102, 241, 0.3)',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 700,
            zIndex: 2000,
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'bounceScaleUp 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.25)'
          }}
        >
          {toast.type === 'success' && '✓'}
          {toast.type === 'info' && '🛈'}
          {toast.type === 'error' && '⚠'}
          <span>{toast.message}</span>
        </div>
      )}

      <input 
        type="file" 
        id="import-workspace-file" 
        accept=".json" 
        style={{ display: 'none' }} 
        onChange={handleImportWorkspace} 
      />

    </div>
  );
}
