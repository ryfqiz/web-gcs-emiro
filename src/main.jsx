import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Remove StrictMode in production, keep for development
const isDevelopment = import.meta.env.DEV;

ReactDOM.createRoot(document.getElementById('root')).render(
  isDevelopment ? (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  ) : (
    <App />
  )
);