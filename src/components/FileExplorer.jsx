import React, { useState } from 'react';
import { 
  Folder, FolderOpen, FileCode, File, 
  Plus, FolderPlus, Trash2, Edit3, Check, X, Search 
} from 'lucide-react';

export default function FileExplorer({
  files,
  activeFileId,
  createFile,
  renameNode,
  deleteNode,
  openFile
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('name'); // 'name' | 'content'
  const [expanded, setExpanded] = useState({ root: true });
  const [creating, setCreating] = useState(null); // { parentId, type: 'file' | 'dir' }
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartCreate = (parentId, type, e) => {
    e.stopPropagation();
    setExpanded(prev => ({ ...prev, [parentId]: true }));
    setCreating({ parentId, type });
    setNewName(type === 'file' ? 'untitled.py' : 'New Folder');
  };

  const validateName = (name, parentId, type, excludeId = null) => {
    const trimmed = name.trim();
    if (!trimmed) {
      alert("Name cannot be empty.");
      return false;
    }
    
    if (/[\\/:*?"<>|]/.test(trimmed)) {
      alert("Names cannot contain invalid characters: \\ / : * ? \" < > |");
      return false;
    }
    
    const isDuplicate = Object.values(files).some(
      node => 
        node.parentId === parentId && 
        node.name.toLowerCase() === trimmed.toLowerCase() && 
        node.id !== excludeId
    );
    
    if (isDuplicate) {
      alert(`A ${type === 'file' ? 'file' : 'folder'} named "${trimmed}" already exists in this folder.`);
      return false;
    }
    
    return true;
  };

  const handleConfirmCreate = () => {
    let finalName = newName.trim();
    if (!finalName) {
      setCreating(null);
      return;
    }
    
    if (creating.type === 'file' && !finalName.endsWith('.py') && !finalName.includes('.')) {
      finalName += '.py';
    }

    if (!validateName(finalName, creating.parentId, creating.type)) {
      return;
    }

    createFile(finalName, creating.parentId, creating.type);
    setCreating(null);
    setNewName('');
  };

  const handleStartRename = (node, e) => {
    e.stopPropagation();
    setEditingId(node.id);
    setEditName(node.name);
  };

  const handleConfirmRename = () => {
    const finalName = editName.trim();
    if (!finalName || !editingId) {
      setEditingId(null);
      return;
    }

    const node = files[editingId];
    if (!node) {
      setEditingId(null);
      return;
    }

    if (!validateName(finalName, node.parentId, node.type, editingId)) {
      return;
    }

    renameNode(editingId, finalName);
    setEditingId(null);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (id === '1') {
      alert("main.py cannot be deleted as it is the project entrance point.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this?")) {
      deleteNode(id);
    }
  };

  // Helper to construct node path (for search view context)
  const getNodeDisplayPath = (nodeId) => {
    const node = files[nodeId];
    if (!node || nodeId === 'root' || !node.parentId || node.parentId === 'root') return '';
    const parentPath = getNodeDisplayPath(node.parentId);
    return parentPath ? `${parentPath}/${files[node.parentId].name}` : files[node.parentId].name;
  };

  // Helper to render tree nodes recursively
  const renderNode = (nodeId) => {
    const node = files[nodeId];
    if (!node) return null;

    const isDir = node.type === 'dir';
    const isExpanded = expanded[nodeId];
    const isActive = activeFileId === nodeId;
    const isEditing = editingId === nodeId;

    const children = Object.values(files).filter(n => n.parentId === nodeId);

    return (
      <div key={nodeId} className="file-node">
        {nodeId !== 'root' && (
          <div 
            className={`file-node-row ${isActive ? 'active' : ''}`}
            onClick={() => isDir ? toggleExpand(nodeId) : openFile(nodeId)}
          >
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }} onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  className="input-node-name"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleConfirmRename();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                  style={{ width: '100%', padding: '2px 4px', fontSize: '13px' }}
                />
                <button onClick={handleConfirmRename} className="btn-icon" style={{ width: '22px', height: '22px' }}>
                  <Check size={14} style={{ color: 'var(--accent-emerald)' }} />
                </button>
                <button onClick={() => setEditingId(null)} className="btn-icon" style={{ width: '22px', height: '22px' }}>
                  <XIcon size={14} style={{ color: 'var(--accent-rose)' }} />
                </button>
              </div>
            ) : (
              <>
                <div className="file-node-label">
                  {isDir ? (
                    isExpanded ? <FolderOpen size={14} style={{ color: 'var(--accent-amber)' }} /> 
                               : <Folder size={14} style={{ color: 'var(--accent-amber)' }} />
                  ) : (
                    node.name.endsWith('.py') 
                      ? <FileCode size={14} style={{ color: 'var(--accent-cyan)' }} />
                      : <File size={14} style={{ color: 'var(--text-secondary)' }} />
                  )}
                  <span>{node.name}</span>
                </div>

                <div className="file-node-actions">
                  {isDir && (
                    <>
                      <button 
                        onClick={(e) => handleStartCreate(nodeId, 'file', e)} 
                        title="New File"
                        className="btn-icon" 
                        style={{ width: '20px', height: '20px' }}
                      >
                        <Plus size={12} />
                      </button>
                      <button 
                        onClick={(e) => handleStartCreate(nodeId, 'dir', e)} 
                        title="New Folder"
                        className="btn-icon" 
                        style={{ width: '20px', height: '20px' }}
                      >
                        <FolderPlus size={12} />
                      </button>
                    </>
                  )}
                  <button 
                    onClick={(e) => handleStartRename(node, e)} 
                    title="Rename"
                    className="btn-icon" 
                    style={{ width: '20px', height: '20px' }}
                  >
                    <Edit3 size={12} />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(nodeId, e)} 
                    title="Delete"
                    className="btn-icon" 
                    style={{ width: '20px', height: '20px', color: 'var(--accent-rose)' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {creating && creating.parentId === nodeId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: nodeId === 'root' ? '0px' : '20px', padding: '4px' }}>
            {creating.type === 'file' ? <FileCode size={14} style={{ color: 'var(--text-muted)' }} /> : <Folder size={14} style={{ color: 'var(--text-muted)' }} />}
            <input
              type="text"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--accent-primary)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 6px',
                fontSize: '12px',
                width: '100px'
              }}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleConfirmCreate();
                if (e.key === 'Escape') setCreating(null);
              }}
              autoFocus
            />
            <button onClick={handleConfirmCreate} className="btn-icon" style={{ width: '22px', height: '22px' }}>
              <Check size={12} style={{ color: 'var(--accent-emerald)' }} />
            </button>
            <button onClick={() => setCreating(null)} className="btn-icon" style={{ width: '22px', height: '22px' }}>
              <X size={12} style={{ color: 'var(--accent-rose)' }} />
            </button>
          </div>
        )}

        {isDir && isExpanded && (
          <div className="file-node-children" style={{ marginLeft: nodeId === 'root' ? '0px' : '10px' }}>
            {children.map(child => renderNode(child.id))}
          </div>
        )}
      </div>
    );
  };

  // Filter VFS files by query (name or content)
  const filteredFiles = Object.values(files).filter(node => {
    if (node.type !== 'file') return false;
    if (searchMode === 'name') {
      return node.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    } else {
      return node.content && node.content.toLowerCase().includes(searchQuery.trim().toLowerCase());
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
      
      {/* File Action buttons */}
      <div className="file-tree-actions">
        <button 
          className="btn btn-secondary" 
          style={{ flex: 1, padding: '5px 10px', fontSize: '11px' }}
          onClick={(e) => handleStartCreate('root', 'file', e)}
        >
          <Plus size={12} />
          New File
        </button>
        <button 
          className="btn btn-secondary" 
          style={{ flex: 1, padding: '5px 10px', fontSize: '11px' }}
          onClick={(e) => handleStartCreate('root', 'dir', e)}
        >
          <FolderPlus size={12} />
          New Folder
        </button>
      </div>

      {/* VS Code Style Search Box */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={14} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder={searchMode === 'name' ? 'Search files...' : 'Search inside files...'}
          style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 26px 6px 28px',
            fontSize: '12px',
            color: 'var(--text-primary)'
          }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            style={{ position: 'absolute', right: '8px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Search Mode Toggle */}
      <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.01)', padding: '2px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-color)' }}>
        <button
          onClick={() => setSearchMode('name')}
          style={{
            flex: 1,
            background: searchMode === 'name' ? 'var(--accent-primary)' : 'transparent',
            color: searchMode === 'name' ? '#ffffff' : 'var(--text-secondary)',
            border: 'none',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '4px 0',
            borderRadius: 'var(--radius-xs)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          File Names
        </button>
        <button
          onClick={() => setSearchMode('content')}
          style={{
            flex: 1,
            background: searchMode === 'content' ? 'var(--accent-primary)' : 'transparent',
            color: searchMode === 'content' ? '#ffffff' : 'var(--text-secondary)',
            border: 'none',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '4px 0',
            borderRadius: 'var(--radius-xs)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          Full-Text Content
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {searchQuery.trim() ? (
          /* Search results listing */
          filteredFiles.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginTop: '12px' }}>
              No matching files found.
            </div>
          ) : (
            filteredFiles.map(node => {
              const path = getNodeDisplayPath(node.id);
              const isActive = activeFileId === node.id;

              // Preview lines matching query
              const previewLines = searchMode === 'content' ? (() => {
                const lines = (node.content || '').split('\n');
                const list = [];
                const query = searchQuery.trim().toLowerCase();
                lines.forEach((text, i) => {
                  if (text.toLowerCase().includes(query)) {
                    list.push({ lineNum: i + 1, text: text.trim() });
                  }
                });
                return list.slice(0, 3);
              })() : [];

              return (
                <div 
                  key={node.id}
                  className={`file-node-row ${isActive ? 'active' : ''}`}
                  onClick={() => openFile(node.id)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 10px', height: 'auto', gap: '4px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <FileCode size={14} style={{ color: 'var(--accent-cyan)' }} />
                    <span style={{ fontWeight: 600 }}>{node.name}</span>
                  </div>
                  {path && (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '22px' }}>
                      in {path}
                    </span>
                  )}
                  {searchMode === 'content' && previewLines.length > 0 && (
                    <div style={{ width: '100%', marginLeft: '22px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {previewLines.map((line, idx) => (
                        <div key={idx} style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.18)', padding: '2px 6px', borderRadius: 'var(--radius-xs)', wordBreak: 'break-all', border: '1px solid rgba(255,255,255,0.02)' }}>
                          <span style={{ color: 'var(--accent-primary)', marginRight: '4px', fontWeight: 'bold' }}>L{line.lineNum}:</span>
                          {line.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          /* Standard VFS Tree render */
          renderNode('root')
        )}
      </div>
    </div>
  );
}
