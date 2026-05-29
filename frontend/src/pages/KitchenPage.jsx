import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const authGet  = (path)       => api.get(path);
const authPost = (path, data) => api.post(path, data);
const authPatch= (path, data) => api.patch(path, data);

// ─── Load qrcode library dynamically ─────────────────────────────────────────
let QRCode = null;
const loadQRLib = () =>
  new Promise((resolve) => {
    if (QRCode) return resolve(QRCode);
    if (window.QRCode) { QRCode = window.QRCode; return resolve(QRCode); }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload = () => { QRCode = window.QRCode; resolve(QRCode); };
    document.head.appendChild(s);
  });

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { label: 'New',       emoji: '📋', color: '#e05c5c', bg: 'rgba(224,92,92,0.10)',  border: 'rgba(224,92,92,0.30)',  next: 'preparing', nextLabel: '👨‍🍳 Start' },
  preparing: { label: 'Preparing', emoji: '👨‍🍳', color: '#d4862a', bg: 'rgba(212,134,42,0.10)', border: 'rgba(212,134,42,0.30)', next: 'ready',    nextLabel: '✅ Ready' },
  ready:     { label: 'Ready',     emoji: '✅', color: '#4caf88', bg: 'rgba(76,175,136,0.10)',  border: 'rgba(76,175,136,0.30)', next: 'served',   nextLabel: '🍵 Served' },
  served:    { label: 'Served',    emoji: '🍵', color: '#7b9bc8', bg: 'rgba(123,155,200,0.10)', border: 'rgba(123,155,200,0.30)', next: 'completed', nextLabel: '✓ Done' },
  completed: { label: 'Done',      emoji: '🙏', color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.25)', next: null, nextLabel: null },
  cancelled: { label: 'Cancelled', emoji: '❌', color: '#e05c5c', bg: 'rgba(224,92,92,0.05)',  border: 'rgba(224,92,92,0.20)',  next: null, nextLabel: null },
};

// ─── Audio ────────────────────────────────────────────────────────────────────
const playDing = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[880, 0], [1100, 0.12], [880, 0.24]].forEach(([freq, t]) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
      gain.gain.setValueAtTime(0.35, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.35);
    });
  } catch (e) { /* silently ignore */ }
};

// ─── Notifications ────────────────────────────────────────────────────────────
const requestNotifPerm = () =>
  'Notification' in window && Notification.permission === 'default'
    ? Notification.requestPermission()
    : Promise.resolve();

const sendNotif = (title, body) => {
  if ('Notification' in window && Notification.permission === 'granted')
    new Notification(title, { body, icon: '/favicon.ico' });
};

// ─── Elapsed time label ───────────────────────────────────────────────────────
const elapsed = (createdAt) => {
  const m = Math.floor((Date.now() - new Date(createdAt)) / 60000);
  return m === 0 ? 'Just now' : `${m}m ago`;
};
const isLate = (createdAt) =>
  Math.floor((Date.now() - new Date(createdAt)) / 60000) > 15;

// ═════════════════════════════════════════════════════════════════════════════
// ORDER CARD
// ═════════════════════════════════════════════════════════════════════════════
const OrderCard = ({ order, onStatusChange, onCancel }) => {
  const cfg = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.pending;
  const [updating, setUpdating] = useState(false);
  const late = isLate(order.createdAt);

  const doNext = async () => {
    if (!cfg.next) return;
    setUpdating(true);
    try { await onStatusChange(order._id, cfg.next); }
    finally { setUpdating(false); }
  };

  const doCancel = async () => {
    if (!window.confirm(`Cancel order ${order.orderId}?`)) return;
    setUpdating(true);
    try { await onCancel(order._id); }
    finally { setUpdating(false); }
  };

  return (
    <div style={{
      background: cfg.bg,
      border: `1.5px solid ${cfg.border}`,
      borderRadius: 14,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      animation: order.orderStatus === 'pending' ? 'cardPulse 2.2s ease-in-out infinite' : 'none',
      transition: 'box-shadow 0.2s',
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: cfg.color, fontSize: 13 }}>{order.orderId}</span>
            <span style={{
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              color: cfg.color, padding: '1px 7px', borderRadius: 20,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
            }}>{cfg.label}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>
            👤 {order.customerName}
            {order.customerPhone && (
              <span style={{ color: 'var(--text3)', fontWeight: 400, marginLeft: 6 }}>
                · 📞 {order.customerPhone}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontSize: 26, fontWeight: 800, color: 'var(--amber)',
            fontFamily: 'DM Mono, monospace', lineHeight: 1,
          }}>T{order.tableNumber}</div>
          <div style={{
            fontSize: 11, marginTop: 3, fontWeight: late ? 700 : 400,
            color: late ? 'var(--red)' : 'var(--text3)',
          }}>
            {elapsed(order.createdAt)}{late ? ' ⚠️' : ''}
          </div>
        </div>
      </div>

      {/* ── Items ── */}
      <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 9, padding: '7px 10px' }}>
        {order.items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 0',
            borderBottom: i < order.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <span style={{ fontSize: 17 }}>{item.emoji}</span>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{item.name}</span>
            {item.note && <span style={{ fontSize: 10, color: 'var(--amber)', background: 'rgba(212,134,42,0.12)', padding: '1px 5px', borderRadius: 4 }}>📝</span>}
            <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 13, color: 'var(--amber)' }}>×{item.qty}</span>
          </div>
        ))}
      </div>

      {/* ── Note ── */}
      {order.note && (
        <div style={{
          background: 'rgba(212,134,42,0.07)',
          border: '1px solid rgba(212,134,42,0.2)',
          borderRadius: 8, padding: '6px 10px',
          fontSize: 12, color: 'var(--amber)',
        }}>
          📝 {order.note}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
          {order.items.reduce((s, i) => s + i.qty, 0)} items
        </span>
        <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 14, color: 'var(--green)' }}>
          Rs. {order.total}
        </span>
      </div>

      {/* ── Actions ── */}
      {!['completed', 'cancelled'].includes(order.orderStatus) && (
        <div style={{ display: 'flex', gap: 7, marginTop: 2 }}>
          {cfg.next && (
            <button onClick={doNext} disabled={updating} style={{
              flex: 1, padding: '9px 0', borderRadius: 9,
              background: cfg.color, color: '#fff',
              border: 'none', fontWeight: 700, fontSize: 12,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              opacity: updating ? 0.55 : 1, transition: 'opacity 0.15s',
            }}>
              {updating ? '…' : cfg.nextLabel}
            </button>
          )}
          <button onClick={doCancel} disabled={updating} style={{
            padding: '9px 12px', borderRadius: 9,
            background: 'rgba(224,92,92,0.10)',
            border: '1px solid rgba(224,92,92,0.30)',
            color: '#e05c5c', fontWeight: 700, fontSize: 12,
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            opacity: updating ? 0.55 : 1,
          }}>✕</button>
        </div>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// QR CODE IMAGE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const QRCodeImage = ({ url, size = 160 }) => {
  const ref = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!url || !ref.current) return;
    loadQRLib().then((QRC) => {
      if (!ref.current) return;
      ref.current.innerHTML = '';
      instanceRef.current = new QRC(ref.current, {
        text: url,
        width: size,
        height: size,
        colorDark: '#1a0f00',
        colorLight: '#fdf6ec',
        correctLevel: QRC.CorrectLevel.M,
      });
    });
    return () => { if (ref.current) ref.current.innerHTML = ''; };
  }, [url, size]);

  return (
    <div ref={ref} style={{
      background: '#fdf6ec',
      borderRadius: 10,
      padding: 8,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
    }} />
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// QR TABLE MANAGER
// ═════════════════════════════════════════════════════════════════════════════
const QRTableManager = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const [selected, setSelected] = useState(null); // table for detail modal

  const fetch = async () => {
    try {
      const { data } = await authGet('/qr/tables');
      setTables(data.tables || []);
    } catch { toast.error('Failed to load tables'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const generateQR = async (tableId, tableNumber) => {
    setGenerating(tableId);
    try {
      await authPost(`/qr/tables/${tableId}/generate`, {});
      toast.success(`QR regenerated for Table ${tableNumber}`);
      fetch();
      // If modal is open for this table, refresh it
      if (selected?._id === tableId) {
        const { data } = await authGet('/qr/tables');
        const updated = (data.tables || []).find(t => t._id === tableId);
        if (updated) setSelected(updated);
      }
    } catch { toast.error('Failed to generate QR'); }
    finally { setGenerating(null); }
  };

  const copyLink = (url) => {
    navigator.clipboard.writeText(url)
      .then(() => toast.success('Link copied!'))
      .catch(() => toast.error('Copy failed'));
  };

  const printQR = (table) => {
    const pw = window.open('', '_blank');
    pw.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Table ${table.number}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { background:#fff; display:flex; align-items:center; justify-content:center; min-height:100vh; font-family:Georgia,serif; }
          .card { border:2px solid #d4862a; border-radius:16px; padding:32px 40px; text-align:center; width:340px; }
          h1 { font-size:26px; color:#1a0f00; margin-bottom:4px; }
          .sub { color:#7a5c32; font-size:14px; margin-bottom:8px; }
          .tnum { font-size:52px; font-weight:800; color:#d4862a; margin:8px 0; }
          #qr { display:flex; justify-content:center; margin:16px 0; }
          .url { font-size:9px; color:#aaa; word-break:break-all; margin-top:8px; }
          .footer { font-size:11px; color:#7a5c32; margin-top:12px; }
          @media print { body { -webkit-print-color-adjust:exact; } }
        </style>
      </head>
      <body>
        <div class="card">
          <div style="font-size:42px">🍵</div>
          <h1>Chiya Chowk</h1>
          <div class="sub">Scan to view menu &amp; order</div>
          <div class="tnum">Table ${table.number}</div>
          <div id="qr"></div>
          <div class="footer">Point your phone camera at the QR code</div>
          <div class="url">${table.qrUrl}</div>
        </div>
        <script>
          window.onload = function() {
            new QRCode(document.getElementById('qr'), {
              text: '${table.qrUrl}',
              width: 200, height: 200,
              colorDark: '#1a0f00', colorLight: '#ffffff',
              correctLevel: QRCode.CorrectLevel.M
            });
            setTimeout(function(){ window.print(); }, 800);
          };
        <\/script>
      </body>
      </html>
    `);
    pw.document.close();
  };

  if (loading) return (
    <div className="flex-center" style={{ padding: 48 }}>
      <div className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  );

  const withQR    = tables.filter(t => t.qrToken);
  const withoutQR = tables.filter(t => !t.qrToken);

  return (
    <div>
      {/* Info banner */}
      <div style={{
        fontSize: 13, color: 'var(--text2)',
        marginBottom: 20, padding: '12px 16px',
        background: 'rgba(212,134,42,0.07)',
        borderRadius: 10, border: '1px solid rgba(212,134,42,0.2)',
        lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--amber)' }}>📱 How QR ordering works:</strong> Each table gets a permanent QR code. Customers scan it → browse the menu → place order directly. Orders appear instantly on the Live Orders board. You can regenerate a QR at any time (old scans will stop working).
      </div>

      {/* Tables without QR */}
      {withoutQR.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            ⚠️ {withoutQR.length} table{withoutQR.length > 1 ? 's' : ''} without QR
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {withoutQR.map(t => (
              <button key={t._id}
                onClick={() => generateQR(t._id, t.number)}
                disabled={generating === t._id}
                style={{
                  padding: '8px 16px', borderRadius: 9,
                  background: 'rgba(224,92,92,0.10)',
                  border: '1px solid rgba(224,92,92,0.30)',
                  color: '#e05c5c', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', fontFamily: 'DM Sans',
                }}>
                {generating === t._id ? 'Generating…' : `🔗 Generate QR — Table ${t.number}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tables with QR grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {withQR.map(table => (
          <div key={table._id} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 16,
            cursor: 'pointer', transition: 'border-color 0.15s',
          }}
            onClick={() => setSelected(table)}
          >
            {/* Table header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--amber)' }}>T{table.number}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{table.seats} seats · {table.location}</div>
              </div>
              <div style={{
                padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                background: table.status === 'available' ? 'rgba(76,175,136,0.15)' : 'rgba(212,134,42,0.15)',
                color: table.status === 'available' ? 'var(--green)' : 'var(--amber)',
                border: `1px solid ${table.status === 'available' ? 'rgba(76,175,136,0.3)' : 'rgba(212,134,42,0.3)'}`,
              }}>{table.status}</div>
            </div>

            {/* QR preview */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <QRCodeImage url={table.qrUrl} size={120} />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-xs btn-secondary" style={{ flex: 1 }}
                onClick={e => { e.stopPropagation(); copyLink(table.qrUrl); }}>
                📋 Copy Link
              </button>
              <button className="btn btn-xs btn-secondary"
                onClick={e => { e.stopPropagation(); printQR(table); }}
                title="Print QR">🖨️</button>
              <button className="btn btn-xs btn-ghost"
                onClick={e => { e.stopPropagation(); generateQR(table._id, table.number); }}
                disabled={generating === table._id}
                title="Regenerate QR (invalidates old scans)">↻</button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setSelected(null)}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 18, padding: 28, maxWidth: 380, width: '90%',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--amber)' }}>Table {selected.number}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{selected.seats} seats · {selected.location}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <QRCodeImage url={selected.qrUrl} size={200} />
            </div>

            <div style={{
              background: 'var(--card2)', borderRadius: 10,
              padding: '10px 12px', marginBottom: 16,
              fontSize: 11, color: 'var(--text3)', wordBreak: 'break-all', lineHeight: 1.7,
            }}>
              🔗 {selected.qrUrl}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
                onClick={() => copyLink(selected.qrUrl)}>📋 Copy Link</button>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}
                onClick={() => printQR(selected)}>🖨️ Print QR</button>
            </div>
            <button className="btn btn-ghost btn-sm btn-full" style={{ marginTop: 8 }}
              onClick={() => generateQR(selected._id, selected.number)}
              disabled={generating === selected._id}>
              {generating === selected._id ? 'Regenerating…' : '↻ Regenerate QR (invalidates current)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// COMPLETED ORDERS TABLE (fetches from /orders with QR filter)
// ═════════════════════════════════════════════════════════════════════════════
const CompletedOrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authGet('/orders?status=completed&limit=60')
      .then(({ data }) => setOrders(data.orders || []))
      .catch(() => toast.error('Failed to load completed orders'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex-center" style={{ padding: 48 }}>
      <div className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  );

  if (orders.length === 0)
    return <div className="empty-state"><div className="icon">📋</div><p>No completed orders yet today</p></div>;

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Table</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Total</th>
            <th>Source</th>
            <th>Status</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => {
            const cfg = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.completed;
            return (
              <tr key={order._id}>
                <td style={{ fontFamily: 'DM Mono', color: 'var(--amber)', fontSize: 12 }}>{order.orderId}</td>
                <td style={{ fontWeight: 700 }}>T{order.tableNumber || '—'}</td>
                <td>
                  <div style={{ fontSize: 13 }}>{order.customerName || '—'}</div>
                  {order.customerPhone && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{order.customerPhone}</div>}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text3)' }}>{order.items?.length || 0} items</td>
                <td style={{ fontFamily: 'DM Mono', fontWeight: 700 }}>Rs. {order.total}</td>
                <td>
                  <span style={{
                    padding: '2px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                    background: order.isQROrder ? 'rgba(123,155,200,0.15)' : 'rgba(212,134,42,0.12)',
                    color: order.isQROrder ? '#7b9bc8' : 'var(--amber)',
                    border: `1px solid ${order.isQROrder ? 'rgba(123,155,200,0.3)' : 'rgba(212,134,42,0.3)'}`,
                  }}>
                    {order.isQROrder ? '📱 QR' : '🧾 POS'}
                  </span>
                </td>
                <td>
                  <span style={{
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    color: cfg.color, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                  }}>
                    {cfg.emoji} {cfg.label}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {new Date(order.createdAt).toLocaleTimeString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN KITCHEN PAGE
// ═════════════════════════════════════════════════════════════════════════════
const KitchenPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('live');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const prevIds = useRef(new Set());
  const { user } = useAuth();

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await authGet('/qr/orders/live');
      const fresh = data.orders || [];
      const freshIds = new Set(fresh.map(o => o._id));

      // Detect genuinely new pending orders
      if (prevIds.current.size > 0) {
        fresh.forEach(order => {
          if (!prevIds.current.has(order._id) && order.orderStatus === 'pending') {
            if (soundEnabled) playDing();
            if (notifEnabled) sendNotif(`🍵 New Order — Table ${order.tableNumber}`,
              `${order.customerName} · ${order.items.length} items · Rs. ${order.total}`);
            toast.custom(() => (
              <div style={{
                background: '#0f0b06', border: '1px solid rgba(212,134,42,0.4)',
                borderRadius: 12, padding: '12px 16px',
                display: 'flex', gap: 10, alignItems: 'center', color: '#f5e6c8',
                fontFamily: 'DM Sans, sans-serif',
              }}>
                <span style={{ fontSize: 24 }}>🍵</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#d4862a' }}>
                    New Order! Table {order.tableNumber}
                  </div>
                  <div style={{ fontSize: 11, color: '#a07850' }}>
                    {order.customerName} · Rs. {order.total}
                  </div>
                </div>
              </div>
            ), { duration: 6000 });
          }
        });
      }

      prevIds.current = freshIds;
      setOrders(fresh);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Kitchen fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [soundEnabled, notifEnabled]);

  useEffect(() => {
    fetchOrders();
    const iv = setInterval(fetchOrders, 12000);
    return () => clearInterval(iv);
  }, [fetchOrders]);

  useEffect(() => {
    requestNotifPerm().then(() =>
      setNotifEnabled(window.Notification?.permission === 'granted'));
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await authPatch(`/qr/orders/${id}/status`, { status });
      toast.success(`Marked as ${status}`);
      fetchOrders();
    } catch { toast.error('Status update failed'); }
  };

  const handleCancel = async (id) => {
    try {
      await authPatch(`/qr/orders/${id}/status`, { status: 'cancelled' });
      toast.success('Order cancelled');
      fetchOrders();
    } catch { toast.error('Cancel failed'); }
  };

  const active    = orders.filter(o => !['completed','cancelled'].includes(o.orderStatus));
  const byStatus  = (s) => active.filter(o => o.orderStatus === s);

  const pendingCount   = byStatus('pending').length;
  const preparingCount = byStatus('preparing').length;
  const readyCount     = byStatus('ready').length;
  const servedCount    = byStatus('served').length;

  const COLUMNS = ['pending', 'preparing', 'ready', 'served'];

  return (
    <div className="animate-fadeIn">
      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h2 className="page-title">🍽️ Kitchen Board</h2>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>Live QR &amp; Kitchen Orders</span>
            <span style={{ color: 'var(--text3)' }}>·</span>
            <span>Last refresh: {lastRefresh.toLocaleTimeString()}</span>
            {pendingCount > 0 && (
              <span style={{ color: 'var(--red)', fontWeight: 700 }}>
                🔴 {pendingCount} waiting
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSoundEnabled(p => !p)}
            style={{
              padding: '6px 12px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--card)',
              color: soundEnabled ? 'var(--amber)' : 'var(--text3)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans',
            }}>
            {soundEnabled ? '🔔 Sound ON' : '🔕 Muted'}
          </button>
          {!notifEnabled && (
            <button className="btn btn-secondary btn-sm"
              onClick={() => requestNotifPerm().then(() => setNotifEnabled(window.Notification?.permission === 'granted'))}>
              🔔 Enable Alerts
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={fetchOrders}>↻ Refresh</button>
        </div>
      </div>

      {/* ── Summary stat bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Pending',   count: pendingCount,   color: 'var(--red)' },
          { label: 'Preparing', count: preparingCount, color: 'var(--amber)' },
          { label: 'Ready',     count: readyCount,     color: 'var(--green)' },
          { label: 'Served',    count: servedCount,    color: '#7b9bc8' },
          { label: 'Active',    count: active.length,  color: 'var(--text2)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '12px 14px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'DM Mono', fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.count}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        background: 'var(--card2)', borderRadius: 10, padding: 4,
        width: 'fit-content', border: '1px solid var(--border)',
      }}>
        {[
          { key: 'live',      label: `🔴 Live${active.length > 0 ? ` (${active.length})` : ''}` },
          { key: 'completed', label: '✅ Completed' },
          { key: 'qr',        label: '📱 QR Codes' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', borderRadius: 7, border: 'none',
            background: tab === t.key ? 'var(--amber)' : 'transparent',
            color: tab === t.key ? '#1a0f00' : 'var(--text3)',
            cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13,
            fontWeight: 600, transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── LIVE ORDERS ── */}
      {tab === 'live' && (
        loading ? (
          <div className="flex-center" style={{ padding: 60 }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : active.length === 0 ? (
          <div className="empty-state">
            <div className="icon" style={{ fontSize: 52 }}>🍵</div>
            <h3>No active orders</h3>
            <p>New QR orders appear here automatically every 12 seconds</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 18, alignItems: 'start' }}>
            {COLUMNS.map(status => {
              const col = byStatus(status);
              const cfg = STATUS_CONFIG[status];
              if (col.length === 0 && status !== 'pending') return null;
              return (
                <div key={status}>
                  {/* Column header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    marginBottom: 10, paddingBottom: 8,
                    borderBottom: `2px solid ${cfg.border}`,
                  }}>
                    <span style={{ fontSize: 16 }}>{cfg.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                      {cfg.label}
                    </span>
                    <span style={{
                      marginLeft: 'auto',
                      background: cfg.bg, border: `1px solid ${cfg.border}`,
                      color: cfg.color, padding: '1px 9px', borderRadius: 20,
                      fontSize: 11, fontWeight: 700,
                    }}>{col.length}</span>
                  </div>

                  {/* Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {col.length === 0 ? (
                      <div style={{
                        border: `1.5px dashed ${cfg.border}`, borderRadius: 12,
                        padding: '22px 0', textAlign: 'center',
                        color: cfg.color, fontSize: 12, opacity: 0.45,
                      }}>
                        No orders here
                      </div>
                    ) : col.map(order => (
                      <OrderCard
                        key={order._id}
                        order={order}
                        onStatusChange={handleStatusChange}
                        onCancel={handleCancel}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── COMPLETED ── */}
      {tab === 'completed' && <CompletedOrdersTab />}

      {/* ── QR CODES ── */}
      {tab === 'qr' && <QRTableManager />}

      <style>{`
        @keyframes cardPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(224,92,92,0); }
          50%       { box-shadow: 0 0 0 7px rgba(224,92,92,0.13); }
        }
      `}</style>
    </div>
  );
};

export default KitchenPage;