import { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom'; // IMPORT PENTING
import offlineMapManager from '../../utils/OfflineMapManager';
import './MapDownloadModal.css';

const MapDownloadModal = ({ isOpen, onClose, currentBounds, currentZoom }) => {
  const [step, setStep] = useState('select');
  const [mapType, setMapType] = useState('streets');
  const [zoomLevels, setZoomLevels] = useState([]);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStats, setDownloadStats] = useState(null);
  const [estimatedTiles, setEstimatedTiles] = useState(0);
  
  // Konfigurasi Zoom
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 22;
  const ZOOM_RANGE_DISPLAY = 10;

  // Logic Zoom Range
  const availableZooms = useMemo(() => {
    const start = Math.max(MIN_ZOOM, Math.round(currentZoom) - 3);
    const end = Math.min(MAX_ZOOM, start + ZOOM_RANGE_DISPLAY - 1);
    
    const levels = [];
    for (let z = start; z <= end; z++) {
      levels.push(z);
    }
    return levels;
  }, [currentZoom]);

  // Reset saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setDownloadProgress(0);
      setDownloadStats(null);
      setZoomLevels([Math.round(currentZoom)]);
    }
  }, [isOpen, currentZoom]);

  // Hitung Estimasi
  useEffect(() => {
    if (currentBounds && zoomLevels.length > 0) {
      let total = 0;
      for (const zoom of zoomLevels) {
        try {
          // Logic estimasi sederhana
          const nw = offlineMapManager.getTileCoordinates(currentBounds.north, currentBounds.west, zoom);
          const se = offlineMapManager.getTileCoordinates(currentBounds.south, currentBounds.east, zoom);
          const width = Math.abs(se.x - nw.x) + 1;
          const height = Math.abs(se.y - nw.y) + 1;
          total += width * height;
        } catch (e) {
          console.warn("Error calculating tiles", e);
        }
      }
      setEstimatedTiles(total);
    } else {
      setEstimatedTiles(0);
    }
  }, [currentBounds, zoomLevels]);

  const handleSelectAllZooms = () => {
    if (zoomLevels.length === availableZooms.length) {
      setZoomLevels([]);
    } else {
      setZoomLevels([...availableZooms]);
    }
  };

  const handleZoomToggle = (zoom) => {
    setZoomLevels(prev => {
      if (prev.includes(zoom)) {
        return prev.filter(z => z !== zoom);
      } else {
        return [...prev, zoom].sort((a, b) => a - b);
      }
    });
  };

  const handleDownload = async () => {
    if (!currentBounds) return;
    
    const hasHighZoom = zoomLevels.some(z => z >= 19);
    if (hasHighZoom && estimatedTiles > 2000) {
      if (!window.confirm(`Warning: High zoom download (${estimatedTiles} tiles). This may take a while. Continue?`)) {
        return;
      }
    }

    setStep('downloading');
    setDownloadProgress(0);

    try {
      await offlineMapManager.downloadMapArea(
        currentBounds,
        zoomLevels,
        mapType,
        (stats) => {
          setDownloadProgress(stats.progress);
          setDownloadStats(stats);
        }
      );
      setStep('complete');
    } catch (error) {
      alert('Download Error: ' + error.message);
      setStep('select');
    }
  };

  const handleClose = () => {
    if (step === 'downloading') {
      if (!window.confirm('Cancel download?')) return;
    }
    onClose();
  };

  if (!isOpen) return null;

  // --- SOLUSI PORTAL AGAR POSISI SELALU DI TENGAH LAYAR ---
  return ReactDOM.createPortal(
    <div className="map-download-modal-overlay">
      <div className="map-download-modal">
        
        {/* Header */}
        <div className="modal-header">
          <h2>Download Offline Map</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {step === 'select' && (
            <>
              {/* Map Type */}
              <div className="section">
                <h3>Map Type</h3>
                <div className="map-type-selector">
                  <label className={mapType === 'streets' ? 'active' : ''}>
                    <input type="radio" value="streets" checked={mapType === 'streets'} onChange={() => setMapType('streets')} />
                    Streets
                  </label>
                  <label className={mapType === 'satellite' ? 'active' : ''}>
                    <input type="radio" value="satellite" checked={mapType === 'satellite'} onChange={() => setMapType('satellite')} />
                    Satellite
                  </label>
                </div>
              </div>

              {/* Zoom Levels */}
              <div className="section">
                <div className="section-header">
                  <h3>Zoom Levels</h3>
                  <button className="btn-small" onClick={handleSelectAllZooms}>
                    {zoomLevels.length === availableZooms.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                
                <div className="zoom-selector">
                  {availableZooms.map(zoom => (
                    <label key={zoom} className={zoomLevels.includes(zoom) ? 'active' : ''}>
                      <input
                        type="checkbox"
                        checked={zoomLevels.includes(zoom)}
                        onChange={() => handleZoomToggle(zoom)}
                      />
                      Z{zoom}
                    </label>
                  ))}
                </div>
                <p className="hint">Current Zoom: Z{Math.round(currentZoom)}. Higher zoom (Z19+) takes more storage.</p>
              </div>

              {/* Estimasi */}
              <div className="section cache-info">
                <p><span>Tiles to download:</span> <strong>{estimatedTiles.toLocaleString()}</strong></p>
                <p><span>Est. Size:</span> <strong>~{(estimatedTiles * 0.02).toFixed(1)} MB</strong></p>
                <p><span>Est. Time:</span> <strong>~{Math.ceil(estimatedTiles / 100)} sec</strong></p>
              </div>

              <button 
                className="btn-download" 
                onClick={handleDownload}
                disabled={zoomLevels.length === 0 || estimatedTiles === 0}
              >
                Start Download
              </button>
            </>
          )}

          {step === 'downloading' && (
            <div className="downloading">
              <h3>Downloading...</h3>
              <div className="progress-text">{Math.round(downloadProgress)}%</div>
              {downloadStats && (
                <div className="hint">
                  {downloadStats.downloaded} / {downloadStats.total} tiles
                </div>
              )}
            </div>
          )}

          {step === 'complete' && (
            <div className="complete">
              <div className="success-icon">✓</div>
              <h3>Download Complete!</h3>
              <p>Map area is now available offline.</p>
              <button className="btn-done" onClick={onClose}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body // Target Render: Langsung ke Body, lepas dari Map Container
  );
};

export default MapDownloadModal;