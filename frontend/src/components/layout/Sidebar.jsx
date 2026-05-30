import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const NAV = [
  { group: 'Operations', items: [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/pos', icon: '🛒', label: 'New Order' },
    { path: '/tables', icon: '🪑', label: 'Tables' },
    { path: '/orders', icon: '📋', label: 'All Orders' },
    { path: '/kitchen', icon: '👨‍🍳', label: 'Kitchen & QR Orders' },
  ]},
  { group: 'Management', items: [
    { path: '/menu', icon: '🍽️', label: 'Menu Items', roles: ['admin', 'manager'] },
    { path: '/inventory', icon: '📦', label: 'Inventory' },
    { path: '/reports', icon: '📈', label: 'Reports', roles: ['admin', 'manager'] },
    { path: '/transactions', icon: '💰', label: 'Transactions' },
  ]},
  { group: 'Admin', items: [
    { path: '/admin', icon: '⚙️', label: 'Admin Panel', roles: ['admin'] },
  ]},
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const canAccess = (item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">☕</div>
            <div className="logo-text">
              <h2>Chiya Chowk</h2>
              <span>POS System</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV.map(section => (
            <div key={section.group} className="nav-section">
              <div className="nav-label">{section.group}</div>
              {section.items.filter(canAccess).map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${pathname === item.path || pathname.startsWith(item.path + '/') ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {/* Theme toggle */}
          <button className="theme-toggle-btn" onClick={toggleTheme} title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
            <div className="theme-toggle-left">
              <span className="theme-icon">{isDark ? '🌙' : '☀️'}</span>
              <span className="theme-label">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <div className="theme-track">
              <div className="theme-thumb" />
            </div>
          </button>

          {/* User card */}
          <div className="user-card">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div className="user-info-text">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>

          <button className="btn btn-secondary btn-full btn-sm" onClick={handleLogout} style={{ marginTop: 8 }}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      <style>{`
        /* ─── Sidebar shell ─────────────────────────────────── */
        .sidebar {
          position: fixed;
          left: 0; top: 0; bottom: 0;
          width: var(--sidebar-width, 220px);
          background: ${isDark ? '#0d0a06' : '#fff8f0'};
          border-right: 1px solid ${isDark ? 'rgba(212,134,42,0.12)' : 'rgba(180,120,60,0.18)'};
          z-index: 200;
          display: flex;
          flex-direction: column;
          transition: transform 0.3s, background 0.3s, border-color 0.3s;
        }
        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 199;
        }

        /* ─── Logo ──────────────────────────────────────────── */
        .sidebar-logo {
          padding: 18px 16px 14px;
          border-bottom: 1px solid ${isDark ? 'rgba(212,134,42,0.12)' : 'rgba(180,120,60,0.18)'};
        }
        .logo-mark { display: flex; align-items: center; gap: 10px; }
        .logo-icon {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #d4862a, #e8a04a);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(212,134,42,0.3);
          flex-shrink: 0;
        }
        .logo-text h2 {
          font-family: 'Playfair Display', serif;
          font-size: 15px;
          font-weight: 700;
          line-height: 1.2;
          color: ${isDark ? '#f5e6c8' : '#2a1a08'};
        }
        .logo-text span {
          font-size: 10px;
          color: ${isDark ? '#7a6a5a' : '#8a6a48'};
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        /* ─── Nav ───────────────────────────────────────────── */
        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 10px 8px;
          scrollbar-width: thin;
          scrollbar-color: ${isDark ? 'rgba(212,134,42,0.15)' : 'rgba(180,120,60,0.2)'} transparent;
        }
        .sidebar-nav::-webkit-scrollbar { width: 4px; }
        .sidebar-nav::-webkit-scrollbar-thumb { background: ${isDark ? 'rgba(212,134,42,0.15)' : 'rgba(180,120,60,0.2)'}; border-radius: 2px; }
        .nav-section { margin-bottom: 6px; }
        .nav-label {
          font-size: 10px;
          color: ${isDark ? '#4a3a2a' : '#bfa080'};
          text-transform: uppercase;
          letter-spacing: 0.12em;
          padding: 7px 10px 4px;
          font-weight: 600;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 10px;
          border-radius: 8px;
          cursor: pointer;
          color: ${isDark ? '#7a6a5a' : '#8a6a48'};
          font-size: 13px;
          font-weight: 500;
          transition: all 0.18s;
          margin-bottom: 1px;
          border: 1px solid transparent;
          text-decoration: none;
        }
        .nav-item:hover {
          color: ${isDark ? '#d4b896' : '#5a3a18'};
          background: ${isDark ? '#1a1408' : '#f0e8dc'};
        }
        .nav-item.active {
          background: ${isDark ? 'rgba(212,134,42,0.10)' : 'rgba(184,98,10,0.08)'};
          color: ${isDark ? '#d4862a' : '#b8620a'};
          border-color: ${isDark ? 'rgba(212,134,42,0.20)' : 'rgba(184,98,10,0.20)'};
          font-weight: 600;
        }
        .nav-icon { font-size: 15px; width: 20px; text-align: center; }

        /* ─── Footer ────────────────────────────────────────── */
        .sidebar-footer {
          padding: 10px 8px;
          border-top: 1px solid ${isDark ? 'rgba(212,134,42,0.12)' : 'rgba(180,120,60,0.18)'};
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* ─── Theme toggle ──────────────────────────────────── */
        .theme-toggle-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 9px 10px;
          border-radius: 8px;
          border: 1px solid ${isDark ? 'rgba(212,134,42,0.15)' : 'rgba(180,120,60,0.2)'};
          background: ${isDark ? 'rgba(212,134,42,0.06)' : 'rgba(184,98,10,0.05)'};
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .theme-toggle-btn:hover {
          background: ${isDark ? 'rgba(212,134,42,0.12)' : 'rgba(184,98,10,0.10)'};
          border-color: ${isDark ? 'rgba(212,134,42,0.3)' : 'rgba(184,98,10,0.3)'};
        }
        .theme-toggle-left {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .theme-icon { font-size: 15px; }
        .theme-label {
          font-size: 12px;
          font-weight: 600;
          color: ${isDark ? '#d4862a' : '#8a5a20'};
        }
        .theme-track {
          width: 32px;
          height: 18px;
          border-radius: 9px;
          background: ${isDark ? '#d4862a' : '#c8a880'};
          position: relative;
          transition: background 0.3s;
          flex-shrink: 0;
        }
        .theme-thumb {
          position: absolute;
          top: 2px;
          left: ${isDark ? '14px' : '2px'};
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
          transition: left 0.25s cubic-bezier(0.4,0,0.2,1);
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }

        /* ─── User card ─────────────────────────────────────── */
        .user-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          background: ${isDark ? '#1a1408' : '#f0e8dc'};
          border-radius: 8px;
          border: 1px solid ${isDark ? 'rgba(212,134,42,0.10)' : 'rgba(180,120,60,0.18)'};
        }
        .user-avatar {
          width: 30px; height: 30px;
          background: ${isDark ? 'rgba(212,134,42,0.10)' : 'rgba(184,98,10,0.10)'};
          border: 1px solid ${isDark ? 'rgba(212,134,42,0.25)' : 'rgba(184,98,10,0.25)'};
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
          color: ${isDark ? '#d4862a' : '#b8620a'};
          font-weight: 700;
          font-family: 'DM Mono', monospace;
          flex-shrink: 0;
        }
        .user-info-text { flex: 1; min-width: 0; }
        .user-name {
          font-size: 12px;
          font-weight: 600;
          color: ${isDark ? '#f5e6c8' : '#2a1a08'};
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-role {
          font-size: 10px;
          color: ${isDark ? '#d4862a' : '#b8620a'};
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        /* ─── Mobile ────────────────────────────────────────── */
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .sidebar-overlay { display: block; }
        }
      `}</style>
    </>
  );
};

export default Sidebar;