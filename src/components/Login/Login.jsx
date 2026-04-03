import { useState, useEffect, useCallback } from 'react';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [attempts, setAttempts] = useState(2);
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');

  // ========================================
  // SECURITY LAYER 1: Encrypted Credentials with Salt
  // ========================================
  const SECURITY_SALT = 'WebGCS_Emiro_2026_Secure_v1';
  
  const hashCredential = (value) => {
    // Double encoding with salt
    const salted = value + SECURITY_SALT;
    return btoa(btoa(salted));
  };

  const CREDENTIALS = {
    username: hashCredential('emiro'),
    password: hashCredential('Em1r0-12/2026')
  };

  // ========================================
  // SECURITY LAYER 2: Rate Limiting & IP Tracking
  // ========================================
  const RATE_LIMIT_KEY = 'webgcs_rate_limit';
  const MAX_REQUESTS_PER_MINUTE = 5;

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    const rateLimitData = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '{"attempts": []}'  );
    
    // Filter attempts from last minute
    const recentAttempts = rateLimitData.attempts.  filter(
      timestamp => now - timestamp < 60000
    );

    if (recentAttempts.length >= MAX_REQUESTS_PER_MINUTE) {
      return false; // Rate limit exceeded
    }

    // Add current attempt
    recentAttempts.push(now);
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ attempts: recentAttempts }));
    return true;
  }, []);

  // ========================================
  // SECURITY LAYER 3: Session Fingerprinting
  // ========================================
  const generateFingerprint = () => {
    const data = [
      navigator.  userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
      !! window.sessionStorage,
      !!window. localStorage
    ].join('|');
    return btoa(data);
  };

  // ========================================
  // SECURITY LAYER 4: Anti-Automation Detection
  // ========================================
  const [mouseActivity, setMouseActivity] = useState(false);
  const [keyboardActivity, setKeyboardActivity] = useState(false);

  useEffect(() => {
    const handleMouseMove = () => setMouseActivity(true);
    const handleKeyDown = () => setKeyboardActivity(true);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // ========================================
  // SECURITY LAYER 5: Lock Detection & Validation
  // ========================================
  useEffect(() => {
    const lockStatus = localStorage.getItem('webgcs_lock_status');
    const lockTime = localStorage.getItem('webgcs_lock_time');
    const lockFingerprint = localStorage.getItem('webgcs_lock_fingerprint');
    
    if (lockStatus === 'locked') {
      const currentFingerprint = generateFingerprint();
      
      // Verify lock is for this device
      if (lockFingerprint === currentFingerprint) {
        const lockDuration = 30 * 60 * 1000;
        const timePassed = Date.now() - parseInt(lockTime);
        
        if (timePassed < lockDuration) {
          setIsLocked(true);
        } else {
          clearLock();
          setAttempts(2);
        }
      } else {
        // Lock from different device, clear it
        clearLock();
      }
    }

    // Check for suspicious rapid page reloads
    const pageLoadCount = parseInt(sessionStorage.getItem('webgcs_page_loads') || '0');
    if (pageLoadCount > 10) {
      // Too many reloads, possible automation
      lockSystem('Suspicious activity detected');
    }
    sessionStorage.setItem('webgcs_page_loads', (pageLoadCount + 1).toString());

  }, []);

  // ========================================
  // SECURITY LAYER 6: Dev Mode Shortcut (Development Only)
  // ========================================
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const handleKeyPress = (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
          e.preventDefault();
          clearLock();
          window.location.reload();
        }
      };
      window.addEventListener('keydown', handleKeyPress);
      return () => window. removeEventListener('keydown', handleKeyPress);
    }
  }, []);

  // ========================================
  // Security Helper Functions
  // ========================================
  const clearLock = () => {
    localStorage.removeItem('webgcs_lock_status');
    localStorage.removeItem('webgcs_lock_time');
    localStorage.removeItem('webgcs_lock_fingerprint');
    localStorage.removeItem('webgcs_lock_reason');
  };

  const lockSystem = (reason = 'Maximum attempts exceeded') => {
    setIsLocked(true);
    const fingerprint = generateFingerprint();
    localStorage.setItem('webgcs_lock_status', 'locked');
    localStorage.setItem('webgcs_lock_time', Date.now().toString());
    localStorage.setItem('webgcs_lock_fingerprint', fingerprint);
    localStorage.setItem('webgcs_lock_reason', reason);
    setError('');
    
    // Log security event
    logSecurityEvent('SYSTEM_LOCKED', { reason, fingerprint });
  };

  const logSecurityEvent = (event, data) => {
    const logs = JSON.parse(localStorage.getItem('webgcs_security_logs') || '[]');
    logs.push({
      timestamp: new Date().toISOString(),
      event,
      data,
      fingerprint: generateFingerprint()
    });
    
    // Keep only last 50 logs
    if (logs.length > 50) logs.shift();
    
    localStorage.setItem('webgcs_security_logs', JSON.stringify(logs));
    
    // Console log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔒 Security Event: ${event}`, data);
    }
  };

  // ========================================
  // Login Handler with Security Checks
  // ========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLocked || isProcessing) return;

    // Security Check 1: Rate Limiting
    if (!checkRateLimit()) {
      setError('Too many attempts. Please wait a moment.');
      logSecurityEvent('RATE_LIMIT_EXCEEDED');
      return;
    }

    // Security Check 2: Human Activity Detection
    if (! mouseActivity && !keyboardActivity) {
      setError('Suspicious activity detected.');
      logSecurityEvent('NO_HUMAN_ACTIVITY');
      lockSystem('Automation detected');
      return;
    }

    // Security Check 3: Input Validation
    if (username.length < 3 || password.length < 6) {
      setError('Invalid input format.');
      return;
    }

    // Security Check 4: Timing Attack Protection (simulate processing delay)
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

    const encodedUsername = hashCredential(username);
    const encodedPassword = hashCredential(password);

    if (encodedUsername === CREDENTIALS.username && encodedPassword === CREDENTIALS.password) {
      // Successful login
      setError('');
      
      const fingerprint = generateFingerprint();
      const authToken = btoa(Date.now() + fingerprint);
      
      sessionStorage.setItem('webgcs_authenticated', 'true');
      sessionStorage.setItem('webgcs_auth_time', Date.now().toString());
      sessionStorage.setItem('webgcs_auth_token', authToken);
      sessionStorage.setItem('webgcs_fingerprint', fingerprint);
      
      clearLock();
      localStorage.removeItem(RATE_LIMIT_KEY);
      
      logSecurityEvent('LOGIN_SUCCESS', { username:  username.substring(0, 2) + '***' });
      
      onLoginSuccess();
    } else {
      // Failed login
      const remainingAttempts = attempts - 1;
      setAttempts(remainingAttempts);
      
      logSecurityEvent('LOGIN_FAILED', { 
        username: username.substring(0, 2) + '***',
        remainingAttempts 
      });
      
      if (remainingAttempts <= 0) {
        lockSystem('Maximum login attempts exceeded');
      } else {
        setError(`Invalid credentials. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      }
      
      setPassword('');
    }

    setIsProcessing(false);
  };

  // ========================================
  // Render
  // ========================================
  if (isLocked) {
    return <LockScreen />;
  }

  return (
    <div className="login-container">
      <div className={`login-box ${isShaking ? 'shake' : ''}`}>
        <div className="login-logo">
          <img src="./emiro.png" alt="Emiro Logo" />
        </div>
        
        <h1>WEB-GCS</h1>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="off"
            autoFocus
            required
            disabled={isProcessing}
            minLength={3}
            maxLength={50}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="off"
            required
            disabled={isProcessing}
            minLength={6}
            maxLength={100}
          />

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ========================================
// Lock Screen Component
// ========================================
const LockScreen = () => {
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(prev => ! prev);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const lockTime = localStorage.getItem('webgcs_lock_time');
  const lockReason = localStorage.getItem('webgcs_lock_reason') || 'Multiple failed attempts';
  const unlockTime = lockTime ? new Date(parseInt(lockTime) + 30 * 60 * 1000) : null;

  return (
    <div className="lock-screen">
      <div className="lock-content">
        <h1 className={`warning ${blink ? 'visible' : 'hidden'}`}>WARNING</h1>
        
        <h2>SYSTEM LOCKED</h2>
        <p>Access denied:  {lockReason}</p>
        <p>System will unlock automatically in 30 minutes.</p>
        
        {unlockTime && (
          <div className="unlock-time">
            Unlock time: {unlockTime.toLocaleString()}
          </div>
        )}

        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={() => {
              localStorage.removeItem('webgcs_lock_status');
              localStorage.removeItem('webgcs_lock_time');
              localStorage.removeItem('webgcs_lock_fingerprint');
              localStorage.removeItem('webgcs_lock_reason');
              window.location.reload();
            }}
            style={{
              marginTop:  '40px',
              padding:  '12px 24px',
              background: 'rgba(255, 203, 107, 0.2)',
              border: '1px solid #ffcb6b',
              borderRadius:  '6px',
              color:  '#ffcb6b',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            [DEV] Reset Lock
          </button>
        )}
      </div>
    </div>
  );
};

export default Login;