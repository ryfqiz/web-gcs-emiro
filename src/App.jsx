import React, { Suspense, useState, useEffect } from 'react';
import { RosProvider } from './context/RosContext';
import Header from './components/Header/Header';
import TelemetryPanel from './components/LeftPanel/LeftPanel';
import VideoFeed from './components/CenterPanel/VideoFeed';
import MapView from './components/CenterPanel/MapView';
import ControlPanel from './components/RightPanel/ControlPanel';
import BottomTerminal from './components/BottomPanel/BottomTerminal';
import Login from './components/Login/Login';
import './App.css';

// Loading Component
const LoadingSpinner = () => (
  <div className="loading-overlay">
    <div className="loading-spinner"></div>
  </div>
);

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="loading-overlay">
          <div style={{ textAlign: 'center', color: '#e74c3c' }}>
            <h2>⚠ WARNING:  Something went wrong</h2>
            <p>{this.state. error?.message}</p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius:  '6px',
                cursor:  'pointer',
                fontSize:  '14px',
                fontWeight: '600'
              }}
            >
              RELOAD APPLICATION
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Panel visibility states
  const [showTelemetry, setShowTelemetry] = useState(true);
  const [showVideo, setShowVideo] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [showControl, setShowControl] = useState(true);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(300);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      const authStatus = sessionStorage.getItem('webgcs_authenticated');
      const authTime = sessionStorage.getItem('webgcs_auth_time');
      
      if (authStatus === 'true' && authTime) {
        const sessionDuration = 8 * 60 * 60 * 1000; // 8 hours
        const timePassed = Date.now() - parseInt(authTime);
        
        if (timePassed < sessionDuration) {
          setIsAuthenticated(true);
        } else {
          // Session expired
          sessionStorage.removeItem('webgcs_authenticated');
          sessionStorage. removeItem('webgcs_auth_time');
          setIsAuthenticated(false);
        }
      }
      
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      sessionStorage.removeItem('webgcs_authenticated');
      sessionStorage.removeItem('webgcs_auth_time');
      setIsAuthenticated(false);
    }
  };

  // Calculate dynamic grid layout based on visible panels
  const getGridLayout = () => {
    const hasCenterContent = showVideo || showMap;
    
    // Count visible side panels
    const leftVisible = showTelemetry;
    const rightVisible = showControl;
    const centerVisible = hasCenterContent;

    // Build grid template based on what's visible
    const columns = [];
    
    if (leftVisible) columns.push('300px');
    if (centerVisible) columns.push('1fr');
    if (rightVisible) columns.push('340px');

    // If no columns, show at least center area
    if (columns.length === 0) return '1fr';
    
    return columns.join(' ');
  };

  // Check if there's any content to show
  const hasContent = showTelemetry || showVideo || showMap || showControl;

  // Show loading spinner while checking authentication
  if (isCheckingAuth) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a192f',
        color: '#64ffda',
        fontSize: '18px',
        fontWeight: '600'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{ marginBottom: '20px' }}></div>
          <div>Initializing Web-GCS...</div>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Show main app if authenticated
  return (
    <ErrorBoundary>
      <RosProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <div className="app-container">
            <Header 
              showTelemetry={showTelemetry}
              setShowTelemetry={setShowTelemetry}
              showVideo={showVideo}
              setShowVideo={setShowVideo}
              showMap={showMap}
              setShowMap={setShowMap}
              showControl={showControl}
              setShowControl={setShowControl}
              showTerminal={showTerminal}
              setShowTerminal={setShowTerminal}
              onLogout={handleLogout}
            />
            
            {hasContent ?  (
              <div 
                className="main-content" 
                style={{ 
                  gridTemplateColumns: getGridLayout()
                }}
              >
                {/* Left Panel - Telemetry */}
                {showTelemetry && (
                  <div className="left-panel">
                    <TelemetryPanel />
                  </div>
                )}
                
                {/* Center Panel - Video + Map */}
                {(showVideo || showMap) && (
                  <div className="center-panel">
                    {showVideo && <VideoFeed />}
                    {showMap && <MapView />}
                  </div>
                )}
                
                {/* Right Panel - Controls */}
                {showControl && (
                  <div className="right-panel">
                    <ControlPanel />
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-content">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#3498db" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                  </svg>
                  <h3>No Panels Visible</h3>
                  <p>Enable at least one panel from the layout menu to view content.</p>
                </div>
              </div>
            )}

            {/* Bottom Terminal Panel */}
            <BottomTerminal 
              isOpen={showTerminal} 
              onClose={() => setShowTerminal(false)}
              onHeightChange={setTerminalHeight}
            />
          </div>
        </Suspense>
      </RosProvider>
    </ErrorBoundary>
  );
}

export default App;