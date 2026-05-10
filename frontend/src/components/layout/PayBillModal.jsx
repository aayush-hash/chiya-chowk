// src/components/PayBillModal.jsx
import React, { useState } from 'react';
import { orderAPI } from '../../services/api'; 
import toast from 'react-hot-toast';

const PayBillModal = ({ order, table, onClose, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [payMode, setPayMode] = useState('full');
  const [paying, setPaying] = useState(false);

  const alreadyPaid = order.amountPaid || order.amountReceived || 0;
  const remaining = order.remainingAmount ?? (order.total - alreadyPaid);
  const inputAmt = parseFloat(amountReceived) || 0;
  const change = payMode === 'full' ? Math.max(0, inputAmt - remaining) : 0;
  const short = payMode === 'full' && amountReceived && inputAmt < remaining;
  const canSubmit = !amountReceived || inputAmt > 0;

  const handlePay = async () => {
    if (!amountReceived && payMode === 'partial') { toast.error('Enter amount received'); return; }
    if (payMode === 'full' && amountReceived && inputAmt < remaining) { toast.error('Amount less than remaining total'); return; }
    setPaying(true);
    try {
      let data;
      if (payMode === 'partial' && inputAmt < remaining) {
        ({ data } = await orderAPI.partialPay(order._id, { amountReceived: inputAmt, paymentMethod }));
        toast.success(`💰 Rs. ${inputAmt.toLocaleString()} recorded. Rs. ${data.order.remainingAmount?.toLocaleString()} remaining.`);
      } else {
        ({ data } = await orderAPI.markPaid(order._id, { paymentMethod, amountReceived: inputAmt || remaining }));
        toast.success(`✅ Rs. ${remaining.toLocaleString()} collected. Order cleared!`);
      }
      onSuccess(data.order || order);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally { setPaying(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 430 }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">💳 Collect Payment</h3>
            {order.customerName && (
              <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 2 }}>
                👤 {order.customerName}{order.customerPhone ? ` · ${order.customerPhone}` : ''}
              </div>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: 'var(--text3)' }}>Order</span>
              <span style={{ fontFamily: 'DM Mono', color: 'var(--amber)' }}>{order.orderId}</span>
            </div>
            {(order.tableNumber || table?.number) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: 'var(--text3)' }}>Table</span>
                <span>Table {order.tableNumber || table?.number}</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 6 }}>
              {order.items?.slice(0, 5).map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
                  <span>{item.emoji} {item.name} × {item.qty}</span>
                  <span style={{ fontFamily: 'DM Mono', color: 'var(--text2)' }}>Rs. {(item.subtotal || item.price * item.qty).toLocaleString()}</span>
                </div>
              ))}
              {order.items?.length > 5 && (
                <div style={{ fontSize: 11, color: 'var(--text3)', padding: '3px 0' }}>+{order.items.length - 5} more items</div>
              )}
            </div>
            <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 2 }}>
                <span>Subtotal</span><span>Rs. {order.subtotal?.toLocaleString()}</span>
              </div>
              {order.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--red)', marginBottom: 2 }}>
                  <span>Discount</span><span>- Rs. {order.discount}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text3)', marginBottom: 2 }}>
                <span>Bill Total</span>
                <span style={{ fontFamily: 'DM Mono' }}>Rs. {order.total?.toLocaleString()}</span>
              </div>
              {alreadyPaid > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--green)', marginBottom: 2 }}>
                  <span>Already paid</span>
                  <span style={{ fontFamily: 'DM Mono' }}>Rs. {alreadyPaid.toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 700, color: 'var(--amber)', marginTop: 6 }}>
                <span>Remaining</span>
                <span style={{ fontFamily: 'DM Mono' }}>Rs. {remaining.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
            {[{ k: 'full', label: '✅ Pay in Full' }, { k: 'partial', label: '💰 Partial Payment' }].map(m => (
              <button key={m.k} onClick={() => setPayMode(m.k)} style={{
                padding: '9px 6px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                border: `2px solid ${payMode === m.k ? 'var(--amber)' : 'var(--border2)'}`,
                background: payMode === m.k ? 'var(--amber-dim)' : 'var(--card)',
                color: payMode === m.k ? 'var(--amber)' : 'var(--text3)',
                fontFamily: 'DM Sans',
              }}>{m.label}</button>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Payment Method</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[{ key: 'cash', icon: '💵', label: 'Cash' }, { key: 'qr', icon: '📱', label: 'QR / eSewa' }].map(m => (
                <div key={m.key} onClick={() => setPaymentMethod(m.key)} style={{
                  padding: '10px 8px', borderRadius: 10, textAlign: 'center', cursor: 'pointer',
                  border: `2px solid ${paymentMethod === m.key ? 'var(--amber)' : 'var(--border2)'}`,
                  background: paymentMethod === m.key ? 'var(--amber-dim)' : 'var(--card)',
                }}>
                  <div style={{ fontSize: 24, marginBottom: 3 }}>{m.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: paymentMethod === m.key ? 'var(--amber)' : 'var(--text3)' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              {payMode === 'partial' ? 'Amount Paying Now' : 'Amount Received'}{' '}
              <span style={{ fontWeight: 400 }}>{payMode === 'full' ? '(leave blank if exact)' : ''}</span>
            </label>
            <input type="number" className="form-control"
              placeholder={payMode === 'partial' ? 'e.g. 150' : `Rs. ${remaining.toLocaleString()}`}
              value={amountReceived} onChange={e => setAmountReceived(e.target.value)}
              min="1" autoFocus />
            {amountReceived && payMode === 'full' && !short && (
              <div style={{ marginTop: 7, padding: '7px 11px', background: 'rgba(76,175,136,0.1)', border: '1px solid rgba(76,175,136,0.3)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text3)' }}>Change to return</span>
                <span style={{ fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--green)' }}>Rs. {change.toLocaleString()}</span>
              </div>
            )}
            {short && (
              <div style={{ marginTop: 7, padding: '7px 11px', background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 8, fontSize: 12, color: 'var(--red)' }}>
                ⚠️ Rs. {(remaining - inputAmt).toLocaleString()} short — use Partial Payment instead
              </div>
            )}
            {amountReceived && payMode === 'partial' && inputAmt > 0 && inputAmt < remaining && (
              <div style={{ marginTop: 7, padding: '7px 11px', background: 'rgba(91,155,213,0.1)', border: '1px solid rgba(91,155,213,0.3)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text3)' }}>Still remaining after this</span>
                <span style={{ fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--blue)' }}>Rs. {(remaining - inputAmt).toLocaleString()}</span>
              </div>
            )}
            {amountReceived && payMode === 'partial' && inputAmt >= remaining && (
              <div style={{ marginTop: 7, padding: '7px 11px', background: 'rgba(76,175,136,0.1)', border: '1px solid rgba(76,175,136,0.3)', borderRadius: 8, fontSize: 12, color: 'var(--green)' }}>
                ✅ This covers the full remaining amount — order will be marked paid
              </div>
            )}
          </div>

          {paymentMethod === 'qr' && (
            <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(91,155,213,0.08)', border: '1px solid rgba(91,155,213,0.25)', borderRadius: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 30, marginBottom: 4 }}>📱</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Scan QR / Pay via eSewa</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                Amount: <b style={{ color: 'var(--amber)', fontFamily: 'DM Mono' }}>Rs. {(inputAmt || remaining).toLocaleString()}</b>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Confirm transfer before clicking below</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={paying}>Cancel</button>
            <button className="btn btn-success" onClick={handlePay}
              disabled={paying || !canSubmit || (payMode === 'full' && short)}>
              {paying
                ? <><span className="spinner" style={{ width: 13, height: 13 }} /> Processing...</>
                : payMode === 'partial' && inputAmt < remaining
                  ? `💰 Record Rs. ${inputAmt.toLocaleString()}`
                  : '✅ Confirm Payment'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayBillModal;