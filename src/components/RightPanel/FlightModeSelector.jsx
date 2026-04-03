import React, { useState } from 'react';
import { FLIGHT_MODES } from '../../utils/constants';
import styles from './FlightModeSelector.module.css';

const FlightModeSelector = ({ flightControl, isConnected }) => {
  const [selectedMode, setSelectedMode] = useState('STABILIZE');
  const [loading, setLoading] = useState(false);

  const handleModeChange = async (mode) => {
    if (!isConnected || !flightControl) {
      alert('Not connected to drone');
      return;
    }

    // Validation dialog sebelum change mode
    const confirmMessage = `⚠️ FLIGHT MODE CHANGE\n\n` +
      `Current: ${selectedMode}\n` +
      `New: ${mode}\n\n` +
      `Are you sure you want to change flight mode?`;

    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }

    setLoading(true);
    try {
      await flightControl.setMode(mode);
      setSelectedMode(mode);
      alert(`✓ Flight mode changed to ${mode}`);
    } catch (error) {
      alert(`✗ Failed to change mode: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Flight Mode</h3>
      <select 
        className={styles.modeSelect}
        value={selectedMode}
        onChange={(e) => handleModeChange(e.target.value)}
        disabled={!isConnected || loading}
      >
        {FLIGHT_MODES.map(mode => (
          <option key={mode} value={mode}>{mode}</option>
        ))}
      </select>

      <div className={styles.quickModes}>
        <button 
          className={styles.quickBtn}
          onClick={() => handleModeChange('ALT_HOLD')}
          disabled={!isConnected || loading}
        >
          Alt Hold
        </button>
        <button 
          className={styles.quickBtn}
          onClick={() => handleModeChange('LOITER')}
          disabled={!isConnected || loading}
        >
          Loiter
        </button>
        <button 
          className={`${styles.quickBtn} ${styles.rtl}`}
          onClick={() => handleModeChange('RTL')}
          disabled={!isConnected || loading}
        >
          RTL
        </button>
      </div>
    </div>
  );
};

export default FlightModeSelector;