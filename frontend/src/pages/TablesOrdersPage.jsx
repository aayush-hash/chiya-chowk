// TablesPage.jsx
import React, { useState, useEffect } from 'react';
import { tableAPI, orderAPI } from '../services/api';
import toast from 'react-hot-toast';

export const TablesPage = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showModal, setShowModal] = useState(false);

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
      fetchTables();
      setShowModal(false);
      toast.success(`Table updated to ${status}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update table');
    }
  };

  const clearTable = async (tableId) => {
    try {
      await tableAPI.clear(tableId);
      fetchTables();
      setShowModal(false);
      toast.success('Table cleared');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear table');
    }
  };

  const addTable = async () => {
    const nextNo = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1;
    try {
      await tableAPI.create({ number: nextNo, seats: 4, location: 'indoor' });
      fetchTables();
      toast.success(`Table ${nextNo} added`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add table');
    }
  };

  const markOrderPaid = async (orderId) => {
    try {
      await orderAPI.markPaid(orderId, { paymentMethod: 'cash' });
      fetchTables();
      setShowModal(false);
      toast.success('Order marked as paid');
    } catch (err) {
      toast.error('Failed to mark as paid');
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
            <div className={`table-status-lbl`} style={{ color: `var(--${statusColor[table.status] || 'text3'})` }}>
              {table.status.toUpperCase()}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              {table.currentOrder ? `Active order` : table.location}
            </div>
            {table.currentOrder?.total && (
              <div style={{ fontFamily: 'DM Mono', fontSize: 13, color: 'var(--amber)', marginTop: 4 }}>
                Rs. {table.currentOrder.total.toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>

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
                      <span style={{ fontFamily: 'DM Mono', color: 'var(--amber)' }}>Rs. {item.subtotal.toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontWeight: 700, fontSize: 14 }}>
                    <span>Total</span>
                    <span style={{ fontFamily: 'DM Mono', color: 'var(--amber)' }}>Rs. {selectedTable.currentOrder.total.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                    {selectedTable.currentOrder.paymentStatus === 'unpaid' && (
                      <button className="btn btn-success" onClick={() => markOrderPaid(selectedTable.currentOrder._id)}>✅ Mark Paid</button>
                    )}
                    <button className="btn btn-danger" onClick={() => clearTable(selectedTable._id)}>🧹 Clear Table</button>
                  </div>
                </div>
              ) : (
                <div className="empty-state"><div className="icon">🪑</div><p>No active order</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .tables-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)); gap: 14px; }
        .table-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 18px;
          cursor: pointer;
          transition: var(--transition);
          position: relative;
        }
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

// OrdersPage.jsx
export const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

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

  const markPaid = async (orderId) => {
    try {
      await orderAPI.markPaid(orderId, { paymentMethod: 'cash' });
      fetchOrders();
      toast.success('Marked as paid');
    } catch (err) {
      toast.error('Failed');
    }
  };

  const filters = ['all', 'paid', 'unpaid', 'cash', 'qr'];

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h2 className="page-title">📋 All Orders</h2>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {filters.map(f => (
          <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <input type="date" className="form-control" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          style={{ marginLeft: 'auto', width: 'auto' }} />
      </div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {loading ? (
          <div className="flex-center" style={{ padding: 40 }}><div className="spinner" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th><th>Table</th><th>Items</th>
                <th>Total</th><th>Payment</th><th>Status</th>
                <th>Time</th><th>Actions</th>
              </tr>
            </thead>
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
                  <td style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono' }}>
                    {new Date(o.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {o.paymentStatus === 'unpaid' && (
                        <button className="btn btn-xs btn-success" onClick={() => markPaid(o._id)}>Pay</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <style>{`
        .filter-chip {
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid var(--border2);
          background: var(--card);
          color: var(--text3);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
          font-family: 'DM Sans', sans-serif;
        }
        .filter-chip.active { background: var(--amber-dim); border-color: var(--amber); color: var(--amber); }
        .filter-chip:hover:not(.active) { border-color: var(--border2); color: var(--text2); }
      `}</style>
    </div>
  );
};