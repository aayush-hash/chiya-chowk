import React, { useState, useEffect } from 'react';
import { tableAPI, orderAPI, menuAPI } from '../services/api';
import toast from 'react-hot-toast';

// ===== BILL PRINT UTILITY =====
const printBill = (order, table) => {
  const win = window.open('', '_blank', 'width=400,height=600');
  const items = order.items || [];
  const itemRows = items.map(item => `
    <tr>
      <td>${item.emoji || ''} ${item.name}</td>
      <td style="text-align:center">${item.qty}</td>
      <td style="text-align:right">Rs. ${item.price}</td>
      <td style="text-align:right">Rs. ${item.subtotal || item.price * item.qty}</td>
    </tr>
  `).join('');

  win.document.write(`<!DOCTYPE html>
<html><head><title>Bill - ${order.orderId}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Courier New',monospace; font-size:13px; color:#000; background:#fff; padding:16px; max-width:320px; margin:0 auto; }
  .header { text-align:center; margin-bottom:12px; border-bottom:2px dashed #000; padding-bottom:12px; }
  .header h1 { font-size:22px; font-weight:900; letter-spacing:2px; }
  .header p { font-size:11px; color:#555; margin-top:3px; }
  .info { margin-bottom:10px; font-size:12px; }
  .info-row { display:flex; justify-content:space-between; padding:2px 0; }
  table { width:100%; border-collapse:collapse; margin-bottom:10px; }
  thead tr { border-bottom:1px dashed #000; }
  th { font-size:11px; padding:4px 0; text-align:left; }
  th:last-child, th:nth-child(3), th:nth-child(2) { text-align:right; }
  td { padding:5px 0; font-size:12px; border-bottom:1px solid #eee; vertical-align:top; }
  .divider { border-top:1px dashed #000; margin:8px 0; }
  .total-row { display:flex; justify-content:space-between; padding:3px 0; font-size:13px; }
  .grand-total { font-size:16px; font-weight:900; border-top:2px solid #000; padding-top:6px; margin-top:4px; }
  .payment-badge { text-align:center; margin-top:12px; padding:6px; border:2px solid #000; font-weight:700; font-size:14px; letter-spacing:2px; }
  .footer { text-align:center; margin-top:16px; border-top:2px dashed #000; padding-top:12px; font-size:11px; color:#555; line-height:1.8; }
  @media print { body { padding:0; } }
</style></head><body>
  <div class="header"><h1>🍵 CHIYA CHOWK</h1><p>Kathmandu, Nepal</p><p>Thank you for dining with us!</p></div>
  <div class="info">
    <div class="info-row"><span>Bill No:</span><span><b>${order.orderId}</b></span></div>
    <div class="info-row"><span>Table:</span><span>Table ${order.tableNumber || table?.number || '-'}</span></div>
    ${order.customerName ? `<div class="info-row"><span>Customer:</span><span>${order.customerName}</span></div>` : ''}
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
    <div class="total-row"><span>VAT (${order.taxRate || 13}%)</span><span>Rs. ${order.taxAmount?.toLocaleString()}</span></div>
    ${order.serviceCharge > 0 ? `<div class="total-row"><span>Service Charge</span><span>Rs. ${order.serviceCharge}</span></div>` : ''}
    <div class="total-row grand-total"><span>TOTAL</span><span>Rs. ${order.total?.toLocaleString()}</span></div>
    ${order.amountReceived > 0 ? `<div class="total-row"><span>Received</span><span>Rs. ${order.amountReceived?.toLocaleString()}</span></div><div class="total-row"><span>Change</span><span>Rs. ${order.changeGiven?.toLocaleString()}</span></div>` : ''}
  </div>
  <div class="payment-badge">${order.paymentMethod === 'cash' ? '💵 CASH' : order.paymentMethod === 'qr' ? '📱 QR / eSewa' : order.paymentMethod?.toUpperCase() || 'PENDING'}</div>
  <div class="footer"><p>⭐ We hope you enjoyed your visit!</p><p>Please come again</p></div>
  <script>window.onload = () => { window.print(); }</script>
</body></html>`);
  win.document.close();
};

// ===== ADD ITEMS MODAL (mini POS for existing table) =====
const AddItemsModal = ({ table, existingOrder, onClose, onSuccess }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    menuAPI.getAll({ available: true }).then(({ data }) => {
      setMenuItems(data.items);
      setCategories(['All', ...data.categories]);
    }).catch(() => toast.error('Failed to load menu')).finally(() => setLoading(false));
  }, []);

  const filtered = menuItems.filter(item => {
    const catOk = activeCategory === 'All' || item.category === activeCategory;
    const searchOk = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return catOk && searchOk;
  });

  const addToCart = (item) => {
    setCart(prev => {
      const ex = prev.find(c => c.menuItem === item._id);
      if (ex) return prev.map(c => c.menuItem === item._id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { menuItem: item._id, name: item.name, emoji: item.emoji, price: item.price, qty: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    setCart(prev => prev.map(c => c.menuItem === id ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0));
  };

  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const handleSubmit = async () => {
  if (cart.length === 0) { toast.error('Add at least one item'); return; }
  setSubmitting(true);
  try {
    await orderAPI.addItems(existingOrder._id, {
      items: cart.map(c => ({ menuItem: c.menuItem, qty: c.qty })),
    });
    toast.success(`✅ ${cartCount} item(s) added to order`);
    onSuccess();
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to add items');
  } finally {
    setSubmitting(false);
  }
};

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, height: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">➕ Add Items — Table {table.number}</h3>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Select items to add to the existing order</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 0 }}>
          {/* Menu side */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
            {/* Search */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
              <input className="form-control" placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: 13 }} />
            </div>
            {/* Category tabs */}
            <div style={{ display: 'flex', gap: 6, padding: '8px 14px', borderBottom: '1px solid var(--border)', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                  padding: '5px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                  border: `1px solid ${activeCategory === cat ? 'var(--amber)' : 'var(--border2)'}`,
                  background: activeCategory === cat ? 'var(--amber)' : 'var(--card2)',
                  color: activeCategory === cat ? '#1a0f00' : 'var(--text3)',
                  cursor: 'pointer', fontFamily: 'DM Sans',
                }}>{cat}</button>
              ))}
            </div>
            {/* Items grid */}
            {loading ? (
              <div className="flex-center" style={{ flex: 1 }}><div className="spinner" /></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, padding: 12, overflowY: 'auto', flex: 1 }}>
                {filtered.map(item => {
                  const qty = cart.find(c => c.menuItem === item._id)?.qty || 0;
                  return (
                    <div key={item._id} onClick={() => addToCart(item)} style={{
                      background: qty > 0 ? 'var(--amber-dim)' : 'var(--card2)',
                      border: `1px solid ${qty > 0 ? 'var(--amber)' : 'var(--border)'}`,
                      borderRadius: 10, padding: 10, cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
                    }}>
                      <div style={{ fontSize: 24, marginBottom: 5 }}>{item.emoji}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{item.name}</div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--amber)' }}>Rs. {item.price}</div>
                      {qty > 0 && (
                        <div style={{ position: 'absolute', top: 6, right: 6, background: 'var(--amber)', color: '#1a0f00', borderRadius: '50%', width: 20, height: 20, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{qty}</div>
                      )}
                    </div>
                  );
                })}
                {filtered.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text3)', padding: 30, fontSize: 13 }}>No items found</div>}
              </div>
            )}
          </div>

          {/* Cart side */}
          <div style={{ width: 220, display: 'flex', flexDirection: 'column', background: 'var(--card2)' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>
              🛒 New Items ({cartCount})
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, padding: '20px 0' }}>Tap items to add</div>
              ) : cart.map(c => (
                <div key={c.menuItem} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 16 }}>{c.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--amber)', fontFamily: 'DM Mono' }}>Rs. {c.price * c.qty}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <button onClick={() => changeQty(c.menuItem, -1)} style={{ width: 18, height: 18, borderRadius: 4, border: 'none', background: 'var(--border2)', color: 'var(--text)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: 12, fontWeight: 700, minWidth: 14, textAlign: 'center' }}>{c.qty}</span>
                    <button onClick={() => changeQty(c.menuItem, 1)} style={{ width: 18, height: 18, borderRadius: 4, border: 'none', background: 'var(--border2)', color: 'var(--text)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                  <span>Subtotal</span>
                  <span style={{ fontFamily: 'DM Mono', color: 'var(--amber)' }}>Rs. {cartTotal.toLocaleString()}</span>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', fontSize: 13 }} onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <><span className="spinner" style={{ width: 13, height: 13 }} /> Adding...</> : `➕ Add ${cartCount} Item${cartCount > 1 ? 's' : ''}`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== PAY BILL MODAL =====
const PayBillModal = ({ order, table, onClose, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [paying, setPaying] = useState(false);

  const change = amountReceived ? Math.max(0, parseFloat(amountReceived) - order.total) : 0;
  const isExact = !amountReceived || parseFloat(amountReceived) >= order.total;

  const handlePay = async () => {
    if (amountReceived && parseFloat(amountReceived) < order.total) {
      toast.error('Amount received is less than total');
      return;
    }
    setPaying(true);
    try {
      const { data } = await orderAPI.markPaid(order._id, {
        paymentMethod,
        amountReceived: parseFloat(amountReceived) || order.total,
      });
      toast.success(`✅ Payment received — Rs. ${order.total.toLocaleString()}`);
      onSuccess(data.order || order);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3 className="modal-title">💳 Collect Payment</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Order summary */}
          <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Order</span>
              <span style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--amber)' }}>{order.orderId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Table</span>
              <span style={{ fontSize: 12 }}>Table {order.tableNumber || table?.number}</span>
            </div>
            {order.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
                <span>{item.emoji} {item.name} × {item.qty}</span>
                <span style={{ fontFamily: 'DM Mono', color: 'var(--text2)' }}>Rs. {(item.subtotal || item.price * item.qty).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>
                <span>Subtotal</span><span>Rs. {order.subtotal?.toLocaleString()}</span>
              </div>
              {order.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--red)', marginBottom: 3 }}>
                  <span>Discount</span><span>- Rs. {order.discount}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>
                <span>VAT ({order.taxRate || 13}%)</span><span>Rs. {order.taxAmount?.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: 'var(--amber)', marginTop: 6 }}>
                <span>TOTAL</span><span style={{ fontFamily: 'DM Mono' }}>Rs. {order.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 8 }}>Payment Method</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[{ key: 'cash', icon: '💵', label: 'Cash' }, { key: 'qr', icon: '📱', label: 'QR / eSewa' }].map(m => (
                <div key={m.key} onClick={() => setPaymentMethod(m.key)} style={{
                  padding: '14px 10px', borderRadius: 10, textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                  border: `2px solid ${paymentMethod === m.key ? 'var(--amber)' : 'var(--border2)'}`,
                  background: paymentMethod === m.key ? 'var(--amber-dim)' : 'var(--card)',
                }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{m.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: paymentMethod === m.key ? 'var(--amber)' : 'var(--text3)' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cash: amount received */}
          {paymentMethod === 'cash' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Amount Received <span style={{ fontWeight: 400 }}>(leave blank if exact)</span>
              </label>
              <input type="number" className="form-control" placeholder={`Rs. ${order.total?.toLocaleString()}`}
                value={amountReceived} onChange={e => setAmountReceived(e.target.value)} min={order.total} autoFocus />
              {amountReceived && parseFloat(amountReceived) >= order.total && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(76,175,136,0.1)', border: '1px solid rgba(76,175,136,0.3)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)' }}>Change to return</span>
                  <span style={{ fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--green)' }}>Rs. {change.toLocaleString()}</span>
                </div>
              )}
              {amountReceived && parseFloat(amountReceived) < order.total && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 8, fontSize: 12, color: 'var(--red)' }}>
                  ⚠️ Rs. {(order.total - parseFloat(amountReceived)).toLocaleString()} short
                </div>
              )}
            </div>
          )}

          {/* QR info */}
          {paymentMethod === 'qr' && (
            <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(91,155,213,0.08)', border: '1px solid rgba(91,155,213,0.25)', borderRadius: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>📱</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Scan QR / Pay via eSewa</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Amount: <b style={{ color: 'var(--amber)', fontFamily: 'DM Mono' }}>Rs. {order.total?.toLocaleString()}</b></div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>Confirm payment before clicking below</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={paying}>Cancel</button>
            <button className="btn btn-success" onClick={handlePay} disabled={paying || !isExact} style={{ opacity: !isExact ? 0.5 : 1 }}>
              {paying ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Processing...</> : `✅ Confirm Payment`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== TABLES PAGE =====
export const TablesPage = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAddItems, setShowAddItems] = useState(false);
  const [payingOrder, setPayingOrder] = useState(null);
  const [paidOrder, setPaidOrder] = useState(null);

  useEffect(() => { fetchTables(); }, []);

  const fetchTables = async () => {
    try {
      const { data } = await tableAPI.getAll();
      setTables(data.tables);
    } catch (err) {
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const setStatus = async (tableId, status) => {
    try {
      await tableAPI.setStatus(tableId, { status });
      fetchTables(); setShowModal(false);
      toast.success(`Table updated to ${status}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update table');
    }
  };

  const clearTable = async (tableId) => {
    try {
      await tableAPI.clear(tableId);
      fetchTables(); setShowModal(false);
      toast.success('Table cleared');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear table');
    }
  };

  const addTable = async () => {
    const nextNo = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1;
    try {
      await tableAPI.create({ number: nextNo, seats: 4, location: 'indoor' });
      fetchTables(); toast.success(`Table ${nextNo} added`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add table');
    }
  };

  const statusColor = { available: 'green', occupied: 'amber', reserved: 'blue', dirty: 'red' };

  if (loading) return <div className="flex-center" style={{ height: 300 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h2 className="page-title">🪑 Table Management</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            <span style={{ color: 'var(--green)' }}>● Available</span>
            <span style={{ color: 'var(--amber)' }}>● Occupied</span>
            <span style={{ color: 'var(--blue)' }}>● Reserved</span>
            <span style={{ color: 'var(--red)' }}>● Dirty</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={addTable}>+ Add Table</button>
        </div>
      </div>

      <div className="tables-grid">
        {tables.map(table => (
          <div key={table._id} className={`table-card status-${table.status}`} onClick={() => { setSelectedTable(table); setShowModal(true); }}>
            <div className="table-seats-badge">👥 {table.seats}</div>
            <div className="table-number">{table.number}</div>
            <div className="table-status-lbl" style={{ color: `var(--${statusColor[table.status] || 'text3'})` }}>
              {table.status.toUpperCase()}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              {table.currentOrder ? 'Active order' : table.location}
            </div>
            {table.currentOrder?.total && (
              <div style={{ fontFamily: 'DM Mono', fontSize: 13, color: 'var(--amber)', marginTop: 4 }}>
                Rs. {table.currentOrder.total.toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Table detail modal */}
      {showModal && selectedTable && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3 className="modal-title">Table {selectedTable.number} — {selectedTable.status.toUpperCase()}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                <button className="btn btn-success btn-sm" onClick={() => setStatus(selectedTable._id, 'available')}>✓ Available</button>
                <button className="btn btn-sm" style={{ background: 'var(--blue-dim)', border: '1px solid var(--blue)', color: 'var(--blue)' }} onClick={() => setStatus(selectedTable._id, 'reserved')}>📅 Reserve</button>
                <button className="btn btn-danger btn-sm" onClick={() => setStatus(selectedTable._id, 'dirty')}>🧹 Dirty</button>
              </div>

              {selectedTable.currentOrder ? (
                <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedTable.currentOrder.orderId}</span>
                    <span className={`badge badge-${selectedTable.currentOrder.paymentStatus}`}>{selectedTable.currentOrder.paymentStatus}</span>
                  </div>
                  {selectedTable.currentOrder.items?.slice(0, 5).map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                      <span>{item.emoji} {item.name} × {item.qty}</span>
                      <span style={{ fontFamily: 'DM Mono', color: 'var(--amber)' }}>Rs. {(item.subtotal || item.price * item.qty).toLocaleString()}</span>
                    </div>
                  ))}
                  {selectedTable.currentOrder.items?.length > 5 && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', padding: '4px 0' }}>+{selectedTable.currentOrder.items.length - 5} more items</div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontWeight: 700, fontSize: 15 }}>
                    <span>Total</span>
                    <span style={{ fontFamily: 'DM Mono', color: 'var(--amber)' }}>Rs. {selectedTable.currentOrder.total?.toLocaleString()}</span>
                  </div>

{/* Action buttons */}
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
  {selectedTable.currentOrder.paymentStatus !== 'paid' && (
    <button className="btn btn-primary btn-sm" onClick={() => { setShowModal(false); setShowAddItems(true); }}>
      ➕ Add Items
    </button>
  )}
  {selectedTable.currentOrder.paymentStatus !== 'paid' && (
    <button className="btn btn-success btn-sm" onClick={() => { setPayingOrder(selectedTable.currentOrder); setShowModal(false); setShowPayModal(true); }}>
      💳 Collect Bill
    </button>
  )}
  {selectedTable.currentOrder.paymentStatus === 'paid' && (
    <button className="btn btn-secondary btn-sm" onClick={() => printBill(selectedTable.currentOrder, selectedTable)}>
      🖨️ Print Bill
    </button>
  )}
  <button className="btn btn-danger btn-sm" onClick={() => clearTable(selectedTable._id)}>🧹 Clear</button>
</div>
                </div>
              ) : (
                <div className="empty-state"><div className="icon">🪑</div><p>No active order</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add items modal */}
      {showAddItems && selectedTable && (
        <AddItemsModal
          table={selectedTable}
          existingOrder={selectedTable.currentOrder}
          onClose={() => setShowAddItems(false)}
          onSuccess={() => { setShowAddItems(false); fetchTables(); toast.success('Items added!'); }}
        />
      )}

      {/* Pay bill modal */}
      {showPayModal && payingOrder && (
        <PayBillModal
          order={payingOrder}
          table={selectedTable}
          onClose={() => setShowPayModal(false)}
          onSuccess={(completedOrder) => { setPaidOrder(completedOrder); setShowPayModal(false); fetchTables(); }}
        />
      )}

      {/* Post-payment print prompt */}
      {paidOrder && (
        <div className="modal-backdrop" onClick={() => setPaidOrder(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, textAlign: 'center' }}>
            <div className="modal-body" style={{ padding: 32 }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Payment Received!</h3>
              <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 6 }}>{paidOrder.orderId} · Rs. {paidOrder.total?.toLocaleString()}</p>
              <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 24 }}>
                Paid via <b style={{ color: 'var(--amber)' }}>{paidOrder.paymentMethod?.toUpperCase()}</b>
                {paidOrder.changeGiven > 0 && ` · Change: Rs. ${paidOrder.changeGiven?.toLocaleString()}`}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setPaidOrder(null)}>Skip</button>
                <button className="btn btn-primary" onClick={() => { printBill(paidOrder, null); setPaidOrder(null); }}>🖨️ Print Bill</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .tables-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)); gap: 14px; }
        .table-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; cursor: pointer; transition: var(--transition); position: relative; }
        .table-card:hover { transform: translateY(-3px); box-shadow: var(--shadow); }
        .table-card.status-occupied { border-color: rgba(212,134,42,0.4); background: var(--amber-dim); }
        .table-card.status-reserved { border-color: rgba(91,155,213,0.4); background: var(--blue-dim); }
        .table-card.status-dirty { border-color: rgba(224,92,92,0.4); background: var(--red-dim); }
        .table-seats-badge { position: absolute; top: 10px; right: 10px; font-size: 10px; color: var(--text3); }
        .table-number { font-family: 'Playfair Display', serif; font-size: 34px; font-weight: 900; line-height: 1; margin-bottom: 6px; }
        .table-status-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
      `}</style>
    </div>
  );
};

// ===== ORDERS PAGE =====
export const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingOrder, setPayingOrder] = useState(null);
  const [paidOrder, setPaidOrder] = useState(null);

  useEffect(() => { fetchOrders(); }, [filter, dateFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') {
        if (['paid', 'unpaid'].includes(filter)) params.status = filter;
        else if (['cash', 'qr'].includes(filter)) params.payment = filter;
      }
      if (dateFilter) params.date = dateFilter;
      const { data } = await orderAPI.getAll(params);
      setOrders(data.orders);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filters = ['all', 'paid', 'unpaid', 'cash', 'qr'];

  return (
    <div className="animate-fadeIn">
      <div className="page-header"><h2 className="page-title">📋 All Orders</h2></div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {filters.map(f => (
          <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <input type="date" className="form-control" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ marginLeft: 'auto', width: 'auto' }} />
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {loading ? <div className="flex-center" style={{ padding: 40 }}><div className="spinner" /></div> : (
          <table className="data-table">
            <thead><tr><th>Order ID</th><th>Table</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Time</th><th>Actions</th></tr></thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text3)', padding: 30 }}>No orders found</td></tr>
              ) : orders.map(o => (
                <tr key={o._id}>
                  <td><span style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--amber)' }}>{o.orderId}</span></td>
                  <td>{o.tableNumber ? `T${o.tableNumber}` : o.orderType}</td>
                  <td>{o.items.map(i => i.emoji).join('')} <span style={{ fontSize: 11, color: 'var(--text3)' }}>{o.items.length} items</span></td>
                  <td><span style={{ fontFamily: 'DM Mono', color: 'var(--amber)', fontWeight: 600 }}>Rs. {o.total.toLocaleString()}</span></td>
                  <td><span className={`badge badge-${o.paymentMethod}`}>{o.paymentMethod?.toUpperCase()}</span></td>
                  <td><span className={`badge badge-${o.paymentStatus}`}>{o.paymentStatus?.toUpperCase()}</span></td>
                  <td style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono' }}>{new Date(o.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {o.paymentStatus === 'unpaid' && (
                        <button className="btn btn-xs btn-success" onClick={() => { setPayingOrder(o); setShowPayModal(true); }}>💳 Pay</button>
                      )}
                      <button className="btn btn-xs btn-secondary" onClick={() => printBill(o, null)}>🖨️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showPayModal && payingOrder && (
        <PayBillModal order={payingOrder} table={null} onClose={() => setShowPayModal(false)}
          onSuccess={(completedOrder) => { setPaidOrder(completedOrder); setShowPayModal(false); fetchOrders(); }} />
      )}

      {paidOrder && (
        <div className="modal-backdrop" onClick={() => setPaidOrder(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, textAlign: 'center' }}>
            <div className="modal-body" style={{ padding: 32 }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Payment Received!</h3>
              <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24 }}>
                {paidOrder.orderId} · Rs. {paidOrder.total?.toLocaleString()} via <b style={{ color: 'var(--amber)' }}>{paidOrder.paymentMethod?.toUpperCase()}</b>
                {paidOrder.changeGiven > 0 && ` · Change: Rs. ${paidOrder.changeGiven?.toLocaleString()}`}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setPaidOrder(null)}>Skip</button>
                <button className="btn btn-primary" onClick={() => { printBill(paidOrder, null); setPaidOrder(null); }}>🖨️ Print Bill</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .filter-chip { padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border2); background: var(--card); color: var(--text3); font-size: 12px; font-weight: 600; cursor: pointer; transition: var(--transition); font-family: 'DM Sans', sans-serif; }
        .filter-chip.active { background: var(--amber-dim); border-color: var(--amber); color: var(--amber); }
        .filter-chip:hover:not(.active) { border-color: var(--border2); color: var(--text2); }
      `}</style>
    </div>
  );
};