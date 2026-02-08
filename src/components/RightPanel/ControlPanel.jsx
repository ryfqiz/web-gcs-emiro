import React, { useState } from 'react';
import { useRos } from '../../context/RosContext';
import { useTelemetry } from '../../hooks/useTelemetry';
import { FlightControlService } from '../../services/flightControlService';
import FlightModeSelector from './FlightModeSelector';
import ArmControl from './ArmControl';
import styles from './ControlPanel.module.css';
import ServoControl from './ServoControl';

const ControlPanel = () => {
  const { ros, isConnected } = useRos();
  const telemetry = useTelemetry();
  const [flightControl, setFlightControl] = useState(null);

  React.useEffect(() => {
    if (ros && isConnected) {
      setFlightControl(new FlightControlService(ros));
    }
  }, [ros, isConnected]);

  // Intelligent E-STOP logic based on drone state
  const handleEmergencyStop = async () => {
    if (! isConnected) {
      alert('ERROR: Not connected to drone');
      return;
    }

    const altitude = telemetry.relAlt || 0;
    const isArmed = telemetry.armed;

    let action = '';
    let actionDescription = '';

    if (! isArmed) {
      alert('WARNING: Drone is already disarmed.\n\nNo emergency action needed.');
      return;
    }

    // Decision logic
    if (altitude < 2) {
      action = 'DISARM';
      actionDescription = 'Altitude < 2m: Immediate disarm';
    } else if (altitude < 10) {
      action = 'LAND';
      actionDescription = 'Altitude < 10m: Controlled landing';
    } else {
      action = 'RTL';
      actionDescription = 'Altitude > 10m: Return to launch';
    }

    const confirmMessage = 
      `WARNING: EMERGENCY STOP\n\n` +
      `Current State:\n` +
      `• Altitude: ${altitude.toFixed(1)} m\n` +
      `• Armed: ${isArmed ? 'YES' : 'NO'}\n` +
      `• Mode: ${telemetry.flightMode || 'UNKNOWN'}\n\n` +
      `Action: ${action}\n` +
      `Reason: ${actionDescription}\n\n` +
      `Continue with E-STOP?`;

    if (! window.confirm(confirmMessage)) {
      return;
    }

    const flightControlService = new FlightControlService(ros);

    try {
      if (action === 'DISARM') {
        await flightControlService.setArmed(false);
        alert('SUCCESS: Motors disarmed');
      } else if (action === 'LAND') {
        await flightControlService.land();
        alert('SUCCESS: Landing initiated');
      } else if (action === 'RTL') {
        await flightControlService.setMode('RTL');
        alert('SUCCESS: RTL initiated');
      }
    } catch (error) {
      console.error('Emergency stop failed:', error);
      alert(`ERROR: FAILED\n\nError: ${error.message}`);
    }
  };

  return (
    <div className={styles.controlPanel}>
      <h2 className={styles. title}>FLIGHT CONTROL</h2>

      {/* STICKY TOP CONTROLS - Ultra Compact */}
      <div className={styles.stickyControls}>
        <ArmControl flightControl={flightControl} isConnected={isConnected} />
        
        <button 
          className={styles.emergencyStop}
          onClick={handleEmergencyStop}
          disabled={!isConnected}
          title="Emergency Stop (Auto: <2m→Disarm | <10m→Land | >10m→RTL)"
        >
          <span className={styles.icon}>⚠</span>
          <span className={styles.text}>EMERGENCY STOP</span>
        </button>
      </div>

      {/* SCROLLABLE CONTROLS */}
      <div className={styles.scrollableControls}>
        <FlightModeSelector flightControl={flightControl} isConnected={isConnected} />
        <ServoControl flightControl={flightControl} isConnected={isConnected} />
      </div>
    </div>
  );
};

export default ControlPanel;