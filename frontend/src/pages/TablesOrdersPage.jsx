import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { orderAPI, tableAPI } from "../services/api";

// ─── Bill print utility ───────────────────────────────────────────────────────
const printBill = (order) => {
  const win = window.open("", "_blank", "width=400,height=600");
  const items = order.items || [];
  const itemRows = items
    .map(
      (item) => `
    <tr>
      <td>${item.emoji || ""} ${item.name}</td>
      <td style="text-align:center">${item.qty}</td>
      <td style="text-align:right">Rs. ${item.price}</td>
      <td style="text-align:right">Rs. ${item.subtotal || item.price * item.qty}</td>
    </tr>
  `,
    )
    .join("");

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
    <div class="info-row"><span>Table:</span><span>Table ${order.tableNumber || "-"}</span></div>
    ${order.customerName ? `<div class="info-row"><span>Customer:</span><span>${order.customerName}</span></div>` : ""}
    ${order.customerPhone ? `<div class="info-row"><span>Phone:</span><span>${order.customerPhone}</span></div>` : ""}
    <div class="info-row"><span>Cashier:</span><span>${order.cashierName || "-"}</span></div>
    <div class="info-row"><span>Date:</span><span>${new Date(order.createdAt).toLocaleString("en-NP", { dateStyle: "short", timeStyle: "short" })}</span></div>
  </div>
  <div class="divider"></div>
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div>
    <div class="total-row"><span>Subtotal</span><span>Rs. ${order.subtotal?.toLocaleString()}</span></div>
    ${order.discount > 0 ? `<div class="total-row" style="color:#c00"><span>Discount</span><span>- Rs. ${order.discount}</span></div>` : ""}
    <div class="total-row grand-total"><span>TOTAL</span><span>Rs. ${order.total?.toLocaleString()}</span></div>
    ${order.amountReceived > 0 ? `<div class="total-row"><span>Paid</span><span>Rs. ${order.amountReceived?.toLocaleString()}</span></div>` : ""}
    ${order.remainingAmount > 0 ? `<div class="total-row" style="color:#c00;font-weight:700"><span>REMAINING</span><span>Rs. ${order.remainingAmount?.toLocaleString()}</span></div>` : ""}
    ${order.changeGiven > 0 ? `<div class="total-row"><span>Change</span><span>Rs. ${order.changeGiven?.toLocaleString()}</span></div>` : ""}
  </div>
  <div class="payment-badge">${order.paymentStatus === "partial" ? "⏳ PARTIAL PAYMENT" : order.paymentMethod === "cash" ? "💵 CASH" : order.paymentMethod === "qr" ? "📱 QR / eSewa" : order.paymentMethod?.toUpperCase() || "PENDING"}</div>
  <div class="footer"><p>⭐ We hope you enjoyed your visit!</p><p>Please come again</p></div>
  <script>window.onload = () => { window.print(); }</script>
</body></html>`);
  win.document.close();
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── TABLES PAGE ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Table status badge ───────────────────────────────────────────────────────
const TableStatusBadge = ({ status }) => {
  const cfg = {
    available: { bg: "rgba(76,175,136,0.15)", color: "var(--green)", label: "✅ Available" },
    occupied:  { bg: "rgba(212,134,42,0.15)",  color: "var(--amber)", label: "🍽️ Occupied"  },
    reserved:  { bg: "rgba(91,155,213,0.15)",  color: "#5b9bd5",      label: "📋 Reserved"  },
    dirty:     { bg: "rgba(224,92,92,0.15)",   color: "var(--red)",   label: "🧹 Dirty"     },
  };
  const c = cfg[status] || cfg.available;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color, letterSpacing: 0.5,
    }}>
      {c.label}
    </span>
  );
};

// ─── Add / Edit Table Modal ───────────────────────────────────────────────────
const TableFormModal = ({ table, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    number:   table?.number   || "",
    seats:    table?.seats    || 4,
    location: table?.location || "indoor",
    notes:    table?.notes    || "",
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!table;

  const handleSubmit = async () => {
    if (!form.number) { toast.error("Table number is required"); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await tableAPI.update(table._id, { seats: form.seats, location: form.location, notes: form.notes });
        toast.success(`Table ${form.number} updated`);
      } else {
        await tableAPI.create(form);
        toast.success(`Table ${form.number} created`);
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save table");
    } finally {
      setSaving(false);
    }
  };

  const lbl = { fontSize: 12, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 6 };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? "✏️ Edit Table" : "➕ Add Table"}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={lbl}>Table Number</label>
            <input className="form-control" type="number" min={1} max={200}
              value={form.number}
              onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
              placeholder="e.g. 5" autoFocus disabled={isEdit} />
            {isEdit && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>Table number cannot be changed after creation.</div>}
          </div>
          <div>
            <label style={lbl}>Seats</label>
            <input className="form-control" type="number" min={1} max={20}
              value={form.seats}
              onChange={e => setForm(f => ({ ...f, seats: e.target.value }))}
              placeholder="4" />
          </div>
          <div>
            <label style={lbl}>Location</label>
            <select className="form-control" value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}>
              <option value="indoor">🏠 Indoor</option>
              <option value="outdoor">🌿 Outdoor</option>
              <option value="balcony">🌅 Balcony</option>
              <option value="vip">⭐ VIP</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Notes <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <input className="form-control" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Window seat, near bar..." />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : isEdit ? "💾 Save Changes" : "➕ Add Table"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Table Detail / Status Modal ──────────────────────────────────────────────
const TableDetailModal = ({ table, onClose, onRefresh }) => {
  const [newStatus, setNewStatus] = useState(table.status);
  const [saving, setSaving]   = useState(false);
  const [clearing, setClearing] = useState(false);

  const order = table.currentOrder;

  const handleStatusChange = async () => {
    if (newStatus === table.status) { onClose(); return; }
    setSaving(true);
    try {
      await tableAPI.setStatus(table._id, { status: newStatus });
      toast.success(`Table ${table.number} → ${newStatus}`);
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await tableAPI.clear(table._id);
      toast.success(`Table ${table.number} cleared`);
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to clear table");
    } finally {
      setClearing(false);
    }
  };

  const statusOptions = [
    { key: "available", icon: "✅", label: "Available" },
    { key: "occupied",  icon: "🍽️", label: "Occupied"  },
    { key: "reserved",  icon: "📋", label: "Reserved"  },
    { key: "dirty",     icon: "🧹", label: "Dirty"     },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">🪑 Table {table.number}</h3>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
              {table.seats} seats · <span style={{ textTransform: "capitalize" }}>{table.location}</span>
              {table.notes ? ` · ${table.notes}` : ""}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Current order summary */}
          {order && (
            <div style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, marginBottom: 8 }}>ACTIVE ORDER</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: "DM Mono", fontSize: 13, color: "var(--amber)" }}>{order.orderId}</span>
                <span style={{ fontFamily: "DM Mono", fontSize: 14, fontWeight: 700 }}>Rs. {order.total?.toLocaleString()}</span>
              </div>
              {order.items?.length > 0 && (
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 8 }}>
                  {order.items.map(i => `${i.emoji || ""} ${i.name} ×${i.qty}`).join(" · ")}
                </div>
              )}
              <span style={{
                padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                background: order.paymentStatus === "paid" ? "rgba(76,175,136,0.15)" : "rgba(224,92,92,0.15)",
                color: order.paymentStatus === "paid" ? "var(--green)" : "var(--red)",
              }}>
                {order.paymentStatus?.toUpperCase()}
              </span>
            </div>
          )}

          {/* Status picker */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 8 }}>
              Set Status
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {statusOptions.map(s => (
                <div key={s.key} onClick={() => setNewStatus(s.key)} style={{
                  padding: "10px 12px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                  fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                  border: `2px solid ${newStatus === s.key ? "var(--amber)" : "var(--border2)"}`,
                  background: newStatus === s.key ? "var(--amber-dim)" : "var(--card)",
                  color: newStatus === s.key ? "var(--amber)" : "var(--text3)",
                }}>
                  {s.icon} {s.label}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="btn btn-primary" onClick={handleStatusChange} disabled={saving || newStatus === table.status}>
              {saving ? "Updating..." : "💾 Update Status"}
            </button>
            {(table.status === "occupied" || table.status === "dirty") && (
              <button className="btn btn-secondary" onClick={handleClear} disabled={clearing}>
                {clearing ? "Clearing..." : "🧹 Clear Table"}
              </button>
            )}
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Tables Page ─────────────────────────────────────────────────────────
export const TablesPage = () => {
  const [tables, setTables]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [statusFilter, setStatusFilter]     = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [selectedTable, setSelectedTable]   = useState(null);
  const [editingTable, setEditingTable]     = useState(null);
  const [showAddModal, setShowAddModal]     = useState(false);

  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "all")   params.status   = statusFilter;
      if (locationFilter !== "all") params.location = locationFilter;
      const { data } = await tableAPI.getAll(params);
      setTables(data.tables);
    } catch (err) {
      toast.error("Failed to load tables");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, locationFilter]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const handleDelete = async (table) => {
    if (!window.confirm(`Remove Table ${table.number}? This cannot be undone.`)) return;
    try {
      await tableAPI.delete(table._id);
      toast.success(`Table ${table.number} removed`);
      fetchTables();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete table");
    }
  };

  // Summary counts
  const total     = tables.length;
  const available = tables.filter(t => t.status === "available").length;
  const occupied  = tables.filter(t => t.status === "occupied").length;
  const reserved  = tables.filter(t => t.status === "reserved").length;
  const dirty     = tables.filter(t => t.status === "dirty").length;

  const statusFilters   = ["all", "available", "occupied", "reserved", "dirty"];
  const locationFilters = ["all", "indoor", "outdoor", "balcony", "vip"];

  const statusIcon = { available: "✅", occupied: "🍽️", reserved: "📋", dirty: "🧹" };

  return (
    <div className="animate-fadeIn">
      {/* ── Header ── */}
      <div className="page-header">
        <h2 className="page-title">🪑 Tables</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          ➕ Add Table
        </button>
      </div>

      {/* ── Summary stat cards ── */}
      <div className="stats-grid mb-16" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <div className="stat-card">
          <div className="stat-label">Total Tables</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{total}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Available</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{available}</div>
        </div>
        <div className="stat-card" style={{ borderColor: "rgba(212,134,42,0.3)", background: "rgba(212,134,42,0.06)" }}>
          <div className="stat-label" style={{ color: "var(--amber)" }}>Occupied</div>
          <div className="stat-value" style={{ fontSize: 22, color: "var(--amber)" }}>{occupied}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Reserved</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{reserved}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Dirty</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{dirty}</div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {statusFilters.map(s => (
            <button key={s} className={`filter-chip ${statusFilter === s ? "active" : ""}`}
              onClick={() => setStatusFilter(s)}>
              {s === "all" ? "All Status" : `${statusIcon[s]} ${s.charAt(0).toUpperCase() + s.slice(1)}`}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {locationFilters.map(l => (
            <button key={l} className={`filter-chip ${locationFilter === l ? "active" : ""}`}
              onClick={() => setLocationFilter(l)}>
              {l === "all" ? "All Locations" : l.charAt(0).toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={fetchTables}>
          🔄 Refresh
        </button>
      </div>

      {/* ── Table grid ── */}
      {loading ? (
        <div className="flex-center" style={{ padding: 60 }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : tables.length === 0 ? (
        <div className="empty-state" style={{ padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🪑</div>
          <p style={{ color: "var(--text3)" }}>No tables found. Add your first table!</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAddModal(true)}>
            ➕ Add Table
          </button>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 14,
        }}>
          {tables.map(table => {
            const order = table.currentOrder;
            const statusColors = {
              available: { border: "var(--green)",  bg: "rgba(76,175,136,0.06)"  },
              occupied:  { border: "var(--amber)",  bg: "rgba(212,134,42,0.08)"  },
              reserved:  { border: "#5b9bd5",       bg: "rgba(91,155,213,0.06)"  },
              dirty:     { border: "var(--red)",    bg: "rgba(224,92,92,0.06)"   },
            };
            const sc = statusColors[table.status] || statusColors.available;

            return (
              <div key={table._id}
                onClick={() => setSelectedTable(table)}
                style={{
                  background: "var(--card)",
                  border: `2px solid ${sc.border}`,
                  borderRadius: "var(--radius)",
                  padding: 16,
                  cursor: "pointer",
                  transition: "var(--transition)",
                  position: "relative",
                  background: sc.bg,
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                {/* Table number */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "DM Mono", color: "var(--text)" }}>
                    T{table.number}
                  </div>
                  <TableStatusBadge status={table.status} />
                </div>

                {/* Seats & location */}
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 8 }}>
                  🪑 {table.seats} seats · <span style={{ textTransform: "capitalize" }}>{table.location}</span>
                </div>

                {/* Active order info */}
                {order && (
                  <div style={{
                    background: "var(--card)", border: "1px solid var(--border)",
                    borderRadius: 8, padding: "8px 10px", marginBottom: 8,
                  }}>
                    <div style={{ fontFamily: "DM Mono", fontSize: 11, color: "var(--amber)", marginBottom: 2 }}>
                      {order.orderId}
                    </div>
                    <div style={{ fontFamily: "DM Mono", fontSize: 13, fontWeight: 700 }}>
                      Rs. {order.total?.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                      {order.items?.length} item{order.items?.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {table.notes && (
                  <div style={{ fontSize: 11, color: "var(--text3)", fontStyle: "italic", marginBottom: 10 }}>
                    {table.notes}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}
                  onClick={e => e.stopPropagation()}>
                  <button className="btn btn-xs btn-secondary"
                    onClick={() => setEditingTable(table)}
                    title="Edit table">
                    ✏️ Edit
                  </button>
                  {table.status !== "occupied" && (
                    <button className="btn btn-xs btn-secondary"
                      onClick={() => handleDelete(table)}
                      title="Remove table"
                      style={{ color: "var(--red)" }}>
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modals ── */}
      {showAddModal && (
        <TableFormModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchTables(); }}
        />
      )}
      {editingTable && (
        <TableFormModal
          table={editingTable}
          onClose={() => setEditingTable(null)}
          onSuccess={() => { setEditingTable(null); fetchTables(); }}
        />
      )}
      {selectedTable && (
        <TableDetailModal
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
          onRefresh={fetchTables}
        />
      )}

      <style>{`
        .filter-chip { padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border2); background: var(--card); color: var(--text3); font-size: 12px; font-weight: 600; cursor: pointer; transition: var(--transition); font-family: 'DM Sans', sans-serif; }
        .filter-chip.active { background: var(--amber-dim); border-color: var(--amber); color: var(--amber); }
        .filter-chip:hover:not(.active) { border-color: var(--border2); color: var(--text2); }
        .mb-16 { margin-bottom: 16px; }
      `}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ORDERS PAGE ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Edit Order Modal (customer details + partial pay + clear) ────────────────
const EditOrderModal = ({ order, onClose, onSuccess }) => {
  const [customerName, setCustomerName] = useState(order.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone || "");
  const [note, setNote] = useState(order.note || "");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(
    order.paymentMethod !== "pending" ? order.paymentMethod : "cash",
  );
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const remaining = order.remainingAmount ?? order.total;
  const newRemaining = amountPaid ? Math.max(0, remaining - parseFloat(amountPaid)) : remaining;
  const isOverpay = amountPaid && parseFloat(amountPaid) > remaining;

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      await orderAPI.updateCustomer(order._id, { customerName, customerPhone, note });
      toast.success("Customer details updated");
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update");
    } finally { setSaving(false); }
  };

  const handlePartialPay = async () => {
    if (!amountPaid || parseFloat(amountPaid) <= 0) { toast.error("Enter a valid amount"); return; }
    setPaying(true);
    try {
      const { data } = await orderAPI.partialPay(order._id, { amountPaid: parseFloat(amountPaid), paymentMethod });
      toast.success(data.message);
      onSuccess(data.order);
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment failed");
    } finally { setPaying(false); }
  };

  const handleClearRemaining = async () => {
    setClearing(true);
    try {
      const { data } = await orderAPI.markPaid(order._id, { paymentMethod, amountReceived: order.total });
      toast.success("✅ Remaining cleared — order fully paid!");
      onSuccess(data.order);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to clear");
    } finally { setClearing(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">✏️ Edit Order</h3>
            <div style={{ fontSize: 12, color: "var(--amber)", fontFamily: "DM Mono", marginTop: 2 }}>
              {order.orderId} · Rs. {order.total?.toLocaleString()}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 20px" }}>
          {[{ key: "details", label: "👤 Customer" }, { key: "payment", label: "💳 Payment" }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: "10px 16px", background: "none", border: "none",
              borderBottom: `2px solid ${activeTab === tab.key ? "var(--amber)" : "transparent"}`,
              color: activeTab === tab.key ? "var(--amber)" : "var(--text3)",
              fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.15s", marginBottom: -1,
            }}>{tab.label}</button>
          ))}
        </div>

        <div className="modal-body">
          {activeTab === "details" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 6 }}>Customer Name</label>
                <input className="form-control" placeholder="Enter customer name..." value={customerName} onChange={e => setCustomerName(e.target.value)} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 6 }}>Phone Number</label>
                <input className="form-control" placeholder="98XXXXXXXX" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 6 }}>Order Note</label>
                <input className="form-control" placeholder="Special instructions..." value={note} onChange={e => setNote(e.target.value)} />
              </div>
              <div style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>
                  <span>Total Bill</span>
                  <span style={{ fontFamily: "DM Mono", color: "var(--text)" }}>Rs. {order.total?.toLocaleString()}</span>
                </div>
                {order.amountReceived > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>
                    <span>Paid So Far</span>
                    <span style={{ fontFamily: "DM Mono", color: "var(--green)" }}>Rs. {order.amountReceived?.toLocaleString()}</span>
                  </div>
                )}
                {remaining > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700 }}>
                    <span style={{ color: "var(--red)" }}>Remaining</span>
                    <span style={{ fontFamily: "DM Mono", color: "var(--red)" }}>Rs. {remaining?.toLocaleString()}</span>
                  </div>
                )}
                {order.paymentStatus === "paid" && (
                  <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 700, textAlign: "center", padding: "4px 0" }}>✅ Fully Paid</div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveDetails} disabled={saving}>
                  {saving ? "Saving..." : "💾 Save Details"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "payment" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text3)", marginBottom: 5 }}>
                  <span>Order Total</span>
                  <span style={{ fontFamily: "DM Mono" }}>Rs. {order.total?.toLocaleString()}</span>
                </div>
                {order.amountReceived > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text3)", marginBottom: 5 }}>
                    <span>Already Paid</span>
                    <span style={{ fontFamily: "DM Mono", color: "var(--green)" }}>Rs. {order.amountReceived?.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
                  <span style={{ color: remaining > 0 ? "var(--red)" : "var(--green)" }}>{remaining > 0 ? "Due" : "Settled"}</span>
                  <span style={{ fontFamily: "DM Mono", color: remaining > 0 ? "var(--red)" : "var(--green)" }}>Rs. {remaining?.toLocaleString()}</span>
                </div>
              </div>

              {remaining > 0 && order.paymentStatus !== "paid" ? (
                <>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 8 }}>Payment Method</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[{ key: "cash", icon: "💵", label: "Cash" }, { key: "qr", icon: "📱", label: "QR / eSewa" }].map(m => (
                        <div key={m.key} onClick={() => setPaymentMethod(m.key)} style={{
                          padding: "12px 10px", borderRadius: 10, textAlign: "center", cursor: "pointer", transition: "all 0.15s",
                          border: `2px solid ${paymentMethod === m.key ? "var(--amber)" : "var(--border2)"}`,
                          background: paymentMethod === m.key ? "var(--amber-dim)" : "var(--card)",
                        }}>
                          <div style={{ fontSize: 24, marginBottom: 3 }}>{m.icon}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: paymentMethod === m.key ? "var(--amber)" : "var(--text3)" }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 6 }}>
                      Amount to Collect <span style={{ fontWeight: 400 }}>(can be partial)</span>
                    </label>
                    <input type="number" className="form-control"
                      placeholder={`Max Rs. ${remaining?.toLocaleString()}`}
                      value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                      min={1} max={remaining} />
                    {amountPaid && !isOverpay && parseFloat(amountPaid) > 0 && (
                      <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card2)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: "var(--text3)" }}>Collecting now</span>
                          <span style={{ fontFamily: "DM Mono", color: "var(--green)", fontWeight: 700 }}>Rs. {parseFloat(amountPaid).toLocaleString()}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span style={{ color: "var(--text3)" }}>{newRemaining > 0 ? "Still remaining" : "Fully settled ✅"}</span>
                          <span style={{ fontFamily: "DM Mono", color: newRemaining > 0 ? "var(--red)" : "var(--green)", fontWeight: 700 }}>
                            {newRemaining > 0 ? `Rs. ${newRemaining.toLocaleString()}` : "Rs. 0"}
                          </span>
                        </div>
                      </div>
                    )}
                    {isOverpay && (
                      <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(224,92,92,0.1)", border: "1px solid rgba(224,92,92,0.3)", borderRadius: 8, fontSize: 12, color: "var(--red)" }}>
                        ⚠️ Exceeds remaining amount by Rs. {(parseFloat(amountPaid) - remaining).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button className="btn btn-success" onClick={handlePartialPay}
                      disabled={paying || !amountPaid || parseFloat(amountPaid) <= 0 || isOverpay}
                      style={{ opacity: (!amountPaid || parseFloat(amountPaid) <= 0 || isOverpay) ? 0.5 : 1 }}>
                      {paying ? "Processing..." : newRemaining > 0
                        ? `💳 Collect Rs. ${amountPaid ? parseFloat(amountPaid).toLocaleString() : "—"} (Partial)`
                        : "✅ Collect & Mark Fully Paid"}
                    </button>
                    <button className="btn btn-secondary" onClick={handleClearRemaining} disabled={clearing || paying}>
                      {clearing ? "Clearing..." : `🧹 Clear Remaining — Mark Rs. ${remaining?.toLocaleString()} as Paid`}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green)", marginBottom: 4 }}>Order Fully Paid</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>via {order.paymentMethod?.toUpperCase()} · Rs. {order.total?.toLocaleString()}</div>
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

// ─── Quick Pay Modal ──────────────────────────────────────────────────────────
const QuickPayModal = ({ order, onClose, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [paying, setPaying] = useState(false);

  const remaining = order.remainingAmount ?? order.total;
  const change = amountReceived ? Math.max(0, parseFloat(amountReceived) - remaining) : 0;
  const isExact = !amountReceived || parseFloat(amountReceived) >= remaining;

  const handlePay = async () => {
    if (amountReceived && parseFloat(amountReceived) < remaining) {
      toast.error("Amount received is less than remaining balance"); return;
    }
    setPaying(true);
    try {
      const { data } = await orderAPI.markPaid(order._id, {
        paymentMethod,
        amountReceived: parseFloat(amountReceived) || remaining,
      });
      toast.success(`✅ Rs. ${remaining.toLocaleString()} collected`);
      onSuccess(data.order || order);
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment failed");
    } finally { setPaying(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">💳 Collect Payment</h3>
            {order.customerName && (
              <div style={{ fontSize: 12, color: "var(--amber)", marginTop: 2 }}>
                👤 {order.customerName}{order.customerPhone ? ` · ${order.customerPhone}` : ""}
              </div>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>Order</span>
              <span style={{ fontFamily: "DM Mono", fontSize: 12, color: "var(--amber)" }}>{order.orderId}</span>
            </div>
            {order.tableNumber && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--text3)" }}>Table</span>
                <span style={{ fontSize: 12 }}>Table {order.tableNumber}</span>
              </div>
            )}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 6 }}>
              {order.items?.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12, borderBottom: "1px solid var(--border)" }}>
                  <span>{item.emoji} {item.name} × {item.qty}</span>
                  <span style={{ fontFamily: "DM Mono", color: "var(--text2)" }}>Rs. {(item.subtotal || item.price * item.qty).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
              {order.amountReceived > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--green)", marginBottom: 3 }}>
                  <span>Already Paid</span><span>Rs. {order.amountReceived?.toLocaleString()}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--red)", marginBottom: 3 }}>
                  <span>Discount</span><span>- Rs. {order.discount}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 700, color: "var(--red)", marginTop: 6 }}>
                <span>REMAINING DUE</span>
                <span style={{ fontFamily: "DM Mono" }}>Rs. {remaining?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 8 }}>Payment Method</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[{ key: "cash", icon: "💵", label: "Cash" }, { key: "qr", icon: "📱", label: "QR / eSewa" }].map(m => (
                <div key={m.key} onClick={() => setPaymentMethod(m.key)} style={{
                  padding: "14px 10px", borderRadius: 10, textAlign: "center", cursor: "pointer", transition: "all 0.15s",
                  border: `2px solid ${paymentMethod === m.key ? "var(--amber)" : "var(--border2)"}`,
                  background: paymentMethod === m.key ? "var(--amber-dim)" : "var(--card)",
                }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{m.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: paymentMethod === m.key ? "var(--amber)" : "var(--text3)" }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {paymentMethod === "cash" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Amount Received <span style={{ fontWeight: 400 }}>(leave blank if exact)</span>
              </label>
              <input type="number" className="form-control"
                placeholder={`Rs. ${remaining?.toLocaleString()}`}
                value={amountReceived} onChange={e => setAmountReceived(e.target.value)}
                min={remaining} autoFocus />
              {amountReceived && parseFloat(amountReceived) >= remaining && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(76,175,136,0.1)", border: "1px solid rgba(76,175,136,0.3)", borderRadius: 8, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text3)" }}>Change to return</span>
                  <span style={{ fontFamily: "DM Mono", fontWeight: 700, color: "var(--green)" }}>Rs. {change.toLocaleString()}</span>
                </div>
              )}
              {amountReceived && parseFloat(amountReceived) < remaining && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(224,92,92,0.1)", border: "1px solid rgba(224,92,92,0.3)", borderRadius: 8, fontSize: 12, color: "var(--red)" }}>
                  ⚠️ Rs. {(remaining - parseFloat(amountReceived)).toLocaleString()} short
                </div>
              )}
            </div>
          )}

          {paymentMethod === "qr" && (
            <div style={{ marginBottom: 16, padding: "12px 14px", background: "rgba(91,155,213,0.08)", border: "1px solid rgba(91,155,213,0.25)", borderRadius: 10, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>📱</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Scan QR / Pay via eSewa</div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>
                Amount: <b style={{ color: "var(--amber)", fontFamily: "DM Mono" }}>Rs. {remaining?.toLocaleString()}</b>
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>Confirm payment before clicking below</div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={paying}>Cancel</button>
            <button className="btn btn-success" onClick={handlePay} disabled={paying || !isExact} style={{ opacity: !isExact ? 0.5 : 1 }}>
              {paying ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Processing...</> : "✅ Confirm Payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Success Confirmation Modal ───────────────────────────────────────────────
const PaidConfirmModal = ({ order, onClose }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, textAlign: "center" }}>
      <div className="modal-body" style={{ padding: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Payment Received!</h3>
        {order.customerName && <p style={{ color: "var(--amber)", fontSize: 14, marginBottom: 4 }}>👤 {order.customerName}</p>}
        <p style={{ color: "var(--text3)", fontSize: 13, marginBottom: 6 }}>{order.orderId} · Rs. {order.total?.toLocaleString()}</p>
        <p style={{ color: "var(--text3)", fontSize: 12, marginBottom: 24 }}>
          Paid via <b style={{ color: "var(--amber)" }}>{order.paymentMethod?.toUpperCase()}</b>
          {order.changeGiven > 0 && ` · Change: Rs. ${order.changeGiven?.toLocaleString()}`}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
    paid:    { bg: "rgba(76,175,136,0.15)",  color: "var(--green)", label: "✅ PAID"    },
    partial: { bg: "rgba(255,165,0,0.15)",   color: "#f5a623",      label: "⏳ PARTIAL" },
    unpaid:  { bg: "rgba(224,92,92,0.15)",   color: "var(--red)",   label: "❌ UNPAID"  },
  };
  const c = cfg[status] || cfg.unpaid;
  return (
    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: c.bg, color: c.color, letterSpacing: 0.5 }}>
      {c.label}
    </span>
  );
};

// ─── Main Orders Page ─────────────────────────────────────────────────────────
export const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingOrder, setPayingOrder] = useState(null);
  const [paidOrder, setPaidOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (filter !== "all") {
        if (["paid", "unpaid", "partial"].includes(filter)) params.status = filter;
        else if (["cash", "qr"].includes(filter)) params.payment = filter;
      }
      if (dateFilter) params.date = dateFilter;
      if (search) params.search = search;
      const { data } = await orderAPI.getAll(params);
      setOrders(data.orders);
    } catch (err) {
      toast.error("Failed to load orders");
    } finally { setLoading(false); }
  }, [filter, dateFilter, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { const t = setTimeout(() => setSearch(searchInput), 400); return () => clearTimeout(t); }, [searchInput]);

  const handlePaySuccess = (completedOrder) => {
    setShowPayModal(false); setPayingOrder(null);
    if (completedOrder?.paymentStatus === "paid") setPaidOrder(completedOrder);
    fetchOrders();
  };
  const handleEditSuccess = (updatedOrder) => {
    setEditingOrder(null);
    if (updatedOrder?.paymentStatus === "paid") setPaidOrder(updatedOrder);
    fetchOrders();
  };

  const filters = [
    { key: "all", label: "All" }, { key: "unpaid", label: "❌ Unpaid" },
    { key: "partial", label: "⏳ Partial" }, { key: "paid", label: "✅ Paid" },
    { key: "cash", label: "💵 Cash" }, { key: "qr", label: "📱 QR" },
  ];

  const paid         = orders.filter(o => o.paymentStatus === "paid");
  const unpaidOrders = orders.filter(o => o.paymentStatus === "unpaid");
  const partialOrders= orders.filter(o => o.paymentStatus === "partial");
  const totalRev     = paid.reduce((s, o) => s + o.total, 0);
  const totalUnpaid  = unpaidOrders.reduce((s, o) => s + (o.remainingAmount ?? o.total), 0);
  const totalPartial = partialOrders.reduce((s, o) => s + (o.remainingAmount ?? 0), 0);
  const cashRev      = paid.filter(o => o.paymentMethod === "cash").reduce((s, o) => s + o.total, 0);
  const qrRev        = paid.filter(o => o.paymentMethod === "qr").reduce((s, o) => s + o.total, 0);

  const exportCSV = () => {
    const headers = ["Order ID","Customer","Phone","Table","Items","Subtotal","Discount","Total","Paid","Remaining","Payment","Status","Time","Cashier"];
    const rows = orders.map(o => [
      o.orderId, o.customerName || "", o.customerPhone || "", o.tableNumber || o.orderType,
      o.items.map(i => `${i.name}x${i.qty}`).join(";"),
      o.subtotal, o.discount || 0, o.total, o.amountReceived || 0,
      o.remainingAmount ?? (o.paymentStatus === "unpaid" ? o.total : 0),
      o.paymentMethod, o.paymentStatus, new Date(o.createdAt).toLocaleString(), o.cashierName,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `orders-${dateFilter || "all"}.csv`; a.click();
    toast.success("Exported!");
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h2 className="page-title">📋 All Orders</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="date" className="form-control" value={dateFilter}
            onChange={e => setDateFilter(e.target.value)} style={{ width: "auto" }} />
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>↓ CSV</button>
        </div>
      </div>

      <div className="stats-grid mb-16" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <div className="stat-card"><div className="stat-label">Collected</div><div className="stat-value mono" style={{ fontSize: 18 }}>Rs. {totalRev.toLocaleString()}</div></div>
        <div className="stat-card green"><div className="stat-label">Cash</div><div className="stat-value mono" style={{ fontSize: 18 }}>Rs. {cashRev.toLocaleString()}</div></div>
        <div className="stat-card blue"><div className="stat-label">QR / eSewa</div><div className="stat-value mono" style={{ fontSize: 18 }}>Rs. {qrRev.toLocaleString()}</div></div>
        <div className="stat-card" style={{ borderColor: "rgba(255,165,0,0.3)", background: "rgba(255,165,0,0.06)" }}>
          <div className="stat-label" style={{ color: "#f5a623" }}>Partial ({partialOrders.length})</div>
          <div className="stat-value mono" style={{ fontSize: 18, color: "#f5a623" }}>Rs. {totalPartial.toLocaleString()}</div>
        </div>
        <div className="stat-card red"><div className="stat-label">Unpaid ({unpaidOrders.length})</div><div className="stat-value mono" style={{ fontSize: 18 }}>Rs. {totalUnpaid.toLocaleString()}</div></div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {filters.map(f => (
          <button key={f.key} className={`filter-chip ${filter === f.key ? "active" : ""}`} onClick={() => setFilter(f.key)}>{f.label}</button>
        ))}
        <div style={{ marginLeft: "auto", position: "relative", minWidth: 260 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text3)", pointerEvents: "none" }}>🔍</span>
          <input className="form-control" placeholder="Search name, phone, order ID..."
            value={searchInput} onChange={e => setSearchInput(e.target.value)}
            style={{ paddingLeft: 32, fontSize: 13 }} />
          {searchInput && (
            <button onClick={() => { setSearchInput(""); setSearch(""); }}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>
          )}
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        {loading ? (
          <div className="flex-center" style={{ padding: 40 }}><div className="spinner" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th><th>Customer</th><th>Table</th><th>Items</th>
                <th>Total</th><th>Paid</th><th>Remaining</th><th>Payment</th>
                <th>Status</th><th>Time</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: "center", color: "var(--text3)", padding: 40 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                  {search ? `No results for "${search}"` : "No orders found"}
                </td></tr>
              ) : orders.map(o => {
                const remaining = o.remainingAmount ?? (o.paymentStatus === "unpaid" ? o.total : 0);
                const paidSoFar = o.amountReceived || 0;
                const isExpanded = expandedOrder === o._id;
                const isPartial  = o.paymentStatus === "partial";

                return (
                  <React.Fragment key={o._id}>
                    <tr style={{
                      cursor: "pointer",
                      background: isExpanded ? "var(--amber-dim)" : isPartial ? "rgba(255,165,0,0.04)" : undefined,
                      borderLeft: isPartial ? "3px solid #f5a623" : o.paymentStatus === "unpaid" ? "3px solid var(--red)" : "3px solid transparent",
                    }} onClick={() => setExpandedOrder(isExpanded ? null : o._id)}>
                      <td><span style={{ fontFamily: "DM Mono", fontSize: 12, color: "var(--amber)" }}>{o.orderId}</span></td>
                      <td>
                        {o.customerName ? (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{o.customerName}</div>
                            {o.customerPhone && <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "DM Mono" }}>{o.customerPhone}</div>}
                          </div>
                        ) : <span style={{ fontSize: 12, color: "var(--text3)" }}>—</span>}
                      </td>
                      <td>{o.tableNumber ? `T${o.tableNumber}` : o.orderType}</td>
                      <td>
                        <span style={{ fontSize: 14 }}>{o.items.map(i => i.emoji).join("")}</span>
                        <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: 4 }}>{o.items.length} items</span>
                      </td>
                      <td><span style={{ fontFamily: "DM Mono", color: "var(--amber)", fontWeight: 600 }}>Rs. {o.total.toLocaleString()}</span></td>
                      <td>
                        {paidSoFar > 0
                          ? <span style={{ fontFamily: "DM Mono", color: "var(--green)", fontSize: 12 }}>Rs. {paidSoFar.toLocaleString()}</span>
                          : <span style={{ color: "var(--text3)", fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        {remaining > 0
                          ? <span style={{ fontFamily: "DM Mono", color: isPartial ? "#f5a623" : "var(--red)", fontWeight: 700, fontSize: 13 }}>Rs. {remaining.toLocaleString()}</span>
                          : <span style={{ color: "var(--green)", fontSize: 12 }}>✓ Cleared</span>}
                      </td>
                      <td><span className={`badge badge-${o.paymentMethod}`}>{o.paymentMethod?.toUpperCase()}</span></td>
                      <td><PayBadge status={o.paymentStatus} /></td>
                      <td style={{ fontSize: 11, color: "var(--text3)", fontFamily: "DM Mono" }}>
                        {new Date(o.createdAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 5 }}>
                          {(o.paymentStatus === "unpaid" || o.paymentStatus === "partial") && (
                            <button className="btn btn-xs btn-success"
                              onClick={() => { setPayingOrder(o); setShowPayModal(true); }}>💳 Pay</button>
                          )}
                          <button className="btn btn-xs btn-secondary" onClick={() => setEditingOrder(o)}>✏️</button>
                          <button className="btn btn-xs btn-secondary" onClick={() => printBill(o)}>🖨️</button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={11} style={{ background: "var(--card2)", padding: 0 }}>
                          <div style={{ padding: "12px 20px" }}>
                            <div style={{ display: "flex", gap: 24, marginBottom: 10, flexWrap: "wrap" }}>
                              <div>
                                <span style={{ fontSize: 11, color: "var(--text3)" }}>CASHIER</span>
                                <div style={{ fontSize: 13 }}>{o.cashierName || "—"}</div>
                              </div>
                              {o.note && <div><span style={{ fontSize: 11, color: "var(--text3)" }}>NOTE</span><div style={{ fontSize: 13 }}>{o.note}</div></div>}
                              <div>
                                <span style={{ fontSize: 11, color: "var(--text3)" }}>ORDER TYPE</span>
                                <div style={{ fontSize: 13, textTransform: "capitalize" }}>{o.orderType}</div>
                              </div>
                              {o.discount > 0 && <div><span style={{ fontSize: 11, color: "var(--text3)" }}>DISCOUNT</span><div style={{ fontSize: 13, color: "var(--red)" }}>Rs. {o.discount}</div></div>}
                              {o.paymentStatus === "partial" && (
                                <div>
                                  <span style={{ fontSize: 11, color: "#f5a623" }}>PARTIAL — PAID SO FAR</span>
                                  <div style={{ fontSize: 13, color: "#f5a623", fontWeight: 700 }}>Rs. {o.amountReceived?.toLocaleString()}</div>
                                </div>
                              )}
                            </div>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                  {["Item","Qty","Price","Subtotal"].map((h, i) => (
                                    <th key={h} style={{ textAlign: i === 0 ? "left" : i === 1 ? "center" : "right", padding: "4px 8px", color: "var(--text3)", fontWeight: 600, fontSize: 11 }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {o.items.map((item, i) => (
                                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                                    <td style={{ padding: "6px 8px" }}>{item.emoji} {item.name}</td>
                                    <td style={{ textAlign: "center", padding: "6px 8px" }}>{item.qty}</td>
                                    <td style={{ textAlign: "right", fontFamily: "DM Mono", padding: "6px 8px" }}>Rs. {item.price}</td>
                                    <td style={{ textAlign: "right", fontFamily: "DM Mono", color: "var(--amber)", padding: "6px 8px" }}>Rs. {(item.subtotal || item.price * item.qty).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td colSpan={3} style={{ textAlign: "right", padding: "8px 8px 4px", fontWeight: 700, fontSize: 14 }}>Total</td>
                                  <td style={{ textAlign: "right", fontFamily: "DM Mono", fontWeight: 700, color: "var(--amber)", fontSize: 16, padding: "8px 8px 4px" }}>Rs. {o.total.toLocaleString()}</td>
                                </tr>
                                {o.amountReceived > 0 && (
                                  <tr>
                                    <td colSpan={3} style={{ textAlign: "right", padding: "4px 8px", color: "var(--green)", fontSize: 13 }}>Paid</td>
                                    <td style={{ textAlign: "right", fontFamily: "DM Mono", color: "var(--green)", fontWeight: 700, padding: "4px 8px" }}>Rs. {o.amountReceived?.toLocaleString()}</td>
                                  </tr>
                                )}
                                {(o.remainingAmount > 0 || o.paymentStatus === "unpaid") && (
                                  <tr>
                                    <td colSpan={3} style={{ textAlign: "right", padding: "4px 8px", color: o.paymentStatus === "partial" ? "#f5a623" : "var(--red)", fontSize: 13 }}>Remaining</td>
                                    <td style={{ textAlign: "right", fontFamily: "DM Mono", color: o.paymentStatus === "partial" ? "#f5a623" : "var(--red)", fontWeight: 700, padding: "4px 8px" }}>Rs. {(o.remainingAmount ?? o.total).toLocaleString()}</td>
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

      {showPayModal && payingOrder && (
        <QuickPayModal order={payingOrder} onClose={() => { setShowPayModal(false); setPayingOrder(null); }} onSuccess={handlePaySuccess} />
      )}
      {paidOrder && <PaidConfirmModal order={paidOrder} onClose={() => setPaidOrder(null)} />}
      {editingOrder && <EditOrderModal order={editingOrder} onClose={() => setEditingOrder(null)} onSuccess={handleEditSuccess} />}

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