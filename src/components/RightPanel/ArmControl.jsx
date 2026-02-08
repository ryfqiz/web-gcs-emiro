import React, { useState } from 'react';
import { useTelemetry } from '../../hooks/useTelemetry';
import styles from './ArmControl.module.css';

const ArmControl = ({ flightControl, isConnected }) => {
  const telemetry = useTelemetry();
  const [loading, setLoading] = useState(false);

  const handleArm = async () => {
    if (!isConnected || !flightControl) {
      alert('Not connected to drone');
      return;
    }

    if (telemetry.armed) {
      if (!window.confirm('Disarm the drone?')) return;
    } else {
      if (!window.confirm('Arm the drone? Propellers will start spinning!')) return;
    }

    setLoading(true);
    try {
      await flightControl.setArmed(!telemetry.armed);
      alert(`Drone ${!telemetry.armed ? 'armed' : 'disarmed'} successfully`);
    } catch (error) {
      alert(`Failed to ${!telemetry.armed ? 'arm' : 'disarm'}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Arm Control</h3>
      <div className={styles.armStatus}>
        <span>Status:</span>
        <span className={telemetry.armed ? styles.armed : styles.disarmed}>
          {telemetry.armed ? 'ARMED' : 'DISARMED'}
        </span>
      </div>
      <button 
        className={`${styles.armBtn} ${telemetry.armed ? styles.disarmBtn : styles.armingBtn}`}
        onClick={handleArm}
        disabled={!isConnected || loading}
      >
        {loading ? 'Processing...' : (telemetry.armed ? 'DISARM' : 'ARM')}
      </button>
    </div>
  );
};

export default ArmControl;