// Flight modes available for Pixhawk (Only used modes)
export const FLIGHT_MODES = [
  'STABILIZE',  // Manual stabilization
  'ALT_HOLD',   // Altitude hold
  'AUTO',       // Auto mission
  'GUIDED',     // Guided mode (GCS control)
  'LOITER',     // Position hold with GPS
  'RTL',        // Return to launch
  'LAND'        // Controlled landing
];

// Servo PWM ranges
export const SERVO_MIN_PWM = 1000;
export const SERVO_MAX_PWM = 2000;
export const SERVO_NEUTRAL_PWM = 1500;

// GPS signal quality thresholds
export const GPS_MIN_SATELLITES = 6;
export const GPS_GOOD_SATELLITES = 10;
export const GPS_EXCELLENT_SATELLITES = 15;

// GPS Fix types
export const GPS_FIX_TYPES = {
  NO_FIX: 'NO_FIX',
  GPS_2D: 'GPS_2D',
  GPS_3D: 'GPS_3D'
};

// RTK Status types
export const RTK_STATUS_TYPES = {
  NONE: 'NONE',
  RTK_FLOAT: 'RTK_FLOAT',
  RTK_FIX: 'RTK_FIX'
};

// Emergency action altitude thresholds (meters)
export const EMERGENCY_THRESHOLDS = {
  DISARM_ALTITUDE: 2,    // Below 2m - immediate disarm
  LAND_ALTITUDE: 10,     // Below 10m - controlled landing
  RTL_ALTITUDE: 10       // Above 10m - return to launch
};

// Waypoint actions
export const WAYPOINT_ACTIONS = {
  WAYPOINT: 16,
  LOITER_UNLIM: 17,
  LOITER_TURNS: 18,
  LOITER_TIME: 19,
  RETURN_TO_LAUNCH: 20,
  LAND: 21,
  TAKEOFF: 22
};

// Connection settings
export const CONNECTION = {
  DEFAULT_PORT: '9090',
  RECONNECT_DELAY: 3000,
  HEARTBEAT_INTERVAL: 1000
};

// UI Colors for status
export const STATUS_COLORS = {
  EXCELLENT: '#2ecc71',
  GOOD: '#f39c12',
  POOR: '#e74c3c',
  ARMED: '#e74c3c',
  DISARMED: '#2ecc71',
  RTK_FIX: '#2ecc71',
  RTK_FLOAT: '#f39c12',
  RTK_NONE: '#7f8c8d'
};