import React, { useState, useEffect, useCallback } from 'react';
import { orderAPI } from '../services/api';
import PayBillModal from "../components/layout/PayBillModal";
import toast from 'react-hot-toast';

// ─── Bill print utility ───────────────────────────────────────────────────────
const printBill = (order) => {
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
    <div class="info-row"><span>Table:</span><span>Table ${order.tableNumber || '-'}</span></div>
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
    ${order.amountReceived > 0 ? `<div class="total-row"><span>Paid</span><span>Rs. ${order.amountReceived?.toLocaleString()}</span></div>` : ''}
    ${(order.remainingAmount > 0) ? `<div class="total-row" style="color:#c00;font-weight:700"><span>REMAINING</span><span>Rs. ${order.remainingAmount?.toLocaleString()}</span></div>` : ''}
    ${order.changeGiven > 0 ? `<div class="total-row"><span>Change</span><span>Rs. ${order.changeGiven?.toLocaleString()}</span></div>` : ''}
  </div>
  <div class="payment-badge">${order.paymentStatus === 'partial' ? '⏳ PARTIAL PAYMENT' : order.paymentMethod === 'cash' ? '💵 CASH' : order.paymentMethod === 'qr' ? '📱 QR / eSewa' : order.paymentMethod?.toUpperCase() || 'PENDING'}</div>
  <div class="footer"><p>⭐ We hope you enjoyed your visit!</p><p>Please come again</p></div>
  <script>window.onload = () => { window.print(); }</script>
</body></html>`);
  win.document.close();
};

// ─── Edit Order Modal (customer details + payment tab) ────────────────────────
const EditOrderModal = ({ order, onClose, onSuccess, initialTab = 'details' }) => {
  const [customerName, setCustomerName] = useState(order.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone || '');
  const [note, setNote] = useState(order.note || '');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(order.paymentMethod !== 'pending' ? order.paymentMethod : 'cash');
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);

  const remaining = order.remainingAmount ?? order.total;
  const newRemaining = amountPaid ? Math.max(0, remaining - parseFloat(amountPaid)) : remaining;
  const isOverpay = amountPaid && parseFloat(amountPaid) > remaining;

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      await orderAPI.updateCustomer(order._id, { customerName, customerPhone, note });
      toast.success('Customer details updated');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  const handlePartialPay = async () => {
    if (!amountPaid || parseFloat(amountPaid) <= 0) { toast.error('Enter a valid amount'); return; }
    setPaying(true);
    try {
      const { data } = await orderAPI.partialPay(order._id, {
        amountReceived: parseFloat(amountPaid),
        paymentMethod,
      });
      toast.success(data.message);
      onSuccess(data.order);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally { setPaying(false); }
  };

  const handleClearRemaining = async () => {
    setClearing(true);
    try {
      const { data } = await orderAPI.markPaid(order._id, {
        paymentMethod,
        amountReceived: order.total,
      });
      toast.success('✅ Remaining cleared — order fully paid!');
      onSuccess(data.order);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear');
    } finally { setClearing(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">✏️ Edit Order</h3>
            <div style={{ fontSize: 12, color: 'var(--amber)', fontFamily: 'DM Mono', marginTop: 2 }}>
              {order.orderId} · Rs. {order.total?.toLocaleString()}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
          {[{ key: 'details', label: '👤 Customer' }, { key: 'payment', label: '💳 Payment' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '10px 16px', background: 'none', border: 'none',
              borderBottom: `2px solid ${activeTab === tab.key ? 'var(--amber)' : 'transparent'}`,
              color: activeTab === tab.key ? 'var(--amber)' : 'var(--text3)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', marginBottom: -1,
            }}>{tab.label}</button>
          ))}
        </div>

        <div className="modal-body">
          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Customer Name</label>
                <input className="form-control" placeholder="Enter customer name..." value={customerName}
                  onChange={e => setCustomerName(e.target.value)} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Phone Number</label>
                <input className="form-control" placeholder="98XXXXXXXX" value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Order Note</label>
                <input className="form-control" placeholder="Special instructions..." value={note}
                  onChange={e => setNote(e.target.value)} />
              </div>
              <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                  <span>Total Bill</span>
                  <span style={{ fontFamily: 'DM Mono', color: 'var(--text)' }}>Rs. {order.total?.toLocaleString()}</span>
                </div>
                {order.amountReceived > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                    <span>Paid So Far</span>
                    <span style={{ fontFamily: 'DM Mono', color: 'var(--green)' }}>Rs. {order.amountReceived?.toLocaleString()}</span>
                  </div>
                )}
                {remaining > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                    <span style={{ color: 'var(--red)' }}>Remaining</span>
                    <span style={{ fontFamily: 'DM Mono', color: 'var(--red)' }}>Rs. {remaining?.toLocaleString()}</span>
                  </div>
                )}
                {order.paymentStatus === 'paid' && (
                  <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700, textAlign: 'center', padding: '4px 0' }}>✅ Fully Paid</div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveDetails} disabled={saving}>
                  {saving ? 'Saving...' : '💾 Save Details'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 5 }}>
                  <span>Order Total</span>
                  <span style={{ fontFamily: 'DM Mono' }}>Rs. {order.total?.toLocaleString()}</span>
                </div>
                {order.amountReceived > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 5 }}>
                    <span>Already Paid</span>
                    <span style={{ fontFamily: 'DM Mono', color: 'var(--green)' }}>Rs. {order.amountReceived?.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                  <span style={{ color: remaining > 0 ? 'var(--red)' : 'var(--green)' }}>{remaining > 0 ? 'Due' : 'Settled'}</span>
                  <span style={{ fontFamily: 'DM Mono', color: remaining > 0 ? 'var(--red)' : 'var(--green)' }}>Rs. {remaining?.toLocaleString()}</span>
                </div>
              </div>

              {remaining > 0 && order.paymentStatus !== 'paid' ? (
                <>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 8 }}>Payment Method</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[{ key: 'cash', icon: '💵', label: 'Cash' }, { key: 'qr', icon: '📱', label: 'QR / eSewa' }].map(m => (
                        <div key={m.key} onClick={() => setPaymentMethod(m.key)} style={{
                          padding: '12px 10px', borderRadius: 10, textAlign: 'center', cursor: 'pointer',
                          border: `2px solid ${paymentMethod === m.key ? 'var(--amber)' : 'var(--border2)'}`,
                          background: paymentMethod === m.key ? 'var(--amber-dim)' : 'var(--card)',
                        }}>
                          <div style={{ fontSize: 24, marginBottom: 3 }}>{m.icon}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: paymentMethod === m.key ? 'var(--amber)' : 'var(--text3)' }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      Amount to Collect <span style={{ fontWeight: 400 }}>(can be partial)</span>
                    </label>
                    <input type="number" className="form-control"
                      placeholder={`Max Rs. ${remaining?.toLocaleString()}`}
                      value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                      min={1} max={remaining} autoFocus={activeTab === 'payment'} />
                    {amountPaid && !isOverpay && parseFloat(amountPaid) > 0 && (
                      <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: 'var(--text3)' }}>Collecting now</span>
                          <span style={{ fontFamily: 'DM Mono', color: 'var(--green)', fontWeight: 700 }}>Rs. {parseFloat(amountPaid).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: 'var(--text3)' }}>{newRemaining > 0 ? 'Still remaining' : 'Fully settled ✅'}</span>
                          <span style={{ fontFamily: 'DM Mono', color: newRemaining > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>
                            {newRemaining > 0 ? `Rs. ${newRemaining.toLocaleString()}` : 'Rs. 0'}
                          </span>
                        </div>
                      </div>
                    )}
                    {isOverpay && (
                      <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 8, fontSize: 12, color: 'var(--red)' }}>
                        ⚠️ Exceeds remaining amount by Rs. {(parseFloat(amountPaid) - remaining).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button className="btn btn-success"
                      onClick={handlePartialPay}
                      disabled={paying || !amountPaid || parseFloat(amountPaid) <= 0 || isOverpay}
                      style={{ opacity: (!amountPaid || parseFloat(amountPaid) <= 0 || isOverpay) ? 0.5 : 1 }}>
                      {paying ? 'Processing...' : newRemaining > 0
                        ? `💳 Collect Rs. ${amountPaid ? parseFloat(amountPaid).toLocaleString() : '—'} (Partial)`
                        : '✅ Collect & Mark Fully Paid'}
                    </button>
                    <button className="btn btn-secondary" onClick={handleClearRemaining} disabled={clearing || paying}>
                      {clearing ? 'Clearing...' : `🧹 Clear Remaining — Mark Rs. ${remaining?.toLocaleString()} as Paid`}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>Order Fully Paid</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>via {order.paymentMethod?.toUpperCase()} · Rs. {order.total?.toLocaleString()}</div>
                </div>
              )}
              <button className="btn btn-ghost" onClick={onClose} style={{ marginTop: 4 }}>Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Success Confirmation Modal ───────────────────────────────────────────────
const PaidConfirmModal = ({ order, onClose }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, textAlign: 'center' }}>
      <div className="modal-body" style={{ padding: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Payment Received!</h3>
        {order.customerName && (
          <p style={{ color: 'var(--amber)', fontSize: 14, marginBottom: 4 }}>👤 {order.customerName}</p>
        )}
        <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 6 }}>
          {order.orderId} · Rs. {order.total?.toLocaleString()}
        </p>
        <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 24 }}>
          Paid via <b style={{ color: 'var(--amber)' }}>{order.paymentMethod?.toUpperCase()}</b>
          {order.changeGiven > 0 && ` · Change: Rs. ${order.changeGiven?.toLocaleString()}`}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => { printBill(order); onClose(); }}>🖨️ Print Bill</button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Payment status badge ─────────────────────────────────────────────────────
const PayBadge = ({ status }) => {
  const cfg = {
    paid:    { bg: 'rgba(76,175,136,0.15)',  color: 'var(--green)', label: '✅ PAID' },
    partial: { bg: 'rgba(255,165,0,0.15)',   color: '#f5a623',      label: '⏳ PARTIAL' },
    unpaid:  { bg: 'rgba(224,92,92,0.15)',   color: 'var(--red)',   label: '❌ UNPAID' },
  };
  const c = cfg[status] || cfg.unpaid;
  return (
    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: c.bg, color: c.color, letterSpacing: 0.5 }}>
      {c.label}
    </span>
  );
};

// ─── Main Orders Page ─────────────────────────────────────────────────────────
export const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [payingOrder, setPayingOrder] = useState(null);   // drives PayBillModal
  const [paidOrder, setPaidOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (filter !== 'all') {
        if (['paid', 'unpaid', 'partial'].includes(filter)) params.status = filter;
        else if (['cash', 'qr'].includes(filter)) params.payment = filter;
      }
      if (dateFilter) params.date = dateFilter;
      if (search) params.search = search;
      const { data } = await orderAPI.getAll(params);
      setOrders(data.orders);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally { setLoading(false); }
  }, [filter, dateFilter, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handlePaySuccess = (completedOrder) => {
    setPayingOrder(null);
    if (completedOrder?.paymentStatus === 'paid') setPaidOrder(completedOrder);
    fetchOrders();
  };

  const handleEditSuccess = (updatedOrder) => {
    setEditingOrder(null);
    if (updatedOrder?.paymentStatus === 'paid') setPaidOrder(updatedOrder);
    fetchOrders();
  };

  const filters = [
    { key: 'all',     label: 'All' },
    { key: 'unpaid',  label: '❌ Unpaid' },
    { key: 'partial', label: '⏳ Partial' },
    { key: 'paid',    label: '✅ Paid' },
    { key: 'cash',    label: '💵 Cash' },
    { key: 'qr',      label: '📱 QR' },
  ];

  const paid         = orders.filter(o => o.paymentStatus === 'paid');
  const unpaidOrders = orders.filter(o => o.paymentStatus === 'unpaid');
  const partialOrders= orders.filter(o => o.paymentStatus === 'partial');
  const totalRev     = paid.reduce((s, o) => s + o.total, 0);
  const totalUnpaid  = unpaidOrders.reduce((s, o) => s + (o.remainingAmount ?? o.total), 0);
  const totalPartial = partialOrders.reduce((s, o) => s + (o.remainingAmount ?? 0), 0);
  const cashRev      = paid.filter(o => o.paymentMethod === 'cash').reduce((s, o) => s + o.total, 0);
  const qrRev        = paid.filter(o => o.paymentMethod === 'qr').reduce((s, o) => s + o.total, 0);

  const exportCSV = () => {
    const headers = ['Order ID','Customer','Phone','Table','Items','Subtotal','Discount','Total','Paid','Remaining','Payment','Status','Time','Cashier'];
    const rows = orders.map(o => [
      o.orderId, o.customerName || '', o.customerPhone || '',
      o.tableNumber || o.orderType,
      o.items.map(i => `${i.name}x${i.qty}`).join(';'),
      o.subtotal, o.discount || 0, o.total,
      o.amountReceived || 0,
      o.remainingAmount ?? (o.paymentStatus === 'unpaid' ? o.total : 0),
      o.paymentMethod, o.paymentStatus,
      new Date(o.createdAt).toLocaleString(), o.cashierName,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `orders-${dateFilter || 'all'}.csv`; a.click();
    toast.success('Exported!');
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h2 className="page-title">📋 All Orders</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="date" className="form-control" value={dateFilter}
            onChange={e => setDateFilter(e.target.value)} style={{ width: 'auto' }} />
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>↓ CSV</button>
        </div>
      </div>

      <div className="stats-grid mb-16" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-label">Collected</div>
          <div className="stat-value mono" style={{ fontSize: 18 }}>Rs. {totalRev.toLocaleString()}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Cash</div>
          <div className="stat-value mono" style={{ fontSize: 18 }}>Rs. {cashRev.toLocaleString()}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">QR / eSewa</div>
          <div className="stat-value mono" style={{ fontSize: 18 }}>Rs. {qrRev.toLocaleString()}</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'rgba(255,165,0,0.3)', background: 'rgba(255,165,0,0.06)' }}>
          <div className="stat-label" style={{ color: '#f5a623' }}>Partial ({partialOrders.length})</div>
          <div className="stat-value mono" style={{ fontSize: 18, color: '#f5a623' }}>Rs. {totalPartial.toLocaleString()}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Unpaid ({unpaidOrders.length})</div>
          <div className="stat-value mono" style={{ fontSize: 18 }}>Rs. {totalUnpaid.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {filters.map(f => (
          <button key={f.key} className={`filter-chip ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', position: 'relative', minWidth: 260 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text3)', pointerEvents: 'none' }}>🔍</span>
          <input className="form-control" placeholder="Search name, phone, order ID..."
            value={searchInput} onChange={e => setSearchInput(e.target.value)}
            style={{ paddingLeft: 32, fontSize: 13 }} />
          {searchInput && (
            <button onClick={() => { setSearchInput(''); setSearch(''); }} style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16, lineHeight: 1,
            }}>✕</button>
          )}
        </div>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {loading ? (
          <div className="flex-center" style={{ padding: 40 }}><div className="spinner" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th><th>Customer</th><th>Table</th><th>Items</th>
                <th>Total</th><th>Paid</th><th>Remaining</th>
                <th>Payment</th><th>Status</th><th>Time</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                    {search ? `No results for "${search}"` : 'No orders found'}
                  </td>
                </tr>
              ) : orders.map(o => {
                const remaining = o.remainingAmount ?? (o.paymentStatus === 'unpaid' ? o.total : 0);
                const paidSoFar = o.amountReceived || 0;
                const isExpanded = expandedOrder === o._id;
                const isPartial = o.paymentStatus === 'partial';

                return (
                  <React.Fragment key={o._id}>
                    <tr
                      style={{
                        cursor: 'pointer',
                        background: isExpanded ? 'var(--amber-dim)' : isPartial ? 'rgba(255,165,0,0.04)' : undefined,
                        borderLeft: isPartial ? '3px solid #f5a623' : o.paymentStatus === 'unpaid' ? '3px solid var(--red)' : '3px solid transparent',
                      }}
                      onClick={() => setExpandedOrder(isExpanded ? null : o._id)}
                    >
                      <td><span style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--amber)' }}>{o.orderId}</span></td>
                      <td>
                        {o.customerName ? (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{o.customerName}</div>
                            {o.customerPhone && <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono' }}>{o.customerPhone}</div>}
                          </div>
                        ) : <span style={{ fontSize: 12, color: 'var(--text3)' }}>—</span>}
                      </td>
                      <td>{o.tableNumber ? `T${o.tableNumber}` : o.orderType}</td>
                      <td>
                        <span style={{ fontSize: 14 }}>{o.items.map(i => i.emoji).join('')}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>{o.items.length} items</span>
                      </td>
                      <td><span style={{ fontFamily: 'DM Mono', color: 'var(--amber)', fontWeight: 600 }}>Rs. {o.total.toLocaleString()}</span></td>
                      <td>
                        {paidSoFar > 0
                          ? <span style={{ fontFamily: 'DM Mono', color: 'var(--green)', fontSize: 12 }}>Rs. {paidSoFar.toLocaleString()}</span>
                          : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        {remaining > 0
                          ? <span style={{ fontFamily: 'DM Mono', color: isPartial ? '#f5a623' : 'var(--red)', fontWeight: 700, fontSize: 13 }}>Rs. {remaining.toLocaleString()}</span>
                          : <span style={{ color: 'var(--green)', fontSize: 12 }}>✓ Cleared</span>}
                      </td>
                      <td><span className={`badge badge-${o.paymentMethod}`}>{o.paymentMethod?.toUpperCase()}</span></td>
                      <td><PayBadge status={o.paymentStatus} /></td>
                      <td style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono' }}>
                        {new Date(o.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {(o.paymentStatus === 'unpaid' || o.paymentStatus === 'partial') && (
                            <button
                              className="btn btn-xs btn-success"
                              onClick={() => setPayingOrder(o)}
                              title="Collect payment"
                            >
                              💳 Pay
                            </button>
                          )}
                          <button className="btn btn-xs btn-secondary" onClick={() => setEditingOrder(o)} title="Edit order">✏️</button>
                          <button className="btn btn-xs btn-secondary" onClick={() => printBill(o)} title="Print bill">🖨️</button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={11} style={{ background: 'var(--card2)', padding: 0 }}>
                          <div style={{ padding: '12px 20px' }}>
                            <div style={{ display: 'flex', gap: 24, marginBottom: 10, flexWrap: 'wrap' }}>
                              <div>
                                <span style={{ fontSize: 11, color: 'var(--text3)' }}>CASHIER</span>
                                <div style={{ fontSize: 13 }}>{o.cashierName || '—'}</div>
                              </div>
                              {o.note && (
                                <div>
                                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>NOTE</span>
                                  <div style={{ fontSize: 13 }}>{o.note}</div>
                                </div>
                              )}
                              <div>
                                <span style={{ fontSize: 11, color: 'var(--text3)' }}>ORDER TYPE</span>
                                <div style={{ fontSize: 13, textTransform: 'capitalize' }}>{o.orderType}</div>
                              </div>
                              {o.discount > 0 && (
                                <div>
                                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>DISCOUNT</span>
                                  <div style={{ fontSize: 13, color: 'var(--red)' }}>Rs. {o.discount}</div>
                                </div>
                              )}
                              {o.paymentStatus === 'partial' && (
                                <div>
                                  <span style={{ fontSize: 11, color: '#f5a623' }}>PARTIAL — PAID SO FAR</span>
                                  <div style={{ fontSize: 13, color: '#f5a623', fontWeight: 700 }}>Rs. {o.amountReceived?.toLocaleString()}</div>
                                </div>
                              )}
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                  <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text3)', fontWeight: 600, fontSize: 11 }}>Item</th>
                                  <th style={{ textAlign: 'center', padding: '4px 8px', color: 'var(--text3)', fontWeight: 600, fontSize: 11 }}>Qty</th>
                                  <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--text3)', fontWeight: 600, fontSize: 11 }}>Price</th>
                                  <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--text3)', fontWeight: 600, fontSize: 11 }}>Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {o.items.map((item, i) => (
                                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '6px 8px' }}>{item.emoji} {item.name}</td>
                                    <td style={{ textAlign: 'center', padding: '6px 8px' }}>{item.qty}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'DM Mono', padding: '6px 8px' }}>Rs. {item.price}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'DM Mono', color: 'var(--amber)', padding: '6px 8px' }}>
                                      Rs. {(item.subtotal || item.price * item.qty).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td colSpan={3} style={{ textAlign: 'right', padding: '8px 8px 4px', fontWeight: 700, fontSize: 14 }}>Total</td>
                                  <td style={{ textAlign: 'right', fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--amber)', fontSize: 16, padding: '8px 8px 4px' }}>
                                    Rs. {o.total.toLocaleString()}
                                  </td>
                                </tr>
                                {o.amountReceived > 0 && (
                                  <tr>
                                    <td colSpan={3} style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--green)', fontSize: 13 }}>Paid</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'DM Mono', color: 'var(--green)', fontWeight: 700, padding: '4px 8px' }}>
                                      Rs. {o.amountReceived?.toLocaleString()}
                                    </td>
                                  </tr>
                                )}
                                {(o.remainingAmount > 0 || o.paymentStatus === 'unpaid') && (
                                  <tr>
                                    <td colSpan={3} style={{ textAlign: 'right', padding: '4px 8px', color: o.paymentStatus === 'partial' ? '#f5a623' : 'var(--red)', fontSize: 13 }}>Remaining</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'DM Mono', color: o.paymentStatus === 'partial' ? '#f5a623' : 'var(--red)', fontWeight: 700, padding: '4px 8px' }}>
                                      Rs. {(o.remainingAmount ?? o.total).toLocaleString()}
                                    </td>
                                  </tr>
                                )}
                              </tfoot>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modals ── */}
      {payingOrder && (
        <PayBillModal
          order={payingOrder}
          table={null}
          onClose={() => setPayingOrder(null)}
          onSuccess={handlePaySuccess}
        />
      )}

      {paidOrder && (
        <PaidConfirmModal
          order={paidOrder}
          onClose={() => setPaidOrder(null)}
        />
      )}

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      <style>{`
        .filter-chip { padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border2); background: var(--card); color: var(--text3); font-size: 12px; font-weight: 600; cursor: pointer; transition: var(--transition); font-family: 'DM Sans', sans-serif; }
        .filter-chip.active { background: var(--amber-dim); border-color: var(--amber); color: var(--amber); }
        .filter-chip:hover:not(.active) { border-color: var(--border2); color: var(--text2); }
        .data-table tbody tr:hover { background: var(--card2); }
        .mb-16 { margin-bottom: 16px; }
      `}</style>
    </div>
  );
};