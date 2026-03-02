import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Inline API calls (works with existing axios setup in api.js)
const token = () => localStorage.getItem('token');
const authHeaders = () => ({ headers: { Authorization: `Bearer ${token()}` } });

const invAPI = {
  getAll: (params) => axios.get('/api/inventory', { params, ...authHeaders() }),
  getTodayUsage: () => axios.get('/api/inventory/stats/today', authHeaders()),
  getReport: (p) => axios.get('/api/inventory/stats/report', { params: p, ...authHeaders() }),
  getById: (id) => axios.get(`/api/inventory/${id}`, authHeaders()),
  create: (d) => axios.post('/api/inventory', d, authHeaders()),
  update: (id, d) => axios.put(`/api/inventory/${id}`, d, authHeaders()),
  restock: (id, d) => axios.post(`/api/inventory/${id}/restock`, d, authHeaders()),
  adjust: (id, d) => axios.patch(`/api/inventory/${id}/adjust`, d, authHeaders()),
  delete: (id) => axios.delete(`/api/inventory/${id}`, authHeaders()),
  getMenuItems: () => axios.get('/api/inventory/menu-items', authHeaders()),
};

// ===== SUB-COMPONENTS =====

const StockBadge = ({ status, stock, unit }) => {
  const styles = {
    out: { bg: 'rgba(224,92,92,0.15)', border: 'rgba(224,92,92,0.4)', color: '#e05c5c', label: '⛔ Out of Stock' },
    low: { bg: 'rgba(212,134,42,0.15)', border: 'rgba(212,134,42,0.4)', color: '#d4862a', label: '⚠️ Low Stock' },
    ok: { bg: 'rgba(76,175,136,0.15)', border: 'rgba(76,175,136,0.35)', color: '#4caf88', label: '✅ In Stock' },
  };
  const s = styles[status] || styles.ok;
  return (
    <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
};

const RestockModal = ({ item, onClose, onSuccess }) => {
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState(item.costPerUnit || '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!qty || parseFloat(qty) <= 0) { toast.error('Enter valid quantity'); return; }
    setLoading(true);
    try {
      await invAPI.restock(item._id, { quantity: parseFloat(qty), costPerUnit: parseFloat(cost) || undefined, note });
      toast.success(`✅ Added ${qty} ${item.unit} to ${item.name}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Restock failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">📦 Restock — {item.name}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--text3)' }}>Current Stock</span>
            <span style={{ fontFamily: 'DM Mono', color: item.currentStock <= item.lowStockThreshold ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>
              {item.currentStock} {item.unit}
            </span>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Add Quantity ({item.unit}) *</label>
              <input type="number" className="form-control" value={qty} onChange={e => setQty(e.target.value)} placeholder={`e.g. 10 ${item.unit}`} min="0.001" step="0.001" required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Cost per {item.unit} (Rs.)</label>
              <input type="number" className="form-control" value={cost} onChange={e => setCost(e.target.value)} placeholder={item.costPerUnit || '0'} min="0" step="0.01" />
            </div>
            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input type="text" className="form-control" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Morning delivery" />
            </div>
            {qty && (
              <div style={{ background: 'var(--amber-dim)', border: '1px solid var(--amber-glow)', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text3)' }}>After restock:</span>
                  <span style={{ fontFamily: 'DM Mono', color: 'var(--amber)', fontWeight: 700 }}>{(parseFloat(item.currentStock) + parseFloat(qty || 0)).toFixed(3)} {item.unit}</span>
                </div>
                {cost && <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text3)' }}>Total cost:</span>
                  <span style={{ fontFamily: 'DM Mono', color: 'var(--text2)' }}>Rs. {(parseFloat(qty) * parseFloat(cost)).toFixed(2)}</span>
                </div>}
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Adding...' : '+ Add Stock'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const AddItemModal = ({ onClose, onSuccess, menuItems }) => {
  const UNITS = ['kg', 'g', 'liters', 'ml', 'pieces', 'packets', 'boxes', 'bottles'];
  const CATS = ['Dairy', 'Tea & Coffee', 'Spices', 'Flour & Grains', 'Vegetables', 'Beverages', 'Packaging', 'Other'];
  const [form, setForm] = useState({ name: '', category: 'Other', unit: 'kg', currentStock: '', lowStockThreshold: '', costPerUnit: '', supplier: '', notes: '' });
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);

  const addLink = () => setLinks(prev => [...prev, { menuItem: '', quantityPerServing: '' }]);
  const removeLink = (i) => setLinks(prev => prev.filter((_, idx) => idx !== i));
  const updateLink = (i, field, val) => setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const validLinks = links.filter(l => l.menuItem && l.quantityPerServing > 0);
      await invAPI.create({ ...form, currentStock: parseFloat(form.currentStock) || 0, lowStockThreshold: parseFloat(form.lowStockThreshold) || 10, costPerUnit: parseFloat(form.costPerUnit) || 0, usedInMenuItems: validLinks });
      toast.success(`${form.name} added to inventory!`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add item');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">➕ Add Inventory Item</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Ingredient Name *</label>
                <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Milk, Tea Leaves" required />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Unit *</label>
                <select className="form-control" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Opening Stock</label>
                <input type="number" className="form-control" value={form.currentStock} onChange={e => setForm(f => ({ ...f, currentStock: e.target.value }))} placeholder="0" min="0" step="0.001" />
              </div>
              <div className="form-group">
                <label className="form-label">Low Stock Alert At</label>
                <input type="number" className="form-control" value={form.lowStockThreshold} onChange={e => setForm(f => ({ ...f, lowStockThreshold: e.target.value }))} placeholder="10" min="0" step="0.001" />
              </div>
              <div className="form-group">
                <label className="form-label">Cost per Unit (Rs.)</label>
                <input type="number" className="form-control" value={form.costPerUnit} onChange={e => setForm(f => ({ ...f, costPerUnit: e.target.value }))} placeholder="0" min="0" step="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">Supplier</label>
                <input className="form-control" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name" />
              </div>
            </div>

            {/* Menu item links */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>🔗 Link to Menu Items (for auto stock deduction)</label>
                <button type="button" className="btn btn-xs btn-secondary" onClick={addLink}>+ Add Link</button>
              </div>
              {links.map((link, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                  <select className="form-control" value={link.menuItem} onChange={e => updateLink(i, 'menuItem', e.target.value)}>
                    <option value="">Select menu item</option>
                    {menuItems.map(m => <option key={m._id} value={m._id}>{m.emoji} {m.name}</option>)}
                  </select>
                  <input type="number" className="form-control" value={link.quantityPerServing} onChange={e => updateLink(i, 'quantityPerServing', e.target.value)} placeholder={`Qty/${form.unit}`} min="0" step="0.001" style={{ width: 100 }} />
                  <button type="button" className="btn btn-xs btn-danger" onClick={() => removeLink(i)}>✕</button>
                </div>
              ))}
              {links.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>No links added. Stock won't auto-deduct on orders.</div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Adding...' : '+ Add Item'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const DetailModal = ({ item: initItem, onClose, onSuccess, menuItems }) => {
  const [item, setItem] = useState(initItem);
  const [tab, setTab] = useState('overview');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const handleAdjust = async () => {
    if (adjustQty === '' || parseFloat(adjustQty) < 0) { toast.error('Enter valid quantity'); return; }
    setAdjusting(true);
    try {
      const { data } = await invAPI.adjust(item._id, { newStock: parseFloat(adjustQty), reason: adjustReason });
      toast.success('Stock adjusted');
      setItem(prev => ({ ...prev, currentStock: parseFloat(adjustQty) }));
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Adjustment failed');
    } finally { setAdjusting(false); }
  };

  const stockPct = Math.min(100, Math.round((item.currentStock / Math.max(item.lowStockThreshold * 3, item.currentStock + 1)) * 100));
  const barColor = item.currentStock <= 0 ? 'var(--red)' : item.currentStock <= item.lowStockThreshold ? 'var(--amber)' : 'var(--green)';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{item.name}</h3>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{item.category} · {item.unit}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '0 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4 }}>
          {['overview', 'history', 'links'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 14px', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--amber)' : '2px solid transparent', color: tab === t ? 'var(--amber)' : 'var(--text3)', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, textTransform: 'capitalize', marginBottom: -1 }}>
              {t}
            </button>
          ))}
        </div>
        <div className="modal-body">
          {tab === 'overview' && (
            <>
              {/* Stock gauge */}
              <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>Current Stock</span>
                  <StockBadge status={item.currentStock <= 0 ? 'out' : item.currentStock <= item.lowStockThreshold ? 'low' : 'ok'} />
                </div>
                <div style={{ fontFamily: 'DM Mono', fontSize: 32, fontWeight: 700, color: barColor, marginBottom: 8 }}>
                  {item.currentStock} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text3)' }}>{item.unit}</span>
                </div>
                <div style={{ height: 8, background: 'var(--border2)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${stockPct}%`, background: barColor, borderRadius: 4, transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Low stock alert at {item.lowStockThreshold} {item.unit}</div>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Used Today', val: `${item.totalUsedToday || 0} ${item.unit}`, color: 'var(--red)' },
                  { label: 'Used This Month', val: `${item.totalUsedThisMonth || 0} ${item.unit}`, color: 'var(--amber)' },
                  { label: 'Stock Value', val: `Rs. ${(item.currentStock * item.costPerUnit).toFixed(0)}`, color: 'var(--green)' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{s.label}</div>
                    <div style={{ fontFamily: 'DM Mono', fontWeight: 700, color: s.color, fontSize: 14 }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {item.supplier && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>Supplier: <span style={{ color: 'var(--text2)' }}>{item.supplier}</span></div>}
              {item.notes && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>Notes: <span style={{ color: 'var(--text2)' }}>{item.notes}</span></div>}

              {/* Manual adjust */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text2)' }}>🔧 Manual Stock Correction</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
                  <input type="number" className="form-control" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder={`Set to (${item.unit})`} min="0" step="0.001" />
                  <input type="text" className="form-control" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Reason (optional)" />
                  <button className="btn btn-secondary" onClick={handleAdjust} disabled={adjusting}>{adjusting ? '...' : 'Set'}</button>
                </div>
              </div>
            </>
          )}

          {tab === 'history' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>📥 Restock History</div>
              {(item.restockHistory || []).length === 0 ? (
                <div className="empty-state"><p>No restock history</p></div>
              ) : [...(item.restockHistory || [])].reverse().slice(0, 15).map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ fontSize: 18 }}>📦</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text)', fontWeight: 600 }}>+{r.quantity} {item.unit}</div>
                    <div style={{ color: 'var(--text3)' }}>{r.addedByName} · {r.note || 'No note'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'DM Mono', color: 'var(--green)', fontSize: 12 }}>Rs. {(r.totalCost || 0).toFixed(0)}</div>
                    <div style={{ color: 'var(--text3)', fontSize: 10 }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</div>
                  </div>
                </div>
              ))}

              <div style={{ fontSize: 13, fontWeight: 600, margin: '16px 0 10px' }}>📤 Recent Usage</div>
              {(item.usageLog || []).length === 0 ? (
                <div className="empty-state"><p>No usage recorded yet</p></div>
              ) : [...(item.usageLog || [])].reverse().slice(0, 10).map((u, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ fontSize: 16 }}>📉</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text)' }}>−{u.quantity} {item.unit}</div>
                    <div style={{ color: 'var(--text3)' }}>{u.menuItemName || 'Manual'}</div>
                  </div>
                  <div style={{ color: 'var(--text3)', fontSize: 10 }}>{u.date ? new Date(u.date).toLocaleTimeString() : ''}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'links' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>🔗 Linked Menu Items</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
                Stock is automatically deducted from this ingredient when these menu items are ordered.
              </div>
              {(item.usedInMenuItems || []).length === 0 ? (
                <div className="empty-state"><div className="icon" style={{ fontSize: 32 }}>🔗</div><p>No menu items linked</p><p style={{ fontSize: 11, marginTop: 4 }}>Edit this item to add links</p></div>
              ) : (item.usedInMenuItems || []).map((link, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{link.menuItemName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Per serving used</div>
                  </div>
                  <div style={{ fontFamily: 'DM Mono', color: 'var(--amber)', fontWeight: 700 }}>
                    {link.quantityPerServing} {item.unit}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== MAIN PAGE =====
const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('stock'); // stock | today | report
  const [showAdd, setShowAdd] = useState(false);
  const [restockItem, setRestockItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [reportDates, setReportDates] = useState({
    start: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    fetchAll();
    invAPI.getMenuItems().then(r => setMenuItems(r.data.items || [])).catch(() => {});
  }, []);

  useEffect(() => { fetchAll(); }, [filter, search]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      const [invRes, todayRes] = await Promise.all([invAPI.getAll(params), invAPI.getTodayUsage()]);
      setItems(invRes.data.items || []);
      setSummary(invRes.data.summary || {});
      setTodayData(todayRes.data);
    } catch (err) {
      toast.error('Failed to load inventory');
    } finally { setLoading(false); }
  }, [filter, search]);

  const fetchReport = async () => {
    try {
      const { data } = await invAPI.getReport({ startDate: reportDates.start, endDate: reportDates.end });
      setReportData(data);
    } catch (err) {
      toast.error('Failed to load report');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}" from inventory?`)) return;
    try {
      await invAPI.delete(id);
      toast.success(`${name} removed`);
      fetchAll();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const stockColor = (item) => {
    if (item.currentStock <= 0) return 'var(--red)';
    if (item.currentStock <= item.lowStockThreshold) return 'var(--amber)';
    return 'var(--green)';
  };

  const stockStatusLabel = (item) => {
    if (item.currentStock <= 0) return 'out';
    if (item.currentStock <= item.lowStockThreshold) return 'low';
    return 'ok';
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header">
        <h2 className="page-title">📦 Inventory Management</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchAll}>↻ Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Item</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Items', val: summary.total || 0, icon: '📦', color: '' },
          { label: 'Healthy Stock', val: summary.healthy || 0, icon: '✅', color: 'green' },
          { label: 'Low Stock', val: summary.lowStock || 0, icon: '⚠️', color: 'red' },
          { label: 'Out of Stock', val: summary.outOfStock || 0, icon: '⛔', color: 'red' },
          { label: 'Inventory Value', val: `Rs. ${parseFloat(summary.totalValue || 0).toLocaleString()}`, icon: '💰', color: 'purple' },
        ].map(c => (
          <div key={c.label} className={`stat-card ${c.color}`}>
            <div className="stat-icon">{c.icon}</div>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value" style={{ fontSize: 26 }}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* Low stock / out of stock alert banner */}
      {(summary.lowStock > 0 || summary.outOfStock > 0) && (
        <div style={{ background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--red)' }}>Stock Alert</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              {summary.outOfStock > 0 && <span style={{ color: 'var(--red)' }}>{summary.outOfStock} items out of stock · </span>}
              {summary.lowStock > 0 && <span style={{ color: 'var(--amber)' }}>{summary.lowStock} items running low</span>}
            </div>
          </div>
          <button className="btn btn-xs btn-danger" onClick={() => setFilter('out')}>View Out of Stock</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--card2)', borderRadius: 10, padding: 4, width: 'fit-content', border: '1px solid var(--border)' }}>
        {[{ key: 'stock', label: '📋 Stock List' }, { key: 'today', label: '📅 Today\'s Usage' }, { key: 'report', label: '📊 Report' }].map(t => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); if (t.key === 'report') fetchReport(); }} style={{ padding: '8px 16px', borderRadius: 7, border: 'none', background: activeTab === t.key ? 'var(--amber)' : 'transparent', color: activeTab === t.key ? '#1a0f00' : 'var(--text3)', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== STOCK LIST TAB ===== */}
      {activeTab === 'stock' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="text" className="form-control" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search ingredients..." style={{ maxWidth: 220 }} />
            {['all', 'ok', 'low', 'out'].map(f => (
              <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'ok' ? '✅ Healthy' : f === 'low' ? '⚠️ Low' : '⛔ Out'}
              </button>
            ))}
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {loading ? (
              <div className="flex-center" style={{ padding: 50 }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>
            ) : items.length === 0 ? (
              <div className="empty-state" style={{ padding: 50 }}>
                <div className="icon">📦</div>
                <h3>No inventory items found</h3>
                <p>Add your first ingredient to get started</p>
                <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setShowAdd(true)}>+ Add Item</button>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ingredient</th><th>Category</th><th>Current Stock</th>
                    <th>Used Today</th><th>Low Alert</th><th>Status</th>
                    <th>Stock Value</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const status = stockStatusLabel(item);
                    const today = new Date().toISOString().slice(0, 10);
                    const usedToday = item.usageResetDate === today ? item.totalUsedToday : 0;
                    return (
                      <tr key={item._id} style={{ cursor: 'pointer' }}>
                        <td onClick={() => setDetailItem(item)}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                          {item.supplier && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.supplier}</div>}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text3)' }}>{item.category}</td>
                        <td>
                          <span style={{ fontFamily: 'DM Mono', fontWeight: 700, color: stockColor(item), fontSize: 14 }}>
                            {item.currentStock}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>{item.unit}</span>
                          {/* Mini progress bar */}
                          <div style={{ height: 3, background: 'var(--border2)', borderRadius: 2, marginTop: 4, width: 80 }}>
                            <div style={{ height: '100%', width: `${Math.min(100, (item.currentStock / Math.max(item.lowStockThreshold * 3, 1)) * 100)}%`, background: stockColor(item), borderRadius: 2 }} />
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'DM Mono', fontSize: 13, color: usedToday > 0 ? 'var(--red)' : 'var(--text3)' }}>
                            {usedToday > 0 ? `−${usedToday}` : '0'} {item.unit}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--text3)' }}>{item.lowStockThreshold} {item.unit}</td>
                        <td><StockBadge status={status} /></td>
                        <td style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--text2)' }}>
                          Rs. {(item.currentStock * item.costPerUnit).toFixed(0)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button className="btn btn-xs btn-success" onClick={() => setRestockItem(item)} title="Restock">📦 Restock</button>
                            <button className="btn btn-xs btn-secondary" onClick={() => setDetailItem(item)} title="Details">👁</button>
                            <button className="btn btn-xs btn-danger" onClick={() => handleDelete(item._id, item.name)} title="Delete">🗑</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ===== TODAY'S USAGE TAB ===== */}
      {activeTab === 'today' && todayData && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: "Today's Date", val: todayData.date, icon: '📅' },
              { label: 'Low Stock Items', val: todayData.summary?.lowStockCount || 0, icon: '⚠️', color: 'red' },
              { label: 'Out of Stock', val: todayData.summary?.outOfStockCount || 0, icon: '⛔', color: 'red' },
              { label: 'Cost Consumed Today', val: `Rs. ${parseFloat(todayData.summary?.totalValueConsumedToday || 0).toFixed(0)}`, icon: '💸', color: 'purple' },
            ].map(c => (
              <div key={c.label} className={`stat-card ${c.color || ''}`}>
                <div className="stat-icon">{c.icon}</div>
                <div className="stat-label">{c.label}</div>
                <div className="stat-value" style={{ fontSize: 22, fontFamily: 'DM Mono' }}>{c.val}</div>
              </div>
            ))}
          </div>

          {/* Alerts */}
          {(todayData.outOfStockItems?.length > 0 || todayData.lowStockItems?.length > 0) && (
            <div style={{ marginBottom: 16 }}>
              {todayData.outOfStockItems?.length > 0 && (
                <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>⛔ Out of Stock — Order Immediately</div>
                  {todayData.outOfStockItems.map(i => (
                    <div key={i._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid rgba(224,92,92,0.15)' }}>
                      <span>{i.name}</span>
                      <span style={{ fontFamily: 'DM Mono', color: 'var(--red)' }}>0 {i.unit}</span>
                    </div>
                  ))}
                </div>
              )}
              {todayData.lowStockItems?.length > 0 && (
                <div style={{ background: 'var(--amber-dim)', border: '1px solid var(--amber-glow)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 700, color: 'var(--amber)', fontSize: 13, marginBottom: 8 }}>⚠️ Low Stock — Reorder Soon</div>
                  {todayData.lowStockItems.map(i => (
                    <div key={i._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--amber-glow)' }}>
                      <span>{i.name}</span>
                      <span style={{ fontFamily: 'DM Mono', color: 'var(--amber)' }}>{i.currentStock} / {i.lowStockThreshold} {i.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Today usage table */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ingredient</th><th>Category</th><th>Opening Stock</th>
                  <th>Used Today</th><th>Remaining</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(todayData.usage || []).map(item => (
                  <tr key={item._id}>
                    <td><span style={{ fontWeight: 600 }}>{item.name}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{item.category}</td>
                    <td style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--text3)' }}>
                      {(item.currentStock + item.usedToday).toFixed(3)} {item.unit}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'DM Mono', color: item.usedToday > 0 ? 'var(--red)' : 'var(--text3)', fontWeight: item.usedToday > 0 ? 700 : 400 }}>
                        {item.usedToday > 0 ? `−${item.usedToday}` : '—'} {item.usedToday > 0 ? item.unit : ''}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'DM Mono', fontWeight: 700, color: item.currentStock <= 0 ? 'var(--red)' : item.currentStock <= item.lowStockThreshold ? 'var(--amber)' : 'var(--green)' }}>
                        {item.currentStock} {item.unit}
                      </span>
                    </td>
                    <td><StockBadge status={item.stockStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ===== REPORT TAB ===== */}
      {activeTab === 'report' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <input type="date" className="form-control" value={reportDates.start} onChange={e => setReportDates(d => ({ ...d, start: e.target.value }))} style={{ width: 'auto' }} />
            <span style={{ color: 'var(--text3)', fontSize: 12 }}>to</span>
            <input type="date" className="form-control" value={reportDates.end} onChange={e => setReportDates(d => ({ ...d, end: e.target.value }))} style={{ width: 'auto' }} />
            <button className="btn btn-primary btn-sm" onClick={fetchReport}>Generate</button>
          </div>

          {reportData && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                <div className="stat-card"><div className="stat-label">Total Items Tracked</div><div className="stat-value">{reportData.report?.length || 0}</div></div>
                <div className="stat-card red"><div className="stat-label">Cost of Goods Consumed</div><div className="stat-value mono" style={{ fontSize: 20 }}>Rs. {parseFloat(reportData.summary?.totalCostConsumed || 0).toLocaleString()}</div></div>
                <div className="stat-card green"><div className="stat-label">Most Used Item</div><div className="stat-value" style={{ fontSize: 18 }}>{reportData.summary?.mostUsed || 'N/A'}</div></div>
              </div>

              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Ingredient</th><th>Category</th><th>Total Used</th><th>Total Restocked</th><th>Cost Consumed</th><th>Remaining</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {(reportData.report || []).map(item => (
                      <tr key={item._id}>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td style={{ fontSize: 12, color: 'var(--text3)' }}>{item.category}</td>
                        <td style={{ fontFamily: 'DM Mono', color: 'var(--red)' }}>{item.totalUsed} {item.unit}</td>
                        <td style={{ fontFamily: 'DM Mono', color: 'var(--green)' }}>{item.totalRestocked} {item.unit}</td>
                        <td style={{ fontFamily: 'DM Mono', color: 'var(--amber)' }}>Rs. {parseFloat(item.costConsumed).toLocaleString()}</td>
                        <td style={{ fontFamily: 'DM Mono', fontWeight: 700, color: item.currentStock <= 0 ? 'var(--red)' : item.currentStock <= item.lowStockThreshold ? 'var(--amber)' : 'var(--green)' }}>{item.currentStock} {item.unit}</td>
                        <td><StockBadge status={item.stockStatus} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* Modals */}
      {showAdd && <AddItemModal onClose={() => setShowAdd(false)} onSuccess={fetchAll} menuItems={menuItems} />}
      {restockItem && <RestockModal item={restockItem} onClose={() => setRestockItem(null)} onSuccess={fetchAll} />}
      {detailItem && <DetailModal item={detailItem} onClose={() => setDetailItem(null)} onSuccess={fetchAll} menuItems={menuItems} />}

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
        .filter-chip:hover:not(.active) { color: var(--text2); }
      `}</style>
    </div>
  );
};

export default InventoryPage;