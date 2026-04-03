import React from 'react';
import VideoFeed from './VideoFeed';
import MapView from './MapView';
// Pastikan import styles ini ada
import styles from './CenterPanel.module.css'; 

const CenterPanel = () => {
  return (
    // Class centerPanel ini yang membuatnya transparan
    <div className={styles.centerPanel}>
      <div className={styles.videoSection}>
        <VideoFeed />
      </div>
      <div className={styles.mapSection}>
        <MapView />
      </div>
    </div>
  );
};

export default CenterPanel;