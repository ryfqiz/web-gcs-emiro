import React, { useState, useEffect } from 'react';
import { useRos } from '../../context/RosContext';
import { useTelemetry } from '../../hooks/useTelemetry';
import styles from './Header.module.css';
import SettingsSidebar from './SettingsSidebar';
import ThemeToggle from './ThemeToggle';

// 1. IMPORT LOGO
import logoEmiro from '../../assets/logo.png'; 

const IP_STORAGE_KEY = "gcs_saved_ips";

const Header = ({ 
  showTelemetry, setShowTelemetry,
  showVideo, setShowVideo,
  showMap, setShowMap,
  showControl, setShowControl,
  showTerminal, setShowTerminal,
  onLogout
}) => {
  const { isConnected, isConnecting, connect, disconnect, connectionUrl, connectionIP, rosUrl } = useRos();
  const telemetry = useTelemetry();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savedIps, setSavedIps] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(IP_STORAGE_KEY);
      if (stored) {
        setSavedIps(JSON.parse(stored));
      }
    } catch {
      setSavedIps([]);
    }
  }, []);

  const getConnectedIp = () => {
    if (connectionIP && typeof connectionIP === 'string' && connectionIP. trim() !== '') {
      return connectionIP;
    }
    if (connectionUrl) {
      const match = connectionUrl.match(/:\/\/([\d.]+):\d+/);
      if (match && match[1]) return match[1];
    }
    if (rosUrl) {
      const m1 = rosUrl.match(/ws:\/\/([^: ]+):/);
      if (m1 && m1[1]) return m1[1];
      const m2 = rosUrl.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (m2 && m2[1]) return m2[1];
    }
    return 'N/A';
  };

  const handleDisconnect = () => {
    if (window.confirm('WARNING:  Disconnect from drone?\n\nThis will close the ROS connection. ')) {
      disconnect();
      console.log('Disconnected from ROS');
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const ipDisplay = isConnected ? getConnectedIp() : 'N/A';

  return (
    <>
      <header className={styles.header}>
        <div className={styles.logo}>
          {/* 2. TAMPILKAN LOGO */}
          <img src={logoEmiro} alt="Emiro Logo" className={styles.logoImage} />
          <h1 className={styles.title}>WEB-GCS EMIRO</h1>
        </div>

        <div className={styles.connectionPanel}>
          <ThemeToggle />
          
          <div className={styles.statusIndicator}>
            <span className={`${styles.statusDot} ${isConnected ? styles.connected : styles. disconnected}`} />
            <span className={styles.statusText}>
              {isConnecting ? 'Connecting...' :  (isConnected ? 'Connected' : 'Disconnected')}
            </span>
          </div>

          {isConnected && (
            <>
              <div className={styles. infoChip}>
                <span className={styles.chipLabel}>IP:</span>
                <span className={styles.chipValue}>{ipDisplay}</span>
              </div>
              <div className={styles.infoChip}>
                <span 
                  className={styles.chipValue}
                  style={{ color: telemetry.armed !== null ? '#2ecc71' : '#e74c3c' }}
                >
                  {telemetry.armed !== null ? 'ACTIVE' : 'LOST'}
                </span>
              </div>
            </>
          )}

          {isConnected && (
            <button className={styles.btnDisconnect} onClick={handleDisconnect}>
              DISCONNECT
            </button>
          )}

          <button 
            className={styles.btnLogout} 
            onClick={handleLogout}
            title="Logout from Web-GCS"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>

          <button
            className={styles.menuBtn}
            onClick={() => setSidebarOpen(true)}
            title="Settings & Controls"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      {sidebarOpen && (
        <SettingsSidebar 
          onClose={() => setSidebarOpen(false)}
          savedIps={savedIps}
          setSavedIps={setSavedIps}
          connect={connect}
          isConnected={isConnected}
          isConnecting={isConnecting}
          showTelemetry={showTelemetry}
          setShowTelemetry={setShowTelemetry}
          showVideo={showVideo}
          setShowVideo={setShowVideo}
          showMap={showMap}
          setShowMap={setShowMap}
          showControl={showControl}
          setShowControl={setShowControl}
          showTerminal={showTerminal}
          setShowTerminal={setShowTerminal}
        />
      )}
    </>
  );
};

export default Header;