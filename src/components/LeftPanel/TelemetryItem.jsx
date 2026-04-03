import React from 'react';
import styles from './TelemetryItem.module.css';

const TelemetryItem = ({ label, value, unit = '', fullWidth = false, className = '', highlight = false }) => {
  return (
    <div className={`${styles.item} ${fullWidth ? styles.fullWidth : ''} ${className}`}>
      <div className={styles.label}>{label}</div>
      <div className={`${styles.value} ${highlight ? styles.highlight : ''}`}>
        {value} {unit && <span className={styles.unit}>{unit}</span>}
      </div>
    </div>
  );
};

export default TelemetryItem;