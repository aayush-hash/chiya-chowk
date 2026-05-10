import React, { useState, useEffect, useCallback } from 'react';
import { tableAPI, orderAPI, menuAPI } from '../services/api';
import PayBillModal from '../components/layout/PayBillModal';
import toast from 'react-hot-toast';

// ─── Bill Print ───────────────────────────────────────────────────────────────
const printBill = (order, table) => {
  const win = window.open('', '_blank', 'width=400,height=600');
  const items = order.items || [];
  const itemRows = items.map(item => `
    <tr>
      <td>${item.emoji || ''} ${item.name}</td>
      <td style="text-align:center">${item.qty}</td>
      <td style="text-align:right">Rs. ${item.price}</td>
      <td style="text-align:right">Rs. ${item.subtotal || item.price * item.qty}</td>
    </tr>`).join('');

  win.document.write(`<!DOCTYPE html><html><head><title>Bill - ${order.orderId}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:13px;color:#000;background:#fff;padding:16px;max-width:320px;margin:0 auto}
  .header{text-align:center;margin-bottom:12px;border-bottom:2px dashed #000;padding-bottom:12px}
  .header h1{font-size:20px;font-weight:900;letter-spacing:2px}
  .header p{font-size:11px;color:#555;margin-top:3px}
  .info{margin-bottom:10px;font-size:12px}
  .info-row{display:flex;justify-content:space-between;padding:2px 0}
  table{width:100%;border-collapse:collapse;margin-bottom:10px}
  thead tr{border-bottom:1px dashed #000}
  th{font-size:11px;padding:4px 0;text-align:left}
  th:last-child,th:nth-child(3),th:nth-child(2){text-align:right}
  td{padding:5px 0;font-size:12px;border-bottom:1px solid #eee;vertical-align:top}
  .divider{border-top:1px dashed #000;margin:8px 0}
  .total-row{display:flex;justify-content:space-between;padding:3px 0;font-size:13px}
  .grand-total{font-size:16px;font-weight:900;border-top:2px solid #000;padding-top:6px;margin-top:4px}
  .payment-badge{text-align:center;margin-top:12px;padding:6px;border:2px solid #000;font-weight:700;font-size:14px;letter-spacing:2px}
  .footer{text-align:center;margin-top:16px;border-top:2px dashed #000;padding-top:12px;font-size:11px;color:#555;line-height:1.8}
  @media print{body{padding:0}}
</style></head><body>
  <div class="header"><h1>🍵 CHIYA CHOWK</h1><p>Kathmandu, Nepal</p><p>Thank you for dining with us!</p></div>
  <div class="info">
    <div class="info-row"><span>Bill No:</span><span><b>${order.orderId}</b></span></div>
    <div class="info-row"><span>Table:</span><span>Table ${order.tableNumber || table?.number || '-'}</span></div>
    ${order.customerName ? `<div class="info-row"><span>Customer:</span><span>${order.customerName}</span></div>` : ''}
    ${order.customerPhone ? `<div class="info-row"><span>Phone:</span><span>${order.customerPhone}</span></div>` : ''}
    <div class="info-row"><span>Cashier:</span><span>${order.cashierName || '-'}</span></div>
    <div class="info-row"><span>Date:</span><span>${new Date(order.createdAt).toLocaleString('en-NP', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
  </div>
  <div class="divider"></div>
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div>
    <div class="total-row"><span>Subtotal</span><span>Rs. ${order.subtotal?.toLocaleString()}</span></div>
    ${order.discount > 0 ? `<div class="total-row" style="color:#c00"><span>Discount</span><span>- Rs. ${order.discount}</span></div>` : ''}
    <div class="total-row grand-total"><span>TOTAL</span><span>Rs. ${order.total?.toLocaleString()}</span></div>
    ${(order.amountPaid > 0 && order.amountPaid < order.total) ? `<div class="total-row"><span>Paid so far</span><span>Rs. ${order.amountPaid?.toLocaleString()}</span></div><div class="total-row" style="color:#c00;font-weight:700"><span>Remaining</span><span>Rs. ${order.remainingAmount?.toLocaleString()}</span></div>` : ''}
    ${order.paymentStatus === 'paid' && order.changeGiven > 0 ? `<div class="total-row"><span>Change</span><span>Rs. ${order.changeGiven?.toLocaleString()}</span></div>` : ''}
  </div>
  <div class="payment-badge">${order.paymentStatus === 'partial' ? '⏳ PARTIAL PAYMENT' : order.paymentMethod === 'cash' ? '💵 CASH' : order.paymentMethod === 'qr' ? '📱 QR / eSewa' : '⏳ PENDING'}</div>
  <div class="footer"><p>⭐ We hope you enjoyed your visit!</p><p>Please come again</p></div>
  <script>window.onload=()=>{window.print()}</script>
</body></html>`);
  win.document.close();
};

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_COLOR = { available: 'green', occupied: 'amber', reserved: 'blue', dirty: 'red' };
const STATUS_EMOJI = { available: '✅', occupied: '🍽️', reserved: '📅', dirty: '🧹' };

// ─── Add / Add-more Items Modal ───────────────────────────────────────────────
const OrderModal = ({ table, existingOrder, onClose, onSuccess }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState(existingOrder?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(existingOrder?.customerPhone || '');
  const [note, setNote] = useState('');

  const isNew = !existingOrder?._id;

  useEffect(() => {
    menuAPI.getAll({ available: true })
      .then(({ data }) => { setMenuItems(data.items); setCategories(['All', ...data.categories]); })
      .catch(() => toast.error('Failed to load menu'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = menuItems.filter(item => {
    const catOk = activeCategory === 'All' || item.category === activeCategory;
    const searchOk = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return catOk && searchOk;
  });

  const addToCart = (item) => setCart(prev => {
    const ex = prev.find(c => c.menuItem === item._id);
    if (ex) return prev.map(c => c.menuItem === item._id ? { ...c, qty: c.qty + 1 } : c);
    return [...prev, { menuItem: item._id, name: item.name, emoji: item.emoji, price: item.price, qty: 1 }];
  });

  const changeQty = (id, delta) =>
    setCart(prev => prev.map(c => c.menuItem === id ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0));

  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const handleSubmit = async () => {
    if (cart.length === 0) { toast.error('Add at least one item'); return; }
    setSubmitting(true);
    try {
      if (!isNew) {
        await orderAPI.addItems(existingOrder._id, { items: cart.map(c => ({ menuItem: c.menuItem, qty: c.qty })) });
        if (customerName !== existingOrder.customerName || customerPhone !== existingOrder.customerPhone) {
          await orderAPI.updateCustomer(existingOrder._id, { customerName, customerPhone });
        }
        toast.success(`✅ ${cartCount} item(s) added`);
      } else {
        await orderAPI.create({
          items: cart.map(c => ({ menuItem: c.menuItem, qty: c.qty })),
          tableId: table._id,
          tableNumber: table.number,
          orderType: 'dine-in',
          paymentMethod: 'pending',
          discount: 0,
          discountType: 'fixed',
          note,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
        });
        toast.success(`✅ Order placed for Table ${table.number}`);
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, height: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{isNew ? `🍽️ New Order — Table ${table.number}` : `➕ Add Items — Table ${table.number}`}</h3>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              {isNew ? 'Place a new order for this table' : `Adding to ${existingOrder.orderId}`}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--card2)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <input className="form-control" placeholder="👤 Customer name (optional)" value={customerName}
            onChange={e => setCustomerName(e.target.value)} style={{ fontSize: 13 }} />
          <input className="form-control" placeholder="📞 Phone (optional)" value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)} style={{ fontSize: 13, maxWidth: 180 }} />
          {isNew && <input className="form-control" placeholder="📝 Note..." value={note}
            onChange={e => setNote(e.target.value)} style={{ fontSize: 13 }} />}
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
              <input className="form-control" placeholder="🔍 Search..." value={search}
                onChange={e => setSearch(e.target.value)} style={{ fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', gap: 6, padding: '7px 12px', borderBottom: '1px solid var(--border)', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                  padding: '4px 11px', borderRadius: 16, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                  border: `1px solid ${activeCategory === cat ? 'var(--amber)' : 'var(--border2)'}`,
                  background: activeCategory === cat ? 'var(--amber)' : 'var(--card2)',
                  color: activeCategory === cat ? '#1a0f00' : 'var(--text3)',
                  cursor: 'pointer', fontFamily: 'DM Sans',
                }}>{cat}</button>
              ))}
            </div>
            {loading ? (
              <div className="flex-center" style={{ flex: 1 }}><div className="spinner" /></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))', gap: 8, padding: 10, overflowY: 'auto', flex: 1 }}>
                {filtered.map(item => {
                  const qty = cart.find(c => c.menuItem === item._id)?.qty || 0;
                  return (
                    <div key={item._id} onClick={() => addToCart(item)} style={{
                      background: qty > 0 ? 'var(--amber-dim)' : 'var(--card2)',
                      border: `1px solid ${qty > 0 ? 'var(--amber)' : 'var(--border)'}`,
                      borderRadius: 10, padding: 9, cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
                    }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{item.emoji}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2, lineHeight: 1.3 }}>{item.name}</div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--amber)' }}>Rs. {item.price}</div>
                      {qty > 0 && (
                        <div style={{ position: 'absolute', top: 5, right: 5, background: 'var(--amber)', color: '#1a0f00', borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{qty}</div>
                      )}
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text3)', padding: 30, fontSize: 13 }}>No items found</div>
                )}
              </div>
            )}
          </div>

          <div style={{ width: 210, display: 'flex', flexDirection: 'column', background: 'var(--card2)' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>
              🛒 {isNew ? 'Order' : 'New Items'} ({cartCount})
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, padding: '24px 0' }}>Tap items to add</div>
              ) : cart.map(c => (
                <div key={c.menuItem} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 15 }}>{c.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--amber)', fontFamily: 'DM Mono' }}>Rs. {c.price * c.qty}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button onClick={e => { e.stopPropagation(); changeQty(c.menuItem, -1); }} style={styles.qtyBtn}>−</button>
                    <span style={{ fontSize: 11, fontWeight: 700, minWidth: 14, textAlign: 'center' }}>{c.qty}</span>
                    <button onClick={e => { e.stopPropagation(); changeQty(c.menuItem, 1); }} style={styles.qtyBtn}>+</button>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div style={{ padding: 10, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                  <span>Subtotal</span>
                  <span style={{ fontFamily: 'DM Mono', color: 'var(--amber)' }}>Rs. {cartTotal.toLocaleString()}</span>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', fontSize: 12 }} onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Placing...</> : isNew ? `🍽️ Place Order` : `➕ Add ${cartCount} Item${cartCount > 1 ? 's' : ''}`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Edit Table Modal ─────────────────────────────────────────────────────────
const EditTableModal = ({ table, onClose, onSuccess }) => {
  const [seats, setSeats] = useState(table.seats);
  const [location, setLocation] = useState(table.location);
  const [notes, setNotes] = useState(table.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await tableAPI.update(table._id, { seats: parseInt(seats), location, notes });
      toast.success('Table updated');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <div className="modal-header">
          <h3 className="modal-title">✏️ Edit Table {table.number}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Seats</label>
            <input type="number" className="form-control" value={seats} min={1} max={20}
              onChange={e => setSeats(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <select className="form-control" value={location} onChange={e => setLocation(e.target.value)}>
              {['indoor', 'outdoor', 'balcony', 'vip'].map(l => (
                <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-control" placeholder="e.g. Near window, requires extra setup..." value={notes}
              onChange={e => setNotes(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Payment Success Modal ────────────────────────────────────────────────────
const PaySuccessModal = ({ order, table, onClose }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 370, textAlign: 'center' }}>
      <div className="modal-body" style={{ padding: 32 }}>
        <div style={{ fontSize: 54, marginBottom: 10 }}>{order.paymentStatus === 'partial' ? '💰' : '✅'}</div>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
          {order.paymentStatus === 'partial' ? 'Partial Payment Recorded' : 'Payment Received!'}
        </h3>
        {order.customerName && <p style={{ color: 'var(--amber)', fontSize: 14, marginBottom: 4 }}>👤 {order.customerName}</p>}
        <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 4 }}>
          {order.orderId} · Bill: Rs. {order.total?.toLocaleString()}
        </p>
        {order.paymentStatus === 'partial' && (
          <div style={{ background: 'rgba(91,155,213,0.1)', border: '1px solid rgba(91,155,213,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>Paid so far</div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>Rs. {(order.amountPaid || order.amountReceived)?.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Still remaining</div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>Rs. {order.remainingAmount?.toLocaleString()}</div>
          </div>
        )}
        {order.paymentStatus === 'paid' && (
          <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 20 }}>
            Paid via <b style={{ color: 'var(--amber)' }}>{order.paymentMethod?.toUpperCase()}</b>
            {order.changeGiven > 0 && ` · Change: Rs. ${order.changeGiven?.toLocaleString()}`}
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => { printBill(order, table); onClose(); }}>🖨️ Print Bill</button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Table Detail Drawer ──────────────────────────────────────────────────────
const TableDrawer = ({ table, onClose, onRefresh }) => {
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [paySuccessOrder, setPaySuccessOrder] = useState(null);
  const [settingStatus, setSettingStatus] = useState(false);

  const order = table.currentOrder;
  const hasActiveOrder = order && order.paymentStatus !== 'paid';
  const hasPaidOrder = order && order.paymentStatus === 'paid';
  const remaining = order?.remainingAmount ?? (order ? order.total - (order.amountPaid || order.amountReceived || 0) : 0);
  const isPartial = order?.paymentStatus === 'partial';

  const setStatus = async (status) => {
    setSettingStatus(true);
    try {
      await tableAPI.setStatus(table._id, { status });
      toast.success(`Table ${table.number} → ${status}`);
      onRefresh();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSettingStatus(false); }
  };

  const clearTable = async () => {
    try {
      await tableAPI.clear(table._id);
      toast.success(`Table ${table.number} cleared`);
      onRefresh(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Clear failed'); }
  };

  const handlePaySuccess = (completedOrder) => {
    setShowPayModal(false);
    setPaySuccessOrder(completedOrder);
    onRefresh();
  };

  return (
    <>
      <div style={styles.drawerBackdrop} onClick={onClose} />
      <div style={styles.drawer}>
        <div style={styles.drawerHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: `var(--${STATUS_COLOR[table.status]}-dim, var(--amber-dim))`,
              border: `2px solid var(--${STATUS_COLOR[table.status]}, var(--amber))`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>{STATUS_EMOJI[table.status]}</div>
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 900 }}>Table {table.number}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                👥 {table.seats} seats · 📍 {table.location}
                {table.notes && ` · ${table.notes}`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowEditModal(true)} title="Edit table">✏️</button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="btn btn-success btn-sm" onClick={() => setStatus('available')} disabled={settingStatus}>✓ Available</button>
          <button className="btn btn-sm" style={{ background: 'var(--blue-dim)', border: '1px solid var(--blue)', color: 'var(--blue)' }} onClick={() => setStatus('reserved')} disabled={settingStatus}>📅 Reserve</button>
          <button className="btn btn-danger btn-sm" onClick={() => setStatus('dirty')} disabled={settingStatus}>🧹 Dirty</button>
          <button className="btn btn-sm" style={{ background: 'var(--card2)', border: '1px solid var(--border2)', color: 'var(--text3)', marginLeft: 'auto' }} onClick={() => setShowEditModal(true)}>⚙️ Edit Table</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>

          {hasActiveOrder && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Active Order</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--amber)' }}>{order.orderId}</span>
                  <span className={`badge badge-${order.paymentStatus}`}>{order.paymentStatus?.toUpperCase()}</span>
                </div>
              </div>

              {(order.customerName || order.customerPhone) && (
                <div style={{ background: 'var(--amber-dim)', border: '1px solid var(--amber-glow)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12 }}>
                  <span style={{ color: 'var(--amber)' }}>👤 {order.customerName || '—'}</span>
                  {order.customerPhone && <span style={{ color: 'var(--text3)', marginLeft: 8 }}>📞 {order.customerPhone}</span>}
                </div>
              )}

              {isPartial && (
                <div style={{ background: 'rgba(91,155,213,0.1)', border: '1px solid rgba(91,155,213,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12 }}>
                  <div style={{ color: 'var(--blue)', fontWeight: 700, marginBottom: 2 }}>💰 Partial payment recorded</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text3)' }}>Paid: <b style={{ color: 'var(--green)', fontFamily: 'DM Mono' }}>Rs. {(order.amountPaid || order.amountReceived || 0).toLocaleString()}</b></span>
                    <span style={{ color: 'var(--text3)' }}>Remaining: <b style={{ color: 'var(--red)', fontFamily: 'DM Mono' }}>Rs. {remaining.toLocaleString()}</b></span>
                  </div>
                </div>
              )}

              <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
                {order.items?.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                    <span>{item.emoji} {item.name} <span style={{ color: 'var(--text3)' }}>× {item.qty}</span></span>
                    <span style={{ fontFamily: 'DM Mono', color: 'var(--amber)' }}>Rs. {(item.subtotal || item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ padding: '8px 12px', background: 'var(--card)' }}>
                  {order.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--red)', marginBottom: 3 }}>
                      <span>Discount</span><span>- Rs. {order.discount}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}>
                    <span>Bill Total</span>
                    <span style={{ fontFamily: 'DM Mono', color: 'var(--amber)' }}>Rs. {order.total?.toLocaleString()}</span>
                  </div>
                  {isPartial && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                      <span style={{ color: 'var(--red)' }}>Remaining</span>
                      <span style={{ fontFamily: 'DM Mono', color: 'var(--red)' }}>Rs. {remaining.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => setShowOrderModal(true)}>➕ Add Items</button>
                <button className="btn btn-success btn-sm" onClick={() => setShowPayModal(true)}>
                  {isPartial ? `💰 Collect Rs. ${remaining.toLocaleString()}` : '💳 Collect Bill'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => printBill(order, table)}>🖨️ Print Bill</button>
                <button className="btn btn-danger btn-sm" onClick={clearTable}>🗑️ Clear Table</button>
              </div>
            </div>
          )}

          {hasPaidOrder && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600, marginBottom: 4 }}>Order Paid — {order.orderId}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
                Rs. {order.total?.toLocaleString()} via {order.paymentMethod?.toUpperCase()}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => printBill(order, table)}>🖨️ Print Bill</button>
                <button className="btn btn-danger btn-sm" onClick={clearTable}>🧹 Clear Table</button>
              </div>
            </div>
          )}

          {!order && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>🪑</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
                {table.status === 'reserved' ? '📅 Table is reserved'
                  : table.status === 'dirty' ? '🧹 Needs cleaning'
                    : '✅ Table is free — ready to seat'}
              </div>
              {table.status !== 'dirty' && (
                <button className="btn btn-primary" style={{ width: '100%', fontSize: 14, padding: '12px' }}
                  onClick={() => setShowOrderModal(true)}>
                  🍽️ Take Order for Table {table.number}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showOrderModal && (
        <OrderModal
          table={table}
          existingOrder={hasActiveOrder ? order : null}
          onClose={() => setShowOrderModal(false)}
          onSuccess={() => { setShowOrderModal(false); onRefresh(); }}
        />
      )}
      {showPayModal && order && (
        <PayBillModal
          order={order}
          table={table}
          onClose={() => setShowPayModal(false)}
          onSuccess={handlePaySuccess}
        />
      )}
      {showEditModal && (
        <EditTableModal
          table={table}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => { setShowEditModal(false); onRefresh(); }}
        />
      )}
      {paySuccessOrder && (
        <PaySuccessModal
          order={paySuccessOrder}
          table={table}
          onClose={() => { setPaySuccessOrder(null); if (paySuccessOrder.paymentStatus === 'paid') onClose(); }}
        />
      )}
    </>
  );
};

// ─── Add Table Modal ──────────────────────────────────────────────────────────
const AddTableModal = ({ nextNumber, onClose, onSuccess }) => {
  const [number, setNumber] = useState(nextNumber);
  const [seats, setSeats] = useState(4);
  const [location, setLocation] = useState('indoor');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    setSaving(true);
    try {
      await tableAPI.create({ number: parseInt(number), seats: parseInt(seats), location, notes });
      toast.success(`Table ${number} added`);
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add table');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 340 }}>
        <div className="modal-header">
          <h3 className="modal-title">➕ Add New Table</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="grid-2" style={{ gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Table Number</label>
              <input type="number" className="form-control" value={number} min={1} max={200}
                onChange={e => setNumber(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Seats</label>
              <input type="number" className="form-control" value={seats} min={1} max={20}
                onChange={e => setSeats(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <select className="form-control" value={location} onChange={e => setLocation(e.target.value)}>
              {['indoor', 'outdoor', 'balcony', 'vip'].map(l => (
                <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
            <input className="form-control" placeholder="e.g. Near window" value={notes}
              onChange={e => setNotes(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
              {saving ? 'Adding...' : '➕ Add Table'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Tables Page ─────────────────────────────────────────────────────────
export const TablesPage = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchTables = useCallback(async () => {
    try {
      const { data } = await tableAPI.getAll();
      setTables(data.tables);
      if (selectedTable) {
        const fresh = data.tables.find(t => t._id === selectedTable._id);
        if (fresh) setSelectedTable(fresh);
      }
    } catch (err) {
      toast.error('Failed to load tables');
    } finally { setLoading(false); }
  }, []); // eslint-disable-line

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 20000);
    return () => clearInterval(interval);
  }, [fetchTables]);

  const locations = ['all', ...new Set(tables.map(t => t.location))];
  const statuses = ['all', 'available', 'occupied', 'reserved', 'dirty'];

  const filtered = tables.filter(t => {
    const locOk = locationFilter === 'all' || t.location === locationFilter;
    const stOk = statusFilter === 'all' || t.status === statusFilter;
    return locOk && stOk;
  });

  const counts = tables.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});
  const unpaidTotal = tables
    .filter(t => t.currentOrder && t.currentOrder.paymentStatus !== 'paid')
    .reduce((s, t) => s + (t.currentOrder?.remainingAmount ?? t.currentOrder?.total ?? 0), 0);

  const nextNumber = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1;

  if (loading) return (
    <div className="flex-center" style={{ height: 300 }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h2 className="page-title">🪑 Table Management</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>+ Add Table</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Available', count: counts.available || 0, color: 'var(--green)' },
          { label: 'Occupied', count: counts.occupied || 0, color: 'var(--amber)' },
          { label: 'Reserved', count: counts.reserved || 0, color: 'var(--blue)' },
          { label: 'Dirty', count: counts.dirty || 0, color: 'var(--red)' },
        ].map(s => (
          <div key={s.label} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20,
            fontSize: 12, fontWeight: 600,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ color: s.color }}>{s.count}</span>
            <span style={{ color: 'var(--text3)' }}>{s.label}</span>
          </div>
        ))}
        {unpaidTotal > 0 && (
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', background: 'var(--red-dim)', border: '1px solid rgba(224,92,92,0.3)',
            borderRadius: 20, fontSize: 12, fontWeight: 700, color: 'var(--red)',
          }}>
            ⚠️ Outstanding: <span style={{ fontFamily: 'DM Mono' }}>Rs. {unpaidTotal.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>STATUS</span>
          {statuses.map(s => (
            <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : STATUS_EMOJI[s] + ' ' + s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        {locations.length > 2 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>ZONE</span>
            {locations.map(l => (
              <button key={l} className={`filter-chip ${locationFilter === l ? 'active' : ''}`} onClick={() => setLocationFilter(l)}>
                {l === 'all' ? 'All' : l.charAt(0).toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="tables-grid">
        {filtered.map(table => {
          const order = table.currentOrder;
          const hasOrder = order && order.paymentStatus !== 'paid';
          const isPaid = order && order.paymentStatus === 'paid';
          const isPartial = order?.paymentStatus === 'partial';
          const remaining = order?.remainingAmount ?? (order ? order.total - (order.amountPaid || order.amountReceived || 0) : 0);

          return (
            <div
              key={table._id}
              className={`table-card status-${table.status}`}
              onClick={() => setSelectedTable(table)}
            >
              <div className="table-seats-badge">👥 {table.seats}</div>
              <div className="table-number">{table.number}</div>
              <div className="table-status-lbl" style={{ color: `var(--${STATUS_COLOR[table.status] || 'text3'})` }}>
                {STATUS_EMOJI[table.status]} {table.status.toUpperCase()}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, textTransform: 'capitalize' }}>
                {table.location}
              </div>
              {hasOrder && (
                <div style={{ marginTop: 6, borderTop: '1px solid var(--border)', paddingTop: 5 }}>
                  {order.customerName && (
                    <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      👤 {order.customerName}
                    </div>
                  )}
                  <div style={{ fontFamily: 'DM Mono', fontSize: 12, color: isPartial ? 'var(--blue)' : 'var(--amber)', fontWeight: 700 }}>
                    {isPartial ? `Rs. ${remaining.toLocaleString()} left` : `Rs. ${order.total?.toLocaleString()}`}
                  </div>
                  {isPartial && (
                    <div style={{ fontSize: 10, color: 'var(--blue)', marginTop: 1 }}>💰 Partial</div>
                  )}
                </div>
              )}
              {isPaid && (
                <div style={{ marginTop: 6, fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>✅ Paid — awaiting clear</div>
              )}
              {table.notes && (
                <div style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 12, opacity: 0.5 }} title={table.notes}>📝</div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🪑</div>
            <p>No tables match this filter</p>
          </div>
        )}
      </div>

      {selectedTable && (
        <TableDrawer
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
          onRefresh={fetchTables}
        />
      )}

      {showAddModal && (
        <AddTableModal
          nextNumber={nextNumber}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchTables(); }}
        />
      )}

      <style>{`
        .tables-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
          gap: 14px;
        }
        .table-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 16px 14px 14px;
          cursor: pointer;
          transition: var(--transition);
          position: relative;
          min-height: 130px;
        }
        .table-card:hover { transform: translateY(-3px); box-shadow: 0 6px 24px rgba(0,0,0,0.3); border-color: var(--amber); }
        .table-card.status-occupied { border-color: rgba(212,134,42,0.45); background: var(--amber-dim); }
        .table-card.status-reserved { border-color: rgba(91,155,213,0.4); background: var(--blue-dim); }
        .table-card.status-dirty { border-color: rgba(224,92,92,0.4); background: var(--red-dim); }
        .table-seats-badge { position: absolute; top: 9px; right: 10px; font-size: 10px; color: var(--text3); }
        .table-number { font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 900; line-height: 1; margin-bottom: 4px; }
        .table-status-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
        .filter-chip { padding: 5px 12px; border-radius: 20px; border: 1px solid var(--border2); background: var(--card); color: var(--text3); font-size: 11px; font-weight: 600; cursor: pointer; transition: var(--transition); font-family: 'DM Sans', sans-serif; }
        .filter-chip.active { background: var(--amber-dim); border-color: var(--amber); color: var(--amber); }
        .filter-chip:hover:not(.active) { border-color: var(--border2); color: var(--text2); }
      `}</style>
    </div>
  );
};

// ─── Shared inline styles ─────────────────────────────────────────────────────
const styles = {
  drawerBackdrop: {
    position: 'fixed', inset: 0, zIndex: 150,
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
  },
  drawer: {
    position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 200,
    width: 400, maxWidth: '95vw',
    background: 'var(--surface)',
    borderLeft: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
  },
  drawerHeader: {
    padding: '16px 16px 14px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--card2)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  qtyBtn: {
    width: 20, height: 20, borderRadius: 4, border: 'none',
    background: 'var(--border2)', color: 'var(--text)',
    fontSize: 12, cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: 'DM Sans',
  },
};

export default TablesPage;