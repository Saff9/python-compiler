import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Terminal as TerminalIcon, X as XIcon, Keyboard } from 'lucide-react';

export default function Terminal({ 
  output, 
  clearOutput, 
  isRunning, 
  showClose, 
  onClose,
  stdin,
  setStdin,
  isWaitingForInput,
  submitInteractiveInput
}) {
  const [activeSubTab, setActiveSubTab] = useState('output'); // 'output' | 'stdin'
  const [interactiveInput, setInteractiveInput] = useState('');
  const terminalEndRef = useRef(null);
  const interactiveInputRef = useRef(null);

  // Focus input when waiting for input
  useEffect(() => {
    if (isWaitingForInput && activeSubTab === 'output' && interactiveInputRef.current) {
      interactiveInputRef.current.focus();
    }
  }, [isWaitingForInput, activeSubTab]);

  useEffect(() => {
    if (terminalEndRef.current && activeSubTab === 'output') {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output, activeSubTab, isWaitingForInput]);

  const handleInteractiveSubmit = (e) => {
    if (e.key === 'Enter') {
      submitInteractiveInput(interactiveInput);
      setInteractiveInput('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Terminal Header Tabs */}
      <div className="terminal-header" style={{ padding: '0 10px' }}>
        <div style={{ display: 'flex', gap: '4px', height: '100%', alignItems: 'center' }}>
          <button 
            className={`terminal-tab-btn ${activeSubTab === 'output' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('output')}
            style={{ 
              fontSize: '12px',
              padding: '4px 10px',
              background: activeSubTab === 'output' ? 'rgba(255,255,255,0.03)' : 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-xs)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <TerminalIcon size={12} />
            Output
          </button>
          
          <button 
            className={`terminal-tab-btn ${activeSubTab === 'stdin' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('stdin')}
            style={{ 
              fontSize: '12px',
              padding: '4px 10px',
              background: activeSubTab === 'stdin' ? 'rgba(255,255,255,0.03)' : 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-xs)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Keyboard size={12} />
            Input (stdin)
          </button>
        </div>

        <div className="terminal-controls">
          {isRunning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '10px' }}>
              <div className="loader-small" style={{ width: '12px', height: '12px' }}></div>
              <span style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>Running...</span>
            </div>
          )}
          
          {activeSubTab === 'output' && (
            <button 
              className="btn-icon" 
              onClick={clearOutput} 
              title="Clear Console"
              style={{ width: '28px', height: '28px' }}
            >
              <Trash2 size={14} />
            </button>
          )}

          {showClose && (
            <button 
              className="btn-icon" 
              onClick={onClose} 
              title="Close Console"
              style={{ width: '28px', height: '28px', marginLeft: '6px', color: 'var(--accent-rose)' }}
            >
              <XIcon size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Content Body */}
      <div 
        className="terminal-body" 
        style={{ 
          flex: 1, 
          backgroundColor: 'var(--bg-terminal)', 
          padding: '0', 
          display: 'flex', 
          flexDirection: 'column',
          cursor: isWaitingForInput ? 'text' : 'default'
        }}
        onClick={() => {
          if (isWaitingForInput && interactiveInputRef.current) {
            interactiveInputRef.current.focus();
          }
        }}
      >
        {activeSubTab === 'output' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {output.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px' }}>
                Console idle. Click 'Run' to execute code and see output here.
              </div>
            ) : (
              output.map((line, idx) => (
                <div 
                  key={idx} 
                  className={`terminal-line ${line.type}`}
                  style={line.type === 'stdin_echo' ? { color: 'var(--accent-cyan)', fontWeight: 'bold' } : {}}
                >
                  {line.type === 'stdin_echo' ? `> ${line.text}` : line.text}
                </div>
              ))
            )}
            
            {isWaitingForInput && (
              <div 
                className="terminal-input-prompt-line"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  marginTop: '4px',
                  color: 'var(--accent-cyan)'
                }}
              >
                <span style={{ fontWeight: 'bold' }}>&gt;</span>
                <input
                  ref={interactiveInputRef}
                  type="text"
                  value={interactiveInput}
                  onChange={(e) => setInteractiveInput(e.target.value)}
                  onKeyDown={handleInteractiveSubmit}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    padding: '0',
                    caretColor: 'var(--accent-cyan)'
                  }}
                  placeholder="Enter input here and press Enter..."
                />
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>
        ) : (
          <textarea
            placeholder="Provide mock standard inputs here (one per line) for Python scripts using input()..."
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            style={{
              flex: 1,
              width: '100%',
              background: 'transparent',
              border: 'none',
              resize: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              outline: 'none',
              padding: '12px 16px',
              lineHeight: '1.6'
            }}
          />
        )}
      </div>
    </div>
  );
}
