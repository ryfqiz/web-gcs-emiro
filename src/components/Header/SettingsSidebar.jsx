import React, { useState } from 'react';
import styles from './SettingsSidebar.module.css';

const IP_STORAGE_KEY = "gcs_saved_ips";
const PORT = "9090";

const SettingsSidebar = ({ 
  onClose,
  savedIps, 
  setSavedIps, 
  connect,
  isConnected,
  isConnecting,
  showTelemetry,
  setShowTelemetry,
  showVideo,
  setShowVideo,
  showMap,
  setShowMap,
  showControl,
  setShowControl,
  showTerminal,
  setShowTerminal
}) => {
  const [activeView, setActiveView] = useState('menu'); // 'menu', 'connection', 'layout'
  const [ipInput, setIpInput] = useState('');

  // Validate IP
  const validateIP = (ip) => {
    const trimmed = ip.trim();
    const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
    return ipv4Regex.test(trimmed);
  };

  // Save IP to localStorage
  const saveIpToStorage = (ip) => {
    try {
      const updatedIps = [ip, ...savedIps. filter(saved => saved !== ip)].slice(0, 10);
      setSavedIps(updatedIps);
      localStorage.setItem(IP_STORAGE_KEY, JSON.stringify(updatedIps));
    } catch (error) {
      console.error('Error saving IP:', error);
    }
  };

  // Handle connect
  const handleConnect = async () => {
    const trimmedIp = ipInput.trim();

    if (!trimmedIp) {
      alert('ERROR: Please enter an IP address');
      return;
    }

    if (!validateIP(trimmedIp)) {
      alert('ERROR: Invalid IP address format\n\nExample: 192.168.30.102');
      return;
    }

    const websocketUrl = `ws://${trimmedIp}:${PORT}`;

    try {
      await connect(websocketUrl);
      saveIpToStorage(trimmedIp);
      alert(`SUCCESS: Connected to ${trimmedIp}`);
      setIpInput('');
      onClose();
    } catch (error) {
      alert(`ERROR: Connection failed!\n\n${error.message}`);
    }
  };

  const handleSelectIp = (ip) => {
    setIpInput(ip);
  };

  const handleDeleteIp = (ipToDelete) => {
    const updatedIps = savedIps.filter(ip => ip !== ipToDelete);
    setSavedIps(updatedIps);
    localStorage.setItem(IP_STORAGE_KEY, JSON.stringify(updatedIps));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && ! isConnected && !isConnecting) {
      handleConnect();
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className={styles.overlay} onClick={onClose} />
      
      {/* Sidebar */}
      <div className={styles.sidebar}>
        {/* MENU VIEW */}
        {activeView === 'menu' && (
          <div className={styles.menuView}>
            <div className={styles.header}>
              <h2>SETTINGS</h2>
              <button className={styles.closeBtn} onClick={onClose}>✕</button>
            </div>
            
            <div className={styles.menuList}>
              <button 
                className={styles.menuItem}
                onClick={() => setActiveView('connection')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                  <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                  <line x1="12" y1="20" x2="12.01" y2="20"></line>
                </svg>
                <div>
                  <span className={styles.menuTitle}>CONNECTION</span>
                  <span className={styles.menuDesc}>Connect to drone</span>
                </div>
              </button>

              <button 
                className={styles. menuItem}
                onClick={() => setActiveView('layout')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                </svg>
                <div>
                  <span className={styles.menuTitle}>PANEL LAYOUT</span>
                  <span className={styles.menuDesc}>Configure panels</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* CONNECTION VIEW */}
        {activeView === 'connection' && (
          <div className={styles.contentView}>
            <div className={styles.header}>
              <button className={styles.backBtn} onClick={() => setActiveView('menu')}>
                ← BACK
              </button>
              <button className={styles.closeBtn} onClick={onClose}>✕</button>
            </div>

            <h3 className={styles.viewTitle}>CONNECTION</h3>

            {! isConnected ? (
              <>
                <div className={styles. inputGroup}>
                  <label>Jetson IP Address</label>
                  <input
                    type="text"
                    placeholder="e.g., 192.168.30.102"
                    value={ipInput}
                    onChange={(e) => setIpInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isConnecting}
                  />
                </div>

                <button 
                  className={styles. connectBtn}
                  onClick={handleConnect}
                  disabled={isConnecting || !ipInput. trim()}
                >
                  {isConnecting ? 'CONNECTING...' : 'CONNECT'}
                </button>

                {savedIps.length > 0 && (
                  <div className={styles.savedIps}>
                    <label>Recent IPs</label>
                    {savedIps.map((ip, index) => (
                      <div key={index} className={styles. savedIpItem}>
                        <span onClick={() => handleSelectIp(ip)}>{ip}</span>
                        <button onClick={() => handleDeleteIp(ip)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.connectedState}>
                <div className={styles.successIcon}>✓</div>
                <p>Connected to drone</p>
                <small>Use DISCONNECT button in header</small>
              </div>
            )}
          </div>
        )}

        {/* LAYOUT VIEW */}
        {activeView === 'layout' && (
          <div className={styles.contentView}>
            <div className={styles.header}>
              <button className={styles.backBtn} onClick={() => setActiveView('menu')}>
                ← BACK
              </button>
              <button className={styles.closeBtn} onClick={onClose}>✕</button>
            </div>

            <h3 className={styles. viewTitle}>PANEL LAYOUT</h3>

            <div className={styles.toggleList}>
              <label className={styles.toggleItem}>
                <div>
                  <span className={styles.toggleLabel}>TELEMETRY</span>
                  <span className={styles.toggleDesc}>Flight data & GPS</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={showTelemetry} 
                  onChange={(e) => setShowTelemetry(e.target.checked)}
                />
                <span className={styles.toggleSwitch}></span>
              </label>

              <label className={styles. toggleItem}>
                <div>
                  <span className={styles.toggleLabel}>VIDEO FEED</span>
                  <span className={styles.toggleDesc}>FPV camera stream</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={showVideo} 
                  onChange={(e) => setShowVideo(e.target.checked)}
                />
                <span className={styles.toggleSwitch}></span>
              </label>

              <label className={styles.toggleItem}>
                <div>
                  <span className={styles. toggleLabel}>MAP VIEW</span>
                  <span className={styles.toggleDesc}>Mission map with GPS</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={showMap} 
                  onChange={(e) => setShowMap(e.target.checked)}
                />
                <span className={styles.toggleSwitch}></span>
              </label>

              <label className={styles.toggleItem}>
                <div>
                  <span className={styles. toggleLabel}>FLIGHT CONTROL</span>
                  <span className={styles.toggleDesc}>Flight modes & controls</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={showControl} 
                  onChange={(e) => setShowControl(e.target. checked)}
                />
                <span className={styles.toggleSwitch}></span>
              </label>

              <label className={styles.toggleItem}>
                <div>
                  <span className={styles.toggleLabel}>TERMINAL</span>
                  <span className={styles.toggleDesc}>Command line interface</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={showTerminal} 
                  onChange={(e) => setShowTerminal(e.target.checked)}
                />
                <span className={styles.toggleSwitch}></span>
              </label>
            </div>

            <div className={styles.panelInfo}>
              {[showTelemetry, showVideo, showMap, showControl, showTerminal].filter(Boolean).length} panel(s) active
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SettingsSidebar;