// src/utils/calculations.js

// Haversine formula untuk menghitung jarak antara dua koordinat GPS
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius bumi dalam meter
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Menghitung bearing antara dua koordinat
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return (θ * 180 / Math.PI + 360) % 360; // Bearing in degrees
}

// Kalkulasi waktu untuk payload drop (simplified)
export function calculateDropTime(altitude, velocity) {
  const g = 9.81; // gravitasi m/s^2
  const freefall = Math.sqrt((2 * altitude) / g);
  const timeAdjustment = velocity * 0.1;
  return freefall + timeAdjustment;
}

// Kalkulasi jarak horizontal untuk drop
export function calculateDropDistance(altitude, velocity, windSpeed = 0) {
  const dropTime = calculateDropTime(altitude, velocity);
  return velocity * dropTime + (windSpeed * dropTime);
}
