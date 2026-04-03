import React from 'react';
import styles from './AttitudeIndicator.module.css';

const AttitudeIndicator = ({ roll, pitch }) => {
  return (
    <div className={styles.container}>
      <div className={styles.indicator}>
        <div 
          className={styles.horizon}
          style={{
            transform: `rotate(${-roll}deg) translateY(${pitch * 2}px)`
          }}
        >
          <div className={styles.sky}></div>
          <div className={styles.ground}></div>
        </div>
        <div className={styles.centerMark}>
          <div className={styles.leftWing}></div>
          <div className={styles.centerDot}></div>
          <div className={styles.rightWing}></div>
        </div>
        <div className={styles.pitchLines}>
          <div className={styles.pitchLine} style={{ top: 'calc(50% - 40px)' }}>
            <span>20°</span>
          </div>
          <div className={styles.pitchLine} style={{ top: 'calc(50% - 20px)' }}>
            <span>10°</span>
          </div>
          <div className={styles.pitchLine} style={{ top: 'calc(50% + 20px)' }}>
            <span>-10°</span>
          </div>
          <div className={styles.pitchLine} style={{ top: 'calc(50% + 40px)' }}>
            <span>-20°</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttitudeIndicator;