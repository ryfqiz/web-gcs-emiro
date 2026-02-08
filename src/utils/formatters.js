// Format latitude/longitude ke string dengan presisi
export function formatCoordinate(value, precision = 7) {
  return value.toFixed(precision);
}

// Format altitude dengan satuan
export function formatAltitude(value, unit = 'm') {
  return `${value.toFixed(1)} ${unit}`;
}

// Format kecepatan
export function formatSpeed(value, unit = 'm/s') {
  return `${value.toFixed(1)} ${unit}`;
}

// Format voltage
export function formatVoltage(value) {
  return `${value.toFixed(2)} V`;
}

// Format current
export function formatCurrent(value) {
  return `${value.toFixed(2)} A`;
}

// Format percentage
export function formatPercentage(value) {
  return `${Math.round(value)} %`;
}

// Format angle
export function formatAngle(value) {
  return `${value.toFixed(1)}°`;
}

// Format timestamp
export function formatTimestamp(date = new Date()) {
  return date.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}