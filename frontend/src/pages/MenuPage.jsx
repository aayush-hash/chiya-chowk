import React, { useState, useEffect } from 'react';
import { menuAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const MenuPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isManager } = useAuth();
  const [form, setForm] = useState({ name: '', category: 'Tea', price: '', emoji: '🍵', description: '', costPrice: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const { data } = await menuAPI.getAll();
      setItems(data.items);
    } catch (err) {
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) { toast.error('Name and price required'); return; }
    setSubmitting(true);
    try {
      await menuAPI.create({ ...form, price: parseFloat(form.price), costPrice: parseFloat(form.costPrice) || 0 });
      toast.success(`${form.name} added to menu!`);
      setForm({ name: '', category: 'Tea', price: '', emoji: '🍵', description: '', costPrice: '' });
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleItem = async (id) => {
    try {
      const { data } = await menuAPI.toggle(id);
      toast.success(data.message);
      fetchItems();
    } catch (err) {
      toast.error('Failed to toggle');
    }
  };

  const deleteItem = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await menuAPI.delete(id);
      toast.success(`${name} deleted`);
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const cats = ['Tea', 'Coffee', 'Snacks', 'Drinks', 'Food', 'Desserts', 'Other'];
  const grouped = cats.reduce((acc, c) => {
    const g = items.filter(i => i.category === c);
    if (g.length) acc[c] = g;
    return acc;
  }, {});

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h2 className="page-title">🍽️ Menu Management</h2>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{items.length} items</span>
      </div>
      <div className="menu-mgmt-layout">
        <div>
          {loading ? (
            <div className="flex-center" style={{ height: 200 }}><div className="spinner" /></div>
          ) : Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat} className="menu-category-section">
              <div className="cat-header">
                <span className="cat-name">{cat}</span>
                <span className="cat-count">{catItems.length} items</span>
              </div>
              {catItems.map(item => (
                <div key={item._id} className={`menu-list-item ${!item.isAvailable ? 'unavailable' : ''}`}>
                  <div style={{ fontSize: 28 }}>{item.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                      Rs. {item.price} · {item.description || 'No description'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                      Sold: {item.soldCount || 0} times
                    </div>
                  </div>
                  {isManager && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className={`btn btn-xs ${item.isAvailable ? 'btn-success' : 'btn-secondary'}`} onClick={() => toggleItem(item._id)}>
                        {item.isAvailable ? '✅' : '❌'}
                      </button>
                      <button className="btn btn-xs btn-danger" onClick={() => deleteItem(item._id, item.name)}>🗑</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {isManager && (
          <div className="add-item-card card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>➕ Add New Item</h3>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label className="form-label">Item Name *</label>
                <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Masala Chiya" required />
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Price (NPR) *</label>
                  <input className="form-control" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="150" min="0" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Cost Price</label>
                  <input className="form-control" type="number" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} placeholder="80" min="0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Emoji Icon</label>
                <input className="form-control" value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} placeholder="☕" style={{ fontSize: 20 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description..." style={{ resize: 'none' }} />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
                {submitting ? 'Adding...' : '+ Add to Menu'}
              </button>
            </form>
          </div>
        )}
      </div>

      <style>{`
        .menu-mgmt-layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 16px;
          align-items: start;
        }
        .menu-category-section { margin-bottom: 20px; }
        .cat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 16px;
          background: var(--card2);
          border: 1px solid var(--border);
          border-bottom: none;
          border-radius: var(--radius) var(--radius) 0 0;
        }
        .cat-name { font-family: 'Playfair Display', serif; font-size: 15px; font-weight: 600; }
        .cat-count { font-size: 11px; color: var(--text3); }
        .menu-list-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 16px;
          background: var(--card);
          border: 1px solid var(--border);
          border-top: none;
          transition: var(--transition);
        }
        .menu-list-item:last-child { border-radius: 0 0 var(--radius) var(--radius); }
        .menu-list-item:hover { background: var(--card2); }
        .menu-list-item.unavailable { opacity: 0.55; }
        .add-item-card { position: sticky; top: calc(var(--topbar-height) + 24px); }
        @media (max-width: 900px) {
          .menu-mgmt-layout { grid-template-columns: 1fr; }
          .add-item-card { position: static; }
        }
      `}</style>
    </div>
  );
};

export default MenuPage;