import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRos } from '../../context/RosContext';
import styles from './VideoFeed.module.css';

// --- KONFIGURASI KAMERA ---
const KNOWN_CAMERAS = [
  { id: 0, port: 8080, label: 'Cam 1' },
  { id: 1, port: 8081, label: 'Cam 2' }
];

const WIDTH = 1920;
const HEIGHT = 1080;
const QUALITY = 100;

const SNAPSHOT_PATH = `/?action=snapshot&width=${WIDTH}&height=${HEIGHT}&quality=${QUALITY}`;

const LAYOUT_MODES = {
  SINGLE: 'single',
  GRID:  'grid',
  PIP: 'pip' 
};

const VideoFeed = () => {
  const { isConnected, rosUrl, connectionIP } = useRos();
  
  // State
  const [baseIP, setBaseIP] = useState('');
  const [selectedStreamIndex, setSelectedStreamIndex] = useState(1);
  const [layoutMode, setLayoutMode] = useState(LAYOUT_MODES.SINGLE);
  const [isRecording, setIsRecording] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(false); 
  const [fpsData, setFpsData] = useState({});
  
  // --- STATE BARU UNTUK SOURCE & CV ---
  const [videoSource, setVideoSource] = useState('drone'); 
  const [cvEnabled, setCvEnabled] = useState(false);       
  const [cvModel, setCvModel] = useState('best');          

  // Refs
  const containerRef = useRef(null);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  
  // Canvas & Recorder Refs
  const canvasRefs = useRef({}); 
  const animationFrameRefs = useRef({});
  const loopTimerRefs = useRef({}); 
  const activeLoopsRef = useRef({}); // REF BARU: Untuk membunuh Ghost Loop
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // 1. Setup IP Logic
  useEffect(() => {
    if (!isConnected) {
      setBaseIP('');
      return;
    }
    if (connectionIP) { setBaseIP(connectionIP); return; }
    if (rosUrl) {
      const match = rosUrl.match(/ws:\/\/([^:]+):/) || rosUrl.match(/ws:\/\/([^\s/]+)/);
      if (match && match[1]) setBaseIP(match[1]);
    }
  }, [isConnected, rosUrl, connectionIP]);

  // 2. Auto Layout
  useEffect(() => {
    if (KNOWN_CAMERAS.length > 1) {
      setLayoutMode(LAYOUT_MODES.PIP);
    } else {
      setLayoutMode(LAYOUT_MODES.SINGLE);
    }
  }, []);

  // 3. LOGIKA SNAPSHOT LOOP (UPDATED: ANTI-GHOST LOOP)
  const startStreamLoop = useCallback((camId, port) => {
    if (videoSource === 'drone' && !baseIP) return () => {};

    // FLAG KUNCI: Menandakan apakah loop ini masih sah atau sudah dibunuh
    let isLoopActive = true; 

    const fetchNextFrame = () => {
      // Jika loop sudah tidak sah, hentikan semuanya!
      if (!isLoopActive || !mountedRef.current || !cameraEnabled) return;

      const img = new Image();
      img.crossOrigin = "Anonymous"; 
      
      let streamUrl = '';
      if (videoSource === 'local') {
        if (camId !== selectedStreamIndex) return; 
        streamUrl = `http://localhost:5000/snapshot?cv=${cvEnabled ? '1' : '0'}&model=${cvModel}`;
      } else {
        streamUrl = `http://${baseIP}:${port}${SNAPSHOT_PATH}`;
      }
      
      const separator = streamUrl.includes('?') ? '&' : '?';
      img.src = `${streamUrl}${separator}t=${Date.now()}`;

      img.onload = () => {
        // Cek lagi sebelum menggambar, jangan-jangan loop sudah dimatikan saat gambar di-download
        if (!isLoopActive || !mountedRef.current || !cameraEnabled) return;
        
        const canvas = canvasRefs.current[camId];
        if (canvas) {
          const ctx = canvas.getContext('2d', { alpha: false });
          if (canvas.width !== WIDTH) { canvas.width = WIDTH; canvas.height = HEIGHT; }
          ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
          setFpsData(prev => ({...prev, [camId]: Date.now()}));
        }

        animationFrameRefs.current[camId] = requestAnimationFrame(fetchNextFrame);
      };

      img.onerror = () => {
        if (!isLoopActive || !mountedRef.current || !cameraEnabled) return;
        loopTimerRefs.current[camId] = setTimeout(fetchNextFrame, 1000);
      };
    };

    fetchNextFrame();

    // Fungsi "Pembunuh" Loop
    return () => {
      isLoopActive = false; // Matikan bendera
      if (animationFrameRefs.current[camId]) cancelAnimationFrame(animationFrameRefs.current[camId]);
      if (loopTimerRefs.current[camId]) clearTimeout(loopTimerRefs.current[camId]);
    };
  }, [baseIP, cameraEnabled, videoSource, cvEnabled, cvModel, selectedStreamIndex]);

  // 4. Trigger Stream (UPDATED: Mengeksekusi Pembunuh Loop)
  useEffect(() => {
    // 1. Bunuh semua antrean lama secara paksa sebelum membuat yang baru
    Object.values(activeLoopsRef.current).forEach(killLoop => killLoop());
    activeLoopsRef.current = {};

    // 2. Mulai antrean baru
    if (cameraEnabled) {
      if (videoSource === 'local' || (videoSource === 'drone' && isConnected && baseIP)) {
        KNOWN_CAMERAS.forEach(cam => {
          // Simpan fungsi pembunuhnya ke dalam Ref
          activeLoopsRef.current[cam.id] = startStreamLoop(cam.id, cam.port);
        });
      }
    }

    // 3. Saat komponen mati, bersihkan
    return () => {
      Object.values(activeLoopsRef.current).forEach(killLoop => killLoop());
      activeLoopsRef.current = {};
    };
  }, [baseIP, isConnected, cameraEnabled, videoSource, cvEnabled, cvModel, startStreamLoop]);

  // 5. Cleanup Component
  useEffect(() => {
    mountedRef.current = true;
    const handleFs = () => {
       const isFull = document.fullscreenElement || document.webkitFullscreenElement;
       if (mountedRef.current) setIsFullscreen(!!isFull);
    };
    document.addEventListener('fullscreenchange', handleFs);
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('fullscreenchange', handleFs);
    };
  }, []);

  // --- RECORDING & SNAPSHOT ---
  const handleSnapshot = () => {
    const canvas = canvasRefs.current[selectedStreamIndex];
    if (canvas) {
      try {
        const url = canvas.toDataURL('image/jpeg', 1.0);
        const a = document.createElement('a');
        a.href = url;
        a.download = `snapshot_cam${selectedStreamIndex}_${Date.now()}.jpg`;
        document.body.appendChild(a); 
        a.click();
        document.body.removeChild(a);
      } catch (e) {
        console.error("Snapshot failed:", e);
        alert("Gagal mengambil snapshot. Pastikan Server Kamera mendukung CORS Header.");
      }
    }
  };

  const handleRecord = () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      clearInterval(timerRef.current);
    } else {
      const canvas = canvasRefs.current[selectedStreamIndex];
      if (!canvas) return;

      try {
        const stream = canvas.captureStream(30);
        const mimeType = 'video/webm'; 
        
        const recorder = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
            videoBitsPerSecond: 2500000 
        });

        recordedChunksRef.current = []; 

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          if (blob.size < 1000) {
              alert("Video terlalu pendek atau gagal direkam (Ukuran file terlalu kecil).");
              return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `rec_cam${selectedStreamIndex}_${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }, 100);
        };

        recorder.start(1000); 
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        setRecordingDuration(0);
        timerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);

      } catch (e) {
        console.error("Recording failed:", e);
        alert("Gagal memulai recording: " + e.message);
      }
    }
  };

  const handleFullscreen = () => {
    const el = containerRef.current;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen();
  };

  const handleRefresh = () => {
    setCameraEnabled(false);
    setTimeout(() => setCameraEnabled(true), 500);
  };

  const formatDuration = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  
  const renderNoSignal = () => (
    <div className={styles.videoPlaceholder}>
      <div className={styles.noSignal}>
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.noSignalIconSvg}>
           <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l21 21" />
        </svg>
        <div className={styles.noSignalIcon}>
          {videoSource === 'local' 
            ? (cameraEnabled ? 'WAITING FOR WEBCAM...' : 'CAMERA DISABLED') 
            : (isConnected ? (cameraEnabled ? 'NO SIGNAL' : 'CAMERA DISABLED') : 'DISCONNECTED')}
        </div>
        <p>
          {videoSource === 'local' 
            ? 'Ensure local Python server is running on port 5000' 
            : (isConnected ? 'Waiting for video stream...' : 'Connect to drone first')}
        </p>
      </div>
    </div>
  );

  const renderCanvas = (camData, isPrimary) => {
    return (
      <div key={camData.id} className={`${styles.cameraStream} ${isPrimary ? styles.primary : styles.secondary}`} onClick={() => !isPrimary && setSelectedStreamIndex(camData.id)}>
        <canvas 
          ref={el => canvasRefs.current[camData.id] = el}
          className={styles.videoElement}
          width={WIDTH}
          height={HEIGHT}
        />
        <div className={styles.streamLabel}>{camData.label}</div>
        {isPrimary && isRecording && <div className={styles.recordingIndicator}><div className={styles.recDot}/>REC {formatDuration(recordingDuration)}</div>}
      </div>
    );
  };

  const showVideoArea = cameraEnabled && (videoSource === 'local' || (isConnected && baseIP));

  return (
    <div ref={containerRef} className={`${styles.videoContainer} ${isFullscreen ? styles.fullscreen : ''}`}>
      <div className={styles.videoHeader}>
        <span className={styles.videoTitle}>FPV FEED</span>
        <div className={styles.streamStatus}>
          <div className={styles.streamDot} style={{ background: (isConnected || videoSource === 'local') && cameraEnabled ? '#2ecc71' : '#e74c3c' }} />
          <span>{videoSource === 'local' ? 'Local Mode' : (isConnected ? 'Live Mode' : 'Offline')}</span>
        </div>
      </div>

      <div className={styles.videoWrapper}>
        {showVideoArea ? (
          <div className={`${styles.videoLayout} ${styles['layout'+layoutMode]}`}>
            {layoutMode === LAYOUT_MODES.SINGLE && renderCanvas(KNOWN_CAMERAS[selectedStreamIndex] || KNOWN_CAMERAS[0], true)}
            
            {layoutMode === LAYOUT_MODES.PIP && (
               <>
                 {renderCanvas(KNOWN_CAMERAS[selectedStreamIndex] || KNOWN_CAMERAS[0], true)}
                 {videoSource !== 'local' && (
                   <div className={styles.pipSidebar}>
                      {KNOWN_CAMERAS.map((cam, i) => i !== selectedStreamIndex && renderCanvas(cam, false))}
                   </div>
                 )}
               </>
            )}
            
            {layoutMode === LAYOUT_MODES.GRID && (
                <div className={styles.gridContainer}>
                    {KNOWN_CAMERAS.map((cam, i) => {
                       if (videoSource === 'local' && i !== selectedStreamIndex) return null;
                       return renderCanvas(cam, i===selectedStreamIndex);
                    })}
                </div>
            )}
          </div>
        ) : renderNoSignal()}
      </div>

      <div className={styles.videoControls}>
        <select 
          className={styles.controlBtn} 
          value={videoSource} 
          onChange={(e) => {
            setVideoSource(e.target.value);
            if (e.target.value === 'drone') setCvEnabled(false);
          }}
          disabled={isRecording}
        >
          <option value="drone">Source: Drone</option>
          <option value="local">Source: Local Webcam</option>
        </select>

        {videoSource === 'local' && (
          <>
            <select
              className={styles.controlBtn}
              value={cvModel}
              onChange={(e) => setCvModel(e.target.value)}
              disabled={isRecording}
            >
              <option value="best">Model: Trained</option>
              <option value="yolo11n">Model: Base</option>
            </select>

            <button 
              className={`${styles.controlBtn} ${cvEnabled ? styles.cvActive : ''}`} 
              onClick={() => setCvEnabled(!cvEnabled)}
            >
              {cvEnabled ? 'CV: ON' : 'CV: OFF'}
            </button>
          </>
        )}
        
        <button 
          className={styles.controlBtn} 
          onClick={() => setCameraEnabled(!cameraEnabled)} 
          disabled={isRecording || (!isConnected && videoSource === 'drone')}
        >
          {cameraEnabled ? 'DISABLE' : 'ENABLE'}
        </button>        
        <button className={styles.controlBtn} onClick={handleRefresh} disabled={!cameraEnabled || isRecording || (!isConnected && videoSource === 'drone')}>REFRESH</button>
        <button className={`${styles.controlBtn} ${isRecording ? styles.recording : ''}`} onClick={handleRecord} disabled={!cameraEnabled || (!isConnected && videoSource === 'drone')}>{isRecording ? 'STOP' : 'RECORD'}</button>
        <button className={styles.controlBtn} onClick={handleSnapshot} disabled={!cameraEnabled || (!isConnected && videoSource === 'drone')}>SNAPSHOT</button>
        <button className={styles.controlBtn} onClick={handleFullscreen}>{isFullscreen ? 'MINIMIZE' : 'FULLSCREEN'}</button>
      </div>
    </div>
  );
};

export default React.memo(VideoFeed);