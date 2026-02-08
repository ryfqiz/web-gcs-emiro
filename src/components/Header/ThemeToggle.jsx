import React, { useState, useEffect } from 'react';

const ThemeToggle = () => {
  const [theme, setTheme] = useState('dark');

  // 1. Cek memori saat pertama kali dibuka
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // 2. Fungsi ganti tema
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('app-theme', newTheme); // Simpan agar tidak reset saat refresh
  };

  return (
    <button 
      onClick={toggleTheme}
      style={{
        background: 'rgba(52, 152, 219, 0.1)',
        border: '1px solid var(--border-color)', // Menggunakan variabel
        color: 'var(--text-light)',              // Menggunakan variabel
        padding: '8px 12px',
        borderRadius: '6px',
        cursor: 'pointer',
        marginRight: '10px',
        fontSize: '16px',
        transition: 'all 0.3s ease'
      }}
      title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
};

export default ThemeToggle;