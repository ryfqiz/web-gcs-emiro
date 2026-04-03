import { useTelemetry } from '../../hooks/useTelemetry';
import AttitudeIndicator from './AttitudeIndicator';
import TabbedDataDisplay from './TabbedDataDisplay';
import styles from './CombinedFlightDisplay.module.css';

const CombinedFlightDisplay = () => {
  const telemetry = useTelemetry();

  const formatGpsStatus = () => {
    return telemetry.gpsStatus === 'GPS_3D' ?  '3D FIX' : 'NO FIX';
  };

  return (
    <div className={styles.container}>
      {/* Attitude Indicator */}
      <div className={styles.attitudeWrapper}>
        <div className={styles.headingBadge}>
          {telemetry.heading.toFixed(0)}°
        </div>
        <AttitudeIndicator 
          roll={telemetry.roll} 
          pitch={telemetry.pitch} 
        />
      </div>

      {/* Mode & GPS Status */}
      <div className={styles.modeGpsBar}>
        <div className={styles.modeBox}>
          <span className={styles.boxLabel}>MODE</span>
          <span className={styles.boxValue}>{telemetry.flightMode}</span>
        </div>
        <div className={styles.gpsBox}>
          <span className={styles.boxLabel}>GPS</span>
          <span className={styles. boxValue}>{formatGpsStatus()}</span>
        </div>
      </div>

      {/* Tabbed Data Display - NEW */}
      <TabbedDataDisplay />
    </div>
  );
};

export default CombinedFlightDisplay;