import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '5px 10px 5px 6px',
        borderRadius: 20,
        border: isDark ? '1px solid rgba(212,134,42,0.3)' : '1px solid rgba(180,120,60,0.3)',
        background: isDark ? 'rgba(212,134,42,0.10)' : 'rgba(180,120,60,0.10)',
        color: isDark ? '#d4862a' : '#8a5a20',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'DM Sans, sans-serif',
        transition: 'all 0.2s',
        outline: 'none',
        userSelect: 'none',
      }}
    >
      {/* Pill toggle track */}
      <div style={{
        width: 32,
        height: 18,
        borderRadius: 9,
        background: isDark ? '#d4862a' : '#c8a880',
        position: 'relative',
        transition: 'background 0.3s',
        flexShrink: 0,
      }}>
        {/* Sliding circle */}
        <div style={{
          position: 'absolute',
          top: 2,
          left: isDark ? 14 : 2,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 8,
        }}>
          {isDark ? '🌙' : '☀️'}
        </div>
      </div>

      {/* Label */}
      <span style={{ fontSize: 12, letterSpacing: '0.01em' }}>
        {isDark ? 'Dark' : 'Light'}
      </span>
    </button>
  );
};

export default ThemeToggle;