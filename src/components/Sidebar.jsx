import React from 'react';
import { Files, Package, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { AVATAR_MAP } from '../utils/avatars';

export default function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  user,
  onLogout
}) {
  const tabs = [
    { id: 'files', label: 'File Explorer', icon: Files },
    { id: 'packages', label: 'Package Manager', icon: Package },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const handleTabClick = (tabId) => {
    if (activeTab === tabId) {
      // Toggle collapse
      setIsCollapsed(!isCollapsed);
    } else {
      setActiveTab(tabId);
      setIsCollapsed(false);
    }
  };

  return (
    <aside className="app-sidebar">
      <div className="sidebar-nav-group">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`btn-icon ${activeTab === tab.id && !isCollapsed ? 'active' : ''}`}
              title={tab.label}
              onClick={() => handleTabClick(tab.id)}
            >
              <Icon size={20} />
            </button>
          );
        })}

        {/* Handy toggle for mobile screens */}
        <button
          className="btn-icon mobile-only"
          style={{ marginTop: '10px' }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Panel" : "Collapse Panel"}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <div className="sidebar-nav-group">
        {user && (
          <div 
            className="user-avatar-mini" 
            title={`Logged in as ${user.username}`}
            style={{ cursor: 'default' }}
          >
            {(() => {
              const Icon = AVATAR_MAP[user.avatar] || AVATAR_MAP.user;
              return <Icon size={14} />;
            })()}
          </div>
        )}
        
        <button 
          className="btn-icon" 
          title="Sign Out" 
          onClick={onLogout}
          style={{ color: 'var(--accent-rose)' }}
        >
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
}
