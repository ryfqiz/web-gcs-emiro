import { useState } from 'react';
import { useTelemetry } from '../../hooks/useTelemetry';
import { useRos } from '../../context/RosContext';
import styles from './TabbedDataDisplay.module.css';

const TabbedDataDisplay = () => {
  const telemetry = useTelemetry();
  const [activeTab, setActiveTab] = useState('position');

  const tabs = [
    { id: 'position', label:  'State' },
    { id: 'gps', label: 'GPS & RTK' },
    { id: 'mission', label: 'Mission' }
  ];

  return (
    <div className={styles.container}>
      {/* Tab Selector Buttons */}
      <div className={styles.tabBar}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'position' && <PositionVelocityTab telemetry={telemetry} />}
        {activeTab === 'gps' && <GpsRtkTab telemetry={telemetry} />}
        {activeTab === 'mission' && <MissionTab />}
      </div>
    </div>
  );
};

// Position & Velocity Tab
const PositionVelocityTab = ({ telemetry }) => {
  return (
    <div className={styles.dataGrid}>
      <div className={`${styles.dataCard} ${styles.purple}`}>
        <div className={styles.cardLabel}>Altitude (m)</div>
        <div className={styles.cardValue}>{telemetry.relAlt.toFixed(2)}</div>
      </div>

      <div className={`${styles.dataCard} ${styles.orange}`}>
        <div className={styles.cardLabel}>Groundspeed (m/s)</div>
        <div className={styles.cardValue}>{telemetry.groundSpeed.toFixed(2)}</div>
      </div>

      <div className={`${styles.dataCard} ${styles.cyan}`}>
        <div className={styles.cardLabel}>Airspeed (m/s)</div>
        <div className={styles.cardValue}>{telemetry.airSpeed.toFixed(2)}</div>
      </div>

      <div className={`${styles.dataCard} ${styles.yellow}`}>
        <div className={styles.cardLabel}>Vertical Speed (m/s)</div>
        <div className={styles.cardValue}>{telemetry.velocityZ.toFixed(2)}</div>
      </div>

      <div className={`${styles.dataCard} ${styles.green}`}>
        <div className={styles.cardLabel}>Pitch (deg)</div>
        <div className={styles.cardValue}>{telemetry.pitch.toFixed(2)}</div>
      </div>

      <div className={`${styles.dataCard} ${styles.pink}`}>
        <div className={styles.cardLabel}>Roll (deg)</div>
        <div className={styles.cardValue}>{telemetry.roll.toFixed(2)}</div>
      </div>

      <div className={`${styles.dataCard} ${styles.blue}`}>
        <div className={styles.cardLabel}>Yaw (deg)</div>
        <div className={styles.cardValue}>{telemetry.heading.toFixed(2)}</div>
      </div>
    </div>
  );
};

// GPS & RTK Tab - WITH RTK ENABLED/DISABLED STATE
const GpsRtkTab = ({ telemetry }) => {
  const { ros, isConnected } = useRos();
  const [rtkEnabled, setRtkEnabled] = useState(false);

  const getGpsColor = () => telemetry.gpsStatus === 'GPS_3D' ? '#2ecc71' : '#e74c3c';
  
  const getRtkColor = () => {
    if (! rtkEnabled) return '#7f8c8d'; // Grey when disabled
    
    switch(telemetry.rtkStatus) {
      case 'RTK_FIX':  return '#2ecc71';
      case 'RTK_FLOAT': return '#f39c12';
      default: return '#7f8c8d';
    }
  };

  const getRtkStatusText = () => {
    // If RTK not enabled, show DISABLED regardless of telemetry
    if (!rtkEnabled) return 'DISABLED';
    
    // If enabled, show actual status
    switch(telemetry.rtkStatus) {
      case 'RTK_FIX': return 'FIXED';
      case 'RTK_FLOAT': return 'FLOAT';
      default: return 'NONE';
    }
  };
  
  const getSatColor = () => {
    if (telemetry.satellites >= 10) return '#2ecc71';
    if (telemetry.satellites >= 6) return '#f39c12';
    return '#e74c3c';
  };

  const handleRtkToggle = () => {
    if (!ros || !isConnected) return;

    try {
      // Toggle RTK service call
      const service = new window.ROSLIB.Service({
        ros: ros,
        name: '/mavros/cmd/set_message_interval',
        serviceType: 'mavros_msgs/MessageInterval'
      });

      const request = new window.ROSLIB.ServiceRequest({
        message_id: 127,
        message_rate: rtkEnabled ? 0 : 10
      });

      service.callService(request, (result) => {
        if (result.success) {
          setRtkEnabled(!rtkEnabled);
          console.log(`[RTK] ${! rtkEnabled ? 'Enabled' : 'Disabled'}`);
        }
      });
    } catch (error) {
      console.error('[RTK] Error toggling:', error);
    }
  };

  return (
    <div className={styles.gpsContainer}>
      {/* Status Row */}
      <div className={styles.gpsStatusRow}>
        <div className={styles.gpsStatusItem}>
          <div className={styles.gpsLabel}>GPS</div>
          <div className={styles.gpsValue} style={{ color: getGpsColor() }}>
            {telemetry.gpsStatus === 'GPS_3D' ?  '3D FIX' : 'NO FIX'}
          </div>
        </div>

        <div className={styles.gpsStatusItem}>
          <div className={styles.gpsLabel}>SATELLITES</div>
          <div className={styles.gpsValueLarge} style={{ color: getSatColor() }}>
            {telemetry.satellites}
          </div>
        </div>

        <div className={styles.gpsStatusItem}>
          <div className={styles.gpsLabel}>RTK</div>
          <div className={styles.gpsValue} style={{ color: getRtkColor() }}>
            {getRtkStatusText()}
          </div>
        </div>
      </div>

      {/* RTK Control */}
      <div className={styles.rtkControlRow}>
        <span className={styles.rtkLabel}>RTK Corrections:</span>
        <button 
          className={`${styles.rtkButton} ${rtkEnabled ? styles.rtkEnabled : styles.rtkDisabled}`}
          onClick={handleRtkToggle}
          disabled={!isConnected}
        >
          {rtkEnabled ? 'ENABLED' : 'DISABLED'}
        </button>
      </div>

      {/* Signal Quality */}
      <div className={styles.qualitySection}>
        <div className={styles.qualityLabel}>SIGNAL QUALITY</div>
        <div className={styles.qualityBar}>
          <div 
            className={styles.qualityFill}
            style={{ 
              width: `${Math.min((telemetry.satellites / 15) * 100, 100)}%`,
              backgroundColor: getSatColor()
            }}
          />
        </div>
        <div className={styles.qualityText}>
          {telemetry.satellites >= 10 ? 'EXCELLENT' : 
           telemetry.satellites >= 6 ? 'GOOD' : 'POOR'}
        </div>
      </div>
    </div>
  );
};

// Servo Tab - Using Existing ServoControl Component
const ServoTab = () => {
  const { ros, isConnected } = useRos();

  // Create flightControl object for ServoControl component
  const flightControl = {
    setServo: (id, pwm) => {
      if (! ros || !isConnected) return;

      try {
        const topic = new window. ROSLIB.Topic({
          ros: ros,
          name:  '/mavros/rc/override',
          messageType: 'mavros_msgs/OverrideRCIn'
        });

        // Servo ID 1-4 maps to RC Channel 5-8
        const channelIndex = id + 4;
        const channels = new Array(18).fill(0);
        channels[channelIndex] = pwm;

        const message = new window. ROSLIB.Message({
          channels: channels
        });

        topic.publish(message);
        console.log(`[Servo] Channel ${channelIndex} set to ${pwm} us`);
      } catch (error) {
        console.error('[Servo] Error sending command:', error);
      }
    }
  };

  return (
    <div className={styles.servoTabWrapper}>
      <ServoControl 
        flightControl={flightControl} 
        isConnected={isConnected} 
      />
    </div>
  );
};

// Mission Tab - Placeholder
const MissionTab = () => {
  return (
    <div className={styles.placeholderTab}>
      <div className={styles.placeholderText}>Mission Control</div>
      <div className={styles.placeholderSubtext}>Will be implemented in next step</div>
    </div>
  );
};

export default TabbedDataDisplay;