// src/services/flightControlService.js
import ROSLIB from 'roslib';

export class FlightControlService {
  constructor(ros) {
    this.ros = ros;
    this.timeout = 5000;
    this.lastCommandTime = {};
    this.minCommandInterval = 300; // Min 300ms between same commands
  }

  // Rate limiting helper
  canExecuteCommand(commandName) {
    const now = Date.now();
    const lastTime = this.lastCommandTime[commandName] || 0;
    
    if (now - lastTime < this.minCommandInterval) {
      console.warn(`Command ${commandName} rate limited`);
      return false;
    }
    
    this.lastCommandTime[commandName] = now;
    return true;
  }

  // Helper untuk service call dengan timeout dan error handling
  async callServiceWithTimeout(serviceName, serviceType, request) {
    if (!this.ros || !this.ros.isConnected) {
      throw new Error('ROS not connected');
    }

    return new Promise((resolve, reject) => {
      const service = new ROSLIB.Service({
        ros: this.ros,
        name: serviceName,
        serviceType: serviceType
      });

      const timeoutId = setTimeout(() => {
        reject(new Error(`Service call timeout: ${serviceName}`));
      }, this.timeout);

      service.callService(request, 
        (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(new Error(`Service call failed: ${error}`));
        }
      );
    });
  }

  async setMode(mode) {
    if (!this.canExecuteCommand('setMode')) {
      throw new Error('Command rate limited');
    }

    try {
      const request = new ROSLIB.ServiceRequest({
        custom_mode: mode
      });

      const result = await this.callServiceWithTimeout(
        '/mavros/set_mode',
        'mavros_msgs/SetMode',
        request
      );

      if (!result.mode_sent) {
        throw new Error('Mode change rejected by flight controller');
      }

      console.log(`✅ Mode changed to: ${mode}`);
      return result;
    } catch (error) {
      console.error('❌ Set mode error:', error);
      throw error;
    }
  }

  async setArmed(armed) {
    if (!this.canExecuteCommand('setArmed')) {
      throw new Error('Command rate limited');
    }

    try {
      const request = new ROSLIB.ServiceRequest({
        value: armed
      });

      const result = await this.callServiceWithTimeout(
        '/mavros/cmd/arming',
        'mavros_msgs/CommandBool',
        request
      );

      if (!result.success) {
        throw new Error('Arming command rejected by flight controller');
      }

      console.log(`✅ Armed: ${armed}`);
      return result;
    } catch (error) {
      console.error('❌ Set armed error:', error);
      throw error;
    }
  }

  async land() {
    if (!this.canExecuteCommand('land')) {
      throw new Error('Command rate limited');
    }

    try {
      const request = new ROSLIB.ServiceRequest({
        altitude: 0,
        latitude: 0,
        longitude: 0,
        min_pitch: 0,
        yaw: 0
      });

      const result = await this.callServiceWithTimeout(
        '/mavros/cmd/land',
        'mavros_msgs/CommandTOL',
        request
      );

      if (!result.success) {
        throw new Error('Land command rejected');
      }

      console.log('✅ Landing initiated');
      return result;
    } catch (error) {
      console.error('❌ Land error:', error);
      throw error;
    }
  }

  setServo(channel, pwm) {
    if (!this.canExecuteCommand(`servo_${channel}`)) {
      console.warn('Servo command rate limited');
      return;
    }

    try {
      // Validate inputs
      if (channel < 1 || channel > 8) {
        throw new Error('Servo channel must be between 1-8');
      }
      if (pwm < 1000 || pwm > 2000) {
        throw new Error('PWM value must be between 1000-2000');
      }

      if (!this.ros || !this.ros.isConnected) {
        throw new Error('ROS not connected');
      }

      // Create RC override message
      const rcOverride = new ROSLIB.Message({
        channels: [0, 0, 0, 0, 0, 0, 0, 0]
      });

      // Set specific channel (channels are 0-indexed)
      rcOverride.channels[channel - 1] = pwm;

      // Publish to topic (non-blocking)
      const rcOverrideTopic = new ROSLIB.Topic({
        ros: this.ros,
        name: '/mavros/rc/override',
        messageType: 'mavros_msgs/OverrideRCIn',
        queue_size: 1
      });

      rcOverrideTopic.publish(rcOverride);
      console.log(`✅ Servo ${channel} set to ${pwm} µs`);
      
      // Cleanup topic after publish
      setTimeout(() => {
        rcOverrideTopic.unadvertise();
      }, 100);
      
    } catch (error) {
      console.error('❌ Set servo error:', error);
      throw error;
    }
  }

}