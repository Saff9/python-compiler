import React, { useState } from 'react';
import { User, Eye, Monitor, Trash2, HelpCircle } from 'lucide-react';
import { AVATAR_MAP, AVATAR_IDS } from '../utils/avatars';

const ACCENTS = [
  { name: 'Indigo Space', value: '#6366f1' },
  { name: 'Cyber Amber', value: '#f59e0b' },
  { name: 'Emerald Forest', value: '#10b981' },
  { name: 'Ocean Cyan', value: '#06b6d4' },
  { name: 'Sunset Crimson', value: '#f43f5e' }
];

const PYTHON_TIPS = [
  { title: "List Comprehension", code: "[x**2 for x in range(5)]", desc: "A fast, readable way to generate lists in a single line." },
  { title: "Variable Swapping", code: "a, b = b, a", desc: "Swap values instantly without needing a temp variable!" },
  { title: "F-Strings Formatting", code: "print(f'Val: {x:.2f}')", desc: "Format variables directly inside your strings with ease." },
  { title: "Enumerate Loop", code: "for idx, val in enumerate(arr):", desc: "Retrieve index and value concurrently during iterations." }
];

export default function Settings({
  user,
  setUser,
  editorTheme,
  setEditorTheme,
  fontSize,
  setFontSize,
  accentColor,
  setAccentColor,
  forceResetVFS
}) {
  const [username, setUsername] = useState(user.username);
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [tipIndex, setTipIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    const updatedUser = {
      username: username.trim(),
      avatar: selectedAvatar
    };
    
    localStorage.setItem('py_compiler_session', JSON.stringify(updatedUser));

    const savedUsers = localStorage.getItem('py_compiler_users');
    if (savedUsers) {
      const users = JSON.parse(savedUsers);
      const oldKey = user.username.toLowerCase();
      const newKey = username.trim().toLowerCase();

      const userData = users[oldKey] || { created: Date.now() };
      userData.username = username.trim();
      userData.avatar = selectedAvatar;

      if (oldKey !== newKey) {
        delete users[oldKey];
      }
      users[newKey] = userData;
      localStorage.setItem('py_compiler_users', JSON.stringify(users));
    }

    setUser(updatedUser);
    setSuccessMsg('Profile updated successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleResetVFS = () => {
    if (window.confirm("CAUTION: This will delete ALL folders and python files and restore the default template scripts. Are you sure?")) {
      forceResetVFS().catch(err => {
        console.error("VFS Reset Error:", err);
        alert("Failed to reset workspace database. Try clearing your browser cache.");
      });
    }
  };

  const nextTip = () => {
    setIsFlipped(true);
    setTimeout(() => {
      setTipIndex((prev) => (prev + 1) % PYTHON_TIPS.length);
      setIsFlipped(false);
    }, 250);
  };

  const currentTip = PYTHON_TIPS[tipIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Profile Settings */}
      <div className="settings-section">
        <h4>
          <User size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
          User Profile
        </h4>
        
        {successMsg && (
          <div style={{
            fontSize: '12px',
            color: 'var(--accent-emerald)',
            background: 'rgba(16, 185, 129, 0.08)',
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            textAlign: 'center'
          }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-username-input">Workspace Username</label>
            <input
              id="edit-username-input"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ paddingLeft: '12px' }}
            />
          </div>

          <div className="avatar-selector">
            <label className="form-label">Avatar Icon</label>
            <div className="avatar-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {AVATAR_IDS.map((id) => {
                const Icon = AVATAR_MAP[id];
                return (
                  <div
                    key={id}
                    className={`avatar-option ${selectedAvatar === id ? 'selected' : ''}`}
                    onClick={() => setSelectedAvatar(id)}
                  >
                    <Icon size={18} />
                  </div>
                );
              })}
            </div>
          </div>

          <button type="submit" className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px' }}>
            Save Profile Changes
          </button>
        </form>
      </div>

      {/* Aesthetic Accents Theme Selector */}
      <div className="settings-section">
        <h4>
          <Eye size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
          Custom Themes & Fonts
        </h4>

        {/* Accent Color Circles */}
        <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="form-label">Accent Theme Color</label>
          <div style={{ display: 'flex', gap: '10px', padding: '4px 0' }}>
            {ACCENTS.map((acc) => (
              <div
                key={acc.name}
                onClick={() => setAccentColor(acc.value)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: acc.value,
                  cursor: 'pointer',
                  border: accentColor === acc.value ? '2.5px solid #ffffff' : '1.5px solid rgba(255,255,255,0.1)',
                  boxShadow: accentColor === acc.value ? `0 0 12px ${acc.value}` : 'none',
                  transition: 'all var(--transition-fast)'
                }}
                title={acc.name}
              />
            ))}
          </div>
        </div>

        <div className="settings-row" style={{ marginBottom: '10px' }}>
          <label htmlFor="theme-select">Editor Theme</label>
          <select
            id="theme-select"
            className="settings-select"
            value={editorTheme}
            onChange={(e) => setEditorTheme(e.target.value)}
          >
            <option value="vs-dark">Aesthetic Dark</option>
            <option value="light">Classic Light</option>
          </select>
        </div>

        <div className="settings-row">
          <label htmlFor="font-size-select">Font Size</label>
          <select
            id="font-size-select"
            className="settings-select"
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
          >
            <option value={12}>12 px</option>
            <option value={14}>14 px</option>
            <option value={16}>16 px</option>
            <option value={18}>18 px</option>
            <option value={20}>20 px</option>
          </select>
        </div>
      </div>

      {/* Coding Tips Interactive Flipping Card (Mimo style) */}
      <div className="settings-section">
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <HelpCircle size={14} />
          Python Code Tip
        </h4>
        <div 
          onClick={nextTip}
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            cursor: 'pointer',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            opacity: isFlipped ? 0.3 : 1,
            transition: 'opacity 0.25s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          title="Click to flip tip!"
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              {currentTip.title}
            </div>
            <code style={{ fontSize: '12px', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', display: 'inline-block', width: '100%', wordBreak: 'break-all', color: 'var(--text-primary)', marginBottom: '8px' }}>
              {currentTip.code}
            </code>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {currentTip.desc}
            </p>
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '6px' }}>
            Click to rotate &rarr;
          </div>
        </div>
      </div>

      {/* Reset Operations */}
      <div className="settings-section">
        <h4>
          <Monitor size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
          Workspace Maintenance
        </h4>

        <button 
          onClick={handleResetVFS} 
          className="btn btn-secondary"
          style={{ 
            color: 'var(--accent-rose)', 
            borderColor: 'rgba(244, 63, 94, 0.2)',
            background: 'rgba(244, 63, 94, 0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '13px'
          }}
        >
          <Trash2 size={14} />
          Reset File System
        </button>
      </div>

    </div>
  );
}
