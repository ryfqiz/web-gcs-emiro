import React, { useState, useEffect } from 'react';
import styles from './NetworkStatus.module.css';

const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showStatus) return null;

  return (
    <div className={`${styles.networkStatus} ${isOnline ? styles.online : styles.offline}`}>
      <span className={styles.statusDot}></span>
      <span>{isOnline ? 'Back Online' : 'Working Offline'}</span>
    </div>
  );
};

export default NetworkStatus;