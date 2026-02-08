import CombinedFlightDisplay from './CombinedFlightDisplay';
import styles from './LeftPanel.module.css';

const LeftPanel = () => {
  return (
    <div className={styles.leftPanel}>
      <div className={styles.panelHeader}>
        <h2>TELEMETRY DATA</h2>
      </div>

      <div className={styles.panelContent}>
        {/* Combined Flight Display - Contains everything now */}
        <CombinedFlightDisplay />
      </div>
    </div>
  );
};

export default LeftPanel;