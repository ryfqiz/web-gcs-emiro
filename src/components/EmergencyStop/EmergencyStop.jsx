import React, { useState, useCallback } from 'react';
import { useRos } from '../../context/RosContext';
import { useTelemetry } from '../../hooks/useTelemetry';
import { FlightControlService } from '../../services/flightControlService';
import styles from './EmergencyStop.module.css';

const EmergencyStop = () => {
  const { ros, isConnected } = useRos();
  const telemetry = useTelemetry();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showKillConfirm, setShowKillConfirm] = useState(false);

  // Smart Emergency Stop based on altitude
  const handleEmergencyStop = useCallback(async () => {
    if (!isConnected) {
      alert('❌ Not connected to drone');
      return;
    }

    if (isProcessing) {
      return;
    }

    const altitude = telemetry.relAlt || 0;
    const ALTITUDE_THRESHOLD = 1.0; // 1 meter

    let confirmMessage = '';
    let actionType = '';

    if (altitude < ALTITUDE_THRESHOLD) {
      // Low altitude: Disarm motors
      confirmMessage = 
        `⚠️ EMERGENCY STOP - DISARM MOTORS ⚠️\n\n` +
        `Current Altitude: ${altitude.toFixed(2)}m (< ${ALTITUDE_THRESHOLD}m)\n\n` +
        `This will DISARM the motors immediately!\n` +
        `Drone will drop if airborne.\n\n` +
        `Continue?`;
      actionType = 'DISARM';
    } else {
      // High altitude: RTL
      confirmMessage = 
        `⚠️ EMERGENCY STOP - RETURN TO LAUNCH ⚠️\n\n` +
        `Current Altitude: ${altitude.toFixed(2)}m (> ${ALTITUDE_THRESHOLD}m)\n\n` +
        `This will trigger RTL (Return to Launch) mode.\n` +
        `Drone will return to home position and land.\n\n` +
        `Continue?`;
      actionType = 'RTL';
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsProcessing(true);

    try {
      const flightControl = new FlightControlService(ros);

      if (actionType === 'DISARM') {
        // Disarm motors
        await flightControl.disarm();
        console.log('✅ Emergency Disarm executed');
        alert(
          `✅ EMERGENCY DISARM SUCCESSFUL\n\n` +
          `Motors have been disarmed.\n` +
          `Altitude at execution: ${altitude.toFixed(2)}m`
        );
      } else {
        // RTL mode
        await flightControl.setMode('RTL');
        console.log('✅ Emergency RTL executed');
        alert(
          `✅ RETURN TO LAUNCH INITIATED\n\n` +
          `Drone is returning to home position.\n` +
          `Altitude at execution: ${altitude.toFixed(2)}m`
        );
      }
    } catch (error) {
      console.error('❌ Emergency stop failed:', error);
      alert(
        `❌ EMERGENCY STOP FAILED\n\n` +
        `Error: ${error.message}\n\n` +
        `Please try manual control or KILL switch if necessary.`
      );
    } finally {
      setIsProcessing(false);
    }
  }, [ros, isConnected, telemetry.relAlt, isProcessing]);

  // KILL - Force disarm regardless of altitude
  const handleKillMotors = useCallback(async () => {
    if (!isConnected) {
      alert('❌ Not connected to drone');
      return;
    }

    if (isProcessing) {
      return;
    }

    setShowKillConfirm(true);
  }, [isConnected, isProcessing]);

  // Confirm KILL action
  const confirmKill = useCallback(async () => {
    setShowKillConfirm(false);
    setIsProcessing(true);

    const altitude = telemetry.relAlt || 0;

    try {
      const flightControl = new FlightControlService(ros);
      await flightControl.disarm();
      
      console.log('⚠️ KILL executed - Motors force disarmed');
      
      alert(
        `⚠️ KILL SWITCH ACTIVATED\n\n` +
        `Motors have been FORCE DISARMED.\n` +
        `Altitude at execution: ${altitude.toFixed(2)}m\n\n` +
        `⚠️ WARNING: Drone will drop if airborne!`
      );
    } catch (error) {
      console.error('❌ Kill switch failed:', error);
      alert(
        `❌ KILL SWITCH FAILED\n\n` +
        `Error: ${error.message}\n\n` +
        `Emergency action could not be completed.`
      );
    } finally {
      setIsProcessing(false);
    }
  }, [ros, telemetry.relAlt]);

  // Cancel KILL action
  const cancelKill = useCallback(() => {
    setShowKillConfirm(false);
  }, []);

  return (
    <>
      {/* Emergency Stop Button */}
      <button 
        className={styles.emergencyStop}
        onClick={handleEmergencyStop}
        disabled={!isConnected || isProcessing}
        title={`Smart Emergency Stop (Alt: ${telemetry.relAlt?.toFixed(2) || 0}m)`}
      >
        <span className={styles.icon}>⚠</span>
        <span className={styles.text}>E-STOP</span>
        {isProcessing && (
          <span className={styles.processingDot}>●</span>
        )}
      </button>

      {/* Kill Button */}
      <button 
        className={styles.killButton}
        onClick={handleKillMotors}
        disabled={!isConnected || isProcessing}
        title="KILL - Force Disarm Motors (Any Altitude)"
      >
        <span className={styles.killIcon}>💀</span>
        <span className={styles.killText}>KILL</span>
        {isProcessing && (
          <span className={styles.processingDot}>●</span>
        )}
      </button>

      {/* Kill Confirmation Modal */}
      {showKillConfirm && (
        <div className={styles.modalOverlay} onClick={cancelKill}>
          <div className={styles.modalKill} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalIcon}>💀</span>
              <h2>⚠️ KILL SWITCH CONFIRMATION ⚠️</h2>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.warningBox}>
                <p><strong>⚠️ EXTREME DANGER ⚠️</strong></p>
                <p>This will IMMEDIATELY disarm all motors regardless of altitude!</p>
              </div>

              <div className={styles.statusInfo}>
                <div className={styles.statusItem}>
                  <strong>Current Altitude:</strong>
                  <span className={styles.statusValue}>
                    {telemetry.relAlt?.toFixed(2) || 0} m
                  </span>
                </div>
                <div className={styles.statusItem}>
                  <strong>Armed Status:</strong>
                  <span className={styles.statusValue}>
                    {telemetry.armed ? '🔴 ARMED' : '🟢 DISARMED'}
                  </span>
                </div>
                <div className={styles.statusItem}>
                  <strong>Flight Mode:</strong>
                  <span className={styles.statusValue}>
                    {telemetry.mode || 'UNKNOWN'}
                  </span>
                </div>
              </div>

              <div className={styles.consequenceBox}>
                <p><strong>⚠️ CONSEQUENCES:</strong></p>
                <ul>
                  <li>Motors will stop instantly</li>
                  <li>Drone will drop if airborne</li>
                  <li>Potential damage to equipment</li>
                  <li>Cannot be undone</li>
                </ul>
              </div>

              <p className={styles.confirmPrompt}>
                Type "KILL" below to confirm:
              </p>
              
              <input 
                type="text"
                className={styles.confirmInput}
                placeholder="Type KILL here"
                id="killConfirmInput"
                autoFocus
              />
            </div>

            <div className={styles.modalActions}>
              <button 
                className={styles.btnKillConfirm}
                onClick={() => {
                  const input = document.getElementById('killConfirmInput');
                  if (input && input.value.trim().toUpperCase() === 'KILL') {
                    confirmKill();
                  } else {
                    alert('❌ You must type "KILL" to confirm');
                  }
                }}
              >
                💀 EXECUTE KILL
              </button>
              <button 
                className={styles.btnKillCancel}
                onClick={cancelKill}
              >
                ✕ CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencyStop;