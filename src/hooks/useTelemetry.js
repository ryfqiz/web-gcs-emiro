import { useState, useEffect, useRef } from 'react';
import { useRos } from '../context/RosContext';
import ROSLIB from 'roslib';

export const useTelemetry = () => {
  const { ros, isConnected } = useRos();
  const listenersRef = useRef([]);

  const [telemetry, setTelemetry] = useState({
    // Position
    latitude: 0,
    longitude: 0,
    altitude: 0,
    relAlt: 0,
    localX: 0,
    localY: 0,
    localZ: 0,
    hasGPS: false,

    // Velocity
    groundSpeed: 0,
    airSpeed: 0,
    velocityX:  0,
    velocityY: 0,
    velocityZ: 0,

    // Attitude
    heading: 0,
    throttle: 0,
    roll: 0,
    pitch: 0,
    yaw: 0,

    // GPS Status - Simplified
    satellites: 0,
    gpsStatus: 'NO_GPS', // Only 'NO_GPS' or 'GPS_3D'
    gpsFixType: 0,
    rtkStatus: 'NO_RTK',

    // System
    flightMode: 'UNKNOWN',
    armed:  false,
  });

  useEffect(() => {
    if (!ros || !isConnected) return;

    // Throttle function to limit update rate
    const createThrottledCallback = (callback, delay) => {
      let lastCall = 0;
      return (message) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
          lastCall = now;
          callback(message);
        }
      };
    };

    // State - Flight mode and armed status
    const stateListener = new ROSLIB.Topic({
      ros: ros,
      name:  '/mavros/state',
      messageType: 'mavros_msgs/State',
      throttle_rate: 2000
    });

    stateListener. subscribe((message) => {
      setTelemetry(prev => ({
        ...prev,
        flightMode: message.mode,
        armed: message.armed
      }));
    });
    listenersRef.current.push(stateListener);

    // Global Position (GPS)
    const globalPosListener = new ROSLIB.Topic({
      ros: ros,
      name: '/mavros/global_position/global',
      messageType:  'sensor_msgs/NavSatFix',
      throttle_rate: 1000
    });

    globalPosListener. subscribe(createThrottledCallback((message) => {
      const hasValidGPS = message.status. status >= 0;
      let rtkStatusText = 'NO_RTK';
      const covType = message.position_covariance_type;

      if (covType === 0) rtkStatusText = 'NO_RTK';
      else if (covType === 1 || covType === 2) rtkStatusText = 'RTK_FLOAT';
      else if (covType === 3) rtkStatusText = 'RTK_FIX';

      setTelemetry(prev => ({
        ... prev,
        latitude: hasValidGPS ? message.latitude : prev.latitude,
        longitude: hasValidGPS ? message.longitude :  prev.longitude,
        altitude: hasValidGPS ? message.altitude : prev.altitude,
        hasGPS: hasValidGPS,
        rtkStatus: rtkStatusText
      }));
    }, 1000));
    listenersRef.current.push(globalPosListener);

    // Local Position
    const localPosListener = new ROSLIB.Topic({
      ros: ros,
      name: '/mavros/local_position/pose',
      messageType: 'geometry_msgs/PoseStamped',
      throttle_rate: 500
    });

    localPosListener.subscribe(createThrottledCallback((message) => {
      setTelemetry(prev => ({
        ...prev,
        localX: message.pose.position. x,
        localY: message.pose.position.y,
        localZ: message.pose. position.z,
        relAlt: message.pose.position. z,
      }));
    }, 500));
    listenersRef.current.push(localPosListener);

    // Local Velocity
    const localVelListener = new ROSLIB.Topic({
      ros: ros,
      name: '/mavros/local_position/velocity_local',
      messageType: 'geometry_msgs/TwistStamped',
      throttle_rate: 500
    });

    localVelListener.subscribe(createThrottledCallback((message) => {
      const vx = message.twist. linear.x;
      const vy = message.twist.linear. y;
      const vz = message.twist.linear.z;
      const speed = Math.sqrt(vx*vx + vy*vy);

      setTelemetry(prev => ({
        ...prev,
        velocityX: vx,
        velocityY: vy,
        velocityZ:  vz,
        groundSpeed:  speed,
      }));
    }, 500));
    listenersRef.current.push(localVelListener);

    // IMU - Attitude
    const imuListener = new ROSLIB.Topic({
      ros: ros,
      name: '/mavros/imu/data',
      messageType: 'sensor_msgs/Imu',
      throttle_rate: 200
    });

    imuListener.subscribe(createThrottledCallback((message) => {
      const q = message.orientation;
      const roll = Math.atan2(2*(q.w*q.x + q.y*q.z), 1 - 2*(q.x*q. x + q.y*q. y)) * (180/Math.PI);
      const pitch = -Math.asin(2*(q.w*q.y - q.z*q.x)) * (180/Math.PI);
      const yaw = Math. atan2(2*(q.w*q.z + q.x*q.y), 1 - 2*(q.y*q.y + q.z*q.z)) * (180/Math.PI);

      setTelemetry(prev => ({
        ...prev,
        roll: roll,
        pitch: pitch,
        yaw: yaw
      }));
    }, 200));
    listenersRef.current.push(imuListener);

    // VFR HUD - Speed, heading, throttle
    const vfrListener = new ROSLIB. Topic({
      ros: ros,
      name: '/mavros/vfr_hud',
      messageType: 'mavros_msgs/VFR_HUD',
      throttle_rate: 500
    });

    vfrListener.subscribe(createThrottledCallback((message) => {
      setTelemetry(prev => ({
        ...prev,
        groundSpeed: message.groundspeed,
        airSpeed:  message.airspeed,
        heading: message.heading,
        throttle: message.throttle
      }));
    }, 500));
    listenersRef.current.push(vfrListener);

    // GPS Status - Simplified to NO_GPS or GPS_3D only
    const gpsStatusListener = new ROSLIB.Topic({
      ros: ros,
      name: '/mavros/gpsstatus/gps1/raw',
      messageType: 'mavros_msgs/GPSRAW',
      throttle_rate: 2000
    });

    gpsStatusListener.subscribe(createThrottledCallback((message) => {
      // Simplified:  Only NO_GPS or GPS_3D
      const gpsStatusText = (message.fix_type >= 3) ? 'GPS_3D' : 'NO_GPS';

      setTelemetry(prev => ({
        ...prev,
        satellites: message.satellites_visible,
        gpsStatus: gpsStatusText,
        gpsFixType: message.fix_type
      }));
    }, 2000));
    listenersRef.current.push(gpsStatusListener);

    // Cleanup function
    return () => {
      console.log('[Telemetry] Cleaning up listeners');
      listenersRef.current.forEach(listener => {
        try {
          listener.unsubscribe();
        } catch (e) {
          console.warn('[Telemetry] Error unsubscribing:', e);
        }
      });
      listenersRef.current = [];
    };
  }, [ros, isConnected]);

  return telemetry;
};