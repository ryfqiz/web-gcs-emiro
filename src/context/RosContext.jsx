import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import ROSLIB from 'roslib';

const RosContext = createContext();

export const useRos = () => {
  const context = useContext(RosContext);
  if (!context) {
    throw new Error('useRos must be used within RosProvider');
  }
  return context;
};

export const RosProvider = ({ children }) => {
  const [ros, setRos] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [rosUrl, setRosUrl] = useState(''); // Full WebSocket URL
  const [connectionIP, setConnectionIP] = useState(''); // IP only
  const rosRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = (url) => {
    console.log('🔌 Attempting to connect to:', url);
    
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Reset reconnect attempts on manual connect
    reconnectAttemptsRef.current = 0;
    
    // Inside connect(url)
    const match = url.match(/wss?:\/\/([^:]+):/);
    const extractedIP = match ? match[1] : '';
    setConnectionIP(extractedIP);
    
    console.log('Extracted IP:', extractedIP);
    
    // Close existing connection if any
    if (rosRef.current) {
      console.log('Closing existing connection...');
      rosRef.current.close();
      rosRef.current = null;
    }

    try {
      // Create new ROS connection
      const newRos = new ROSLIB.Ros({
        url: url
      });

      // Connection success handler
      newRos.on('connection', () => {
        console.log('✅ Connected to ROS at:', url);
        setIsConnected(true);
        setRosUrl(url);
        setConnectionIP(extractedIP);
        setRos(newRos);
        rosRef.current = newRos;
        reconnectAttemptsRef.current = 0; // Reset on successful connection
      });

      // Error handler
      newRos.on('error', (error) => {
        console.error('❌ ROS connection error:', error);
        setIsConnected(false);
        
        // Auto-reconnect logic
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000);
          console.log(`🔄 Reconnecting in ${delay}ms... (Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Auto-reconnecting...');
            connect(url);
          }, delay);
        } else {
          console.error('❌ Max reconnection attempts reached');
          setRosUrl('');
          setConnectionIP('');
        }
      });

      // Close handler
      newRos.on('close', () => {
        console.log('🔌 Disconnected from ROS');
        setIsConnected(false);
        
        // Only clear state if not attempting to reconnect
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setRosUrl('');
          setConnectionIP('');
        }
      });

    } catch (error) {
      console.error('❌ Failed to create ROS connection:', error);
      setIsConnected(false);
      setRosUrl('');
      setConnectionIP('');
    }
  };

  const disconnect = () => {
    console.log('Manual disconnect requested');
    
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Reset reconnect attempts to prevent auto-reconnect
    reconnectAttemptsRef.current = maxReconnectAttempts;
    
    // Close ROS connection
    if (rosRef.current) {
      rosRef.current.close();
      rosRef.current = null;
    }
    
    // Clear state
    setRos(null);
    setIsConnected(false);
    setRosUrl('');
    setConnectionIP('');
  };
    
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (rosRef.current) {
        rosRef.current.close();
      }
    };
  }, []);

  return (
    <RosContext.Provider 
      value={{ 
        ros, 
        isConnected,
        rosUrl, 
        connectionIP,
        connect, 
        disconnect 
      }}
    >
      {children}
    </RosContext.Provider>
  );
};