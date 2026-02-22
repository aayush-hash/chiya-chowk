import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PAGE_META = {
  '/dashboard': { title: 'Dashboard', crumb: 'Overview → Today\'s Summary' },
  '/pos': { title: 'New Order', crumb: 'Operations → Create Order' },
  '/tables': { title: 'Table Management', crumb: 'Operations → Floor Plan' },
  '/orders': { title: 'All Orders', crumb: 'Operations → Order History' },
  '/menu': { title: 'Menu Management', crumb: 'Management → Menu Items' },
  '/reports': { title: 'Sales Reports', crumb: 'Analytics → Sales Reports' },
  '/transactions': { title: 'Transactions', crumb: 'Finance → Daily Transactions' },
  '/admin': { title: 'Admin Panel', crumb: 'Settings → Control Panel' },
};

const Topbar = ({ onMenuToggle }) => {
  const [time, setTime] = useState(new Date());
  const { pathname } = useLocation();
  const meta = PAGE_META[pathname] || { title: 'Chiya Chowk', crumb: '' };

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="hamburger" onClick={onMenuToggle} aria-label="Toggle menu">
          ☰
        </button>
        <div>
          <h1 className="topbar-title">{meta.title}</h1>
          <div className="topbar-breadcrumb">{meta.crumb}</div>
        </div>
      </div>
      <div className="topbar-right">
        <div className="live-badge">
          <div className="live-dot" />
          Live
        </div>
        <div className="time-display">
          {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      <style>{`
        .topbar {
          position: sticky;
          top: 0;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: 0 22px;
          height: var(--topbar-height);
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 100;
          flex-shrink: 0;
        }
        .topbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .topbar-title {
          font-family: 'Playfair Display', serif;
          font-size: 19px;
          font-weight: 700;
          line-height: 1.2;
        }
        .topbar-breadcrumb {
          font-size: 11px;
          color: var(--text3);
        }
        .topbar-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .live-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--green-dim);
          border: 1px solid rgba(76,175,136,0.28);
          border-radius: 20px;
          padding: 5px 11px;
          font-size: 11.5px;
          color: var(--green);
          font-weight: 500;
        }
        .live-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--green);
          animation: pulse 1.5s infinite;
        }
        .time-display {
          font-family: 'DM Mono', monospace;
          font-size: 12.5px;
          color: var(--text3);
          background: var(--card);
          border: 1px solid var(--border);
          padding: 5px 11px;
          border-radius: var(--radius2);
        }
        .hamburger {
          display: none;
          width: 36px; height: 36px;
          border-radius: var(--radius2);
          border: 1px solid var(--border2);
          background: var(--card);
          cursor: pointer;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          color: var(--text2);
          transition: var(--transition);
          flex-shrink: 0;
        }
        .hamburger:hover { border-color: var(--amber); color: var(--amber); }
        @media (max-width: 768px) {
          .hamburger { display: flex; }
        }
      `}</style>
    </div>
  );
};

export default Topbar;