/**
 * Offline Map Manager - No Emoji Version
 */

const DB_NAME = 'WebGCS_MapCache';
const DB_VERSION = 1;
const TILE_STORE = 'tiles';
const META_STORE = 'metadata';

class OfflineMapManager {
  constructor() {
    this.db = null;
    this.isDownloading = false;
    this. downloadProgress = 0;
    this.onProgressCallback = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineMap] Database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(TILE_STORE)) {
          const tileStore = db.createObjectStore(TILE_STORE, { keyPath: 'key' });
          tileStore.createIndex('timestamp', 'timestamp', { unique: false });
          tileStore.createIndex('type', 'metadata.type', { unique: false });
          console.log('[OfflineMap] Tile store created');
        }

        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'id' });
          console.log('[OfflineMap] Metadata store created');
        }
      };
    });
  }

  getTileCoordinates(lat, lng, zoom) {
    const n = Math.pow(2, zoom);
    const xtile = Math.floor(((lng + 180) / 360) * n);
    const ytile = Math.floor(
      ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
    );
    return { x: xtile, y: ytile, z: zoom };
  }

  getTileUrl(x, y, z, type = 'streets') {
    const subdomains = ['a', 'b', 'c'];
    const s = subdomains[Math.floor(Math.random() * subdomains.length)];
    
    if (type === 'satellite') {
      // Esri World Imagery supports up to Z19
      if (z > 19) {
        console.warn(`[OfflineMap] Satellite tiles only available up to Z19, requested Z${z}`);
        return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/${y}/${x}`;
      }
      return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
    } else {
      // OpenStreetMap supports up to Z19 officially, some tiles go to Z20-22
      if (z > 19) {
        console.warn(`[OfflineMap] OSM tiles may not be available at Z${z}`);
      }
      return `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
    }
  }

  async downloadTile(x, y, z, type = 'streets') {
    const url = this.getTileUrl(x, y, z, type);
    const key = `${type}-${z}-${x}-${y}`;

    // Check if tile already exists - skip if already cached
    const exists = await this. hasTile(x, y, z, type);
    if (exists) {
      console.log(`[OfflineMap] Tile ${key} already cached, skipping`);
      return true;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'force-cache' // Use browser cache when possible
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('Empty blob');
      }

      await this.saveTile(key, blob, { x, y, z, type, url });
      
      return true;
    } catch (error) {
      console.warn(`[OfflineMap] Fetch failed for ${key}, trying image method`);
      
      try {
        const imageBlob = await this.downloadTileViaImage(url);
        await this.saveTile(key, imageBlob, { x, y, z, type, url });
        return true;
      } catch (imgError) {
        console.error(`[OfflineMap] Both methods failed for ${key}`);
        return false;
      }
    }
  }

  async downloadTileViaImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 256;
          canvas.height = img.height || 256;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/png');
        } catch (e) {
          reject(e);
        }
      };

      img.onerror = () => {
        reject(new Error('Image load failed'));
      };

      img.src = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
      
      setTimeout(() => {
        reject(new Error('Image load timeout'));
      }, 10000);
    });
  }

  async saveTile(key, blob, metadata) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([TILE_STORE], 'readwrite');
      const store = transaction.objectStore(TILE_STORE);

      const tileData = {
        key,
        blob,
        timestamp: Date.now(),
        metadata
      };

      const request = store.put(tileData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async downloadMapArea(bounds, zoomLevels, type = 'streets', onProgress) {
    if (this.isDownloading) {
      throw new Error('Download already in progress');
    }

    this.isDownloading = true;
    this.onProgressCallback = onProgress;

    const { north, south, east, west } = bounds;
    const tiles = [];

    for (const zoom of zoomLevels) {
      const nwTile = this.getTileCoordinates(north, west, zoom);
      const seTile = this.getTileCoordinates(south, east, zoom);

      for (let x = nwTile.x; x <= seTile.x; x++) {
        for (let y = nwTile.y; y <= seTile.y; y++) {
          tiles.push({ x, y, z: zoom, type });
        }
      }
    }

    const totalTiles = tiles.length;
    let downloadedTiles = 0;
    let skippedTiles = 0;
    let failedTiles = 0;

    console.log(`[OfflineMap] Starting download:  ${totalTiles} tiles`);

    const batchSize = 5;
    for (let i = 0; i < tiles.length; i += batchSize) {
      const batch = tiles.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(tile => this.downloadTile(tile.x, tile.y, tile.z, tile.type))
      );

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          downloadedTiles++;
        } else {
          failedTiles++;
        }
      });

      this.downloadProgress = ((downloadedTiles + failedTiles) / totalTiles) * 100;
      
      if (this.onProgressCallback) {
        this.onProgressCallback({
          progress: this. downloadProgress,
          downloaded: downloadedTiles,
          failed:  failedTiles,
          total: totalTiles
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Save metadata with unique ID based on bounds and type
    const areaId = `area-${type}-${Math.floor(north)}-${Math.floor(west)}-${Date.now()}`;
    await this.saveMetadata({
      id: areaId,
      bounds,
      zoomLevels,
      type,
      tileCount: downloadedTiles,
      downloadDate: new Date().toISOString(),
      persistent: true // Mark as persistent
    });

    this.isDownloading = false;
    this.downloadProgress = 0;

    console.log(`[OfflineMap] Download complete: ${downloadedTiles} tiles (${failedTiles} failed)`);

    return {
      success: downloadedTiles > 0,
      downloaded: downloadedTiles,
      failed: failedTiles,
      total: totalTiles
    };
  }

  async getTile(x, y, z, type = 'streets') {
    const key = `${type}-${z}-${x}-${y}`;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([TILE_STORE], 'readonly');
      const store = transaction.objectStore(TILE_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result) {
          const url = URL.createObjectURL(request.result.blob);
          resolve(url);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async hasTile(x, y, z, type = 'streets') {
    const key = `${type}-${z}-${x}-${y}`;

    return new Promise((resolve) => {
      const transaction = this.db.transaction([TILE_STORE], 'readonly');
      const store = transaction.objectStore(TILE_STORE);
      const request = store.get(key);

      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => resolve(false);
    });
  }

  async saveMetadata(data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([META_STORE], 'readwrite');
      const store = transaction.objectStore(META_STORE);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedAreas() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([META_STORE], 'readonly');
      const store = transaction.objectStore(META_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getCacheSize() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([TILE_STORE], 'readonly');
      const store = transaction.objectStore(TILE_STORE);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearCache() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([TILE_STORE, META_STORE], 'readwrite');
      
      const tileStore = transaction.objectStore(TILE_STORE);
      const metaStore = transaction.objectStore(META_STORE);
      
      tileStore.clear();
      metaStore.clear();

      transaction.oncomplete = () => {
        console.log('[OfflineMap] Cache cleared');
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteArea(areaId) {
    const areas = await this.getCachedAreas();
    const area = areas.find(a => a.id === areaId);
    
    if (!area) return;

    const tiles = [];
    for (const zoom of area.zoomLevels) {
      const nwTile = this.getTileCoordinates(area.bounds.north, area.bounds.west, zoom);
      const seTile = this.getTileCoordinates(area.bounds.south, area.bounds.east, zoom);

      for (let x = nwTile.x; x <= seTile.x; x++) {
        for (let y = nwTile.y; y <= seTile.y; y++) {
          tiles.push(`${area.type}-${zoom}-${x}-${y}`);
        }
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([TILE_STORE, META_STORE], 'readwrite');
      const tileStore = transaction.objectStore(TILE_STORE);
      const metaStore = transaction.objectStore(META_STORE);

      tiles.forEach(key => tileStore.delete(key));
      metaStore.delete(areaId);

      transaction.oncomplete = () => {
        console.log(`[OfflineMap] Deleted area:  ${areaId}`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get storage usage info
   */
  async getStorageInfo() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        usageInMB: (estimate.usage / (1024 * 1024)).toFixed(2),
        quotaInMB:  (estimate.quota / (1024 * 1024)).toFixed(2),
        percentUsed: ((estimate.usage / estimate.quota) * 100).toFixed(2)
      };
    }
    return null;
  }

  /**
   * Request persistent storage (prevents deletion on storage pressure)
   */
  async requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      console.log(`[OfflineMap] Persistent storage:  ${isPersisted}`);
      return isPersisted;
    }
    return false;
  }

  /**
   * Check if storage is persistent
   */
  async isPersistent() {
    if (navigator.storage && navigator.storage.persisted) {
      return await navigator.storage.persisted();
    }
    return false;
  }
}

const offlineMapManager = new OfflineMapManager();

export default offlineMapManager;