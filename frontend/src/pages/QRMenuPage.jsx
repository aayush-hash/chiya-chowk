/**
 * QRMenuPage.jsx — Customer QR ordering experience for Chiya Chowk
 *
 * FULL FLOW MODEL
 * ───────────────
 * Table FREE
 *   loading → info (enter name) → menu → place order → tracking
 *
 * Table OCCUPIED (unpaid order exists)
 *   loading → existing → track  OR  → menu (add items to same order)
 *
 * Tracker: order still cooking
 *   tracking → menu (Add More)    → cart submits via add-items API
 *
 * Tracker: order done / cancelled
 *   tracking → menu (New Order)   → cart submits via new-order API
 *              name is remembered, activeOrder is cleared
 *
 * TABLE AVAILABILITY
 * ──────────────────
 * The server checks paymentStatus:'unpaid' + orderStatus not in [completed,cancelled].
 * When staff marks bill paid → table is freed → next scan sees no existingOrder.
 * sessionStorage is cleared on every free-table scan so the next customer
 * always starts fresh with the name entry screen.
 */

import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 15000 });

// ─── sessionStorage helpers ───────────────────────────────────────────────────
const SK = 'chiya_session';
const saveSession  = (name, phone) => { try { sessionStorage.setItem(SK, JSON.stringify({ name, phone })); } catch {} };
const clearSession = ()            => { try { sessionStorage.removeItem(SK); } catch {} };

// ─── Global CSS ───────────────────────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('qr-styles')) {
  const s = document.createElement('style');
  s.id = 'qr-styles';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800&family=DM+Mono:wght@500;700&family=Lora:ital,wght@0,600;1,400&display=swap');
    @keyframes spin    { to { transform:rotate(360deg); } }
    @keyframes slideUp { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:none; } }
    @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
    @keyframes floatIn { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
    @keyframes glow    { 0%,100% { box-shadow:0 0 0 0 rgba(212,134,42,0); } 50% { box-shadow:0 0 0 7px rgba(212,134,42,0.22); } }
    * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; margin:0; padding:0; }
    html, body { background:#0a0804; }
    input, textarea { -webkit-appearance:none; }
    input:focus, textarea:focus { outline:none !important; border-color:#d4862a !important; box-shadow:0 0 0 3px rgba(212,134,42,0.15) !important; }
    ::-webkit-scrollbar { width:3px; height:3px; }
    ::-webkit-scrollbar-track { background:transparent; }
    ::-webkit-scrollbar-thumb { background:#2a1f14; border-radius:4px; }
    .slide-up { animation:slideUp 0.32s cubic-bezier(0.22,1,0.36,1) both; }
    .fade-in  { animation:fadeIn  0.25s ease both; }
  `;
  document.head.appendChild(s);
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:'#0a0804', card:'#0f0b06', card2:'#140e08',
  border:'#241a0e', border2:'#2e2010',
  amber:'#d4862a', amber2:'#b8721f', amberGlow:'rgba(212,134,42,0.15)',
  text:'#f5e6c8', text2:'#c9a96e', text3:'#8a6a46', text4:'#5a4030',
  red:'#e05c5c',  green:'#4caf88',
};

// ─── Shared styles ────────────────────────────────────────────────────────────
const S = {
  page:    { minHeight:'100vh', background:T.bg, fontFamily:"'DM Sans',system-ui,sans-serif", color:T.text, maxWidth:480, margin:'0 auto' },
  center:  { minHeight:'100vh', background:T.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',system-ui,sans-serif", color:T.text, padding:'24px 20px', textAlign:'center' },
  input:   { width:'100%', background:T.card2, border:`1.5px solid ${T.border2}`, borderRadius:12, color:T.text, padding:'13px 15px', fontSize:15, fontFamily:"'DM Sans',system-ui,sans-serif", display:'block', marginBottom:14, transition:'border-color 0.2s, box-shadow 0.2s' },
  label:   { display:'block', fontSize:11, color:T.text3, marginBottom:6, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' },
  btnA:    { background:`linear-gradient(135deg,${T.amber},${T.amber2})`, color:'#1a0f00', border:'none', borderRadius:14, padding:'14px 0', fontWeight:800, fontSize:15, cursor:'pointer', fontFamily:"'DM Sans',system-ui,sans-serif", width:'100%', display:'block', transition:'opacity 0.15s' },
  btnB:    { background:T.card2, color:T.text2, border:`1.5px solid ${T.border2}`, borderRadius:14, padding:'12px 0', fontWeight:600, fontSize:14, cursor:'pointer', fontFamily:"'DM Sans',system-ui,sans-serif", width:'100%', display:'block' },
  spinner: { width:32, height:32, border:`3px solid ${T.border2}`, borderTop:`3px solid ${T.amber}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' },
};
const qtyBtn = { width:32, height:32, background:T.card2, color:T.amber, border:`1.5px solid ${T.border2}`, borderRadius:9, fontSize:18, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',system-ui,sans-serif", flexShrink:0 };

// ═════════════════════════════════════════════════════════════════════════════
// ORDER TRACKER
// ═════════════════════════════════════════════════════════════════════════════
const STEPS = [
  { key:'pending',   label:'Received',  emoji:'📋' },
  { key:'preparing', label:'Preparing', emoji:'👨‍🍳' },
  { key:'ready',     label:'Ready!',    emoji:'✅' },
  { key:'served',    label:'Served',    emoji:'🍵' },
];

const OrderTracker = ({ orderId, tableNumber, onAddMore, onNewOrder }) => {
  const [order,   setOrder  ] = useState(null);
  const [loading, setLoading] = useState(true);

  const poll = useCallback(async () => {
    if (!orderId) return;
    try {
      const { data } = await api.get(`/qr/track/${orderId}`);
      setOrder(data.order);
    } catch (e) { console.error('tracker poll', e); }
    finally { setLoading(false); }
  }, [orderId]);

  useEffect(() => {
    poll();
    const iv = setInterval(poll, 8000);
    return () => clearInterval(iv);
  }, [poll]);

  if (!orderId) return (
    <div style={S.center}>
      <p style={{ color:T.text3, marginBottom:20 }}>No active order.</p>
      <button style={{ ...S.btnB, width:'auto', padding:'11px 24px' }} onClick={onNewOrder}>← Order Something</button>
    </div>
  );
  if (loading) return (
    <div style={S.center}>
      <div style={{ fontSize:52, marginBottom:16 }}>🍵</div>
      <div style={S.spinner} />
      <p style={{ color:T.text3, marginTop:14, fontSize:14 }}>Loading your order…</p>
    </div>
  );
  if (!order) return (
    <div style={S.center}>
      <div style={{ fontSize:48, marginBottom:12 }}>❓</div>
      <p style={{ color:T.red, marginBottom:20 }}>Order not found.</p>
      <button style={{ ...S.btnB, width:'auto', padding:'11px 24px' }} onClick={onNewOrder}>← Go back</button>
    </div>
  );

  const stepIdx     = STEPS.findIndex(s => s.key === order.orderStatus);
  const isCancelled = order.orderStatus === 'cancelled';
  const isDone      = ['completed','served','cancelled'].includes(order.orderStatus);
  const canAdd      = !isDone && !!onAddMore && ['pending','preparing'].includes(order.orderStatus);
  const pct         = stepIdx < 0 ? 0 : (stepIdx / (STEPS.length - 1)) * 100;
  const info        = order.statusInfo || {};

  return (
    <div style={{ ...S.page, paddingBottom:36 }} className="fade-in">
      <div style={{ background:'linear-gradient(180deg,rgba(212,134,42,0.08) 0%,transparent 100%)', padding:'30px 20px 22px', borderBottom:`1px solid ${T.border}`, textAlign:'center' }}>
        <div style={{ fontSize:54, lineHeight:1, marginBottom:10 }}>{info.emoji || '📋'}</div>
        <div style={{ fontFamily:"'Lora',Georgia,serif", fontSize:23, fontWeight:600, color:T.text, marginBottom:7 }}>{info.label}</div>
        <div style={{ fontSize:13, color:T.text3, lineHeight:1.7, maxWidth:280, margin:'0 auto' }}>{info.message}</div>
        {isCancelled && (
          <div style={{ marginTop:14, fontSize:13, color:T.red, background:'rgba(224,92,92,0.10)', border:'1px solid rgba(224,92,92,0.25)', borderRadius:10, padding:'8px 14px', display:'inline-block' }}>
            Ask staff for assistance.
          </div>
        )}
      </div>
      <div style={{ padding:'18px 16px' }}>
        {!isCancelled && (
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:'18px 12px 22px', marginBottom:14 }}>
            <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ position:'absolute', top:18, left:'9%', right:'9%', height:2, background:T.border2, zIndex:0 }} />
              <div style={{ position:'absolute', top:18, left:'9%', height:2, zIndex:1, background:`linear-gradient(90deg,${T.amber},${T.amber2})`, width:`${pct * 0.82}%`, transition:'width 1s ease' }} />
              {STEPS.map((step, i) => {
                const done = i < stepIdx, cur = i === stepIdx;
                return (
                  <div key={step.key} style={{ display:'flex', flexDirection:'column', alignItems:'center', zIndex:2, flex:1 }}>
                    <div style={{ width:38, height:38, borderRadius:'50%', background:done||cur?T.amber:T.card2, border:`2px solid ${done||cur?T.amber:T.border2}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:done?14:18, color:done||cur?'#1a0f00':T.text4, transition:'all 0.5s', animation:cur?'glow 2s ease infinite':'none' }}>
                      {done ? '✓' : step.emoji}
                    </div>
                    <div style={{ fontSize:10, marginTop:7, color:done||cur?T.amber:T.text4, fontWeight:cur?800:500, textAlign:'center', lineHeight:1.3 }}>{step.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:'13px 15px', marginBottom:12 }}>
          <div style={{ fontSize:10, color:T.text3, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:10 }}>Order Details</div>
          {[
            ['Order ID', <span style={{ fontFamily:'DM Mono,monospace', color:T.amber, fontWeight:700 }}>{order.orderId}</span>],
            ['Table',    `Table ${order.tableNumber}`],
            ['Name',     order.customerName],
            ['Status',   <span style={{ textTransform:'capitalize', color:T.amber, fontWeight:700 }}>{order.orderStatus}</span>],
          ].map(([lbl, val]) => (
            <div key={lbl} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
              <span style={{ color:T.text3 }}>{lbl}</span>
              <span style={{ color:T.text2, fontWeight:600 }}>{val}</span>
            </div>
          ))}
        </div>
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:'13px 15px', marginBottom:14 }}>
          <div style={{ fontSize:10, color:T.text3, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:10 }}>Items Ordered</div>
          {order.items?.map((item, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
              <span style={{ fontSize:20 }}>{item.emoji}</span>
              <span style={{ flex:1, color:T.text }}>{item.name}</span>
              <span style={{ color:T.text3, marginRight:4 }}>×{item.qty}</span>
              <span style={{ fontFamily:'DM Mono,monospace', color:T.amber, fontWeight:700 }}>Rs. {item.subtotal}</span>
            </div>
          ))}
          <div style={{ marginTop:10 }}>
            {order.serviceCharge > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.text3, marginBottom:4 }}>
                <span>Service Charge</span><span>Rs. {order.serviceCharge}</span>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:17, fontWeight:800, color:T.amber, paddingTop:8, borderTop:`1px solid ${T.border}`, marginTop:4 }}>
              <span>Total</span>
              <span style={{ fontFamily:'DM Mono,monospace' }}>Rs. {order.total}</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign:'center', fontSize:11, color:T.text4, marginBottom:18 }}>Auto-refreshing every 8 seconds</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {canAdd && <button style={S.btnB} onClick={onAddMore}>➕ Add More Items</button>}
          {isDone  && <button style={S.btnA} onClick={onNewOrder}>🍵 Place Another Order</button>}
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MENU ITEM CARD
// ═════════════════════════════════════════════════════════════════════════════
const MenuItemCard = ({ item, qty, onAdd, onRemove }) => (
  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 14px', background:qty>0?T.amberGlow:T.card, border:`1.5px solid ${qty>0?'rgba(212,134,42,0.3)':T.border}`, borderRadius:14, marginBottom:9, transition:'background 0.2s, border-color 0.2s' }}>
    <div style={{ fontSize:38, flexShrink:0, lineHeight:1 }}>{item.emoji}</div>
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:3, lineHeight:1.3 }}>{item.name}</div>
      {item.description && <div style={{ fontSize:11, color:T.text4, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.description}</div>}
      <div style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:T.amber }}>Rs. {item.price}</div>
    </div>
    <div style={{ flexShrink:0 }}>
      {qty === 0 ? (
        <button onClick={onAdd} style={{ background:T.amberGlow, color:T.amber, border:'1.5px solid rgba(212,134,42,0.3)', borderRadius:10, padding:'8px 16px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:"'DM Sans',system-ui", whiteSpace:'nowrap' }}>+ Add</button>
      ) : (
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={onRemove} style={qtyBtn}>−</button>
          <span style={{ minWidth:22, textAlign:'center', fontWeight:800, color:T.amber, fontSize:15 }}>{qty}</span>
          <button onClick={onAdd}    style={qtyBtn}>+</button>
        </div>
      )}
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const QRMenuPage = () => {
  const { token } = useParams();

  const [phase,         setPhase        ] = useState('loading');
  const [tableInfo,     setTableInfo    ] = useState(null);
  const [menu,          setMenu         ] = useState({});
  const [categories,    setCategories   ] = useState([]);
  const [settings,      setSettings     ] = useState({});
  const [error,         setError        ] = useState('');
  const [activeOrder,   setActiveOrder  ] = useState(null);
  const [trackedId,     setTrackedId    ] = useState(null);
  const [customerName,  setCustomerName ] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [activeCategory,setActiveCategory] = useState('');
  const [cart,          setCart         ] = useState([]);
  const [search,        setSearch       ] = useState('');
  const [note,          setNote         ] = useState('');
  const [showCart,      setShowCart     ] = useState(false);
  const [placing,       setPlacing      ] = useState(false);
  const nameRef = useRef(null);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/qr/scan/${token}`);

        // Validate we got JSON, not an HTML error page
        if (!data || typeof data !== 'object' || !data.success) {
          throw new Error('Invalid response from server');
        }

        setTableInfo(data.table);
        setMenu(data.menu || {});
        setCategories(data.categories || []);
        setSettings(data.settings || {});
        setActiveCategory((data.categories || [])[0] || '');

        if (data.existingOrder) {
          const ex = data.existingOrder;
          setActiveOrder(ex);
          setTrackedId(ex.orderId);
          setCustomerName(ex.customerName  || '');
          setCustomerPhone(ex.customerPhone || '');
          saveSession(ex.customerName, ex.customerPhone);
          setPhase('existing');
        } else {
          // Table is free — always start fresh so the next customer enters their name
          setActiveOrder(null);
          setTrackedId(null);
          clearSession();
          setCustomerName('');
          setCustomerPhone('');
          setPhase('info');
        }
      } catch (err) {
        console.error('[QR] scan error:', err);
        const msg = err.response?.data?.message || err.message || 'Invalid QR code. Please ask staff for help.';
        setError(msg);
        setPhase('error');
      }
    };
    load();
  }, [token]);

  // ── Cart helpers ────────────────────────────────────────────────────────────
  const addToCart = (item) => setCart(prev => {
    const ex = prev.find(c => c.menuItem === item._id);
    if (ex) return prev.map(c => c.menuItem === item._id ? { ...c, qty:c.qty+1 } : c);
    return [...prev, { menuItem:item._id, name:item.name, emoji:item.emoji, price:item.price, qty:1 }];
  });
  const removeFromCart = (id) => setCart(prev => {
    const ex = prev.find(c => c.menuItem === id);
    if (ex?.qty === 1) return prev.filter(c => c.menuItem !== id);
    return prev.map(c => c.menuItem === id ? { ...c, qty:c.qty-1 } : c);
  });
  const cartQty       = (id) => cart.find(c => c.menuItem === id)?.qty || 0;
  const cartTotal     = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartCount     = cart.reduce((s, c) => s + c.qty, 0);
  const serviceRate   = settings?.enableServiceCharge ? (settings?.serviceChargeRate || 0) : 0;
  const serviceCharge = Math.round(cartTotal * serviceRate / 100);
  const grandTotal    = cartTotal + serviceCharge;

  // ── Place order ─────────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!customerName.trim() || customerName.trim().length < 2) { setShowCart(false); setPhase('info'); return; }
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      const itemsPayload = cart.map(c => ({ menuItem:c.menuItem, qty:c.qty, name:c.name }));
      if (activeOrder?._id) {
        await api.post(`/qr/order/${token}/add-items`, { orderId:activeOrder._id, items:itemsPayload });
        setTrackedId(activeOrder.orderId);
      } else {
        const { data } = await api.post(`/qr/order/${token}`, {
          customerName: customerName.trim(), customerPhone: customerPhone.trim(), items: itemsPayload, note,
        });
        const placed = data.order;
        setTrackedId(placed.orderId);
        setActiveOrder({
          _id: placed._id, orderId: placed.orderId, orderStatus: 'pending',
          customerName: customerName.trim(), customerPhone: customerPhone.trim(),
          items: placed.items, total: placed.total,
        });
        saveSession(customerName.trim(), customerPhone.trim());
      }
      setCart([]); setNote(''); setShowCart(false); setPhase('tracking');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally { setPlacing(false); }
  };

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleAddMore = () => { setCart([]); setSearch(''); setPhase('menu'); };
  const handleNewOrder = () => {
    setActiveOrder(null); setTrackedId(null); setCart([]); setNote(''); setSearch('');
    setPhase('menu');
  };

  // ── Visible items ───────────────────────────────────────────────────────────
  const visibleItems = search
    ? Object.values(menu).flat().filter(i => i.name?.toLowerCase().includes(search.toLowerCase()))
    : (menu[activeCategory] || []);

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER — LOADING
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'loading') return (
    <div style={S.center}>
      <div style={{ fontSize:56, marginBottom:20 }}>🍵</div>
      <div style={S.spinner} />
      <p style={{ color:T.text3, marginTop:16, fontSize:14 }}>Loading menu…</p>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER — ERROR
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'error') return (
    <div style={S.center}>
      <div style={{ fontSize:56, marginBottom:16 }}>❌</div>
      <p style={{ color:T.red, textAlign:'center', maxWidth:280, lineHeight:1.7, fontSize:15 }}>{error}</p>
      <p style={{ color:T.text4, fontSize:12, marginTop:10 }}>Please ask staff for assistance.</p>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER — TRACKING
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'tracking') return (
    <OrderTracker
      orderId={trackedId}
      tableNumber={tableInfo?.number}
      onAddMore={activeOrder ? handleAddMore : null}
      onNewOrder={handleNewOrder}
    />
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER — EXISTING ORDER
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'existing') return (
    <div style={{ ...S.page, padding:'32px 18px 44px' }} className="slide-up">
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ fontSize:52, marginBottom:8 }}>🍵</div>
        <div style={{ fontFamily:"'Lora',Georgia,serif", fontSize:26, fontWeight:600, color:T.text, marginBottom:4 }}>
          {settings?.cafeName || 'Chiya Chowk'}
        </div>
        <div style={{ fontSize:13, color:T.text3 }}>
          Table {tableInfo?.number} · Welcome back,{' '}
          <strong style={{ color:T.text2 }}>{activeOrder?.customerName || customerName}</strong>!
        </div>
      </div>
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:'18px 16px', marginBottom:16 }}>
        <div style={{ fontSize:10, color:T.text3, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:12 }}>📋 Active Order</div>
        {[
          ['Order ID', <span style={{ fontFamily:'DM Mono,monospace', color:T.amber, fontWeight:700 }}>{activeOrder?.orderId}</span>],
          ['Customer', activeOrder?.customerName],
          ['Status',   <span style={{ textTransform:'capitalize', color:T.amber, fontWeight:700 }}>{activeOrder?.orderStatus}</span>],
          ['Items',    `${activeOrder?.items?.length || 0} item(s)`],
          ['Total',    <span style={{ fontFamily:'DM Mono,monospace', color:T.amber, fontWeight:800 }}>Rs. {activeOrder?.total}</span>],
        ].map(([lbl, val]) => (
          <div key={lbl} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
            <span style={{ color:T.text3 }}>{lbl}</span>
            <span style={{ color:T.text2, fontWeight:600 }}>{val}</span>
          </div>
        ))}
        <div style={{ marginTop:12 }}>
          {activeOrder?.items?.map((item, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
              <span style={{ fontSize:18 }}>{item.emoji}</span>
              <span style={{ flex:1, color:T.text }}>{item.name}</span>
              <span style={{ color:T.text3 }}>×{item.qty}</span>
              <span style={{ fontFamily:'DM Mono,monospace', color:T.amber }}>Rs. {item.subtotal || item.price * item.qty}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <button style={S.btnA} onClick={() => setPhase('tracking')}>📋 Track My Order</button>
        {['pending','preparing'].includes(activeOrder?.orderStatus) && (
          <button style={S.btnB} onClick={() => setPhase('menu')}>➕ Add More Items</button>
        )}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER — INFO (name entry)
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'info') return (
    <div style={{ ...S.page, paddingBottom:40 }} className="slide-up">
      <div style={{ background:'linear-gradient(170deg,rgba(212,134,42,0.09) 0%,transparent 55%)', padding:'44px 24px 30px', textAlign:'center', borderBottom:`1px solid ${T.border}` }}>
        <div style={{ fontSize:62, marginBottom:10 }}>🍵</div>
        <div style={{ fontFamily:"'Lora',Georgia,serif", fontSize:30, fontWeight:600, color:T.text, marginBottom:6 }}>
          {settings?.cafeName || 'Chiya Chowk'}
        </div>
        <div style={{ fontSize:14, color:T.text3 }}>Scan &amp; Order · Table {tableInfo?.number}</div>
      </div>
      <div style={{ padding:'24px 20px 0' }}>
        <div style={{ background:T.amberGlow, border:'1px solid rgba(212,134,42,0.22)', borderRadius:12, padding:'12px 16px', display:'flex', justifyContent:'space-between', marginBottom:24 }}>
          {[['📍 Table', `Table ${tableInfo?.number}`], ['🪑 Seats', tableInfo?.seats ?? '—'], ['📌 Zone', tableInfo?.location ?? '—']].map(([lbl, val]) => (
            <div key={lbl} style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:T.text3, marginBottom:2 }}>{lbl}</div>
              <div style={{ fontSize:13, fontWeight:700, color:T.amber }}>{val}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize:13, color:T.text3, lineHeight:1.7, textAlign:'center', marginBottom:24 }}>
          Browse the menu, add to cart, and place your order. Staff will bring it to you.
        </p>
        <label style={S.label}>Your Name *</label>
        <input
          ref={nameRef}
          style={S.input}
          placeholder="Enter your name"
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter' && customerName.trim().length >= 2) {
              saveSession(customerName.trim(), customerPhone.trim());
              setPhase('menu');
            }
          }}
        />
        <label style={S.label}>
          Phone <span style={{ color:T.text4, fontWeight:400, textTransform:'none', letterSpacing:0 }}>(optional)</span>
        </label>
        <input
          style={{ ...S.input, marginBottom:28 }}
          placeholder="98XXXXXXXX"
          type="tel"
          value={customerPhone}
          onChange={e => setCustomerPhone(e.target.value)}
        />
        <button style={S.btnA} onClick={() => {
          if (!customerName.trim() || customerName.trim().length < 2) { nameRef.current?.focus(); return; }
          saveSession(customerName.trim(), customerPhone.trim());
          setPhase('menu');
        }}>
          View Menu →
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER — MENU
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ ...S.page, paddingBottom:cartCount > 0 ? 96 : 24 }}>
      {/* Sticky header */}
      <div style={{ position:'sticky', top:0, zIndex:80, background:'rgba(10,8,4,0.97)', backdropFilter:'blur(14px)', borderBottom:`1px solid ${T.border}`, padding:'12px 16px 10px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div>
            <div style={{ fontFamily:"'Lora',Georgia,serif", fontSize:17, fontWeight:600, color:T.text }}>{settings?.cafeName || 'Chiya Chowk'}</div>
            <div style={{ fontSize:11, color:T.text3, marginTop:1 }}>
              Table {tableInfo?.number} · Hi, <strong style={{ color:T.text2 }}>{customerName}</strong>
            </div>
          </div>
          <div style={{ display:'flex', gap:7, alignItems:'center' }}>
            {trackedId && (
              <button onClick={() => setPhase('tracking')} style={{ background:T.amberGlow, border:'1px solid rgba(212,134,42,0.3)', borderRadius:8, padding:'5px 10px', color:T.amber, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',system-ui", whiteSpace:'nowrap' }}>
                📋 My Order
              </button>
            )}
            {activeOrder && (
              <div style={{ background:'rgba(76,175,136,0.12)', border:'1px solid rgba(76,175,136,0.25)', borderRadius:8, padding:'5px 9px', fontSize:10, color:T.green, fontWeight:700, whiteSpace:'nowrap' }}>
                ➕ Add-on
              </div>
            )}
            <button onClick={() => setPhase('info')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:17, color:T.text3, lineHeight:1 }} title="Edit name">✏️</button>
          </div>
        </div>
        {/* Search */}
        <div style={{ position:'relative', marginBottom:10 }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:13, color:T.text4, pointerEvents:'none' }}>🔍</span>
          <input
            style={{ ...S.input, paddingLeft:34, marginBottom:0, fontSize:13, borderRadius:10 }}
            placeholder="Search menu…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:T.text3, fontSize:15, cursor:'pointer', lineHeight:1 }}>✕</button>
          )}
        </div>
        {/* Category pills */}
        {!search && (
          <div style={{ display:'flex', gap:6, overflowX:'auto', scrollbarWidth:'none', paddingBottom:2 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding:'6px 14px', borderRadius:20, flexShrink:0, border:`1.5px solid ${activeCategory===cat?T.amber:T.border2}`, background:activeCategory===cat?T.amber:T.card2, color:activeCategory===cat?'#1a0f00':T.text3, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',system-ui", transition:'all 0.15s', whiteSpace:'nowrap' }}>
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add-on banner */}
      {activeOrder && (
        <div style={{ margin:'12px 14px 0', background:'rgba(76,175,136,0.06)', border:'1px solid rgba(76,175,136,0.22)', borderRadius:10, padding:'9px 14px', fontSize:12, color:T.green, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>➕ Adding items to order <strong>{activeOrder.orderId}</strong></span>
          <button onClick={() => setPhase('tracking')} style={{ background:'none', border:'none', color:T.green, fontSize:11, cursor:'pointer', textDecoration:'underline', fontFamily:"'DM Sans',system-ui" }}>View</button>
        </div>
      )}

      {/* Menu items */}
      <div style={{ padding:'14px 14px 0' }}>
        {search ? (
          <>
            <div style={{ fontSize:12, color:T.text3, marginBottom:12 }}>
              {visibleItems.length} result{visibleItems.length !== 1 ? 's' : ''} for "<strong style={{ color:T.text2 }}>{search}</strong>"
            </div>
            {visibleItems.length === 0
              ? <div style={{ textAlign:'center', padding:'40px 20px', color:T.text4 }}><div style={{ fontSize:40, marginBottom:10 }}>🔍</div><p>Nothing found</p></div>
              : visibleItems.map(item => <MenuItemCard key={item._id} item={item} qty={cartQty(item._id)} onAdd={() => addToCart(item)} onRemove={() => removeFromCart(item._id)} />)
            }
          </>
        ) : (
          <>
            <div style={{ fontSize:13, fontWeight:800, color:T.amber, letterSpacing:'0.04em', marginBottom:12 }}>{activeCategory}</div>
            {visibleItems.length === 0
              ? <div style={{ textAlign:'center', padding:'40px 20px', color:T.text4 }}>No items in this category</div>
              : visibleItems.map(item => <MenuItemCard key={item._id} item={item} qty={cartQty(item._id)} onAdd={() => addToCart(item)} onRemove={() => removeFromCart(item._id)} />)
            }
          </>
        )}
      </div>

      {/* Cart drawer */}
      {showCart && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.72)', backdropFilter:'blur(5px)', display:'flex', alignItems:'flex-end' }} onClick={() => setShowCart(false)}>
          <div style={{ width:'100%', maxWidth:480, margin:'0 auto', background:T.card, border:`1px solid ${T.border}`, borderTopLeftRadius:22, borderTopRightRadius:22, padding:'20px 18px', maxHeight:'88vh', overflowY:'auto' }} onClick={e => e.stopPropagation()} className="slide-up">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <div>
                <div style={{ fontFamily:"'Lora',Georgia,serif", fontSize:18, fontWeight:600, color:T.text }}>{activeOrder ? '➕ Adding Items' : '🛒 Your Order'}</div>
                <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>
                  Table {tableInfo?.number}
                  {activeOrder && <span style={{ color:T.amber, marginLeft:5 }}>· {activeOrder.orderId}</span>}
                </div>
              </div>
              <button onClick={() => setShowCart(false)} style={{ background:T.card2, border:`1px solid ${T.border2}`, borderRadius:8, color:T.text3, fontSize:18, cursor:'pointer', width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
            <div style={{ maxHeight:240, overflowY:'auto', marginBottom:16 }}>
              {cart.map(c => (
                <div key={c.menuItem} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ fontSize:22 }}>{c.emoji}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, color:T.text, fontWeight:600 }}>{c.name}</div>
                    <div style={{ fontSize:12, color:T.text3, fontFamily:'DM Mono,monospace' }}>Rs. {c.price} each</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <button style={qtyBtn} onClick={() => removeFromCart(c.menuItem)}>−</button>
                    <span style={{ minWidth:22, textAlign:'center', fontWeight:800, color:T.amber, fontSize:15 }}>{c.qty}</span>
                    <button style={qtyBtn} onClick={() => addToCart({ _id:c.menuItem, ...c })}>+</button>
                  </div>
                  <span style={{ fontFamily:'DM Mono,monospace', color:T.amber, fontWeight:700, fontSize:13, minWidth:58, textAlign:'right' }}>Rs. {c.price * c.qty}</span>
                </div>
              ))}
            </div>
            {!activeOrder && (
              <>
                <label style={{ ...S.label, marginBottom:6 }}>Note <span style={{ color:T.text4, fontWeight:400, textTransform:'none', letterSpacing:0 }}>(optional)</span></label>
                <textarea style={{ ...S.input, height:60, resize:'none', fontSize:13, marginBottom:16 }} placeholder="e.g. Less sugar, extra hot…" value={note} onChange={e => setNote(e.target.value)} />
              </>
            )}
            <div style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:12, padding:'12px 14px', marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:T.text3, marginBottom:4 }}>
                <span>Subtotal</span><span style={{ fontFamily:'DM Mono,monospace' }}>Rs. {cartTotal}</span>
              </div>
              {serviceCharge > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:T.text3, marginBottom:4 }}>
                  <span>Service ({serviceRate}%)</span><span style={{ fontFamily:'DM Mono,monospace' }}>Rs. {serviceCharge}</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:18, fontWeight:800, color:T.amber, marginTop:8, paddingTop:8, borderTop:`1px solid ${T.border}` }}>
                <span>Total</span><span style={{ fontFamily:'DM Mono,monospace' }}>Rs. {grandTotal}</span>
              </div>
            </div>
            <button style={{ ...S.btnA, opacity:placing?0.6:1 }} onClick={handlePlaceOrder} disabled={placing}>
              {placing ? 'Placing…' : activeOrder ? `➕ Add to Order · Rs. ${grandTotal}` : `✓ Place Order · Rs. ${grandTotal}`}
            </button>
          </div>
        </div>
      )}

      {/* Floating cart button */}
      {cartCount > 0 && !showCart && (
        <button onClick={() => setShowCart(true)} style={{ position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)', background:`linear-gradient(135deg,${T.amber},${T.amber2})`, color:'#1a0f00', border:'none', borderRadius:50, padding:'14px 28px', fontWeight:800, fontSize:14, cursor:'pointer', display:'flex', gap:20, alignItems:'center', boxShadow:'0 6px 28px rgba(212,134,42,0.45)', fontFamily:"'DM Sans',system-ui,sans-serif", zIndex:100, whiteSpace:'nowrap', animation:'floatIn 0.3s ease' }}>
          <span>🛒 {cartCount} item{cartCount !== 1 ? 's' : ''}</span>
          <span style={{ fontFamily:'DM Mono,monospace' }}>Rs. {grandTotal}</span>
        </button>
      )}
    </div>
  );
};

export default QRMenuPage;
