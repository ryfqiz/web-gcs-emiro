import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useTelemetry } from '../../hooks/useTelemetry';
import { useRos } from '../../context/RosContext'; 
import MapDownloadModal from '../Map/MapDownloadModal';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './MapView.module.css';

// --- KONFIGURASI LAYER MAP ---
const MAP_LAYERS = {
  standard: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; OpenStreetMap'
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; Esri'
  }
};

// Custom Markers
const droneIcon = new L.DivIcon({
  html: `<div style="
    width: 24px; height: 24px; background: #3498db; 
    border: 3px solid white; border-radius: 50%; 
    box-shadow: 0 0 12px rgba(52, 152, 219, 0.8), 0 2px 6px rgba(0, 0, 0, 0.3);
  "></div>`,
  className: '', iconSize: [24, 24], iconAnchor: [12, 12],
});

const homeIcon = new L.DivIcon({
  html: `<div style="
    width: 20px; height: 20px; background: #2ecc71; 
    border: 3px solid white; border-radius: 3px; 
    box-shadow: 0 0 12px rgba(46, 204, 113, 0.8), 0 2px 6px rgba(0, 0, 0, 0.3);
  "></div>`,
  className: '', iconSize: [20, 20], iconAnchor: [10, 20],
});

// Helper Components
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0 && center[1] !== 0) {
      map.setView(center, zoom, { animate: true, duration: 0.5 });
    }
  }, [center, zoom, map]);
  return null;
};

const MapBoundsCapture = ({ onMapReady }) => {
  const map = useMap();
  useEffect(() => { if (map) onMapReady(map); }, [map, onMapReady]);
  return null;
};

const MapView = () => {
  const telemetry = useTelemetry();
  const { isConnected } = useRos();
  
  const [homePosition, setHomePosition] = useState(null);
  const [followDrone, setFollowDrone] = useState(true);
  const [mapInstance, setMapInstance] = useState(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [currentBounds, setCurrentBounds] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(18);
  const [mapType, setMapType] = useState('standard'); 

  const toggleMapType = () => {
    setMapType(prev => prev === 'standard' ? 'satellite' : 'standard');
  };

  // Set Home Logic
  useEffect(() => {
    if (telemetry.hasGPS && telemetry.latitude !== 0 && !homePosition) {
      setHomePosition([telemetry.latitude, telemetry.longitude]);
    }
  }, [telemetry.hasGPS, telemetry.latitude, telemetry.longitude, homePosition]);

  // Map Move Listener
  useEffect(() => {
    if (mapInstance) {
      const updateMapInfo = () => {
        const bounds = mapInstance.getBounds();
        setCurrentBounds({
          north: bounds.getNorth(), south: bounds.getSouth(),
          east: bounds.getEast(), west: bounds.getWest()
        });
        setCurrentZoom(mapInstance.getZoom());
      };
      
      // Update info awal
      updateMapInfo();

      // Deteksi interaksi user (drag) -> matikan followDrone otomatis
      const handleDragStart = () => {
        if (followDrone) setFollowDrone(false);
      };

      mapInstance.on('moveend', updateMapInfo);
      mapInstance.on('zoomend', updateMapInfo);
      mapInstance.on('dragstart', handleDragStart); // Penting: Matikan lock saat user geser peta

      return () => {
        mapInstance.off('moveend', updateMapInfo);
        mapInstance.off('zoomend', updateMapInfo);
        mapInstance.off('dragstart', handleDragStart);
      };
    }
  }, [mapInstance, followDrone]);

  // --- CONTROL FUNCTIONS (Zoom & Recenter) ---
  const handleZoomIn = (e) => {
    e.stopPropagation(); // Mencegah klik tembus ke map
    if (mapInstance) mapInstance.zoomIn();
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    if (mapInstance) mapInstance.zoomOut();
  };

  const handleRecenter = (e) => {
    e.stopPropagation();
    // Jika ada GPS drone, lock ke drone. Jika tidak, coba ke Home.
    if (dronePosition) {
      setFollowDrone(true);
      mapInstance.setView(dronePosition, 18, { animate: true });
    } else if (homePosition) {
      mapInstance.setView(homePosition, 18, { animate: true });
    }
  };

  const dronePosition = (telemetry.hasGPS && telemetry.latitude !== 0) 
    ? [telemetry.latitude, telemetry.longitude] : null;
  
  const defaultCenter = [-6.9175, 107.6191]; 

  const getHeaderStatus = () => {
    if (!isConnected) return { text: 'OFFLINE', class: styles.dotOffline };
    if (!dronePosition) return { text: 'WAITING GPS', class: styles.dotWarning };
    return { text: 'LIVE TRACKING', class: styles.dotActive };
  };
  const headerStatus = getHeaderStatus();

  return (
    <div className={styles.mapPanelContainer}>
      
      <div className={styles.mapHeader}>
        <div className={styles.mapTitle}>MISSION MAP</div>
        <div className={styles.headerStatus}>
          <div className={`${styles.statusDot} ${headerStatus.class}`}></div>
          <span>{headerStatus.text}</span>
        </div>
      </div>

      <div className={styles.mapContentWrapper}>
        
        {/* Tombol Kontrol Atas (Overlay Lama) */}
        <div className={styles.mapControls}>
          <button className={`${styles.controlBtn} ${mapType === 'satellite' ? styles.active : ''}`} onClick={toggleMapType}>
            {mapType === 'standard' ? 'SAT VIEW' : 'MAP VIEW'}
          </button>
          <button className={`${styles.controlBtn} ${followDrone ? styles.active : ''}`} onClick={() => setFollowDrone(!followDrone)}>
            {followDrone ? 'LOCKED' : 'FREE'}
          </button>
          <button className={styles.controlBtn} onClick={() => dronePosition && setHomePosition(dronePosition)} disabled={!dronePosition}>
            SET HOME
          </button>
          <button className={styles.controlBtn} onClick={() => setIsDownloadModalOpen(true)}>
            DL MAP
          </button>
        </div>

        {/* --- GOOGLE MAPS STYLE CONTROLS (BARU) --- */}
        <div className={styles.bottomRightControls}>
          {/* Tombol Recenter */}
          <button 
            className={`${styles.floatBtn} ${styles.recenterBtn} ${followDrone ? styles.activeRecenter : ''}`} 
            onClick={handleRecenter}
            title="Recenter Map"
          >
            <div className={styles.iconTarget}></div>
          </button>

          {/* Grup Zoom */}
          <div className={styles.controlGroup}>
            <button className={styles.floatBtn} onClick={handleZoomIn} title="Zoom In">+</button>
            <div className={styles.zoomDivider}></div>
            <button className={styles.floatBtn} onClick={handleZoomOut} title="Zoom Out">-</button>
          </div>
        </div>

        <MapContainer
          center={defaultCenter}
          zoom={18}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false} // Disable default zoom control agar bisa custom
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution={MAP_LAYERS[mapType].attribution}
            url={MAP_LAYERS[mapType].url}
            maxZoom={22}
          />
          
          <MapBoundsCapture onMapReady={setMapInstance} />
          {followDrone && dronePosition && <MapUpdater center={dronePosition} zoom={18} />}
          
          {dronePosition && (
            <Marker position={dronePosition} icon={droneIcon}>
              <Popup className={styles.customPopup}>
                <div className={styles.popupContent}>
                  <div className={styles.popupHeader}>DRONE POSITION</div>
                  <div className={styles.popupRow}><span className={styles.popupLabel}>Lat:</span><span className={styles.popupValue}>{telemetry.latitude.toFixed(6)}</span></div>
                  <div className={styles.popupRow}><span className={styles.popupLabel}>Lng:</span><span className={styles.popupValue}>{telemetry.longitude.toFixed(6)}</span></div>
                </div>
              </Popup>
            </Marker>
          )}
          
          {homePosition && <Marker position={homePosition} icon={homeIcon} />}
        </MapContainer>

        <div className={styles.mapStatusOverlay}>
          <div className={styles.statusGroup}>
            <span className={styles.statusLabel}>GPS:</span>
            <span className={`${styles.statusValue} ${telemetry.gpsStatus === 'GPS_3D' ? styles.gpsActive : styles.gpsInactive}`}>
              {telemetry.gpsStatus === 'GPS_3D' ? '3D FIX' : 'NO FIX'}
            </span>
          </div>
          <div className={styles.statusGroup}>
            <span className={styles.statusLabel}>SATS:</span>
            <span className={styles.statusValue}>{telemetry.satellites}</span>
          </div>
        </div>

      </div>

      <MapDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        currentBounds={currentBounds}
        currentZoom={currentZoom}
      />
    </div>
  );
};

export default MapView;