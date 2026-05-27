import React, { useState } from 'react';
import { Search, Download, Check, HelpCircle } from 'lucide-react';

export default function PackageManager({
  installedPackages,
  installingPackageName,
  installPackage,
  status
}) {
  const [packageName, setPackageName] = useState('');

  const handleInstall = (e) => {
    e.preventDefault();
    if (!packageName.trim() || status !== 'ready' || installingPackageName) return;
    
    installPackage(packageName.trim().toLowerCase());
    setPackageName('');
  };

  const isCompilerReady = status === 'ready';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      
      {/* Install input form */}
      <form onSubmit={handleInstall} className="package-search-box">
        <input
          type="text"
          placeholder="e.g. sympy, requests, numpy"
          value={packageName}
          onChange={(e) => setPackageName(e.target.value)}
          disabled={!isCompilerReady || !!installingPackageName}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ padding: '8px 12px' }}
          disabled={!isCompilerReady || !!installingPackageName || !packageName.trim()}
          title="Install package"
        >
          {installingPackageName ? (
            <div className="loader-small"></div>
          ) : (
            <Download size={16} />
          )}
        </button>
      </form>

      {/* Compiler Initialization Warning */}
      {!isCompilerReady && (
        <div style={{
          fontSize: '12px',
          color: 'var(--accent-amber)',
          background: 'rgba(245, 158, 11, 0.08)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(245, 158, 11, 0.2)'
        }}>
          Waiting for Python engine initialization before installing pip packages.
        </div>
      )}

      {/* Package installing status */}
      {installingPackageName && (
        <div style={{
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'var(--accent-cyan)',
          background: 'rgba(6, 182, 212, 0.08)',
          padding: '10px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(6, 182, 212, 0.2)'
        }}>
          <div className="loader-small" style={{ borderTopColor: 'var(--accent-cyan)' }}></div>
          <span>Installing <strong>{installingPackageName}</strong>...</span>
        </div>
      )}

      {/* Installed Packages List */}
      <div>
        <h4 style={{ 
          fontSize: '12px', 
          fontWeight: 600, 
          color: 'var(--text-muted)', 
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '8px'
        }}>
          Installed Modules ({installedPackages.length})
        </h4>

        {installedPackages.length === 0 ? (
          <div style={{ 
            color: 'var(--text-muted)', 
            fontSize: '12px', 
            fontStyle: 'italic',
            padding: '12px 8px'
          }}>
            No custom packages installed yet.
          </div>
        ) : (
          <div className="installed-packages-list">
            {installedPackages.map((pkg) => (
              <div key={pkg} className="package-item">
                <div className="package-info">
                  <span className="package-name">{pkg}</span>
                  <span className="package-version">via micropip</span>
                </div>
                <div style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center' }}>
                  <Check size={16} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Informative Help Guide */}
      <div className="glass-panel" style={{ 
        marginTop: 'auto', 
        padding: '12px', 
        fontSize: '12px', 
        color: 'var(--text-secondary)',
        lineHeight: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)' }}>
          <HelpCircle size={14} style={{ color: 'var(--accent-primary)' }} />
          <span>Pip package info</span>
        </div>
        <p>Pyodide runs Python in Wasm. It supports:</p>
        <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <li>Pure Python packages (pip wheels).</li>
          <li>Pre-compiled standard science packages (numpy, pandas, sympy, scipy).</li>
          <li>Note: offline installs are loaded from browser memory cache.</li>
        </ul>
      </div>

    </div>
  );
}
