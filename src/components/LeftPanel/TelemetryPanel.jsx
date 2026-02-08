import React from 'react';
import { useTelemetry } from '../../hooks/useTelemetry';
import TelemetryItem from './TelemetryItem';
import AttitudeIndicator from './AttitudeIndicator';
import styles from './TelemetryPanel.module.css';

const TelemetryPanel = () => {
  const telemetry = useTelemetry();

  // Helper untuk status color
  const getGpsColor = () => {
    if (telemetry.satellites >= 10) return '#2ecc71';
    if (telemetry.satellites >= 6) return '#f39c12';
    return '#e74c3c';
  };

  const getGpsQualityText = () => {
    if (telemetry.satellites >= 10) return 'EXCELLENT';
    if (telemetry.satellites >= 6) return 'GOOD';
    return 'POOR';
  };

  // Format flight mode untuk mencegah overflow
  const formatFlightMode = (mode) => {
    if (! mode) return 'N/A';
    // Batasi panjang text
    return mode.length > 10 ? mode.substring(0, 10) + '...' : mode;
  };

  return (
    <div className={styles.telemetryPanel}>
      <h2 className={styles. title}>TELEMETRY DATA</h2>

      {/* Flight Status Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>FLIGHT STATUS</h3>
        <div className={styles.statusGrid}>
          <TelemetryItem 
            label="MODE" 
            value={formatFlightMode(telemetry.flightMode)}
            highlight={true}
            fullWidth={false}
          />
          <TelemetryItem 
            label="ARMED" 
            value={telemetry.armed ? 'YES' : 'NO'}
            className={telemetry.armed ? styles.armed : styles.disarmed}
            fullWidth={false}
          />
        </div>
      </div>

      {/* GPS & RTK Status Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>GPS & RTK STATUS</h3>
        
        {/* Satellite Count - Full Width */}
        <div className={styles.satelliteBar}>
          <div className={styles.satelliteInfo}>
            <span className={styles.satelliteLabel}>SATELLITES</span>
            <span 
              className={styles.satelliteCount}
              style={{ color: getGpsColor() }}
            >
              {telemetry.satellites} ({getGpsQualityText()})
            </span>
          </div>
          <div className={styles.satelliteQuality}>
            <div 
              className={styles.qualityBar}
              style={{ 
                width: `${Math.min((telemetry.satellites / 15) * 100, 100)}%`,
                backgroundColor: getGpsColor()
              }}
            />
          </div>
        </div>

        {/* GPS & RTK Status Grid */}
        <div className={styles.gpsRtkGrid}>
          <div className={styles.statusCard}>
            <span className={styles.statusLabel}>GPS STATUS</span>
            <span 
              className={styles.statusValue}
              style={{ 
                color: telemetry.gpsStatus === 'GPS_3D' ? '#2ecc71' : 
                       telemetry.gpsStatus === 'GPS_2D' ? '#f39c12' : '#e74c3c'
              }}
            >
              {telemetry.gpsStatus === 'GPS_3D' ?  '3D FIX' : 
               telemetry.gpsStatus === 'GPS_2D' ? '2D FIX' : 'NO FIX'}
            </span>
          </div>
          
          <div className={styles.statusCard}>
            <span className={styles.statusLabel}>RTK STATUS</span>
            <span 
              className={styles. statusValue}
              style={{ 
                color: telemetry. rtkStatus === 'RTK_FIX' ? '#2ecc71' : 
                       telemetry.rtkStatus === 'RTK_FLOAT' ? '#f39c12' : '#7f8c8d'
              }}
            >
              {telemetry.rtkStatus === 'RTK_FIX' ? 'FIXED' : 
               telemetry.rtkStatus === 'RTK_FLOAT' ? 'FLOAT' : 'NONE'}
            </span>
          </div>
        </div>

        {/* GPS Warning */}
        {! telemetry.hasGPS && (
          <div className={styles.warningBadge}>
            WARNING: Using Local Position
          </div>
        )}
      </div>

      {/* Position Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          POSITION {telemetry.hasGPS ?  '(GPS)' : '(LOCAL)'}
        </h3>

        {telemetry.hasGPS ?  (
          <div className={styles.positionGrid}>
            <TelemetryItem 
              label="LATITUDE" 
              value={telemetry.latitude.toFixed(7)} 
              unit="°"
              fullWidth={true}
            />
            <TelemetryItem 
              label="LONGITUDE" 
              value={telemetry.longitude.toFixed(7)} 
              unit="°"
              fullWidth={true}
            />
            <TelemetryItem 
              label="ALTITUDE (MSL)" 
              value={telemetry.altitude.toFixed(1)} 
              unit="m"
            />
            <TelemetryItem 
              label="ALTITUDE (REL)" 
              value={telemetry.relAlt.toFixed(1)} 
              unit="m"
              highlight={true}
            />
          </div>
        ) : (
          <div className={styles. positionGrid}>
            <TelemetryItem 
              label="LOCAL X" 
              value={telemetry.localX.toFixed(2)} 
              unit="m"
            />
            <TelemetryItem 
              label="LOCAL Y" 
              value={telemetry.localY.toFixed(2)} 
              unit="m"
            />
            <TelemetryItem 
              label="LOCAL Z" 
              value={telemetry.localZ. toFixed(2)} 
              unit="m"
            />
            <TelemetryItem 
              label="ALTITUDE (REL)" 
              value={telemetry.relAlt.toFixed(1)} 
              unit="m"
              highlight={true}
            />
          </div>
        )}
      </div>

      {/* Velocity Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>VELOCITY & HEADING</h3>
        <div className={styles.velocityGrid}>
          <TelemetryItem 
            label="GROUND SPEED" 
            value={telemetry.groundSpeed.toFixed(1)} 
            unit="m/s"
            highlight={true}
          />
          <TelemetryItem 
            label="AIR SPEED" 
            value={telemetry.airSpeed. toFixed(1)} 
            unit="m/s"
          />
          <TelemetryItem 
            label="HEADING" 
            value={telemetry.heading.toFixed(0)} 
            unit="°"
            highlight={true}
          />
          <TelemetryItem 
            label="THROTTLE" 
            value={telemetry.throttle.toFixed(0)} 
            unit="%"
          />
        </div>
      </div>

      {/* Attitude Section */}
      <div className={styles. section}>
        <h3 className={styles.sectionTitle}>ATTITUDE</h3>
        <AttitudeIndicator roll={telemetry.roll} pitch={telemetry.pitch} />
        <div className={styles.attitudeGrid}>
          <TelemetryItem 
            label="ROLL" 
            value={telemetry.roll.toFixed(1)} 
            unit="°"
          />
          <TelemetryItem 
            label="PITCH" 
            value={telemetry.pitch.toFixed(1)} 
            unit="°"
          />
          <TelemetryItem 
            label="YAW" 
            value={telemetry. heading.toFixed(1)} 
            unit="°"
            fullWidth={true}
          />
        </div>
      </div>
    </div>
  );
};

export default TelemetryPanel;