// Offline Map Tile Handler with Online/Offline flexibility

export const OFFLINE_TILE_SERVER = {
  localTilesPath: '/offline-maps/{z}/{x}/{y}.png',
  osmUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satelliteUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

// Check if running offline
export const isOfflineMode = () => {
  return !navigator.onLine;
};

// Check if tiles can be loaded (internet connectivity test)
export const checkInternetConnectivity = async () => {
  try {
    const response = await fetch('https://tile.openstreetmap.org/0/0/0.png', {
      method: 'HEAD',
      cache: 'no-cache',
      timeout: 3000,
    });
    return response.ok;
  }catch(error){
    return false;
  }
};

// Generate gray grid tile as fallback
export const getGrayTileDataURL = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // Dark background
  ctx.fillStyle = '#1a2332';
  ctx.fillRect(0, 0, 256, 256);
  
  // Grid lines
  ctx.strokeStyle = '#2c3e50';
  ctx. lineWidth = 1;
  
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  
  // Add center cross for reference
  ctx.strokeStyle = '#3498db';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(128, 118);
  ctx.lineTo(128, 138);
  ctx.stroke();
  ctx.beginPath();
  ctx. moveTo(118, 128);
  ctx. lineTo(138, 128);
  ctx.stroke();
  
  return canvas.toDataURL();
};

// Generate coordinate grid tile with lat/lon
export const getCoordinateTileDataURL = (z, x, y) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // Dark background
  ctx.fillStyle = '#1a2332';
  ctx.fillRect(0, 0, 256, 256);
  
  // Grid
  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 1;
  
  for (let i = 0; i <= 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  
  // Tile coordinates
  ctx.fillStyle = '#3498db';
  ctx.font = '12px monospace';
  ctx.fillText(`Z:${z}`, 10, 20);
  ctx.fillText(`X:${x}`, 10, 35);
  ctx.fillText(`Y:${y}`, 10, 50);
  
  return canvas.toDataURL();
};