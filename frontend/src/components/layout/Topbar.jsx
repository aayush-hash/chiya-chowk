import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const PAGE_META = {
  '/dashboard':    { title: 'Dashboard',          crumb: "Overview → Today's Summary" },
  '/pos':          { title: 'New Order',           crumb: 'Operations → Create Order' },
  '/tables':       { title: 'Table Management',    crumb: 'Operations → Floor Plan' },
  '/orders':       { title: 'All Orders',          crumb: 'Operations → Order History' },
  '/menu':         { title: 'Menu Management',     crumb: 'Management → Menu Items' },
  '/reports':      { title: 'Sales Reports',       crumb: 'Analytics → Sales Reports' },
  '/transactions': { title: 'Transactions',        crumb: 'Finance → Daily Transactions' },
  '/inventory':    { title: 'Inventory',           crumb: 'Management → Stock & Ingredients' },
  '/kitchen':      { title: 'Kitchen & QR Orders', crumb: 'Operations → Live Order Board' },
  '/admin':        { title: 'Admin Panel',         crumb: 'Settings → Control Panel' },
};

const Topbar = ({ onMenuToggle }) => {
  const [time, setTime] = useState(new Date());
  const { pathname } = useLocation();
  const { isDark } = useTheme();
  const meta = PAGE_META[pathname] || { title: 'Chiya Chowk', crumb: '' };

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Inline theme values
  const bg      = isDark ? 'rgba(13,10,6,0.92)'   : 'rgba(255,252,248,0.95)';
  const border  = isDark ? 'rgba(212,134,42,0.15)' : 'rgba(180,120,60,0.18)';
  const border2 = isDark ? 'rgba(212,134,42,0.20)' : 'rgba(180,120,60,0.25)';
  const cardBg  = isDark ? '#1a1408'               : '#fff';
  const text    = isDark ? '#f5e6c8'               : '#2a1a08';
  const text2   = isDark ? '#d4b896'               : '#5a3a18';
  const text3   = isDark ? '#7a6a5a'               : '#8a6a48';
  const amber   = isDark ? '#d4862a'               : '#b8620a';
  const green   = isDark ? '#4caf88'               : '#2e8b57';
  const greenDim= isDark ? 'rgba(76,175,136,0.12)' : 'rgba(46,139,87,0.10)';

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      background: bg,
      borderBottom: `1px solid ${border}`,
      padding: '0 22px',
      height: 'var(--topbar-height, 60px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 100,
      flexShrink: 0,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      transition: 'background 0.3s, border-color 0.3s',
    }}>

      {/* Left — hamburger + page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onMenuToggle}
          aria-label="Toggle menu"
          className="topbar-hamburger"
          style={{
            width: 36, height: 36,
            borderRadius: 8,
            border: `1px solid ${border2}`,
            background: cardBg,
            cursor: 'pointer',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 17,
            color: text2,
            transition: 'all 0.18s',
            flexShrink: 0,
          }}
        >
          ☰
        </button>

        <div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 19,
            fontWeight: 700,
            lineHeight: 1.2,
            color: text,
            margin: 0,
          }}>
            {meta.title}
          </h1>
          <div style={{ fontSize: 11, color: text3, marginTop: 1 }}>
            {meta.crumb}
          </div>
        </div>
      </div>

      {/* Right — live badge + theme toggle + clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Live badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: greenDim,
          border: `1px solid ${isDark ? 'rgba(76,175,136,0.28)' : 'rgba(46,139,87,0.25)'}`,
          borderRadius: 20,
          padding: '5px 11px',
          fontSize: 11.5,
          color: green,
          fontWeight: 500,
        }}>
          <div style={{
            width: 6, height: 6,
            borderRadius: '50%',
            background: green,
            animation: 'topbar-pulse 1.5s infinite',
          }} />
          Live
        </div>

        {/* Clock */}
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 12.5,
          color: text3,
          background: cardBg,
          border: `1px solid ${border}`,
          padding: '5px 11px',
          borderRadius: 8,
          letterSpacing: '0.03em',
          transition: 'background 0.3s, border-color 0.3s',
        }}>
          {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      <style>{`
        .topbar-hamburger { display: none !important; }
        @media (max-width: 768px) {
          .topbar-hamburger { display: flex !important; }
        }
        @keyframes topbar-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 ${green}55; }
          50%       { opacity: 0.7; box-shadow: 0 0 0 4px ${green}00; }
        }
      `}</style>
    </div>
  );
};

export default Topbar;