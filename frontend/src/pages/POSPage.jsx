import React, { useState, useEffect, useCallback } from 'react';
import { menuAPI, orderAPI, tableAPI } from '../services/api';
import toast from 'react-hot-toast';

const POSPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [orderType, setOrderType] = useState('dine-in');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMenu();
    fetchTables();
  }, []);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const { data } = await menuAPI.getAll({ available: true });
      setMenuItems(data.items);
      setCategories(['All', ...data.categories]);
    } catch (err) {
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      const { data } = await tableAPI.getAll({ status: 'available' });
      setTables(data.tables);
    } catch (err) {}
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCat = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const addToCart = useCallback((item) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem === item._id);
      if (existing) return prev.map(c => c.menuItem === item._id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { menuItem: item._id, name: item.name, emoji: item.emoji, price: item.price, qty: 1 }];
    });
    toast.success(`${item.emoji} Added`, { duration: 1200, position: 'bottom-right' });
  }, []);

  const changeQty = (itemId, delta) => {
    setCart(prev => {
      const updated = prev.map(c => c.menuItem === itemId ? { ...c, qty: c.qty + delta } : c);
      return updated.filter(c => c.qty > 0);
    });
  };

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discountAmt = parseInt(discount) || 0;
  const taxableAmount = Math.max(0, subtotal - discountAmt);
  const tax = Math.round(taxableAmount * 0.13);
  const grand = taxableAmount + tax;

  const placeOrder = async () => {
    if (cart.length === 0) { toast.error('Please add items first'); return; }
    if (orderType === 'dine-in' && !selectedTable) { toast.error('Please select a table for dine-in orders'); return; }
    setSubmitting(true);
    try {
      const selectedTableObj = tables.find(t => t._id === selectedTable);
      const { data } = await orderAPI.create({
        items: cart,
        tableId: selectedTable || null,
        tableNumber: selectedTableObj?.number || null,
        orderType,
        paymentMethod,
        discount: discountAmt,
        note,
      });
      toast.success(`✅ ${data.order.orderId} placed!`, { duration: 3000 });
      setCart([]);
      setDiscount('');
      setNote('');
      setSelectedTable('');
      fetchTables();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pos-page animate-fadeIn">
      <div className="pos-controls">
        <select className="form-control" value={selectedTable} onChange={e => setSelectedTable(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">Select Table</option>
          {tables.map(t => <option key={t._id} value={t._id}>Table {t.number} ({t.seats} seats)</option>)}
        </select>
        <select className="form-control" value={orderType} onChange={e => setOrderType(e.target.value)} style={{ maxWidth: 130 }}>
          <option value="dine-in">🍽️ Dine In</option>
          <option value="takeaway">🥡 Takeaway</option>
          <option value="delivery">🚀 Delivery</option>
        </select>
      </div>

      <div className="pos-layout">
        {/* MENU PANEL */}
        <div className="menu-panel">
          <div className="menu-top">
            <input type="text" className="form-control" placeholder="🔍 Search menu..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="cat-tabs">
            {categories.map(cat => (
              <button key={cat} className={`cat-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}>{cat}</button>
            ))}
          </div>
          {loading ? (
            <div className="flex-center" style={{ flex: 1, padding: 40 }}>
              <div className="spinner" style={{ width: 28, height: 28 }} />
            </div>
          ) : (
            <div className="items-grid">
              {filteredItems.map(item => (
                <div key={item._id} className="menu-card" onClick={() => addToCart(item)}>
                  <div className="item-em">{item.emoji}</div>
                  <div className="item-nm">{item.name}</div>
                  <div className="item-pr">Rs. {item.price}</div>
                  <div className="item-cat-lbl">{item.category}</div>
                  <div className="add-btn">+</div>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                  <div className="icon">🍽️</div>
                  <p>No items found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ORDER PANEL */}
        <div className="order-panel">
          <div className="order-top">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">Current Order</span>
              {selectedTable && <span style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--amber)' }}>
                Table {tables.find(t => t._id === selectedTable)?.number}
              </span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
              {cart.reduce((s, c) => s + c.qty, 0)} items · {new Date().toLocaleTimeString()}
            </div>
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 20px' }}>
                <div className="icon">🛒</div>
                <p>Tap items to add to order</p>
              </div>
            ) : cart.map(c => (
              <div key={c.menuItem} className="cart-item">
                <span style={{ fontSize: 20 }}>{c.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--amber)' }}>Rs. {(c.price * c.qty).toLocaleString()}</div>
                </div>
                <div className="qty-ctrl">
                  <button onClick={() => changeQty(c.menuItem, -1)}>−</button>
                  <span>{c.qty}</span>
                  <button onClick={() => changeQty(c.menuItem, 1)}>+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="order-footer-section">
            <div className="totals-block">
              <div className="total-row-sm"><span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span></div>
              <div className="total-row-sm"><span>Tax (13% VAT)</span><span>Rs. {tax.toLocaleString()}</span></div>
              {discountAmt > 0 && <div className="total-row-sm" style={{ color: 'var(--red)' }}><span>Discount</span><span>−Rs. {discountAmt}</span></div>}
              <div className="total-row-grand"><span>Total</span><span>Rs. {grand.toLocaleString()}</span></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <input type="number" className="form-control" placeholder="Discount Rs." value={discount} onChange={e => setDiscount(e.target.value)} min="0" />
              <input type="text" className="form-control" placeholder="Note..." value={note} onChange={e => setNote(e.target.value)} />
            </div>

            <div className="payment-methods">
              {['cash', 'qr'].map(m => (
                <div key={m} className={`pay-method ${paymentMethod === m ? 'active' : ''}`} onClick={() => setPaymentMethod(m)}>
                  <div style={{ fontSize: 20 }}>{m === 'cash' ? '💵' : '📱'}</div>
                  <div>{m === 'cash' ? 'Cash' : 'QR/eSewa'}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setCart([])}>🗑 Clear</button>
              <button className="btn btn-primary" onClick={placeOrder} disabled={submitting || cart.length === 0}>
                {submitting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Placing...</> : '✅ Place Order'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .pos-controls {
          display: flex;
          gap: 10px;
          margin-bottom: 14px;
        }
        .pos-layout {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 14px;
          height: calc(100vh - 168px);
        }
        .menu-panel {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .menu-top { padding: 12px; border-bottom: 1px solid var(--border); }
        .cat-tabs {
          display: flex;
          gap: 6px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--border);
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }
        .cat-tabs::-webkit-scrollbar { display: none; }
        .cat-btn {
          padding: 6px 13px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          transition: var(--transition);
          border: 1px solid var(--border2);
          background: var(--card2);
          color: var(--text3);
          font-family: 'DM Sans', sans-serif;
        }
        .cat-btn.active { background: var(--amber); border-color: var(--amber); color: #1a0f00; }
        .cat-btn:hover:not(.active) { border-color: var(--amber); color: var(--amber); }
        .items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
          gap: 10px;
          padding: 12px;
          overflow-y: auto;
          flex: 1;
        }
        .menu-card {
          background: var(--card2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 14px;
          cursor: pointer;
          transition: var(--transition);
          position: relative;
        }
        .menu-card:hover { border-color: var(--amber); transform: scale(1.02); box-shadow: 0 4px 16px rgba(212,134,42,0.15); }
        .menu-card:active { transform: scale(0.98); }
        .item-em { font-size: 26px; margin-bottom: 8px; }
        .item-nm { font-size: 13px; font-weight: 600; margin-bottom: 3px; color: var(--text); }
        .item-pr { font-family: 'DM Mono', monospace; font-size: 13px; color: var(--amber); font-weight: 600; }
        .item-cat-lbl { font-size: 10px; color: var(--text3); margin-top: 2px; }
        .add-btn {
          position: absolute;
          top: 8px; right: 8px;
          width: 20px; height: 20px;
          border-radius: 50%;
          background: var(--amber);
          color: #1a0f00;
          font-size: 14px;
          font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .menu-card:hover .add-btn { opacity: 1; }
        .order-panel {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .order-top {
          padding: 14px;
          border-bottom: 1px solid var(--border);
          background: var(--card2);
          flex-shrink: 0;
        }
        .cart-items {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
        }
        .cart-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          background: var(--card2);
          border: 1px solid var(--border);
          border-radius: var(--radius2);
          margin-bottom: 6px;
          animation: fadeUp 0.2s ease;
        }
        .qty-ctrl {
          display: flex;
          align-items: center;
          gap: 5px;
          background: var(--card);
          border: 1px solid var(--border2);
          border-radius: 6px;
          padding: 3px 5px;
        }
        .qty-ctrl button {
          width: 20px; height: 20px;
          border-radius: 4px;
          border: none;
          background: var(--border2);
          color: var(--text);
          font-size: 14px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: var(--transition);
        }
        .qty-ctrl button:hover { background: var(--amber); color: #1a0f00; }
        .qty-ctrl span { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 600; min-width: 16px; text-align: center; color: var(--text); }
        .order-footer-section {
          border-top: 1px solid var(--border);
          padding: 12px 14px;
          background: var(--card2);
          flex-shrink: 0;
        }
        .totals-block { margin-bottom: 12px; }
        .total-row-sm {
          display: flex;
          justify-content: space-between;
          font-size: 12.5px;
          color: var(--text3);
          padding: 3px 0;
        }
        .total-row-sm span:last-child { font-family: 'DM Mono', monospace; color: var(--text2); }
        .total-row-grand {
          display: flex;
          justify-content: space-between;
          border-top: 1px solid var(--border);
          margin-top: 7px;
          padding-top: 9px;
          font-weight: 700;
          font-size: 15px;
          color: var(--text);
        }
        .total-row-grand span:last-child { font-family: 'DM Mono', monospace; color: var(--amber); font-size: 18px; }
        .payment-methods {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 10px;
        }
        .pay-method {
          padding: 10px;
          border-radius: var(--radius2);
          border: 1px solid var(--border2);
          background: var(--card);
          cursor: pointer;
          text-align: center;
          transition: var(--transition);
          font-size: 11px;
          font-weight: 600;
          color: var(--text3);
        }
        .pay-method:hover, .pay-method.active { border-color: var(--amber); background: var(--amber-dim); color: var(--amber); }
        @media (max-width: 900px) {
          .pos-layout { grid-template-columns: 1fr; height: auto; }
        }
      `}</style>
    </div>
  );
};

export default POSPage;