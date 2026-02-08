import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRos } from '../../context/RosContext';
import styles from './VideoFeed.module.css';

// --- KONFIGURASI KAMERA ---
const KNOWN_CAMERAS = [
  { id: 0, port: 8080, label: 'Bottom Cam' },
  { id: 1, port: 8081, label: 'Front Cam' }
];

const WIDTH = 640;
const HEIGHT = 360;
const QUALITY = 30;

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
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [fpsData, setFpsData] = useState({});

  // Refs
  const containerRef = useRef(null);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  
  // Canvas & Recorder Refs
  const canvasRefs = useRef({}); 
  const animationFrameRefs = useRef({});
  const mediaRecorderRef = useRef(null); // Ref untuk MediaRecorder
  const recordedChunksRef = useRef([]);  // Ref untuk menyimpan data video sementara

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

  // 3. LOGIKA SNAPSHOT LOOP (UPDATED: Added CrossOrigin)
  const startStreamLoop = useCallback((camId, port) => {
    if (!baseIP || !cameraEnabled) return;

    const fetchNextFrame = () => {
      if (!mountedRef.current || !cameraEnabled) return;

      const img = new Image();
      
      // PENTING: Mengizinkan CORS agar Canvas bisa di-snapshot/record
      img.crossOrigin = "Anonymous"; 
      
      img.src = `http://${baseIP}:${port}${SNAPSHOT_PATH}&t=${Date.now()}`;
      
      img.onload = () => {
        if (!mountedRef.current) return;
        
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
        if (mountedRef.current) {
            animationFrameRefs.current[camId] = setTimeout(fetchNextFrame, 1000);
        }
      };
    };

    fetchNextFrame();

  }, [baseIP, cameraEnabled]);

  // 4. Trigger Stream
  useEffect(() => {
    if (baseIP && isConnected && cameraEnabled) {
      KNOWN_CAMERAS.forEach(cam => {
        cancelAnimationFrame(animationFrameRefs.current[cam.id]);
        clearTimeout(animationFrameRefs.current[cam.id]);
        startStreamLoop(cam.id, cam.port);
      });
    }

    return () => {
      Object.values(animationFrameRefs.current).forEach(id => {
          cancelAnimationFrame(id);
          clearTimeout(id);
      });
    };
  }, [baseIP, isConnected, cameraEnabled, startStreamLoop]);

  // 5. Cleanup
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

  // --- RECORDING & SNAPSHOT (FIXED) ---

  const handleSnapshot = () => {
    const canvas = canvasRefs.current[selectedStreamIndex];
    if (canvas) {
      try {
        // Mengambil gambar format JPEG kualitas 1.0 (High)
        const url = canvas.toDataURL('image/jpeg', 1.0);
        const a = document.createElement('a');
        a.href = url;
        a.download = `snapshot_cam${selectedStreamIndex}_${Date.now()}.jpg`;
        document.body.appendChild(a); // Append dulu agar aman di beberapa browser
        a.click();
        document.body.removeChild(a);
      } catch (e) {
        console.error("Snapshot failed:", e);
        alert("Gagal mengambil snapshot. Pastikan Server Kamera mendukung CORS Header.");
      }
    }
  };

  // Recording Menggunakan MediaRecorder API
  // GANTI BAGIAN handleRecord DENGAN INI
  const handleRecord = () => {
    if (isRecording) {
      // --- STOP RECORDING ---
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      clearInterval(timerRef.current);
    } else {
      // --- START RECORDING ---
      const canvas = canvasRefs.current[selectedStreamIndex];
      if (!canvas) return;

      try {
        // 1. Ambil stream dari canvas (30 FPS)
        const stream = canvas.captureStream(30);
        
        // 2. Setup MediaRecorder
        // Kita gunakan 'video/webm' standar agar kompatibilitas maksimal di Chrome/Firefox
        const mimeType = 'video/webm'; 
        
        // Cek support browser (opsional, untuk debugging)
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            console.warn("Browser tidak support video/webm standar, mencoba default...");
        }

        const recorder = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
            videoBitsPerSecond: 2500000 // 2.5 Mbps (Kualitas lebih baik)
        });

        recordedChunksRef.current = []; // Reset storage

        // 3. Event Listeners
        recorder.ondataavailable = (event) => {
          // Logika: Hanya simpan jika ada isinya
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
            console.log("Chunk received:", event.data.size, "bytes"); // Debugging di Console
          }
        };

        recorder.onstop = () => {
          // Buat Blob final
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          console.log("Final Video Size:", blob.size); // Cek ukuran akhir

          if (blob.size < 1000) {
              alert("Video terlalu pendek atau gagal direkam (Ukuran file terlalu kecil).");
              return;
          }

          const url = URL.createObjectURL(blob);
          
          // Trigger Download
          const a = document.createElement('a');
          a.href = url;
          a.download = `rec_cam${selectedStreamIndex}_${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }, 100);
        };

        // 4. Start dengan TIMESLICE 1000ms (PENTING!)
        // Angka 1000 berarti setiap 1 detik, browser "memaksa" menyimpan data chunk.
        // Ini mencegah masalah file 0 byte/header only.
        recorder.start(1000); 
        
        mediaRecorderRef.current = recorder;
        
        // UI Updates
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
        <div className={styles.noSignalIcon}>{isConnected ? (cameraEnabled ? 'NO SIGNAL' : 'CAMERA DISABLED') : 'DISCONNECTED'}</div>
        <p>{isConnected ? 'Waiting for video stream...' : 'Connect to drone first'}</p>
        <small>{baseIP ? `Target: ${baseIP}:${KNOWN_CAMERAS[0].port}` : ''}</small>
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

  return (
    <div ref={containerRef} className={`${styles.videoContainer} ${isFullscreen ? styles.fullscreen : ''}`}>
      <div className={styles.videoHeader}>
        <span className={styles.videoTitle}>FPV FEED</span>
        <div className={styles.streamStatus}>
          <div className={styles.streamDot} style={{ background: isConnected && cameraEnabled ? '#2ecc71' : '#e74c3c' }} />
          <span>{isConnected ? 'Live (Snapshot Mode)' : 'Offline'}</span>
        </div>
      </div>

      <div className={styles.videoWrapper}>
        {cameraEnabled && isConnected && baseIP ? (
          <div className={`${styles.videoLayout} ${styles['layout'+layoutMode]}`}>
            {layoutMode === LAYOUT_MODES.SINGLE && renderCanvas(KNOWN_CAMERAS[selectedStreamIndex] || KNOWN_CAMERAS[0], true)}
            
            {layoutMode === LAYOUT_MODES.PIP && (
               <>
                 {renderCanvas(KNOWN_CAMERAS[selectedStreamIndex] || KNOWN_CAMERAS[0], true)}
                 <div className={styles.pipSidebar}>
                    {KNOWN_CAMERAS.map((cam, i) => i !== selectedStreamIndex && renderCanvas(cam, false))}
                 </div>
               </>
            )}
            
            {layoutMode === LAYOUT_MODES.GRID && (
                <div className={styles.gridContainer}>
                    {KNOWN_CAMERAS.map((cam, i) => renderCanvas(cam, i===selectedStreamIndex))}
                </div>
            )}
          </div>
        ) : renderNoSignal()}
      </div>

      <div className={styles.videoControls}>
        <button className={styles.controlBtn} onClick={() => setCameraEnabled(!cameraEnabled)} disabled={isRecording || !isConnected}>{cameraEnabled ? 'DISABLE' : 'ENABLE'}</button>
        <button className={styles.controlBtn} onClick={handleRefresh} disabled={!cameraEnabled || isRecording || !isConnected}>REFRESH</button>
        <button className={`${styles.controlBtn} ${isRecording ? styles.recording : ''}`} onClick={handleRecord} disabled={!isConnected}>{isRecording ? 'STOP' : 'RECORD'}</button>
        <button className={styles.controlBtn} onClick={handleSnapshot} disabled={!isConnected}>SNAPSHOT</button>
        <button className={styles.controlBtn} onClick={handleFullscreen}>{isFullscreen ? 'MINIMIZE' : 'FULLSCREEN'}</button>
      </div>
    </div>
  );
};

export default React.memo(VideoFeed);