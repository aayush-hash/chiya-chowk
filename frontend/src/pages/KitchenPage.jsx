import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const authGet = (path) => api.get(path);
const authPost = (path, data) => api.post(path, data);
const authPatch = (path, data) => api.patch(path, data);

const STATUS_CONFIG = {
  pending:   { label: 'New Order',    emoji: '📋', color: '#e05c5c', bg: 'rgba(224,92,92,0.1)',  border: 'rgba(224,92,92,0.3)',  next: 'preparing', nextLabel: '👨‍🍳 Start Preparing' },
  preparing: { label: 'Preparing',   emoji: '👨‍🍳', color: '#d4862a', bg: 'rgba(212,134,42,0.1)', border: 'rgba(212,134,42,0.3)', next: 'ready',    nextLabel: '✅ Mark Ready' },
  ready:     { label: 'Ready!',      emoji: '✅', color: '#4caf88', bg: 'rgba(76,175,136,0.1)',  border: 'rgba(76,175,136,0.3)', next: 'served',   nextLabel: '🍵 Mark Served' },
  served:    { label: 'Served',      emoji: '🍵', color: '#7b9bc8', bg: 'rgba(123,155,200,0.1)', border: 'rgba(123,155,200,0.3)', next: 'completed', nextLabel: '✓ Complete' },
  completed: { label: 'Completed',   emoji: '🙏', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)', next: null,       nextLabel: null },
  cancelled: { label: 'Cancelled',   emoji: '❌', color: '#e05c5c', bg: 'rgba(224,92,92,0.05)', border: 'rgba(224,92,92,0.2)',  next: null,       nextLabel: null },
};

// Play ding sound via Web Audio API
const playDing = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.warn('Audio not supported:', e);
  }
};

// Request browser notification permission
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

const sendBrowserNotification = (title, body) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });
  }
};

// ===== ORDER CARD =====
const OrderCard = ({ order, onStatusChange, onCancel }) => {
  const cfg = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.pending;
  const [updating, setUpdating] = useState(false);
  const elapsed = Math.floor((Date.now() - new Date(order.createdAt)) / 60000);

  const handleNext = async () => {
    if (!cfg.next) return;
    setUpdating(true);
    try {
      await onStatusChange(order._id, cfg.next);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm(`Cancel order ${order.orderId}?`)) return;
    setUpdating(true);
    try {
      await onCancel(order._id);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 14,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      animation: order.orderStatus === 'pending' ? 'pulse 2s ease-in-out infinite' : 'none',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>{cfg.emoji}</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: cfg.color, fontSize: 14 }}>{order.orderId}</span>
            <span style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>{cfg.label}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>
            👤 {order.customerName}
            {order.customerPhone && <span style={{ color: 'var(--text3)', fontWeight: 400, marginLeft: 6 }}>· 📞 {order.customerPhone}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--amber)', fontFamily: 'DM Mono, monospace' }}>T{order.tableNumber}</div>
          <div style={{ fontSize: 11, color: elapsed > 15 ? 'var(--red)' : 'var(--text3)', fontWeight: elapsed > 15 ? 700 : 400 }}>
            {elapsed === 0 ? 'Just now' : `${elapsed}m ago`}
            {elapsed > 15 && ' ⚠️'}
          </div>
        </div>
      </div>

      {/* Items */}
      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 10px' }}>
        {order.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: i < order.items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <span style={{ fontSize: 18 }}>{item.emoji}</span>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{item.name}</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 14, color: 'var(--amber)' }}>×{item.qty}</span>
          </div>
        ))}
      </div>

      {/* Note */}
      {order.note && (
        <div style={{ background: 'rgba(212,134,42,0.08)', border: '1px solid rgba(212,134,42,0.2)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--amber)' }}>
          📝 {order.note}
        </div>
      )}

      {/* Total row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
          {order.items.reduce((s, i) => s + i.qty, 0)} items · Rs. {order.total}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>{new Date(order.createdAt).toLocaleTimeString()}</span>
      </div>

      {/* Actions */}
      {order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (
        <div style={{ display: 'flex', gap: 8 }}>
          {cfg.next && (
            <button
              onClick={handleNext}
              disabled={updating}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                background: cfg.color, color: '#fff',
                border: 'none', fontWeight: 700, fontSize: 13,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                opacity: updating ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}>
              {updating ? '...' : cfg.nextLabel}
            </button>
          )}
          <button
            onClick={handleCancel}
            disabled={updating}
            style={{
              padding: '10px 14px', borderRadius: 10,
              background: 'rgba(224,92,92,0.12)',
              border: '1px solid rgba(224,92,92,0.3)',
              color: '#e05c5c', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              opacity: updating ? 0.6 : 1,
            }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

// ===== QR TABLE MANAGER =====
const QRTableManager = () => {
  const [tables, setTables] = useState([]);
  const [frontendUrl, setFrontendUrl] = useState('');
  const [generating, setGenerating] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTables = async () => {
    try {
      const { data } = await authGet('/qr/tables');
      setTables(data.tables || []);
      setFrontendUrl(data.frontendUrl || '');
    } catch (err) {
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTables(); }, []);

  const generateQR = async (tableId, tableNumber) => {
    setGenerating(tableId);
    try {
      const { data } = await authPost(`/qr/tables/${tableId}/generate`, {});
      toast.success(`QR generated for Table ${tableNumber}`);
      fetchTables();
    } catch (err) {
      toast.error('Failed to generate QR');
    } finally {
      setGenerating(null); }
  };

  const copyLink = (url) => {
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied!')).catch(() => toast.error('Copy failed'));
  };

  const printQR = (table, qrUrl) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>QR Table ${table.number}</title>
      <style>
        body { font-family: Georgia, serif; background: #0d0a08; color: #f5e6c8; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
        .card { background: #0f0b06; border: 2px solid #d4862a; border-radius: 20px; padding: 32px 40px; text-align: center; max-width: 340px; }
        h1 { font-size: 28px; color: #d4862a; margin: 0 0 4px; }
        p { color: #a07850; margin: 0 0 20px; }
        .table-num { font-size: 48px; font-weight: 700; color: #f5e6c8; margin: 10px 0; }
        .qr-placeholder { width: 200px; height: 200px; border: 2px dashed #2a1f14; display: flex; align-items: center; justify-content: center; margin: 16px auto; border-radius: 12px; font-size: 12px; color: #6b5040; }
        .url { font-size: 10px; color: #6b5040; word-break: break-all; margin-top: 12px; }
        @media print { body { background: white; color: black; } .card { border-color: #333; } h1 { color: #333; } p { color: #666; } .table-num { color: #000; } }
      </style></head>
      <body>
        <div class="card">
          <div style="font-size:48px">🍵</div>
          <h1>Chiya Chowk</h1>
          <p>Scan to Order</p>
          <div class="table-num">Table ${table.number}</div>
          <div class="qr-placeholder">
            <div>
              <div style="font-size:32px;margin-bottom:8px">📱</div>
              <div>QR Code renders<br/>in browser</div>
            </div>
          </div>
          <p style="font-size:12px;color:#a07850;margin:0">Scan with your phone camera</p>
          <div class="url">${qrUrl}</div>
        </div>
        <script>window.print(); window.close();</script>
      </body></html>
    `);
  };

  if (loading) return <div className="flex-center" style={{ padding: 30 }}><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16, padding: '10px 14px', background: 'var(--card2)', borderRadius: 10, border: '1px solid var(--border)' }}>
        💡 Generate a QR code for each table. Customers scan it to view the menu and place orders directly from their phone.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {tables.map(table => (
          <div key={table._id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Table {table.number}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{table.seats} seats · {table.location}</div>
              </div>
              <div style={{
                padding: '3px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                background: table.status === 'available' ? 'rgba(76,175,136,0.15)' : 'rgba(212,134,42,0.15)',
                color: table.status === 'available' ? 'var(--green)' : 'var(--amber)',
                border: `1px solid ${table.status === 'available' ? 'rgba(76,175,136,0.3)' : 'rgba(212,134,42,0.3)'}`,
              }}>
                {table.status}
              </div>
            </div>

            {table.qrToken ? (
              <>
                <div style={{ background: 'var(--card2)', borderRadius: 8, padding: 10, marginBottom: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--text3)', wordBreak: 'break-all', lineHeight: 1.5 }}>
                    {table.qrUrl?.replace('http://localhost:3000', '').substring(0, 40)}...
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button className="btn btn-xs btn-secondary" style={{ flex: 1 }} onClick={() => copyLink(table.qrUrl)}>📋 Copy</button>
                  <button className="btn btn-xs btn-secondary" onClick={() => printQR(table, table.qrUrl)}>🖨️</button>
                  <button className="btn btn-xs btn-ghost" onClick={() => generateQR(table._id, table.number)} disabled={generating === table._id} title="Regenerate">↻</button>
                </div>
              </>
            ) : (
              <button className="btn btn-primary btn-sm btn-full" onClick={() => generateQR(table._id, table.number)} disabled={generating === table._id}>
                {generating === table._id ? 'Generating...' : '🔗 Generate QR'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ===== MAIN KITCHEN PAGE =====
const KitchenPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('live'); // live | completed | qr
  const [filterStatus, setFilterStatus] = useState('active');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevOrderIds = useRef(new Set());
  const { user } = useAuth();

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await authGet('/qr/orders/live');
      const newOrders = data.orders || [];
      const newIds = new Set(newOrders.map(o => o._id));

      // Check for genuinely new orders
      if (prevOrderIds.current.size > 0) {
        newOrders.forEach(order => {
          if (!prevOrderIds.current.has(order._id) && order.orderStatus === 'pending') {
            // New order arrived!
            if (soundEnabled) playDing();
            if (notificationsEnabled) {
              sendBrowserNotification(
                `🍵 New Order — Table ${order.tableNumber}`,
                `${order.customerName} · ${order.items.length} items · Rs. ${order.total}`
              );
            }
            toast.custom((t) => (
              <div style={{ background: '#0f0b06', border: '1px solid rgba(212,134,42,0.4)', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', color: '#f5e6c8' }}>
                <span style={{ fontSize: 24 }}>🍵</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#d4862a' }}>New Order! Table {order.tableNumber}</div>
                  <div style={{ fontSize: 11, color: '#a07850' }}>{order.customerName} · Rs. {order.total}</div>
                </div>
              </div>
            ), { duration: 5000 });
          }
        });
      }

      prevOrderIds.current = newIds;
      setOrders(newOrders);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setLoading(false);
    }
  }, [soundEnabled, notificationsEnabled]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000); // poll every 8s
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    requestNotificationPermission().then(() => {
      setNotificationsEnabled(Notification?.permission === 'granted');
    });
  }, []);

  const handleStatusChange = async (orderId, status) => {
    try {
      await authPatch(`/qr/orders/${orderId}/status`, { status });
      toast.success(`Order marked as ${status}`);
      fetchOrders();
    } catch (err) {
      toast.error('Status update failed');
    }
  };

  const handleCancel = async (orderId) => {
    try {
      await authPatch(`/qr/orders/${orderId}/status`, { status: 'cancelled' });
      toast.success('Order cancelled');
      fetchOrders();
    } catch (err) {
      toast.error('Cancel failed');
    }
  };

  const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.orderStatus));
  const completedOrders = orders.filter(o => ['completed', 'cancelled'].includes(o.orderStatus));

  const byStatus = (status) => activeOrders.filter(o => o.orderStatus === status);

  const pendingCount = byStatus('pending').length;
  const preparingCount = byStatus('preparing').length;
  const readyCount = byStatus('ready').length;

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">🍽️ Kitchen & QR Orders</h2>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            Auto-refreshes every 8s
            {pendingCount > 0 && <span style={{ color: 'var(--red)', fontWeight: 700, marginLeft: 8 }}>🔴 {pendingCount} new order{pendingCount > 1 ? 's' : ''} waiting</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(p => !p)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: soundEnabled ? 'var(--amber)' : 'var(--text3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans' }}
            title={soundEnabled ? 'Sound ON — click to mute' : 'Sound OFF — click to unmute'}>
            {soundEnabled ? '🔔 Sound' : '🔕 Muted'}
          </button>
          {/* Browser notification toggle */}
          {!notificationsEnabled && (
            <button
              onClick={() => requestNotificationPermission().then(() => setNotificationsEnabled(Notification?.permission === 'granted'))}
              className="btn btn-secondary btn-sm">
              🔔 Enable Alerts
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={fetchOrders}>↻ Refresh</button>
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Pending', count: pendingCount, color: 'var(--red)' },
          { label: 'Preparing', count: preparingCount, color: 'var(--amber)' },
          { label: 'Ready', count: readyCount, color: 'var(--green)' },
          { label: 'Total Active', count: activeOrders.length, color: 'var(--text2)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'DM Mono', fontSize: 28, fontWeight: 700, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--card2)', borderRadius: 10, padding: 4, width: 'fit-content', border: '1px solid var(--border)' }}>
        {[
          { key: 'live', label: `🔴 Live Orders${activeOrders.length > 0 ? ` (${activeOrders.length})` : ''}` },
          { key: 'completed', label: `✅ Done (${completedOrders.length})` },
          { key: 'qr', label: '📱 QR Codes' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', borderRadius: 7, border: 'none',
            background: tab === t.key ? 'var(--amber)' : 'transparent',
            color: tab === t.key ? '#1a0f00' : 'var(--text3)',
            cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== LIVE ORDERS TAB ===== */}
      {tab === 'live' && (
        loading ? (
          <div className="flex-center" style={{ padding: 60 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
        ) : activeOrders.length === 0 ? (
          <div className="empty-state">
            <div className="icon" style={{ fontSize: 48 }}>🍵</div>
            <h3>No active orders</h3>
            <p>New QR orders will appear here automatically</p>
          </div>
        ) : (
          <>
            {/* Kanban columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {['pending', 'preparing', 'ready', 'served'].map(status => {
                const statusOrders = byStatus(status);
                const cfg = STATUS_CONFIG[status];
                if (statusOrders.length === 0 && status !== 'pending') return null;
                return (
                  <div key={status}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{cfg.label}</span>
                      {statusOrders.length > 0 && (
                        <span style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, marginLeft: 'auto' }}>{statusOrders.length}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {statusOrders.length === 0 ? (
                        <div style={{ border: `1px dashed ${cfg.border}`, borderRadius: 12, padding: 20, textAlign: 'center', color: cfg.color, fontSize: 12, opacity: 0.5 }}>
                          No {cfg.label.toLowerCase()} orders
                        </div>
                      ) : statusOrders.map(order => (
                        <OrderCard key={order._id} order={order} onStatusChange={handleStatusChange} onCancel={handleCancel} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )
      )}

      {/* ===== COMPLETED TAB ===== */}
      {tab === 'completed' && (
        completedOrders.length === 0 ? (
          <div className="empty-state"><div className="icon">📋</div><p>No completed orders yet today</p></div>
        ) : (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <table className="data-table">
              <thead><tr><th>Order ID</th><th>Table</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Time</th></tr></thead>
              <tbody>
                {completedOrders.map(order => {
                  const cfg = STATUS_CONFIG[order.orderStatus];
                  return (
                    <tr key={order._id}>
                      <td style={{ fontFamily: 'DM Mono', color: 'var(--amber)', fontSize: 12 }}>{order.orderId}</td>
                      <td style={{ fontWeight: 700 }}>T{order.tableNumber}</td>
                      <td>
                        <div style={{ fontSize: 13 }}>{order.customerName}</div>
                        {order.customerPhone && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{order.customerPhone}</div>}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>{order.items.length} items</td>
                      <td style={{ fontFamily: 'DM Mono', fontWeight: 700 }}>Rs. {order.total}</td>
                      <td>
                        <span style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                          {cfg.emoji} {cfg.label}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(order.createdAt).toLocaleTimeString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ===== QR CODES TAB ===== */}
      {tab === 'qr' && <QRTableManager />}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(224,92,92,0); }
          50% { box-shadow: 0 0 0 6px rgba(224,92,92,0.15); }
        }
      `}</style>
    </div>
  );
};

export default KitchenPage;