import { useState, useRef, useEffect } from 'react';
import Terminal from '../Terminal/Terminal';
import './BottomTerminal.css';

const BottomTerminal = ({ isOpen, onClose, onHeightChange }) => {
  const [terminals, setTerminals] = useState([{ id: 1, title: 'Terminal 1' }]);
  const [activeTerminalId, setActiveTerminalId] = useState(1);
  const [panelHeight, setPanelHeight] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef(null);
  const nextTerminalId = useRef(2);

  // Notify parent about height changes
  useEffect(() => {
    if (onHeightChange) {
      onHeightChange(panelHeight);
    }
  }, [panelHeight, onHeightChange]);

  // AUTO-RENUMBER:  Update terminal titles when terminals change
  useEffect(() => {
    setTerminals(prevTerminals => 
      prevTerminals.map((terminal, index) => ({
        ...terminal,
        title: `Terminal ${index + 1}`
      }))
    );
  }, [terminals. length]); // Only when count changes

  // Handle resize dengan mouse drag
  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const newHeight = window.innerHeight - e.clientY;
      
      const minHeight = 120;
      const maxHeight = window. innerHeight * 0.7;
      
      if (newHeight >= minHeight && newHeight <= maxHeight) {
        setPanelHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Tambah terminal baru
  const handleAddTerminal = () => {
    const newTerminal = {
      id:  nextTerminalId. current,
      title: `Terminal ${terminals.length + 1}` // Will be auto-updated by useEffect
    };
    setTerminals([... terminals, newTerminal]);
    setActiveTerminalId(newTerminal.id);
    nextTerminalId.current += 1;
  };

  // Hapus terminal
  const handleCloseTerminal = (terminalId) => {
    if (terminals. length === 1) {
      return;
    }

    const newTerminals = terminals.filter(t => t.id !== terminalId);
    setTerminals(newTerminals);

    // Jika terminal yang ditutup adalah yang aktif, pindah ke terminal lain
    if (activeTerminalId === terminalId) {
      setActiveTerminalId(newTerminals[0].id);
    }
  };

  // Ganti nama terminal
  const handleRenameTerminal = (terminalId) => {
    const terminal = terminals.find(t => t.id === terminalId);
    const currentNumber = terminals.findIndex(t => t.id === terminalId) + 1;
    const newTitle = prompt(`Rename Terminal ${currentNumber}:`, terminal.title);
    
    if (newTitle && newTitle.trim()) {
      setTerminals(terminals.map(t => 
        t.id === terminalId ?  { ...t, title: newTitle.trim(), customName: true } : t
      ));
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={panelRef}
      className={`bottom-terminal-panel ${isResizing ? 'resizing' : ''}`}
      style={{ height: `${panelHeight}px` }}
    >
      {/* Resize Handle */}
      <div 
        className="resize-handle"
        onMouseDown={handleMouseDown}
      >
        <div className="resize-handle-bar" />
      </div>

      {/* Header dengan Tabs */}
      <div className="terminal-header">
        <div className="terminal-tabs">
          {terminals.map((terminal, index) => (
            <div
              key={terminal.id}
              className={`terminal-tab ${activeTerminalId === terminal. id ? 'active' : ''}`}
              onClick={() => setActiveTerminalId(terminal.id)}
              onDoubleClick={() => handleRenameTerminal(terminal.id)}
            >
              <span className="terminal-tab-title">
                {terminal.customName ? terminal.title : `Terminal ${index + 1}`}
              </span>
              {terminals.length > 1 && (
                <button
                  className="terminal-tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTerminal(terminal.id);
                  }}
                  title="Close terminal"
                >
                  CLOSE
                </button>
              )}
            </div>
          ))}
          
          {/* Button Add Terminal */}
          <button
            className="terminal-add-btn"
            onClick={handleAddTerminal}
            title="Add new terminal"
          >
            NEW
          </button>
        </div>

        {/* Actions */}
        <div className="terminal-actions">
          <button
            className="terminal-action-btn"
            onClick={() => setPanelHeight(200)}
            title="Reset height"
          >
            RESET
          </button>
          
          <button
            className="terminal-action-btn terminal-close-btn"
            onClick={onClose}
            title="Close terminal panel"
          >
            CLOSE PANEL
          </button>
        </div>
      </div>

      {/* Terminal Content Area */}
      <div className="terminal-content-area">
        {terminals.map((terminal) => (
          <Terminal
            key={terminal.id}
            terminalId={terminal.id}
            isActive={activeTerminalId === terminal.id}
          />
        ))}
      </div>

      {/* Status Bar */}
      <div className="terminal-status-bar">
        <div className="status-item">
          <span className="status-dot offline"></span>
          <span>Jetson:  Disconnected</span>
        </div>
        <div className="status-item">
          <span>Active Terminals: {terminals.length}</span>
        </div>
        <div className="status-item">
          <span>Height: {panelHeight}px</span>
        </div>
      </div>
    </div>
  );
};

export default BottomTerminal;