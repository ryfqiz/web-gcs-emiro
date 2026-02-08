import React, { useState } from 'react';
import { SERVO_MIN_PWM, SERVO_MAX_PWM, SERVO_NEUTRAL_PWM } from '../../utils/constants';
import styles from './ServoControl.module.css';

const ServoControl = ({ flightControl, isConnected }) => {
  // =================================================================
  // CONFIG: FITUR PENGUJIAN (TEST MODE)
  // =================================================================
  const TEST_MODE = false; 
  const isReady = isConnected || TEST_MODE; 

  // Batas ambang untuk menentukan Low/Mid/High
  const THRESHOLD_LOW = 1300;
  const THRESHOLD_HIGH = 1700;

  const [servos, setServos] = useState([
    { id: 1, pwm: SERVO_NEUTRAL_PWM },
    { id: 2, pwm: SERVO_NEUTRAL_PWM },
    { id: 3, pwm: SERVO_NEUTRAL_PWM },
    { id: 4, pwm: SERVO_NEUTRAL_PWM },
  ]);

  const handleServoChange = (id, value) => {
    const pwm = parseInt(value);
    
    // Update state lokal
    setServos(prev => prev.map(servo => 
      servo.id === id ? { ...servo, pwm } : servo
    ));
    
    // Logika kirim perintah
    if (flightControl && isConnected) {
      flightControl.setServo(id, pwm);
    } else if (TEST_MODE) {
      // console.log(`[TEST MODE] Servo ${id} set to ${pwm}`);
    }
  };

  const setServoPreset = (id, preset) => {
    let pwm;
    switch(preset) {
      case 'low': pwm = SERVO_MIN_PWM; break;
      case 'mid': pwm = SERVO_NEUTRAL_PWM; break;
      case 'high': pwm = SERVO_MAX_PWM; break;
      default: pwm = SERVO_NEUTRAL_PWM;
    }
    handleServoChange(id, pwm);
  };

  // --- FUNGSI BARU: MENGHITUNG WARNA TRACK SLIDER ---
  const getSliderStyle = (currentPwm) => {
    // 1. Hitung Persentase (0% - 100%)
    const min = SERVO_MIN_PWM;
    const max = SERVO_MAX_PWM;
    const percent = ((currentPwm - min) / (max - min)) * 100;

    // 2. Tentukan Warna berdasarkan Zona
    let color = '#3b82f6'; // Default Mid (Biru)
    if (currentPwm <= THRESHOLD_LOW) color = '#ef4444'; // Low (Merah)
    if (currentPwm >= THRESHOLD_HIGH) color = '#16a34a'; // High (Hijau)

    // 3. Return Style Gradient
    // Bagian kiri (percent%) berwarna, sisanya mengikuti background input default
    return {
      background: `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, var(--bg-input) ${percent}%, var(--bg-input) 100%)`
    };
  };

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        Servo Control {TEST_MODE && <span style={{fontSize:'10px', opacity:0.7, marginLeft:'5px'}}>(TEST MODE)</span>}
      </h3>
      
      {servos.map(servo => {
        const isLow = servo.pwm <= THRESHOLD_LOW;
        const isMid = servo.pwm > THRESHOLD_LOW && servo.pwm < THRESHOLD_HIGH;
        const isHigh = servo.pwm >= THRESHOLD_HIGH;
        
        // Warna teks angka dinamis
        const valueColor = isLow ? '#ef4444' : isHigh ? '#16a34a' : '#3b82f6';

        return (
          <div key={servo.id} className={styles.servoItem}>
            <div className={styles.servoHeader}>
              <label>Servo {servo.id}</label>
              <span 
                className={styles.pwmValue}
                style={{ color: valueColor }}
              >
                {servo.pwm} µs
              </span>
            </div>
            
            <div className={styles.servoControls}>
              <input
                type="range"
                min={SERVO_MIN_PWM}
                max={SERVO_MAX_PWM}
                value={servo.pwm}
                onChange={(e) => handleServoChange(servo.id, e.target.value)}
                disabled={!isReady} 
                className={styles.slider}
                style={getSliderStyle(servo.pwm)}
              />
            </div>
            
            <div className={styles.presetButtons}>
              <button 
                className={`${styles.presetBtn} ${styles.btnLow} ${isLow ? styles.active : ''}`}
                onClick={() => setServoPreset(servo.id, 'low')}
                disabled={!isReady}
              >
                Low
              </button>
              <button 
                className={`${styles.presetBtn} ${styles.btnMid} ${isMid ? styles.active : ''}`}
                onClick={() => setServoPreset(servo.id, 'mid')}
                disabled={!isReady}
              >
                Mid
              </button>
              <button 
                className={`${styles.presetBtn} ${styles.btnHigh} ${isHigh ? styles.active : ''}`}
                onClick={() => setServoPreset(servo.id, 'high')}
                disabled={!isReady}
              >
                High
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ServoControl;