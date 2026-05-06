import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const NAV = [
  {
    group: "Operations",
    items: [
      { path: "/dashboard", icon: "📊", label: "Dashboard" },
      { path: "/pos", icon: "🛒", label: "New Order" },
      { path: "/tables", icon: "🪑", label: "Tables" },
      { path: "/orders", icon: "📋", label: "All Orders" },
      // { path: '/kitchen', icon: '👨‍🍳', label: 'Kitchen & QR Orders' },
    ],
  },
  {
    group: "Management",
    items: [
      {
        path: "/menu",
        icon: "🍽️",
        label: "Menu Items",
        roles: ["admin", "manager"],
      },
      { path: "/inventory", icon: "📦", label: "Inventory" },
      {
        path: "/reports",
        icon: "📈",
        label: "Reports",
        roles: ["admin", "manager"],
      },
      { path: "/transactions", icon: "💰", label: "Transactions" },
    ],
  },
  {
    group: "Admin",
    items: [
      { path: "/admin", icon: "⚙️", label: "Admin Panel", roles: ["admin"] },
    ],
  },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const canAccess = (item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">☕</div>
            <div className="logo-text">
              <h2>Chiya Chowk</h2>
              <span>POS System</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((section) => (
            <div key={section.group} className="nav-section">
              <div className="nav-label">{section.group}</div>
              {section.items.filter(canAccess).map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${pathname === item.path || pathname.startsWith(item.path + "/") ? "active" : ""}`}
                  onClick={onClose}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div className="user-info-text">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-full btn-sm"
            onClick={handleLogout}
            style={{ marginTop: 8 }}
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      <style>{`
        .sidebar {
          position: fixed;
          left: 0; top: 0; bottom: 0;
          width: var(--sidebar-width);
          background: var(--surface);
          border-right: 1px solid var(--border);
          z-index: 200;
          display: flex;
          flex-direction: column;
          transition: transform 0.3s;
        }
        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 199;
        }
        .sidebar-logo {
          padding: 18px 16px 14px;
          border-bottom: 1px solid var(--border);
        }
        .logo-mark {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo-icon {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, var(--amber), var(--amber2));
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(212,134,42,0.25);
          flex-shrink: 0;
        }
        .logo-text h2 {
          font-family: 'Playfair Display', serif;
          font-size: 15px;
          font-weight: 700;
          line-height: 1.2;
        }
        .logo-text span {
          font-size: 10px;
          color: var(--text3);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 10px 8px;
        }
        .nav-section { margin-bottom: 6px; }
        .nav-label {
          font-size: 10px;
          color: var(--text3);
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
          border-radius: var(--radius2);
          cursor: pointer;
          color: var(--text3);
          font-size: 13px;
          font-weight: 500;
          transition: var(--transition);
          margin-bottom: 1px;
          border: 1px solid transparent;
          text-decoration: none;
        }
        .nav-item:hover { color: var(--text2); background: var(--card); }
        .nav-item.active {
          background: var(--amber-dim);
          color: var(--amber);
          border-color: var(--amber-glow);
        }
        .nav-icon { font-size: 15px; width: 20px; text-align: center; }
        .sidebar-footer {
          padding: 10px 8px;
          border-top: 1px solid var(--border);
        }
        .user-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          background: var(--card);
          border-radius: var(--radius2);
          border: 1px solid var(--border);
        }
        .user-avatar {
          width: 30px; height: 30px;
          background: var(--amber-dim);
          border: 1px solid var(--amber-glow);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
          color: var(--amber);
          font-weight: 700;
          font-family: 'DM Mono', monospace;
          flex-shrink: 0;
        }
        .user-info-text { flex: 1; min-width: 0; }
        .user-name { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-role { font-size: 10px; color: var(--amber); text-transform: uppercase; letter-spacing: 0.07em; }
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
