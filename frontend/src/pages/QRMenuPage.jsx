import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

// Public axios — no auth token needed. CRA proxy in package.json forwards /api → localhost:5000
const api = axios.create({ baseURL: "/api", timeout: 15000 });

// ===== STATUS TRACKER =====
const OrderTracker = ({ orderId, onBack }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get(`/qr/track/${orderId}`);
      setOrder(data.order);
    } catch (err) {
      console.error("Tracking error", err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000); // poll every 8s
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const steps = [
    { key: "pending", label: "Received", emoji: "📋" },
    { key: "preparing", label: "Preparing", emoji: "👨‍🍳" },
    { key: "ready", label: "Ready", emoji: "✅" },
    { key: "served", label: "Served", emoji: "🍵" },
  ];

  const stepIndex = steps.findIndex((s) => s.key === order?.orderStatus);

  if (loading)
    return (
      <div style={styles.fullCenter}>
        <div style={styles.spinner} />
        <p style={{ color: "#a07850", marginTop: 12, fontSize: 14 }}>
          Loading your order...
        </p>
      </div>
    );

  if (!order)
    return (
      <div style={styles.fullCenter}>
        <p style={{ color: "#e05c5c" }}>Order not found.</p>
        <button style={styles.btnSecondary} onClick={onBack}>
          ← Back
        </button>
      </div>
    );

  const isCancelled = order.orderStatus === "cancelled";
  const isCompleted =
    order.orderStatus === "completed" || order.orderStatus === "served";

  return (
    <div style={styles.page}>
      <div style={styles.trackerCard}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>
            {order.statusInfo?.emoji}
          </div>
          <h2 style={{ ...styles.heading, fontSize: 22, margin: 0 }}>
            {order.statusInfo?.label}
          </h2>
          <p style={{ color: "#a07850", marginTop: 6, fontSize: 14 }}>
            {order.statusInfo?.message}
          </p>
        </div>

        {/* Progress bar — only show if not cancelled */}
        {!isCancelled && (
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                position: "relative",
              }}
            >
              {/* connector line */}
              <div
                style={{
                  position: "absolute",
                  top: 18,
                  left: "10%",
                  right: "10%",
                  height: 2,
                  background: "#2a1f14",
                  zIndex: 0,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 18,
                  left: "10%",
                  height: 2,
                  zIndex: 1,
                  background: "#d4862a",
                  transition: "width 0.8s ease",
                  width:
                    stepIndex >= 0
                      ? `${Math.min(80, stepIndex * (80 / 3))}%`
                      : "0%",
                }}
              />
              {steps.map((step, i) => (
                <div
                  key={step.key}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    zIndex: 2,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: i <= stepIndex ? "#d4862a" : "#1a1008",
                      border: `2px solid ${i <= stepIndex ? "#d4862a" : "#3d2d1a"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      transition: "all 0.4s",
                      boxShadow:
                        i === stepIndex
                          ? "0 0 12px rgba(212,134,42,0.5)"
                          : "none",
                    }}
                  >
                    {i < stepIndex ? "✓" : step.emoji}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: i <= stepIndex ? "#d4862a" : "#6b5040",
                      marginTop: 5,
                      fontWeight: i === stepIndex ? 700 : 400,
                    }}
                  >
                    {step.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order info */}
        <div style={styles.infoBox}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Order ID</span>
            <span
              style={{
                ...styles.infoValue,
                fontFamily: "monospace",
                color: "#d4862a",
              }}
            >
              {order.orderId}
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Table</span>
            <span style={styles.infoValue}>Table {order.tableNumber}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Name</span>
            <span style={styles.infoValue}>{order.customerName}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Items</span>
            <span style={styles.infoValue}>{order.items?.length} items</span>
          </div>
        </div>

        {/* Items */}
        <div style={{ marginBottom: 16 }}>
          {order.items?.map((item, i) => (
            <div key={i} style={styles.orderItem}>
              <span style={{ fontSize: 18 }}>{item.emoji}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{item.name}</span>
              <span style={{ color: "#a07850", fontSize: 12 }}>
                ×{item.qty}
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  color: "#d4862a",
                  fontSize: 13,
                }}
              >
                Rs. {item.subtotal}
              </span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div style={styles.totalBox}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "#a07850",
              marginBottom: 4,
            }}
          >
            <span>Subtotal</span>
            <span>Rs. {order.subtotal}</span>
          </div>
          {order.taxAmount > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "#a07850",
                marginBottom: 4,
              }}
            >
              <span>VAT (13%)</span>
              <span>Rs. {order.taxAmount}</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 16,
              fontWeight: 700,
              color: "#d4862a",
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px solid #2a1f14",
            }}
          >
            <span>Total</span>
            <span>Rs. {order.total}</span>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <p style={{ fontSize: 11, color: "#6b5040", marginBottom: 12 }}>
            Auto-refreshing every 8 seconds • {new Date().toLocaleTimeString()}
          </p>
          {!isCompleted && !isCancelled && (
            <button style={styles.btnSecondary} onClick={onBack}>
              + Order More Items
            </button>
          )}
          {(isCompleted || isCancelled) && (
            <button style={styles.btnPrimary} onClick={onBack}>
              Start New Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== MAIN QR MENU PAGE =====
const QRMenuPage = () => {
  const { token } = useParams();
  const [phase, setPhase] = useState("loading"); // loading | info | menu | tracking
  const [tableInfo, setTableInfo] = useState(null);
  const [menu, setMenu] = useState({});
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({});
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState(null);

  const [existingOrder, setExistingOrder] = useState(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const { data } = await api.get(`/qr/scan/${token}`);
        setTableInfo(data.table);
        setMenu(data.menu);
        setCategories(data.categories);
        setSettings(data.settings);
        setActiveCategory(data.categories[0] || "");

        // If table already has an active order, pre-fill customer info and go to tracking
        if (data.existingOrder) {
          setExistingOrder(data.existingOrder);
          setCustomerName(data.existingOrder.customerName || "");
          setCustomerPhone(data.existingOrder.customerPhone || "");
          setPlacedOrderId(data.existingOrder.orderId);
          setPhase("existing"); // show existing order screen
        } else {
          setPhase("info");
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Invalid QR code. Please ask staff for help.",
        );
        setPhase("error");
      }
    };
    fetchMenu();
  }, [token]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem === item._id);
      if (existing)
        return prev.map((c) =>
          c.menuItem === item._id ? { ...c, qty: c.qty + 1 } : c,
        );
      return [
        ...prev,
        {
          menuItem: item._id,
          name: item.name,
          emoji: item.emoji,
          price: item.price,
          qty: 1,
        },
      ];
    });
  };

  const removeFromCart = (menuItemId) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem === menuItemId);
      if (existing?.qty === 1)
        return prev.filter((c) => c.menuItem !== menuItemId);
      return prev.map((c) =>
        c.menuItem === menuItemId ? { ...c, qty: c.qty - 1 } : c,
      );
    });
  };

  const cartQty = (menuItemId) =>
    cart.find((c) => c.menuItem === menuItemId)?.qty || 0;

  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const tax = Math.round((cartTotal * (settings.vatRate || 13)) / 100);
  const serviceCharge = settings.enableServiceCharge
    ? Math.round((cartTotal * (settings.serviceChargeRate || 0)) / 100)
    : 0;
  const grandTotal = cartTotal + tax + serviceCharge;

  const filteredItems = (cat) => {
    const items = menu[cat] || [];
    if (!search) return items;
    return items.filter((i) =>
      i.name.toLowerCase().includes(search.toLowerCase()),
    );
  };

  const handlePlaceOrder = async () => {
    if (!customerName.trim() || customerName.trim().length < 2) {
      alert("Please enter your name (at least 2 characters)");
      return;
    }
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    setPlacing(true);
    try {
      if (existingOrder && existingOrder._id) {
        // Add to existing order using public add-items endpoint
        await api.post(`/qr/order/${token}/add-items`, {
          orderId: existingOrder._id,
          items: cart.map((c) => ({
            menuItem: c.menuItem,
            qty: c.qty,
            name: c.name,
          })),
        });
        setPlacedOrderId(existingOrder.orderId);
      } else {
        const { data } = await api.post(`/qr/order/${token}`, {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          items: cart.map((c) => ({
            menuItem: c.menuItem,
            qty: c.qty,
            name: c.name,
          })),
          note,
        });
        setPlacedOrderId(data.order.orderId);
      }
      setCart([]);
      setShowCart(false);
      setPhase("tracking");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to place order. Try again.");
    } finally {
      setPlacing(false);
    }
  };

  // ===== RENDER PHASES =====
  if (phase === "loading")
    return (
      <div style={styles.fullCenter}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🍵</div>
        <div style={styles.spinner} />
        <p style={{ color: "#a07850", marginTop: 12 }}>Loading menu...</p>
      </div>
    );

  if (phase === "error")
    return (
      <div style={styles.fullCenter}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
        <p
          style={{
            color: "#e05c5c",
            textAlign: "center",
            maxWidth: 280,
            lineHeight: 1.6,
          }}
        >
          {error}
        </p>
      </div>
    );

  if (phase === "tracking")
    return (
      <OrderTracker
        orderId={placedOrderId}
        onBack={() => {
          setPhase("menu");
          setCustomerName("");
          setNote("");
        }}
      />
    );

  if (phase === "existing" && existingOrder)
    return (
      <div style={styles.page}>
        <div style={styles.infoCard}>
          <div style={{ fontSize: 52, marginBottom: 8, textAlign: "center" }}>
            🍵
          </div>
          <h1 style={{ ...styles.heading, fontSize: 24, marginBottom: 4 }}>
            Welcome back!
          </h1>
          <p
            style={{
              color: "#a07850",
              textAlign: "center",
              marginBottom: 20,
              fontSize: 14,
            }}
          >
            Table {tableInfo?.number} · Active Order
          </p>

          <div style={{ ...styles.infoBox, marginBottom: 16 }}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Order</span>
              <span
                style={{
                  ...styles.infoValue,
                  color: "#d4862a",
                  fontFamily: "monospace",
                }}
              >
                {existingOrder.orderId}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Customer</span>
              <span style={styles.infoValue}>{existingOrder.customerName}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Status</span>
              <span
                style={{
                  ...styles.infoValue,
                  textTransform: "capitalize",
                  color: "#d4862a",
                }}
              >
                {existingOrder.orderStatus}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Items</span>
              <span style={styles.infoValue}>
                {existingOrder.items?.length} item(s)
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Total</span>
              <span
                style={{
                  ...styles.infoValue,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  color: "#d4862a",
                }}
              >
                Rs. {existingOrder.total}
              </span>
            </div>
          </div>

          {/* Existing items list */}
          <div style={{ marginBottom: 20 }}>
            {existingOrder.items?.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #2a1f14",
                  fontSize: 13,
                }}
              >
                <span>
                  {item.emoji} {item.name} × {item.qty}
                </span>
                <span style={{ fontFamily: "monospace", color: "#d4862a" }}>
                  Rs. {item.subtotal || item.price * item.qty}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              style={{
                ...styles.btnPrimary,
                width: "100%",
                fontSize: 15,
                padding: "13px 0",
              }}
              onClick={() => setPhase("tracking")}
            >
              📋 Track My Order
            </button>
            {["pending", "preparing"].includes(existingOrder.orderStatus) && (
              <button
                style={{
                  ...styles.btnSecondary,
                  width: "100%",
                  fontSize: 14,
                  padding: "11px 0",
                }}
                onClick={() => setPhase("menu")}
              >
                ➕ Add More Items
              </button>
            )}
          </div>
        </div>
      </div>
    );

  if (phase === "info")
    return (
      <div style={styles.page}>
        <div style={styles.infoCard}>
          <div style={{ fontSize: 64, marginBottom: 12, textAlign: "center" }}>
            🍵
          </div>
          <h1 style={{ ...styles.heading, fontSize: 28, marginBottom: 4 }}>
            {settings.cafeName}
          </h1>
          <p
            style={{
              color: "#a07850",
              textAlign: "center",
              marginBottom: 24,
              fontSize: 14,
            }}
          >
            Scan & Order · Table {tableInfo?.number}
          </p>

          <div style={{ ...styles.infoBox, marginBottom: 24 }}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>📍 Table</span>
              <span
                style={{
                  ...styles.infoValue,
                  color: "#d4862a",
                  fontWeight: 700,
                }}
              >
                Table {tableInfo?.number}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>🪑 Seats</span>
              <span style={styles.infoValue}>{tableInfo?.seats} people</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>📍 Location</span>
              <span
                style={{
                  ...styles.infoValue,
                  textTransform: "capitalize",
                }}
              >
                {tableInfo?.location}
              </span>
            </div>
          </div>

          <p
            style={{
              color: "#6b5040",
              textAlign: "center",
              fontSize: 13,
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            Browse our menu, add items to your cart, and place your order
            directly. Staff will bring it to your table.
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={styles.formLabel}>Your Name *</label>
            <input
              style={styles.input}
              placeholder="Enter your name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={styles.formLabel}>
              Phone Number <span style={{ color: "#6b5040" }}>(optional)</span>
            </label>
            <input
              style={styles.input}
              placeholder="9800000000"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>

          <button
            style={{
              ...styles.btnPrimary,
              width: "100%",
              fontSize: 16,
              padding: "14px 0",
            }}
            onClick={() => {
              if (!customerName.trim() || customerName.trim().length < 2) {
                alert("Please enter your name");
                return;
              }
              setPhase("menu");
            }}
          >
            View Menu →
          </button>
        </div>
      </div>
    );

  // ===== MENU PHASE =====
  const allFilteredItems = search
    ? Object.values(menu)
        .flat()
        .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : null;

  return (
    <div style={{ ...styles.page, paddingBottom: cartCount > 0 ? 90 : 20 }}>
      {/* Sticky header */}
      <div style={styles.stickyHeader}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 18,
                fontWeight: 700,
                color: "#f5e6c8",
              }}
            >
              {settings.cafeName}
            </div>
            <div style={{ fontSize: 11, color: "#a07850" }}>
              Table {tableInfo?.number} · Hi, {customerName}!
            </div>
          </div>
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: "#a07850",
            }}
            onClick={() => setPhase("info")}
          >
            ✏️
          </button>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 10 }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 14,
              color: "#6b5040",
            }}
          >
            🔍
          </span>
          <input
            style={{
              ...styles.input,
              paddingLeft: 34,
              marginBottom: 0,
              fontSize: 13,
            }}
            placeholder="Search menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category tabs */}
        {!search && (
          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              paddingBottom: 2,
              scrollbarWidth: "none",
            }}
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: "none",
                  whiteSpace: "nowrap",
                  background: activeCategory === cat ? "#d4862a" : "#1a1008",
                  color: activeCategory === cat ? "#1a0f00" : "#a07850",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  flexShrink: 0,
                  // eslint-disable-next-line no-dupe-keys
                  border: `1px solid ${activeCategory === cat ? "#d4862a" : "#2a1f14"}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Menu items */}
      <div style={{ paddingTop: 4 }}>
        {search ? (
          <>
            <div style={{ fontSize: 12, color: "#6b5040", marginBottom: 12 }}>
              {allFilteredItems.length} result
              {allFilteredItems.length !== 1 ? "s" : ""} for "{search}"
            </div>
            {allFilteredItems.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: 40 }}>🔍</div>
                <p>No items found</p>
              </div>
            ) : (
              allFilteredItems.map((item) => (
                <MenuItemCard
                  key={item._id}
                  item={item}
                  qty={cartQty(item._id)}
                  onAdd={() => addToCart(item)}
                  onRemove={() => removeFromCart(item._id)}
                  currency={settings.currency}
                />
              ))
            )}
          </>
        ) : (
          <>
            <h3
              style={{
                color: "#d4862a",
                fontSize: 15,
                fontWeight: 700,
                marginBottom: 12,
                letterSpacing: "0.05em",
              }}
            >
              {activeCategory}
            </h3>
            {filteredItems(activeCategory).length === 0 ? (
              <div style={styles.emptyState}>
                <p>No items in this category</p>
              </div>
            ) : (
              filteredItems(activeCategory).map((item) => (
                <MenuItemCard
                  key={item._id}
                  item={item}
                  qty={cartQty(item._id)}
                  onAdd={() => addToCart(item)}
                  onRemove={() => removeFromCart(item._id)}
                  currency={settings.currency}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* Cart drawer */}
      {showCart && (
        <div style={styles.cartBackdrop} onClick={() => setShowCart(false)}>
          <div style={styles.cartDrawer} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  color: "#f5e6c8",
                  margin: 0,
                  fontFamily: "Georgia, serif",
                }}
              >
                🛒 Your Order
              </h3>
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "#a07850",
                  fontSize: 20,
                  cursor: "pointer",
                }}
                onClick={() => setShowCart(false)}
              >
                ✕
              </button>
            </div>

            {/* Cart items */}
            <div
              style={{ maxHeight: 220, overflowY: "auto", marginBottom: 16 }}
            >
              {cart.map((c) => (
                <div key={c.menuItem} style={styles.cartItem}>
                  <span style={{ fontSize: 20 }}>{c.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#f5e6c8" }}>
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#d4862a",
                        fontFamily: "monospace",
                      }}
                    >
                      Rs. {c.price} each
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <button
                      style={styles.qtyBtn}
                      onClick={() => removeFromCart(c.menuItem)}
                    >
                      −
                    </button>
                    <span
                      style={{
                        minWidth: 20,
                        textAlign: "center",
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#f5e6c8",
                      }}
                    >
                      {c.qty}
                    </span>
                    <button
                      style={styles.qtyBtn}
                      onClick={() => addToCart({ _id: c.menuItem, ...c })}
                    >
                      +
                    </button>
                  </div>
                  <span
                    style={{
                      fontFamily: "monospace",
                      color: "#d4862a",
                      fontSize: 13,
                      minWidth: 60,
                      textAlign: "right",
                    }}
                  >
                    Rs. {c.price * c.qty}
                  </span>
                </div>
              ))}
            </div>

            {/* Note */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ ...styles.formLabel, fontSize: 12 }}>
                Special note (optional)
              </label>
              <textarea
                style={{
                  ...styles.input,
                  height: 56,
                  resize: "none",
                  fontSize: 13,
                }}
                placeholder="e.g. Less sugar, extra spicy..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* Totals */}
            <div style={{ ...styles.totalBox, marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "#a07850",
                  marginBottom: 4,
                }}
              >
                <span>Subtotal</span>
                <span>Rs. {cartTotal}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "#a07850",
                  marginBottom: 4,
                }}
              >
                <span>VAT ({settings.vatRate}%)</span>
                <span>Rs. {tax}</span>
              </div>
              {serviceCharge > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: "#a07850",
                    marginBottom: 4,
                  }}
                >
                  <span>Service Charge</span>
                  <span>Rs. {serviceCharge}</span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#d4862a",
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: "1px solid #2a1f14",
                }}
              >
                <span>Total</span>
                <span>Rs. {grandTotal}</span>
              </div>
            </div>

            <button
              style={{
                ...styles.btnPrimary,
                width: "100%",
                fontSize: 15,
                padding: "14px 0",
              }}
              onClick={handlePlaceOrder}
              disabled={placing}
            >
              {placing
                ? "Placing Order..."
                : `✓ Place Order · Rs. ${grandTotal}`}
            </button>
          </div>
        </div>
      )}

      {/* Floating cart button */}
      {cartCount > 0 && !showCart && (
        <button style={styles.floatingCart} onClick={() => setShowCart(true)}>
          <span>
            🛒 {cartCount} item{cartCount > 1 ? "s" : ""}
          </span>
          <span style={{ fontFamily: "monospace", fontWeight: 700 }}>
            Rs. {grandTotal}
          </span>
        </button>
      )}
    </div>
  );
};

// ===== MENU ITEM CARD =====
const MenuItemCard = ({ item, qty, onAdd, onRemove, currency }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 14px",
      background: qty > 0 ? "rgba(212,134,42,0.07)" : "#0f0b06",
      border: `1px solid ${qty > 0 ? "rgba(212,134,42,0.3)" : "#1a1008"}`,
      borderRadius: 12,
      marginBottom: 8,
      transition: "all 0.2s",
    }}
  >
    <div style={{ fontSize: 36, flexShrink: 0 }}>{item.emoji}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#f5e6c8",
          marginBottom: 2,
        }}
      >
        {item.name}
      </div>
      {item.description && (
        <div
          style={{
            fontSize: 11,
            color: "#6b5040",
            marginBottom: 4,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.description}
        </div>
      )}
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#d4862a",
          fontFamily: "monospace",
        }}
      >
        {currency} {item.price}
      </div>
    </div>
    <div style={{ flexShrink: 0 }}>
      {qty === 0 ? (
        <button style={styles.addBtn} onClick={onAdd}>
          + Add
        </button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={styles.qtyBtn} onClick={onRemove}>
            −
          </button>
          <span
            style={{
              minWidth: 20,
              textAlign: "center",
              fontWeight: 700,
              color: "#d4862a",
              fontSize: 15,
            }}
          >
            {qty}
          </span>
          <button style={styles.qtyBtn} onClick={onAdd}>
            +
          </button>
        </div>
      )}
    </div>
  </div>
);

// ===== STYLES =====
const styles = {
  page: {
    minHeight: "100vh",
    background: "#0d0a08",
    padding: "0 0 20px 0",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    color: "#f5e6c8",
    maxWidth: 480,
    margin: "0 auto",
  },
  stickyHeader: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "rgba(13,10,8,0.97)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid #1a1008",
    padding: "14px 16px 10px",
    marginBottom: 16,
  },
  fullCenter: {
    minHeight: "100vh",
    background: "#0d0a08",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    color: "#f5e6c8",
  },
  infoCard: {
    margin: "40px 20px",
    background: "#0f0b06",
    border: "1px solid #2a1f14",
    borderRadius: 18,
    padding: 28,
  },
  trackerCard: {
    margin: "24px 16px",
    background: "#0f0b06",
    border: "1px solid #2a1f14",
    borderRadius: 18,
    padding: 24,
  },
  heading: {
    fontFamily: 'Georgia, "Playfair Display", serif',
    color: "#f5e6c8",
    textAlign: "center",
    fontWeight: 700,
    letterSpacing: "0.02em",
  },
  infoBox: {
    background: "#0d0a08",
    border: "1px solid #2a1f14",
    borderRadius: 10,
    padding: 14,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 0",
    borderBottom: "1px solid #1a1008",
    fontSize: 13,
  },
  infoLabel: { color: "#6b5040" },
  infoValue: { color: "#c9a96e", fontWeight: 600 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#0d0a08",
    border: "1px solid #2a1f14",
    borderRadius: 10,
    color: "#f5e6c8",
    padding: "12px 14px",
    fontSize: 15,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    outline: "none",
    marginBottom: 12,
    transition: "border-color 0.2s",
  },
  formLabel: {
    display: "block",
    fontSize: 13,
    color: "#a07850",
    marginBottom: 6,
    fontWeight: 600,
  },
  btnPrimary: {
    background: "linear-gradient(135deg, #d4862a, #b8721f)",
    color: "#1a0f00",
    border: "none",
    borderRadius: 12,
    padding: "13px 24px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    letterSpacing: "0.03em",
    transition: "opacity 0.2s",
  },
  btnSecondary: {
    background: "#1a1008",
    color: "#a07850",
    border: "1px solid #2a1f14",
    borderRadius: 12,
    padding: "11px 20px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  addBtn: {
    background: "rgba(212,134,42,0.15)",
    color: "#d4862a",
    border: "1px solid rgba(212,134,42,0.3)",
    borderRadius: 8,
    padding: "7px 14px",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    whiteSpace: "nowrap",
  },
  qtyBtn: {
    width: 30,
    height: 30,
    background: "#1a1008",
    color: "#d4862a",
    border: "1px solid #2a1f14",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  floatingCart: {
    position: "fixed",
    bottom: 20,
    left: "50%",
    transform: "translateX(-50%)",
    background: "linear-gradient(135deg, #d4862a, #b8721f)",
    color: "#1a0f00",
    border: "none",
    borderRadius: 50,
    padding: "14px 28px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    display: "flex",
    gap: 16,
    alignItems: "center",
    boxShadow: "0 4px 24px rgba(212,134,42,0.4)",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    zIndex: 100,
    whiteSpace: "nowrap",
  },
  cartBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 200,
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "flex-end",
  },
  cartDrawer: {
    width: "100%",
    maxWidth: 480,
    margin: "0 auto",
    background: "#0f0b06",
    border: "1px solid #2a1f14",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85vh",
    overflowY: "auto",
  },
  cartItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 0",
    borderBottom: "1px solid #1a1008",
  },
  totalBox: {
    background: "#0d0a08",
    border: "1px solid #2a1f14",
    borderRadius: 10,
    padding: 14,
  },
  orderItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 0",
    borderBottom: "1px solid #1a1008",
    fontSize: 13,
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#6b5040",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #1a1008",
    borderTop: "3px solid #d4862a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};

// Inject global styles
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body { margin: 0; background: #0d0a08; }
    input:focus, textarea:focus { border-color: #d4862a !important; outline: none; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: #0d0a08; }
    ::-webkit-scrollbar-thumb { background: #2a1f14; border-radius: 4px; }
  `;
  document.head.appendChild(style);
}

export default QRMenuPage;
